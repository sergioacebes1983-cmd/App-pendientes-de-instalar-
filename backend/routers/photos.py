"""Installation photos (stored in Mongo, client resizes before upload) + Excel export."""

import io
import re
from pathlib import Path
from typing import Optional
from datetime import timezone
from zoneinfo import ZoneInfo

from bson import Binary
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from lib.auth import current_user
from lib.db import db
from models.schemas import FieldChange, HistoryEntry, Photo, User, new_id, now_utc

router = APIRouter(tags=["photos"])

MAX_BYTES = 8 * 1024 * 1024
ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MADRID = ZoneInfo("Europe/Madrid")


def _photo(doc: dict) -> Photo:
    doc = {k: v for k, v in doc.items() if k != "data"}
    if doc["created_at"].tzinfo is None:
        doc["created_at"] = doc["created_at"].replace(tzinfo=timezone.utc)
    return Photo(**doc)


async def _log(neighbor: dict, user: User, action: str, note: str) -> None:
    entry = HistoryEntry(
        id=new_id(), neighbor_id=neighbor["id"], community_id=neighbor["community_id"],
        user_id=user.id, user_name=user.name, action=action,
        changes=[FieldChange(field="Fotos", old=None, new=note)], timestamp=now_utc(),
    )
    await db.neighbor_history.insert_one(entry.model_dump())


@router.get("/neighbors/{neighbor_id}/photos", response_model=list[Photo])
async def list_photos(neighbor_id: str, _: User = Depends(current_user)):
    docs = await db.neighbor_photos.find({"neighbor_id": neighbor_id}, {"_id": 0, "data": 0}).sort("created_at", -1).to_list(200)
    return [_photo(d) for d in docs]


async def _read_images(files: list[UploadFile]) -> list[tuple[str, bytes]]:
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Máximo 10 fotos a la vez")
    out = []
    for f in files:
        ctype = (f.content_type or "").lower()
        if ctype not in ALLOWED:
            raise HTTPException(status_code=400, detail="Solo se admiten imágenes (JPG, PNG, WEBP, HEIC)")
        data = await f.read()
        if len(data) > MAX_BYTES:
            raise HTTPException(status_code=400, detail="La foto supera 8 MB")
        out.append((ctype, data))
    return out


async def _store(images: list[tuple[str, bytes]], user: User, **scope) -> list[Photo]:
    created = []
    for ctype, data in images:
        doc = {
            "id": new_id(), **scope, "uploaded_by_id": user.id, "uploaded_by_name": user.name,
            "content_type": ctype, "size": len(data), "created_at": now_utc(), "data": Binary(data),
        }
        await db.neighbor_photos.insert_one(doc)
        created.append(_photo(doc))
    return created


@router.post("/neighbors/{neighbor_id}/photos", response_model=list[Photo], status_code=201)
async def upload_photos(neighbor_id: str, files: list[UploadFile] = File(...), user: User = Depends(current_user)):
    neighbor = await db.neighbors.find_one({"id": neighbor_id}, {"_id": 0})
    if not neighbor:
        raise HTTPException(status_code=404, detail="Vecino no encontrado")
    images = await _read_images(files)
    created = await _store(images, user, neighbor_id=neighbor_id, community_id=neighbor["community_id"])
    await db.neighbors.update_one({"id": neighbor_id}, {"$inc": {"photo_count": len(created)}})
    await _log(neighbor, user, "foto", f"{len(created)} añadida(s)")
    return created


# ---------- community-level photos (general or per street) ----------
@router.get("/communities/{community_id}/photos", response_model=list[Photo])
async def list_community_photos(community_id: str, street: Optional[str] = None, _: User = Depends(current_user)):
    query: dict = {"community_id": community_id, "neighbor_id": None}
    if street is not None:
        query["street"] = street.strip()
    docs = await db.neighbor_photos.find(query, {"_id": 0, "data": 0}).sort("created_at", -1).to_list(500)
    return [_photo(d) for d in docs]


