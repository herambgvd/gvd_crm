"""
Lead Assignment Views — uses LeadAssignmentService
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from core.permissions import require_permission
from apps.authentication.models import User
from .schemas import LeadAssignmentCreate, LeadAssignmentResponse
from .service import lead_assignment_service

router = APIRouter(tags=["assignments"])


@router.get("/lead/{lead_id}", response_model=List[LeadAssignmentResponse])
async def get_lead_assignments(
    lead_id: str,
    current_user: User = Depends(require_permission("leads:view")),
):
    """Get all assignments for a lead."""
    items = await lead_assignment_service.get_lead_assignments(lead_id)
    return [LeadAssignmentResponse(**doc) for doc in items]


@router.post("", response_model=LeadAssignmentResponse)
async def create_assignment(
    data: LeadAssignmentCreate,
    current_user: User = Depends(require_permission("leads:assign")),
):
    """Create a new assignment."""
    doc = await lead_assignment_service.create_assignment(
        lead_id=data.lead_id,
        user_id=data.user_id,
        assigned_by=current_user.id,
        role=data.role,
        notes=data.notes,
    )
    return LeadAssignmentResponse(**doc)


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
