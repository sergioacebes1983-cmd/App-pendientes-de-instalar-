"""Weekly installation report: generated every Monday 09:00 Europe/Madrid by a platform cron
(.emergent/crons.yml → POST /api/cron/weekly-report) for the previous Mon–Sun week.
All users can read reports; generation pushes a notification to everyone."""

import asyncio
import hmac
import logging
import os
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from lib.auth import current_user
from lib.db import db
from lib.push import notify_others
from models.schemas import User, new_id, now_utc

router = APIRouter(tags=["reports"])
logger = logging.getLogger(__name__)
MADRID = ZoneInfo("Europe/Madrid")
_tasks: set[asyncio.Task] = set()


class TechSummary(BaseModel):
    user_name: str
    total: int
    telefono: int
    monitor: int


class CommunitySummary(BaseModel):
    community_id: str
    name: str
    installed: int
    pending_now: int


class InstallItem(BaseModel):
    community_name: str
    street: str = ""
    unit: str
    neighbor_name: str
    device_type: str
    installed_by_name: str
    installed_at: datetime


class WeeklyReport(BaseModel):
    id: str
    week_start: str  # YYYY-MM-DD (Monday, Europe/Madrid)
    week_end: str    # YYYY-MM-DD (Sunday)
    generated_at: datetime
    is_partial: bool = False
    total_installed: int
    total_telefono: int
    total_monitor: int
    pending_now: int
    by_technician: list[TechSummary]
    by_community: list[CommunitySummary]
    items: list[InstallItem]


class ReportListItem(BaseModel):
    id: str
    week_start: str
    week_end: str
    generated_at: datetime
    total_installed: int


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    return dt.replace(tzinfo=timezone.utc) if dt is not None and dt.tzinfo is None else dt


def _week_bounds(monday: date) -> tuple[datetime, datetime]:
    start = datetime.combine(monday, time.min, tzinfo=MADRID)
    end = start + timedelta(days=7)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


async def build_report(monday: date, partial: bool = False) -> WeeklyReport:
    start, end = _week_bounds(monday)
    if partial:
        end = now_utc()
    communities = {c["id"]: c for c in await db.communities.find({}, {"_id": 0}).to_list(5000)}
    docs = await db.neighbors.find(
        {"status": "instalado", "installed_at": {"$gte": start, "$lt": end}}, {"_id": 0}
    ).sort("installed_at", 1).to_list(20000)

    tech: dict[str, dict] = {}
    comm: dict[str, int] = {}
    items: list[InstallItem] = []
    for n in docs:
        who = n.get("installed_by_name") or "—"
        t = tech.setdefault(who, {"total": 0, "telefono": 0, "monitor": 0})
        t["total"] += 1
        t[n["device_type"]] += 1
        comm[n["community_id"]] = comm.get(n["community_id"], 0) + 1
        items.append(InstallItem(
            community_name=communities.get(n["community_id"], {}).get("name", "(comunidad eliminada)"),
            street=n.get("street", ""), unit=n["unit"], neighbor_name=n["name"], device_type=n["device_type"],
            installed_by_name=who, installed_at=_aware(n["installed_at"]),
        ))

    pending_by_comm: dict[str, int] = {}
    async for row in db.neighbors.aggregate([
        {"$match": {"status": "pendiente"}}, {"$group": {"_id": "$community_id", "n": {"$sum": 1}}},
    ]):
        pending_by_comm[row["_id"]] = row["n"]

    by_comm = [
        CommunitySummary(community_id=cid, name=communities.get(cid, {}).get("name", "(comunidad eliminada)"),
                         installed=cnt, pending_now=pending_by_comm.get(cid, 0))
        for cid, cnt in comm.items()
    ]
    by_comm.sort(key=lambda c: (-c.installed, c.name))
    by_tech = sorted((TechSummary(user_name=k, **v) for k, v in tech.items()), key=lambda t: (-t.total, t.user_name))
    return WeeklyReport(
        id=new_id(), week_start=monday.isoformat(), week_end=(monday + timedelta(days=6)).isoformat(),
        generated_at=now_utc(), is_partial=partial, total_installed=len(docs),
        total_telefono=sum(1 for n in docs if n["device_type"] == "telefono"),
        total_monitor=sum(1 for n in docs if n["device_type"] == "monitor"),
        pending_now=sum(pending_by_comm.values()), by_technician=by_tech, by_community=by_comm, items=items,
    )


