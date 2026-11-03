"""Auth helpers: bcrypt hashing, JWT in an httpOnly cookie, principal dependencies.

RBAC only (one shared company): roles are `admin` and `trabajador`. The principal is
re-read from Mongo on every request so deactivation / role change applies immediately.
"""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response

from lib.db import db
from models.schemas import User

COOKIE = "session"
TTL_DAYS = 7
ALGO = "HS256"


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except ValueError:
        return False


def set_session_cookie(response: Response, user_id: str) -> None:
    exp = datetime.now(timezone.utc) + timedelta(days=TTL_DAYS)
    token = jwt.encode({"sub": user_id, "exp": exp}, os.environ["JWT_SECRET"], algorithm=ALGO)
    response.set_cookie(
        COOKIE, token, httponly=True, samesite="lax", secure=False,
        max_age=TTL_DAYS * 86400, path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE, path="/")


def user_from_doc(doc: dict) -> User:
    created = doc["created_at"]
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return User(
        id=doc["id"], email=doc["email"], name=doc["name"], role=doc["role"],
        active=doc.get("active", True), created_at=created,
    )


async def current_user(request: Request) -> User:
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sesión no válida")
    doc = await db.users.find_one({"id": payload.get("sub")})
    if not doc or not doc.get("active", True):
        raise HTTPException(status_code=401, detail="Usuario no válido o desactivado")
    return user_from_doc(doc)


async def require_admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    return user
