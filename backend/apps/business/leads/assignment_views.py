"""
Lead Assignment Views — uses LeadAssignmentService
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from core.permissions import require_permission
from core.auth import get_current_user
from core.database import get_database
from apps.authentication.models import User
from .schemas import LeadAssignmentCreate, LeadAssignmentResponse
from .service import lead_assignment_service

router = APIRouter(tags=["assignments"])


async def _enrich_assignment(doc: dict, db) -> LeadAssignmentResponse:
    """Enrich assignment with user name/email and assigned_by name."""
    a = LeadAssignmentResponse(**doc)

    if doc.get("user_id"):
        user = await db.users.find_one(
            {"id": doc["user_id"]},
            {"_id": 0, "first_name": 1, "last_name": 1, "email": 1},
        )
        if user:
            a.user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
            a.user_email = user.get("email")

    if doc.get("assigned_by"):
        assigner = await db.users.find_one(
            {"id": doc["assigned_by"]},
            {"_id": 0, "first_name": 1, "last_name": 1},
        )
        if assigner:
            a.assigned_by_name = f"{assigner.get('first_name', '')} {assigner.get('last_name', '')}".strip()

    return a


async def _create_assignment_notification(db, assigned_user_id: str, lead: dict, assigned_by_name: str):
    """Create an in-app notification for the assigned user."""
    lead_title = lead.get("project_name") or lead.get("source") or "a lead"
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": assigned_user_id,
        "type": "lead_assigned",
        "title": "You have been assigned to a lead",
        "message": f"{assigned_by_name} assigned you to lead: {lead_title}",
        "link": f"/leads/{lead.get('id', '')}",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(notification)
    notification.pop("_id", None)


@router.get("/lead/{lead_id}", response_model=List[LeadAssignmentResponse])
async def get_lead_assignments(
    lead_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get all assignments for a lead, enriched with user details."""
    items = await lead_assignment_service.get_lead_assignments(lead_id)
    db = get_database()
    return [await _enrich_assignment(doc, db) for doc in items]


@router.post("", response_model=LeadAssignmentResponse)
async def create_assignment(
    data: LeadAssignmentCreate,
    current_user: User = Depends(require_permission("leads:assign")),
):
    """Create a new assignment and notify the assigned user."""
    doc = await lead_assignment_service.create_assignment(
        lead_id=data.lead_id,
        user_id=data.user_id,
        assigned_by=current_user.id,
        role=data.role,
        notes=data.notes,
    )
    db = get_database()

    # Send notification to assigned user (fire-and-forget, non-blocking)
    try:
        lead = await db.leads.find_one({"id": data.lead_id}, {"_id": 0, "id": 1, "project_name": 1, "source": 1})
        if lead and data.user_id != current_user.id:
            await _create_assignment_notification(db, data.user_id, lead, current_user.full_name)
    except Exception:
        pass  # Notification failure must not fail assignment

    return await _enrich_assignment(doc, db)


@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: str,
    current_user: User = Depends(require_permission("leads:assign")),
):
    """Soft-delete an assignment."""
    success = await lead_assignment_service.soft_delete(
        assignment_id, user_id=current_user.id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Assignment deleted successfully"}
