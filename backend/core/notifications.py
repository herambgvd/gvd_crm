"""
In-app notification helper — write directly to the notifications collection.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from core.database import get_database


async def create_notification(
    user_id: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    notification_type: str = "info",
):
    """Create a single in-app notification."""
    if not user_id:
        return
    db = get_database()
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "link": link,
        "type": notification_type,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def notify_users(
    user_ids: List[str],
    title: str,
    message: str,
    link: Optional[str] = None,
    notification_type: str = "info",
    exclude_user_id: Optional[str] = None,
):
    """Create notifications for multiple users. Skips the excluded user (usually the actor)."""
    targets = [uid for uid in user_ids if uid and uid != exclude_user_id]
    if not targets:
        return
    db = get_database()
    now = datetime.now(timezone.utc).isoformat()
    docs = [
        {
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "title": title,
            "message": message,
            "link": link,
            "type": notification_type,
            "is_read": False,
            "created_at": now,
        }
        for uid in targets
    ]
    await db.notifications.insert_many(docs)