def _this_monday():
    today = datetime.now(MADRID).date()
    return today - timedelta(days=today.weekday())


async def generate_last_week(run_id: Optional[str]) -> None:
    monday = _this_monday() - timedelta(days=7)
    if await db.weekly_reports.find_one({"week_start": monday.isoformat()}, {"_id": 1}):
        logger.info("weekly report %s already exists", monday)
        return
    report = await build_report(monday)
    doc = report.model_dump()
    doc["run_id"] = run_id
    try:
        await db.weekly_reports.insert_one(doc)
    except Exception as exc:  # unique index on week_start → concurrent duplicate
        logger.info("weekly report insert skipped: %s", exc)
        return
    d1 = datetime.fromisoformat(report.week_start).strftime("%d/%m")
    d2 = datetime.fromisoformat(report.week_end).strftime("%d/%m")
    top = f" · Más instalaciones: {report.by_technician[0].user_name} ({report.by_technician[0].total})" if report.by_technician else ""
    notify_others(
        actor_id="",
        title=f"Informe semanal {d1}–{d2}",
        body=f"{report.total_installed} instalaciones ({report.total_telefono} teléfonos, {report.total_monitor} monitores){top}",
        url=f"/reports/{report.id}",
    )


def _authorized(request: Request) -> bool:
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else ""
    return bool(secret and token) and hmac.compare_digest(token, secret)


async def _read_envelope(request: Request) -> dict:
    try:
        body = await request.json()
    except Exception:
        return {}
    if body is None:
        return {}
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="invalid body")
    return body


async def _claim_run(run_id: Optional[str]) -> bool:
    """Record the run id; False if this delivery was already seen."""
    if not run_id:
        return True
    try:
        await db.cron_runs.insert_one({"run_id": run_id, "job": "weekly-report", "at": now_utc()})
        return True
    except Exception:
        return False


@router.post("/cron/weekly-report", status_code=202)
async def cron_weekly_report(request: Request):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    if not _authorized(request):
        raise HTTPException(status_code=401, detail="unauthorized")
    body = await _read_envelope(request)
    run_id = request.headers.get("X-Webhook-Id") or body.get("run_id")
    if not await _claim_run(run_id):
        return {"accepted": True, "duplicate": True}
    task = asyncio.create_task(generate_last_week(run_id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
    return {"accepted": True}


@router.get("/reports", response_model=list[ReportListItem])
async def list_reports(_: User = Depends(current_user)):
    docs = await db.weekly_reports.find({}, {"_id": 0, "id": 1, "week_start": 1, "week_end": 1, "generated_at": 1, "total_installed": 1}) \
        .sort("week_start", -1).to_list(520)
    for d in docs:
        d["generated_at"] = _aware(d["generated_at"])
    return [ReportListItem(**d) for d in docs]


@router.get("/reports/current", response_model=WeeklyReport)
async def current_week(_: User = Depends(current_user)):
    return await build_report(_this_monday(), partial=True)


@router.get("/reports/{report_id}", response_model=WeeklyReport)
async def get_report(report_id: str, _: User = Depends(current_user)):
    doc = await db.weekly_reports.find_one({"id": report_id}, {"_id": 0, "run_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    doc["generated_at"] = _aware(doc["generated_at"])
    for it in doc.get("items", []):
        it["installed_at"] = _aware(it["installed_at"])
    return WeeklyReport(**doc)
