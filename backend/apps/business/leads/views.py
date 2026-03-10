"""
Lead Management Views — uses LeadService for all operations
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from core.permissions import require_permission
from apps.authentication.models import User
from .schemas import LeadCreate, LeadUpdate, LeadResponse
from .service import lead_service

router = APIRouter(tags=["leads"])


def _lead_response(doc: dict) -> LeadResponse:
    """Convert a service document to a LeadResponse."""
    return LeadResponse(**doc)


# ── CRUD ──

@router.post("/", response_model=LeadResponse)
async def create_lead(
    lead_data: LeadCreate,
    current_user: User = Depends(require_permission("leads:create")),
):
    """Create a new lead."""
    data = lead_data.model_dump()
    doc = await lead_service.create(data, user_id=current_user.id)
    return _lead_response(doc)


@router.get("/")
async def get_leads(
    current_user: User = Depends(require_permission("leads:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    channel: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: int = Query(-1, ge=-1, le=1, description="-1 desc, 1 asc"),
):
    """List leads with server-side pagination and filtering."""
    result = await lead_service.list_leads(
        page=page,
        page_size=page_size,
        status=status,
        channel=channel,
        priority=priority,
        assigned_to=assigned_to,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    result["items"] = [_lead_response(doc) for doc in result["items"]]
    return result


@router.get("/stats")
async def get_lead_stats(
    current_user: User = Depends(require_permission("leads:view")),
):
    """Get lead statistics for dashboard."""
    return await lead_service.get_stats()


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    current_user: User = Depends(require_permission("leads:view")),
):
    """Get a specific lead by ID."""
    doc = await lead_service.get_by_id(lead_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _lead_response(doc)


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    lead_data: LeadUpdate,
    current_user: User = Depends(require_permission("leads:edit")),
):
    """Update a lead."""
    update_data = lead_data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    doc = await lead_service.update(lead_id, update_data, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _lead_response(doc)


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    current_user: User = Depends(require_permission("leads:delete")),
):
    """Soft-delete a lead."""
    success = await lead_service.soft_delete(lead_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted successfully"}