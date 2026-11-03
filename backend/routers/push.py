import os

from fastapi import APIRouter, Depends

from lib.auth import current_user
from lib.db import db
from models.schemas import PushPublicKey, PushSubscription, PushUnsubscribe, User, now_utc

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/public-key", response_model=PushPublicKey)
async def public_key(_: User = Depends(current_user)):
    return PushPublicKey(public_key=os.environ["VAPID_PUBLIC_KEY"])


@router.post("/subscribe")
async def subscribe(body: PushSubscription, user: User = Depends(current_user)):
    await db.push_subscriptions.update_one(
        {"endpoint": body.endpoint},
        {"$set": {"endpoint": body.endpoint, "keys": body.keys.model_dump(), "user_id": user.id, "updated_at": now_utc()}},
        upsert=True,
    )
    return {"ok": True}


@router.post("/unsubscribe")
async def unsubscribe(body: PushUnsubscribe, user: User = Depends(current_user)):
    await db.push_subscriptions.delete_one({"endpoint": body.endpoint, "user_id": user.id})
    return {"ok": True}
