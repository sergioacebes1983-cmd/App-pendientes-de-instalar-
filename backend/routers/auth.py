from fastapi import APIRouter, Depends, HTTPException, Response

from lib.auth import clear_session_cookie, current_user, set_session_cookie, user_from_doc, verify_password
from lib.db import db
from models.schemas import LoginRequest, User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=User)
async def login(body: LoginRequest, response: Response):
    doc = await db.users.find_one({"email": body.email.lower()})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    if not doc.get("active", True):
        raise HTTPException(status_code=403, detail="Cuenta desactivada. Contacta con el administrador")
    set_session_cookie(response, doc["id"])
    return user_from_doc(doc)


@router.post("/logout")
async def logout(response: Response):
    clear_session_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=User)
async def me(user: User = Depends(current_user)):
    return user
