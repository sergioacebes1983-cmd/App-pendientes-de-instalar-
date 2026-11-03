from fastapi import APIRouter, Depends, HTTPException

from lib.auth import hash_password, require_admin, user_from_doc
from lib.db import db
from models.schemas import User, UserCreate, UserUpdate, new_id, now_utc

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[User])
async def list_users(_: User = Depends(require_admin)):
    docs = await db.users.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return [user_from_doc(d) for d in docs]


@router.post("", response_model=User, status_code=201)
async def create_user(body: UserCreate, _: User = Depends(require_admin)):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email")
    doc = {
        "id": new_id(), "email": email, "name": body.name.strip(), "role": body.role,
        "active": True, "password_hash": hash_password(body.password), "created_at": now_utc(),
    }
    await db.users.insert_one(doc)
    return user_from_doc(doc)


@router.patch("/{user_id}", response_model=User)
async def update_user(user_id: str, body: UserUpdate, admin: User = Depends(require_admin)):
    doc = await db.users.find_one({"id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user_id == admin.id and (body.active is False or body.role == "trabajador"):
        raise HTTPException(status_code=400, detail="No puedes desactivarte ni quitarte el rol de administrador")
    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name.strip()
    if body.role is not None:
        updates["role"] = body.role
    if body.active is not None:
        updates["active"] = body.active
    if body.password:
        updates["password_hash"] = hash_password(body.password)
    if updates:
        await db.users.update_one({"id": user_id}, {"$set": updates})
        doc.update(updates)
    return user_from_doc(doc)
