"""
Support module — main CRUD endpoints.

Uses service layer (BaseCRUDService) with server-side pagination.
All endpoints require appropriate permissions.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone

from core.permissions import require_permission

from .schemas import (
    TicketCreate, TicketUpdate,
    IssueCreate, IssueUpdate,
    EscalationCreate, EscalationUpdate,
    ResolutionCreate, ResolutionUpdate,
    CustomerFeedbackCreate, CustomerFeedbackUpdate,
    KnowledgeBaseArticleCreate,
)
from .service import (
    ticket_service,
    issue_logging_service,
    escalation_service,
    resolution_service,
    customer_feedback_service,
    knowledge_base_service,
)

router = APIRouter()


# ─────────────────── Tickets ───────────────────

@router.get("/tickets")
async def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sop_id: Optional[str] = Query(None),
    current_state_id: Optional[str] = Query(None),
    current_user=Depends(require_permission("support:view")),
):
    """List tickets with server-side pagination, search & filters."""
    return await ticket_service.list_tickets(
        page=page,
        page_size=page_size,
        status=status,
        priority=priority,
        assigned_to=assigned_to,
        category=category,
        search=search,
        sop_id=sop_id,
        current_state_id=current_state_id,
        current_user_id=current_user.id,
        is_superuser=current_user.is_superuser,
    )


@router.get("/tickets/stats")
async def get_ticket_stats(
    current_user=Depends(require_permission("support:view")),
):
    """Get ticket statistics for dashboard cards."""
    return await ticket_service.get_stats()


@router.get("/tickets/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    current_user=Depends(require_permission("support:view")),
):
    """Get a single ticket with all sub-resources (detail view)."""
    result = await ticket_service.get_ticket_with_sub_resources(ticket_id)
    if not result:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return result


@router.post("/tickets")
async def create_ticket(
    data: TicketCreate,
    current_user=Depends(require_permission("support:create")),
):
    """Create a new support ticket."""
    doc = await ticket_service.create_ticket(
        data=data.model_dump(exclude_unset=True),
        user_id=current_user.id,
    )
    return doc


@router.put("/tickets/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    data: TicketUpdate,
    current_user=Depends(require_permission("support:edit")),
):
    """Update an existing ticket."""
    update_dict = data.model_dump(exclude_unset=True)
    # If resolving/closing, set closed_at
    if update_dict.get("status") in ("resolved", "closed"):
        update_dict.setdefault("closed_at", datetime.now(timezone.utc).isoformat())
    updated = await ticket_service.update(ticket_id, update_dict, user_id=current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return updated


@router.delete("/tickets/{ticket_id}")
async def delete_ticket(
    ticket_id: str,
    current_user=Depends(require_permission("support:delete")),
):
    """Soft-delete a ticket."""
    deleted = await ticket_service.delete(ticket_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket deleted successfully"}


# ─────────────────── Issues ───────────────────

@router.get("/issues")
async def list_issues(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(require_permission("support:view")),
):
    """List issues with pagination."""
    return await issue_logging_service.list_issues(
        page=page, page_size=page_size,
        severity=severity, status=status, search=search,
    )


@router.post("/issues")
async def create_issue(
    data: IssueCreate,
    current_user=Depends(require_permission("support:create")),
):
    """Create a new issue."""
    return await issue_logging_service.create_issue(
        data=data.model_dump(exclude_unset=True),
        user_id=current_user.id,
    )


@router.put("/issues/{issue_id}")
async def update_issue(
    issue_id: str,
    data: IssueUpdate,
    current_user=Depends(require_permission("support:edit")),
):
    """Update an issue."""
    updated = await issue_logging_service.update(
        issue_id, data.model_dump(exclude_unset=True), user_id=current_user.id
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Issue not found")
    return updated


@router.delete("/issues/{issue_id}")
async def delete_issue(
    issue_id: str,
    current_user=Depends(require_permission("support:delete")),
):
    """Soft-delete an issue."""
    deleted = await issue_logging_service.delete(issue_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {"message": "Issue deleted successfully"}


# ─────────────────── Escalations ───────────────────

@router.get("/escalations")
async def list_escalations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    escalation_level: Optional[int] = Query(None, ge=1, le=5),
    current_user=Depends(require_permission("support:view")),
):
    """List escalations with pagination."""
    return await escalation_service.list_escalations(
        page=page, page_size=page_size,
        status=status, escalation_level=escalation_level,
    )


@router.post("/escalations")
async def create_escalation(
    data: EscalationCreate,
    current_user=Depends(require_permission("support:escalate")),
):
    """Create a new escalation."""
    return await escalation_service.create_escalation(
        data=data.model_dump(exclude_unset=True),
        user_id=current_user.id,
    )


@router.put("/escalations/{escalation_id}")
async def update_escalation(
    escalation_id: str,
    data: EscalationUpdate,
    current_user=Depends(require_permission("support:edit")),
):
    """Update an escalation."""
    updated = await escalation_service.update(
        escalation_id, data.model_dump(exclude_unset=True), user_id=current_user.id
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Escalation not found")
    return updated


# ─────────────────── Resolutions ───────────────────

@router.get("/resolutions")
async def list_resolutions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ticket_id: Optional[str] = Query(None),
    resolution_type: Optional[str] = Query(None),
    current_user=Depends(require_permission("support:view")),
):
    """List resolutions with pagination."""
    return await resolution_service.list_resolutions(
        page=page, page_size=page_size,
        ticket_id=ticket_id, resolution_type=resolution_type,
    )


@router.post("/resolutions")
async def create_resolution(
    data: ResolutionCreate,
    current_user=Depends(require_permission("support:edit")),
):
    """Create a resolution."""
    return await resolution_service.create_resolution(
        data=data.model_dump(exclude_unset=True),
        user_id=current_user.id,
    )


@router.put("/resolutions/{resolution_id}")
async def update_resolution(
    resolution_id: str,
    data: ResolutionUpdate,
    current_user=Depends(require_permission("support:edit")),
):
    """Update a resolution."""
    updated = await resolution_service.update(
        resolution_id, data.model_dump(exclude_unset=True), user_id=current_user.id
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Resolution not found")
    return updated


# ─────────────────── Feedback ───────────────────

@router.get("/feedback")
async def list_feedback(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    feedback_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(require_permission("support:view")),
):
    """List customer feedback with pagination."""
    return await customer_feedback_service.list_feedback(
        page=page, page_size=page_size,
        feedback_type=feedback_type, status=status, search=search,
    )


@router.post("/feedback")
async def create_feedback(
    data: CustomerFeedbackCreate,
    current_user=Depends(require_permission("support:create")),
):
    """Create customer feedback."""
    doc = data.model_dump(exclude_unset=True)
    doc["status"] = "new"
    return await customer_feedback_service.create(doc, user_id=current_user.id)


@router.put("/feedback/{feedback_id}")
async def update_feedback(
    feedback_id: str,
    data: CustomerFeedbackUpdate,
    current_user=Depends(require_permission("support:edit")),
):
    """Update customer feedback."""
    updated = await customer_feedback_service.update(
        feedback_id, data.model_dump(exclude_unset=True), user_id=current_user.id
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return updated


# ─────────────────── Knowledge Base ───────────────────

@router.get("/knowledge-base")
async def list_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(require_permission("support:view")),
):
    """List knowledge base articles."""
    return await knowledge_base_service.list_articles(
        page=page, page_size=page_size,
        category=category, search=search,
    )


@router.post("/knowledge-base")
async def create_article(
    data: KnowledgeBaseArticleCreate,
    current_user=Depends(require_permission("support:create")),
):
    """Create a knowledge base article."""
    doc = data.model_dump(exclude_unset=True)
    doc.update({"view_count": 0, "helpful_votes": 0, "not_helpful_votes": 0})
    return await knowledge_base_service.create(doc, user_id=current_user.id)