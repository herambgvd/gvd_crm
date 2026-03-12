"""
Lead Involvement Views — uses LeadInvolvementService
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from core.permissions import require_permission
from core.auth import get_current_user
from core.database import get_database
from apps.authentication.models import User
from .schemas import (
    LeadInvolvementCreate,
    LeadInvolvementUpdate,
    LeadInvolvementResponse,
)
from .service import lead_involvement_service, lead_service


class BusinessModelLink(BaseModel):
    business_model_type: str  # "boq", "sales_order", "purchase_order", etc.
    business_model_id: str


router = APIRouter(tags=["lead-involvements"])


@router.get("/lead/{lead_id}", response_model=List[LeadInvolvementResponse])
async def get_lead_involvements(
    lead_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get all involvements for a lead, enriched with entity names."""
    items = await lead_involvement_service.get_lead_involvements(lead_id)
    db = get_database()
    result = []
    for doc in items:
        inv = LeadInvolvementResponse(**doc)
        entity = await db.entities.find_one({"id": doc.get("entity_id")}, {"_id": 0})
        if entity:
            inv.entity_name = entity.get("company_name")
            inv.entity_city = entity.get("city")
        result.append(inv)
    return result


@router.post("", response_model=LeadInvolvementResponse)
async def create_lead_involvement(
    data: LeadInvolvementCreate,
    current_user: User = Depends(require_permission("leads:edit")),
):
    """Create a new lead involvement."""
    # Verify lead exists
    lead = await lead_service.get_by_id(data.lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    involvement_data = data.model_dump()
    doc = await lead_involvement_service.create(involvement_data, user_id=current_user.id)
    return LeadInvolvementResponse(**doc)


@router.put("/{involvement_id}", response_model=LeadInvolvementResponse)
async def update_lead_involvement(
    involvement_id: str,
    data: LeadInvolvementUpdate,
    current_user: User = Depends(require_permission("leads:edit")),
):
    """Update a lead involvement."""
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    doc = await lead_involvement_service.update(
        involvement_id, update_data, user_id=current_user.id
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Involvement not found")
    return LeadInvolvementResponse(**doc)


@router.delete("/{involvement_id}")
async def delete_lead_involvement(
    involvement_id: str,
    current_user: User = Depends(require_permission("leads:edit")),
):
    """Soft-delete a lead involvement."""
    success = await lead_involvement_service.soft_delete(
        involvement_id, user_id=current_user.id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Involvement not found")
    return {"message": "Involvement deleted successfully"}


@router.post("/{involvement_id}/link-business-model")
async def link_business_model(
    involvement_id: str,
    data: BusinessModelLink,
    current_user: User = Depends(require_permission("leads:edit")),
):
    """Link a business model to a lead involvement."""
    db = get_database()

    involvement = await lead_involvement_service.get_by_id(involvement_id)
    if not involvement:
        raise HTTPException(status_code=404, detail="Involvement not found")

    link = {
        "business_model_type": data.business_model_type,
        "business_model_id": data.business_model_id,
        "linked_at": datetime.now(timezone.utc).isoformat(),
        "linked_by": current_user.id,
    }

    await db.lead_involvements.update_one(
        {"id": involvement_id}, {"$push": {"business_models": link}}
    )
    return {"message": "Business model linked successfully"}


@router.delete("/{involvement_id}/unlink-business-model")
async def unlink_business_model(
    involvement_id: str,
    data: BusinessModelLink,
    current_user: User = Depends(require_permission("leads:edit")),
):
    """Unlink a business model from a lead involvement."""
    involvement = await lead_involvement_service.get_by_id(involvement_id)
    if not involvement:
        raise HTTPException(status_code=404, detail="Involvement not found")

    db = get_database()
    await db.lead_involvements.update_one(
        {"id": involvement_id},
        {
            "$pull": {
                "business_models": {
                    "business_model_type": data.business_model_type,
                    "business_model_id": data.business_model_id,
                }
            }
        },
    )
    return {"message": "Business model unlinked successfully"}
