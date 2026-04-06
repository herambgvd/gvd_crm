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
    KnowledgeBaseArticleCreate,
)
from .service import (
    ticket_service,
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
    """Get a single ticket (detail view)."""
    ticket = await ticket_service.get_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"ticket": ticket}


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
