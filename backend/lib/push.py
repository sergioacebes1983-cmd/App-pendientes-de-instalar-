"""Web Push (VAPID) delivery. Subscriptions live in `push_subscriptions`, one doc per device endpoint."""

import asyncio
import json
import logging
import os

from pywebpush import WebPushException, webpush

from lib.db import db

logger = logging.getLogger(__name__)
_tasks: set[asyncio.Task] = set()


def _send(sub: dict, payload: str) -> int | None:
    try:
        webpush(
            subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
            data=payload,
            vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
            vapid_claims={"sub": os.environ.get("VAPID_SUBJECT", "mailto:avisos@portero-control.app")},
            ttl=60 * 60 * 12,
        )
        return None
    except WebPushException as exc:
        status = exc.response.status_code if exc.response is not None else None
        logger.warning("push failed status=%s", status)
        return status
    except Exception as exc:  # never let one bad subscription break the loop
        logger.warning("push error: %s", exc)
        return None


async def _notify(actor_id: str, payload: dict) -> None:
    data = json.dumps(payload)
    async for sub in db.push_subscriptions.find({"user_id": {"$ne": actor_id}}, {"_id": 0}):
        user = await db.users.find_one({"id": sub["user_id"]}, {"_id": 0, "active": 1})
        if not user or not user.get("active", True):
            continue
        status = await asyncio.to_thread(_send, sub, data)
        if status in (404, 410):
            await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})


def notify_others(*, actor_id: str, title: str, body: str, url: str) -> None:
    """Fire-and-forget: notify every subscribed device except the actor's."""
    payload = {"title": title, "body": body, "url": url, "tag": f"inst-{url}"}
    task = asyncio.create_task(_notify(actor_id, payload))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
