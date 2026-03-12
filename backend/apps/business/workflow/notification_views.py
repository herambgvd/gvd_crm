"""
In-App Notification Views
"""

from fastapi import APIRouter, Depends
from datetime import datetime, timezone

from core.auth import get_current_user
from core.database import get_database
from apps.authentication.models import User

router = APIRouter(tags=["notifications"])


@router.get("")
async def get_notifications(
    current_user: User = Depends(get_current_user),
):
    """Get current user's notifications (unread first, max 50)."""
    db = get_database()
    notifications = await db.notifications.find(
        {"user_id": current_user.id},
        {"_id": 0},
    ).sort([("is_read", 1), ("created_at", -1)]).limit(50).to_list(50)
    return notifications


@router.get("/count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
):
    """Get count of unread notifications for current user."""
    db = get_database()
    count = await db.notifications.count_documents(
        {"user_id": current_user.id, "is_read": False}
    )
    return {"unread_count": count}


@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    db = get_database()
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"message": "Marked as read"}


@router.put("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for current user."""
    db = get_database()
    result = await db.notifications.update_many(
        {"user_id": current_user.id, "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"marked_read": result.modified_count}
