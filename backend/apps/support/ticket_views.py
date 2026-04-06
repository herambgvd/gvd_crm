"""
Ticket lifecycle endpoints.
These are nested under /support/tickets/{ticket_id}/...

Uses service layer — consistent UUID `id` field pattern (no raw _id).
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from core.permissions import require_permission

from .service import ticket_service

router = APIRouter(tags=["support-tickets"])


# ─────────── Ticket Status PATCH ───────────

class StatusUpdate(BaseModel):
    status: str
    assigned_to: Optional[str] = None


@router.patch("/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    data: StatusUpdate,
    current_user=Depends(require_permission("support:edit")),
):
    """Quick status update (troubleshooting / escalated / resolved)."""
    extra = {}
    if data.assigned_to:
        extra["assigned_to"] = data.assigned_to
    updated = await ticket_service.update_status(
        ticket_id, data.status, user_id=current_user.id, extra=extra,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": f"Ticket status updated to {data.status}"}


# ─────────── Close Ticket ───────────

@router.post("/tickets/{ticket_id}/close")
async def close_ticket(
    ticket_id: str,
    current_user=Depends(require_permission("support:edit")),
):
    """Close a ticket."""
    updated = await ticket_service.update_status(
        ticket_id, "closed", user_id=current_user.id,
        extra={"closed_by": current_user.id},
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket closed successfully"}


# ─────────── Ticket Metrics ───────────

@router.get("/tickets/{ticket_id}/metrics")
async def get_ticket_metrics(
    ticket_id: str,
    current_user=Depends(require_permission("support:view")),
):
    """Get metrics for a ticket."""
    ticket = await ticket_service.get_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    created_at = ticket.get("created_at")
    closed_at = ticket.get("closed_at")
    resolution_time = None
    if created_at and closed_at:
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if isinstance(closed_at, str):
            closed_at = datetime.fromisoformat(closed_at)
        resolution_time = (closed_at - created_at).total_seconds() / 3600

    return {
        "ticket_id": ticket_id,
        "status": ticket.get("status"),
        "priority": ticket.get("priority"),
        "resolution_time_hours": round(resolution_time, 2) if resolution_time else None,
        "has_resolution": ticket.get("resolution") is not None,
    }
