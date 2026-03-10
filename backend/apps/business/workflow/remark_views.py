from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid

from core.auth import get_current_user
from core.permissions import require_permission
from core.database import get_database
from apps.authentication.models import User

router = APIRouter(tags=["remarks"])


class RemarkCreateRequest(BaseModel):
    content: str = Field(..., min_length=1)
    lead_id: Optional[str] = None
    entity_type: str = "lead"
    entity_id: Optional[str] = None
    type: str = "general"
    is_important: bool = False
    title: Optional[str] = None
    category: Optional[str] = "general"
    tags: List[str] = Field(default_factory=list)


class RemarkUpdateRequest(BaseModel):
    content: Optional[str] = None
    type: Optional[str] = None
    is_important: Optional[bool] = None
    title: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


@router.get("/lead/{lead_id}")
async def get_lead_remarks(
    lead_id: str,
    current_user: User = Depends(require_permission("leads:view"))
):
    """Get all remarks for a lead"""
    db = get_database()

    remarks = await db.remarks.find(
        {'entity_type': 'lead', 'entity_id': lead_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)

    result = []
    for remark in remarks:
        if isinstance(remark.get('created_at'), str):
            remark['created_at'] = datetime.fromisoformat(remark['created_at'])
        if isinstance(remark.get('updated_at'), str):
            remark['updated_at'] = datetime.fromisoformat(remark['updated_at'])
        result.append(remark)

    return result


@router.post("")
async def create_remark(
    data: RemarkCreateRequest,
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Create a new remark"""
    db = get_database()

    entity_id = data.entity_id or data.lead_id or ''

    remark = {
        'id': str(uuid.uuid4()),
        'content': data.content,
        'entity_type': data.entity_type,
        'entity_id': entity_id,
        'type': data.type,
        'is_important': data.is_important,
        'title': data.title,
        'category': data.category or 'general',
        'tags': data.tags,
        'author_id': current_user.id,
        'author_name': current_user.full_name,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }

    await db.remarks.insert_one(remark)

    remark['created_at'] = datetime.fromisoformat(remark['created_at'])
    remark['updated_at'] = datetime.fromisoformat(remark['updated_at'])
    return remark


@router.put("/{remark_id}")
async def update_remark(
    remark_id: str,
    data: RemarkUpdateRequest,
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Update a remark"""
    db = get_database()

    update_dict = data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()

    result = await db.remarks.update_one(
        {'id': remark_id},
        {'$set': update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Remark not found")

    updated = await db.remarks.find_one({'id': remark_id}, {'_id': 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return updated


@router.delete("/{remark_id}")
async def delete_remark(
    remark_id: str,
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Delete a remark"""
    db = get_database()

    result = await db.remarks.delete_one({'id': remark_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Remark not found")

    return {"message": "Remark deleted successfully"}
