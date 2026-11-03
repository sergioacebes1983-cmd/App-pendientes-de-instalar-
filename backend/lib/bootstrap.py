"""Idempotent seed: admin + demo worker if no users; demo communities if none exist."""

from lib.auth import hash_password
from lib.db import db
from models.schemas import new_id, now_utc

ADMIN = ("admin@telecom.es", "Administrador", "Admin123!", "admin")
WORKER = ("tecnico@telecom.es", "Carlos Técnico", "Tecnico123!", "trabajador")

DEMO = {
    "Comunidad Los Olivos 14": ("C/ Los Olivos 14, Madrid", [
        ("María García", "Bajo A", "600111222", "telefono"),
        ("José Martínez", "1º B", "600333444", "monitor"),
        ("Lucía Fernández", "2º A", "", "telefono"),
        ("Antonio López", "3º C", "611222333", "monitor"),
    ]),
    "Edificio Mirador del Parque": ("Av. del Parque 22, Madrid", [
        ("Elena Sánchez", "1º A", "622111000", "monitor"),
        ("Pedro Gómez", "1º B", "", "monitor"),
        ("Carmen Ruiz", "Ático C", "633444555", "telefono"),
    ]),
    "Residencial Las Acacias": ("C/ Acacias 5, Barcelona", [
        ("Javier Díaz", "Bajo Izq", "644555666", "telefono"),
        ("Ana Moreno", "2º D", "", "telefono"),
    ]),
}


async def seed_if_empty() -> None:
    if await db.users.count_documents({}) == 0:
        for email, name, pw, role in (ADMIN, WORKER):
            await db.users.insert_one({
                "id": new_id(), "email": email, "name": name, "role": role, "active": True,
                "password_hash": hash_password(pw), "created_at": now_utc(),
            })
    if await db.communities.count_documents({}) == 0:
        for cname, (addr, neighbors) in DEMO.items():
            cid = new_id()
            now = now_utc()
            await db.communities.insert_one({"id": cid, "name": cname, "address": addr, "created_at": now})
            for name, unit, phone, dtype in neighbors:
                await db.neighbors.insert_one({
                    "id": new_id(), "community_id": cid, "name": name, "unit": unit, "phone": phone,
                    "device_type": dtype, "status": "pendiente", "notes": "",
                    "created_at": now, "updated_at": now, "updated_by_name": "Administrador",
                    "installed_at": None, "installed_by_name": None,
                })
