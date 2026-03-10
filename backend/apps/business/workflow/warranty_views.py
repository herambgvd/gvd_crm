from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid

from core.auth import get_current_user
from core.permissions import require_permission
from core.database import get_database
from apps.authentication.models import User

router = APIRouter(tags=["warranties"])


class WarrantyCreate(BaseModel):
    product_id: str
    sales_order_id: Optional[str] = None
    serial_number: Optional[str] = None
    warranty_type: str = "manufacturer"
    duration_months: int = Field(..., gt=0)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    terms_conditions: Optional[str] = None


class WarrantyResponse(BaseModel):
    id: str
    product_id: str
    sales_order_id: Optional[str] = None
    serial_number: Optional[str] = None
    warranty_type: str
    duration_months: int
    start_date: datetime
    end_date: Optional[datetime] = None
    status: str = "active"
    terms_conditions: Optional[str] = None
    claim_history: List[Dict[str, Any]] = []
    created_by: str
    created_at: datetime
    updated_at: datetime


def _parse_warranty(w: dict) -> dict:
    for field in ['created_at', 'updated_at', 'start_date', 'end_date']:
        if w.get(field) and isinstance(w[field], str):
            w[field] = datetime.fromisoformat(w[field])
    return w


@router.get("", response_model=List[WarrantyResponse])
async def get_warranties(
    product_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("leads:view"))
):
    """Get all warranties"""
    db = get_database()

    filter_dict = {}
    if product_id:
        filter_dict['product_id'] = product_id
    if status:
        filter_dict['status'] = status

    warranties = await db.warranties.find(filter_dict, {'_id': 0}).sort(
        'created_at', -1
    ).to_list(100)

    result = []
    for w in warranties:
        w = _parse_warranty(w)
        result.append(WarrantyResponse(**w))

    return result


@router.post("", response_model=WarrantyResponse)
async def create_warranty(
    data: WarrantyCreate,
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Create a new warranty"""
    db = get_database()

    now = datetime.now(timezone.utc)
    start = data.start_date or now

    warranty = {
        'id': str(uuid.uuid4()),
        'product_id': data.product_id,
        'sales_order_id': data.sales_order_id,
        'serial_number': data.serial_number,
        'warranty_type': data.warranty_type,
        'duration_months': data.duration_months,
        'start_date': start.isoformat(),
        'end_date': data.end_date.isoformat() if data.end_date else None,
        'status': 'active',
        'terms_conditions': data.terms_conditions,
        'claim_history': [],
        'created_by': current_user.id,
        'created_at': now.isoformat(),
        'updated_at': now.isoformat(),
    }

    await db.warranties.insert_one(warranty)

    warranty = _parse_warranty(warranty)
    return WarrantyResponse(**warranty)
