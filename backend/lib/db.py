"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "users": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("email", ASCENDING)], name="email", unique=True),
    ],
    "communities": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "neighbors": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("community_id", ASCENDING), ("unit", ASCENDING)], name="community_unit"),
        IndexModel([("community_id", ASCENDING), ("street", ASCENDING), ("unit", ASCENDING)], name="community_street_unit"),
    ],
    "neighbor_photos": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("neighbor_id", ASCENDING), ("created_at", DESCENDING)], name="neighbor_created"),
        IndexModel([("community_id", ASCENDING)], name="community"),
        IndexModel([("community_id", ASCENDING), ("neighbor_id", ASCENDING), ("street", ASCENDING), ("created_at", DESCENDING)], name="community_scope"),
    ],
    "weekly_reports": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("week_start", DESCENDING)], name="week_start", unique=True),
    ],
    "cron_runs": [
        IndexModel([("run_id", ASCENDING)], name="run_id", unique=True),
        IndexModel([("at", ASCENDING)], name="at_ttl", expireAfterSeconds=60 * 60 * 24 * 60),
    ],
    "push_subscriptions": [
        IndexModel([("endpoint", ASCENDING)], name="endpoint", unique=True),
        IndexModel([("user_id", ASCENDING)], name="user"),
    ],
    "neighbor_history": [
        IndexModel([("neighbor_id", ASCENDING), ("timestamp", DESCENDING)], name="neighbor_ts"),
        IndexModel([("community_id", ASCENDING), ("timestamp", DESCENDING)], name="community_ts"),
    ],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
