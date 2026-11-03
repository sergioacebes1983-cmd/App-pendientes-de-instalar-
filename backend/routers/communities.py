"""Communities + neighbors + per-neighbor change history.

Permissions (RBAC): any active user reads everything and may change a neighbor's
status/notes; only admins create/edit/delete communities and neighbors' other fields.
"""

from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import current_user, require_admin
from lib.db import db
from lib.push import notify_others
from models.schemas import (
    Community, CommunityCreate, FieldChange, HistoryEntry, Neighbor, NeighborCreate,
    NeighborUpdate, User, new_id, now_utc,
)

router = APIRouter(tags=["communities"])

WORKER_FIELDS = {"status", "notes"}
DEVICE_NAMES = {"telefono": "teléfono portero", "monitor": "monitor videoportero"}
FIELD_LABELS = {
    "name": "Nombre", "street": "Calle", "unit": "Piso/Puerta", "phone": "Teléfono", "device_type": "Tipo",
    "status": "Estado", "notes": "Notas",
}


def _aware(dt):
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _neighbor(doc: dict) -> Neighbor:
    for k in ("created_at", "updated_at", "installed_at"):
        doc[k] = _aware(doc.get(k))
    return Neighbor(**doc)


async def _get_community_doc(community_id: str) -> dict:
    doc = await db.communities.find_one({"id": community_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Comunidad no encontrada")
    return doc


async def _with_stats(docs: list[dict]) -> list[Community]:
    ids = [d["id"] for d in docs]
    stats: dict[str, dict] = {}
    pipeline = [
        {"$match": {"community_id": {"$in": ids}}},
        {"$group": {
            "_id": "$community_id",
            "total": {"$sum": 1},
            "installed": {"$sum": {"$cond": [{"$eq": ["$status", "instalado"]}, 1, 0]}},
            "pending_telefono": {"$sum": {"$cond": [
                {"$and": [{"$eq": ["$status", "pendiente"]}, {"$eq": ["$device_type", "telefono"]}]}, 1, 0]}},
            "pending_monitor": {"$sum": {"$cond": [
                {"$and": [{"$eq": ["$status", "pendiente"]}, {"$eq": ["$device_type", "monitor"]}]}, 1, 0]}},
        }},
    ]
    async for row in db.neighbors.aggregate(pipeline):
        stats[row["_id"]] = row
    last: dict[str, dict] = {}
    async for row in db.neighbor_history.aggregate([
        {"$match": {"community_id": {"$in": ids}}},
        {"$sort": {"timestamp": -1}},
        {"$group": {"_id": "$community_id", "ts": {"$first": "$timestamp"}, "by": {"$first": "$user_name"}}},
    ]):
        last[row["_id"]] = row
    out = []
    for d in docs:
        s = stats.get(d["id"], {})
        total, installed = s.get("total", 0), s.get("installed", 0)
        lr = last.get(d["id"], {})
        out.append(Community(
            id=d["id"], name=d["name"], address=d.get("address", ""), created_at=_aware(d["created_at"]),
            total=total, installed=installed, pending=total - installed,
            pending_telefono=s.get("pending_telefono", 0), pending_monitor=s.get("pending_monitor", 0),
            last_activity_at=_aware(lr.get("ts")), last_activity_by=lr.get("by"),
        ))
    return out


async def _log(neighbor: dict, user: User, action: str, changes: list[FieldChange]) -> None:
    entry = HistoryEntry(
        id=new_id(), neighbor_id=neighbor["id"], community_id=neighbor["community_id"],
        user_id=user.id, user_name=user.name, action=action, changes=changes, timestamp=now_utc(),
    )
    await db.neighbor_history.insert_one(entry.model_dump())


# ---------- communities ----------
@router.get("/communities", response_model=list[Community])
async def list_communities(_: User = Depends(current_user)):
    docs = await db.communities.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return await _with_stats(docs)


@router.get("/communities/{community_id}", response_model=Community)
async def get_community(community_id: str, _: User = Depends(current_user)):
    doc = await _get_community_doc(community_id)
    return (await _with_stats([doc]))[0]


@router.post("/communities", response_model=Community, status_code=201)
async def create_community(body: CommunityCreate, _: User = Depends(require_admin)):
    doc = {"id": new_id(), "name": body.name.strip(), "address": body.address.strip(), "created_at": now_utc()}
    await db.communities.insert_one(doc)
    return (await _with_stats([doc]))[0]


@router.put("/communities/{community_id}", response_model=Community)
async def update_community(community_id: str, body: CommunityCreate, _: User = Depends(require_admin)):
    doc = await _get_community_doc(community_id)
    updates = {"name": body.name.strip(), "address": body.address.strip()}
    await db.communities.update_one({"id": community_id}, {"$set": updates})
    doc.update(updates)
    return (await _with_stats([doc]))[0]


@router.delete("/communities/{community_id}")
async def delete_community(community_id: str, _: User = Depends(require_admin)):
    await _get_community_doc(community_id)
    await db.communities.delete_one({"id": community_id})
    await db.neighbors.delete_many({"community_id": community_id})
    await db.neighbor_history.delete_many({"community_id": community_id})
    await db.neighbor_photos.delete_many({"community_id": community_id})
    return {"ok": True}


# ---------- neighbors ----------
@router.get("/communities/{community_id}/neighbors", response_model=list[Neighbor])
async def list_neighbors(community_id: str, _: User = Depends(current_user)):
    await _get_community_doc(community_id)
    docs = await db.neighbors.find({"community_id": community_id}, {"_id": 0}).sort([("street", 1), ("unit", 1)]).to_list(5000)
    return [_neighbor(d) for d in docs]


@router.post("/communities/{community_id}/neighbors", response_model=Neighbor, status_code=201)
async def create_neighbor(community_id: str, body: NeighborCreate, user: User = Depends(require_admin)):
    await _get_community_doc(community_id)
    now = now_utc()
    doc = {
        "id": new_id(), "community_id": community_id,
        "name": body.name.strip(), "street": body.street.strip(), "unit": body.unit.strip(),
        "phone": body.phone.strip(), "photo_count": 0,
        "device_type": body.device_type, "status": body.status, "notes": body.notes,
        "created_at": now, "updated_at": now, "updated_by_name": user.name,
        "installed_at": now if body.status == "instalado" else None,
        "installed_by_name": user.name if body.status == "instalado" else None,
    }
    await db.neighbors.insert_one(dict(doc))
    await _log(doc, user, "creado", [])
    return _neighbor(doc)


def _diff(doc: dict, incoming: dict) -> tuple[dict, list[FieldChange]]:
    """Return only the fields that actually change, plus their history entries."""
    updates: dict = {}
    changes: list[FieldChange] = []
    for field, value in incoming.items():
        if isinstance(value, str) and field != "notes":
            value = value.strip()
        old = doc.get(field)
        if old != value:
            updates[field] = value
            changes.append(FieldChange(field=FIELD_LABELS.get(field, field), old=str(old or ""), new=str(value)))
    return updates, changes


def _apply_status(updates: dict, user: User, now) -> str:
    """Stamp installed_at/by when status changes; return the history action."""
    if "status" not in updates:
        return "modificado"
    if updates["status"] == "instalado":
        updates.update({"installed_at": now, "installed_by_name": user.name})
        return "instalado"
    updates.update({"installed_at": None, "installed_by_name": None})
    return "pendiente"


async def _notify_installed(doc: dict, user: User) -> None:
    community = await db.communities.find_one({"id": doc["community_id"]}, {"_id": 0, "name": 1})
    place = " ".join(x for x in (doc.get("street", ""), doc["unit"]) if x)
    notify_others(
        actor_id=user.id,
        title=f"Instalado en {community['name'] if community else 'comunidad'}",
        body=f"{place} · {doc['name']} ({DEVICE_NAMES[doc['device_type']]}) — por {user.name}",
        url=f"/communities/{doc['community_id']}",
    )


@router.patch("/neighbors/{neighbor_id}", response_model=Neighbor)
async def update_neighbor(neighbor_id: str, body: NeighborUpdate, user: User = Depends(current_user)):
    doc = await db.neighbors.find_one({"id": neighbor_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Vecino no encontrado")
    incoming = body.model_dump(exclude_none=True)
    if user.role != "admin" and set(incoming) - WORKER_FIELDS:
        raise HTTPException(status_code=403, detail="Solo puedes cambiar el estado y las notas")
    updates, changes = _diff(doc, incoming)
    if not updates:
        return _neighbor(doc)
    now = now_utc()
    updates.update({"updated_at": now, "updated_by_name": user.name})
    action = _apply_status(updates, user, now)
    await db.neighbors.update_one({"id": neighbor_id}, {"$set": updates})
    doc.update(updates)
    await _log(doc, user, action, changes)
    if action == "instalado":
        await _notify_installed(doc, user)
    return _neighbor(doc)


@router.delete("/neighbors/{neighbor_id}")
async def delete_neighbor(neighbor_id: str, _: User = Depends(require_admin)):
    res = await db.neighbors.delete_one({"id": neighbor_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vecino no encontrado")
    await db.neighbor_history.delete_many({"neighbor_id": neighbor_id})
    await db.neighbor_photos.delete_many({"neighbor_id": neighbor_id})
    return {"ok": True}


@router.get("/neighbors/{neighbor_id}/history", response_model=list[HistoryEntry])
async def neighbor_history(neighbor_id: str, _: User = Depends(current_user)):
    if not await db.neighbors.find_one({"id": neighbor_id}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Vecino no encontrado")
    docs = await db.neighbor_history.find({"neighbor_id": neighbor_id}, {"_id": 0}).sort("timestamp", -1).to_list(500)
    for d in docs:
        d["timestamp"] = _aware(d["timestamp"])
    return [HistoryEntry(**d) for d in docs]