@router.post("/communities/{community_id}/photos", response_model=list[Photo], status_code=201)
async def upload_community_photos(
    community_id: str,
    files: list[UploadFile] = File(...),
    street: str = Form(default="", max_length=150),
    user: User = Depends(current_user),
):
    if not await db.communities.find_one({"id": community_id}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Comunidad no encontrada")
    images = await _read_images(files)
    return await _store(images, user, neighbor_id=None, street=street.strip(), community_id=community_id)


@router.get("/photos/{photo_id}")
async def get_photo(photo_id: str, _: User = Depends(current_user)):
    doc = await db.neighbor_photos.find_one({"id": photo_id}, {"_id": 0, "data": 1, "content_type": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    return Response(content=bytes(doc["data"]), media_type=doc["content_type"],
                    headers={"Cache-Control": "private, max-age=86400"})


@router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, user: User = Depends(current_user)):
    doc = await db.neighbor_photos.find_one({"id": photo_id}, {"_id": 0, "data": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    if user.role != "admin" and doc["uploaded_by_id"] != user.id:
        raise HTTPException(status_code=403, detail="Solo puedes borrar tus propias fotos")
    await db.neighbor_photos.delete_one({"id": photo_id})
    if not doc.get("neighbor_id"):
        return {"ok": True}
    await db.neighbors.update_one({"id": doc["neighbor_id"]}, {"$inc": {"photo_count": -1}})
    neighbor = await db.neighbors.find_one({"id": doc["neighbor_id"]}, {"_id": 0})
    if neighbor:
        await _log(neighbor, user, "foto_borrada", "1 eliminada")
    return {"ok": True}


# ---------- Excel export ----------
HEAD_FILL = PatternFill("solid", fgColor="002D44")
HEAD_FONT = Font(bold=True, color="FFFFFF")
ORANGE = "E8781E"
DEVICE = {"telefono": "Teléfono portero", "monitor": "Monitor videoportero"}
LOGO_PATH = Path(__file__).resolve().parent.parent / "lib" / "fermy-logo.png"
COMPANY_LINE = "Fermy · Instalaciones de telecomunicaciones · Valladolid"
HEADER_ROW = 6


def _fmt(dt) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(MADRID).strftime("%d/%m/%Y %H:%M")


def _sheet(ws, title: str, community: dict, headers: list[str], rows: list[list], widths: list[int]) -> None:
    last_col = get_column_letter(len(headers))
    # Branded header block: logo (rows 1-2), company + community + summary lines.
    if LOGO_PATH.exists():
        img = XLImage(str(LOGO_PATH))
        img.height = 40
        img.width = int(40 * 520 / 111)
        ws.add_image(img, "A1")
    ws.row_dimensions[1].height = 22
    ws.row_dimensions[2].height = 22
    ws["D1"] = COMPANY_LINE
    ws["D1"].font = Font(bold=True, color="002D44", size=11)
    ws["D2"] = f"Generado: {now_utc().astimezone(MADRID).strftime('%d/%m/%Y %H:%M')}"
    ws["D2"].font = Font(color="64748B", size=9)
    ws["A3"] = community["name"]
    ws["A3"].font = Font(bold=True, size=16, color="002D44")
    ws.row_dimensions[3].height = 26
    sub = " · ".join(x for x in (community.get("address", ""), f"{title}: {len(rows)}") if x)
    ws["A4"] = sub
    ws["A4"].font = Font(color=ORANGE, bold=True, size=11)
    for col in range(1, len(headers) + 1):
        ws.cell(row=5, column=col).border = Border(bottom=Side(style="medium", color=ORANGE))

    for i, h in enumerate(headers, start=1):
        cell = ws.cell(row=HEADER_ROW, column=i, value=h)
        cell.fill, cell.font = HEAD_FILL, HEAD_FONT
        cell.alignment = Alignment(vertical="center")
    ws.row_dimensions[HEADER_ROW].height = 20
    for r_i, r in enumerate(rows, start=HEADER_ROW + 1):
        for c_i, v in enumerate(r, start=1):
            ws.cell(row=r_i, column=c_i, value=v)
    for i, w in enumerate(widths):
        ws.column_dimensions[get_column_letter(i + 1)].width = w
    ws.freeze_panes = f"A{HEADER_ROW + 1}"
    if rows:
        ws.auto_filter.ref = f"A{HEADER_ROW}:{last_col}{HEADER_ROW + len(rows)}"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = f"{HEADER_ROW}:{HEADER_ROW}"


@router.get("/communities/{community_id}/export")
async def export_community(community_id: str, _: User = Depends(current_user)):
    community = await db.communities.find_one({"id": community_id}, {"_id": 0})
    if not community:
        raise HTTPException(status_code=404, detail="Comunidad no encontrada")
    neighbors = await db.neighbors.find({"community_id": community_id}, {"_id": 0}).sort([("street", 1), ("unit", 1)]).to_list(5000)
    pending = [n for n in neighbors if n["status"] == "pendiente"]
    installed = [n for n in neighbors if n["status"] == "instalado"]

    wb = Workbook()
    ws = wb.active
    ws.title = "Pendientes"
    _sheet(ws, "Pendientes", community, ["Calle", "Piso/Puerta", "Vecino", "Teléfono", "Falta instalar", "Notas"],
           [[n.get("street", ""), n["unit"], n["name"], n.get("phone", ""), DEVICE[n["device_type"]], n.get("notes", "")] for n in pending],
           [28, 12, 28, 16, 22, 40])
    ws2 = wb.create_sheet("Instalados")
    _sheet(ws2, "Instalados", community, ["Calle", "Piso/Puerta", "Vecino", "Teléfono", "Instalado", "Instalado por", "Fecha instalación", "Fotos", "Notas"],
           [[n.get("street", ""), n["unit"], n["name"], n.get("phone", ""), DEVICE[n["device_type"]],
             n.get("installed_by_name") or "", _fmt(n.get("installed_at")), n.get("photo_count", 0), n.get("notes", "")] for n in installed],
           [28, 12, 28, 16, 22, 22, 18, 8, 40])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    safe = re.sub(r"[^A-Za-z0-9_-]+", "_", community["name"]).strip("_") or "comunidad"
    filename = f"{safe}_{now_utc().astimezone(MADRID).strftime('%Y-%m-%d')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
