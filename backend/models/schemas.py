"""Pydantic models — mirrored by hand in frontend/src/lib/types.ts."""

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

Role = Literal["admin", "trabajador"]
DeviceType = Literal["telefono", "monitor"]
Status = Literal["pendiente", "instalado"]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- users ----------
class User(BaseModel):
    id: str
    email: str
    name: str
    role: Role
    active: bool = True
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=6, max_length=128)
    role: Role = "trabajador"


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    role: Optional[Role] = None
    active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)


# ---------- communities ----------
class CommunityCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    address: str = Field(default="", max_length=250)


class Community(BaseModel):
    id: str
    name: str
    address: str = ""
    created_at: datetime
    total: int = 0
    installed: int = 0
    pending: int = 0
    pending_telefono: int = 0
    pending_monitor: int = 0
    last_activity_at: Optional[datetime] = None
    last_activity_by: Optional[str] = None


# ---------- neighbors ----------
class NeighborCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    street: str = Field(default="", max_length=150)
    unit: str = Field(min_length=1, max_length=50)
    phone: str = Field(default="", max_length=30)
    device_type: DeviceType = "telefono"
    status: Status = "pendiente"
    notes: str = Field(default="", max_length=1000)


class NeighborUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    street: Optional[str] = Field(default=None, max_length=150)
    unit: Optional[str] = Field(default=None, min_length=1, max_length=50)
    phone: Optional[str] = Field(default=None, max_length=30)
    device_type: Optional[DeviceType] = None
    status: Optional[Status] = None
    notes: Optional[str] = Field(default=None, max_length=1000)


class Neighbor(BaseModel):
    id: str
    community_id: str
    name: str
    street: str = ""
    unit: str
    phone: str = ""
    device_type: DeviceType
    status: Status
    notes: str = ""
    created_at: datetime
    updated_at: datetime
    updated_by_name: str
    installed_at: Optional[datetime] = None
    installed_by_name: Optional[str] = None
    photo_count: int = 0


class FieldChange(BaseModel):
    field: str
    old: Optional[str] = None
    new: Optional[str] = None


class HistoryEntry(BaseModel):
    id: str
    neighbor_id: str
    community_id: str
    user_id: str
    user_name: str
    action: Literal["creado", "modificado", "instalado", "pendiente", "foto", "foto_borrada"]
    changes: list[FieldChange] = []
    timestamp: datetime


# ---------- photos ----------
class Photo(BaseModel):
    id: str
    neighbor_id: Optional[str] = None  # None → community-level photo
    street: Optional[str] = None       # community-level only: "" = general, else street name
    community_id: str
    uploaded_by_id: str
    uploaded_by_name: str
    content_type: str
    size: int
    created_at: datetime


# ---------- push ----------
class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscription(BaseModel):
    endpoint: str = Field(min_length=10, max_length=2000)
    expirationTime: Optional[int] = None
    keys: PushKeys


class PushUnsubscribe(BaseModel):
    endpoint: str


class PushPublicKey(BaseModel):
    public_key: str
