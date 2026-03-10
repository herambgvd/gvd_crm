"""
Ticket lifecycle and sub-resource endpoints.
These are nested under /support/tickets/{ticket_id}/...

Uses service layer — consistent UUID `id` field pattern (no raw _id).
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from core.permissions import require_permission

from .service import (
    ticket_service,
    issue_logging_service,
    escalation_service,
    resolution_service,
    troubleshooting_service,
    customer_feedback_service,
    system_environment_service,
)
from .schemas import (
    IssueCreate, IssueUpdate,
    EscalationCreate, EscalationUpdate,
    ResolutionCreate, ResolutionUpdate,
    TroubleshootingActionCreate,
    CustomerFeedbackCreate, CustomerFeedbackUpdate,
    SystemEnvironmentCreate, SystemEnvironmentUpdate,
)

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


# ─────────── Request Customer Feedback ───────────

@router.post("/tickets/{ticket_id}/request-feedback")
async def request_customer_feedback(
    ticket_id: str,
    current_user=Depends(require_permission("support:edit")),
):
    """Request customer feedback for a resolved ticket."""
    updated = await ticket_service.update(
        ticket_id,
        {
            "status": "customer_feedback",
            "feedback_requested": True,
            "feedback_requested_at": datetime.now(timezone.utc).isoformat(),
            "feedback_requested_by": current_user.id,
        },
        user_id=current_user.id,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Customer feedback requested"}


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

    actions_count = await troubleshooting_service.count({"ticket_id": ticket_id})
    escalations_count = await escalation_service.count({"ticket_id": ticket_id})

    return {
        "ticket_id": ticket_id,
        "status": ticket.get("status"),
        "priority": ticket.get("priority"),
        "resolution_time_hours": round(resolution_time, 2) if resolution_time else None,
        "troubleshooting_actions_count": actions_count,
        "escalations_count": escalations_count,
        "has_resolution": ticket.get("resolution") is not None,
        "feedback_requested": ticket.get("feedback_requested", False),
    }


# ─────────── Issue Logging (nested) ───────────

@router.post("/tickets/{ticket_id}/issue-logging")
async def create_issue_logging(
    ticket_id: str,
    data: IssueCreate,
    current_user=Depends(require_permission("support:edit")),
):
    """Create issue logging entry for a ticket."""
    doc = data.model_dump(exclude_unset=True)
    doc["ticket_id"] = ticket_id
    return await issue_logging_service.create_issue(doc, user_id=current_user.id)


@router.put("/tickets/{ticket_id}/issue-logging/{logging_id}")
async def update_issue_logging(
    ticket_id: str,
    logging_id: str,
    data: IssueUpdate,
    current_user=Depends(require_permission("support:edit")),
):
    """Update issue logging entry."""
    updated = await issue_logging_service.update(
        logging_id, data.model_dump(exclude_unset=True), user_id=current_user.id,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Issue logging entry not found")
    return updated


# ─────────── System Environment (nested) ───────────

@router.post("/tickets/{ticket_id}/system-environment")
async def create_system_environment(
    ticket_id: str,
    data: SystemEnvironmentCreate,
    current_user=Depends(require_permission("support:edit")),
):
    """Create system environment entry for a ticket."""
    doc = data.model_dump(exclude_unset=True)
    doc["ticket_id"] = ticket_id
    doc["is_active"] = True
    return await system_environment_service.create(doc, user_id=current_user.id)


@router.put("/tickets/{ticket_id}/system-environment/{env_id}")
async def update_system_environment(
    ticket_id: str,
    env_id: str,
    data: SystemEnvironmentUpdate,
    current_user=Depends(require_permission("support:edit")),
):
    """Update system environment entry."""
    updated = await system_environment_service.update(
        env_id, data.model_dump(exclude_unset=True), user_id=current_user.id,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="System environment not found")
    return updated


# ─────────── Troubleshooting Actions (nested) ───────────

@router.get("/tickets/{ticket_id}/troubleshooting-actions")
async def get_troubleshooting_actions(
    ticket_id: str,
    current_user=Depends(require_permission("support:view")),
):
    """Get troubleshooting actions for a ticket."""
    result = await troubleshooting_service.list_actions(ticket_id=ticket_id)
    return result.get("items", [])


@router.post("/tickets/{ticket_id}/troubleshooting-actions")
async def create_troubleshooting_action(
    ticket_id: str,
    data: TroubleshootingActionCreate,
    current_user=Depends(require_permission("support:edit")),
):
    """Create troubleshooting action for a ticket."""
    doc = data.model_dump(exclude_unset=True)
    doc["ticket_id"] = ticket_id
    return await troubleshooting_service.create_action(doc, user_id=current_user.id)


# ─────────── Escalations (nested) ───────────

@router.post("/tickets/{ticket_id}/escalations")
async def create_ticket_escalation(
    ticket_id: str,
    data: EscalationCreate,
    current_user=Depends(require_permission("support:escalate")),
):
    """Create escalation for a ticket and set ticket status to escalated."""
    doc = data.model_dump(exclude_unset=True)
    doc["ticket_id"] = ticket_id
    result = await escalation_service.create_escalation(doc, user_id=current_user.id)

    # Update ticket status to escalated
    await ticket_service.update_status(
        ticket_id, "escalated", user_id=current_user.id,
    )
    return result


@router.put("/tickets/{ticket_id}/escalations/{escalation_id}")
async def update_ticket_escalation(
    ticket_id: str,
    escalation_id: str,
    data: EscalationUpdate,
    current_user=Depends(require_permission("support:edit")),
):
    """Update escalation for a ticket."""
    updated = await escalation_service.update(
        escalation_id, data.model_dump(exclude_unset=True), user_id=current_user.id,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Escalation not found")
    return updated


# ─────────── Resolution (nested) ───────────

@router.post("/tickets/{ticket_id}/resolution")
async def create_ticket_resolution(
    ticket_id: str,
    data: ResolutionCreate,
    current_user=Depends(require_permission("support:edit")),
):
    """Create resolution for a ticket and mark ticket as resolved."""
    doc = data.model_dump(exclude_unset=True)
    doc["ticket_id"] = ticket_id
    result = await resolution_service.create_resolution(doc, user_id=current_user.id)

    # Update ticket to resolved
    await ticket_service.update(
        ticket_id,
        {
            "status": "resolved",
            "resolution": data.description,
            "resolution_date": datetime.now(timezone.utc).isoformat(),
            "closed_at": datetime.now(timezone.utc).isoformat(),
        },
        user_id=current_user.id,
    )
    return result


# ─────────── Customer Feedback (nested) ───────────

@router.post("/tickets/{ticket_id}/customer-feedback")
async def create_ticket_feedback(
    ticket_id: str,
    data: CustomerFeedbackCreate,
    current_user=Depends(require_permission("support:create")),
):
    """Create customer feedback for a ticket."""
    doc = data.model_dump(exclude_unset=True)
    doc["ticket_id"] = ticket_id
    doc["status"] = "new"
    return await customer_feedback_service.create(doc, user_id=current_user.id)


@router.put("/tickets/{ticket_id}/customer-feedback/{feedback_id}")
async def update_ticket_feedback(
    ticket_id: str,
    feedback_id: str,
    data: CustomerFeedbackUpdate,
    current_user=Depends(require_permission("support:edit")),
):
    """Update customer feedback for a ticket."""
    updated = await customer_feedback_service.update(
        feedback_id, data.model_dump(exclude_unset=True), user_id=current_user.id,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return updated
