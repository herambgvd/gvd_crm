"""
Customer Master Views — CRUD for the dedicated 'customers' MongoDB collection.
Customers are end-clients, completely separate from the entities collection.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from core.auth import get_current_user
from core.permissions import require_permission
from core.database import get_database
from apps.authentication.models import User

from apps.customers.schemas import CustomerCreate, CustomerUpdate
from apps.customers.service import customer_service

router = APIRouter(tags=["customers"])


@router.get("")
async def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("customers:view")),
):
    result = await customer_service.list_customers(
        page=page,
        page_size=page_size,
        status=status,
        search=search,
        city=city,
        state=state,
    )

    db = get_database()
    for item in result["items"]:
        if item.get("created_by"):
            user = await db.users.find_one(
                {"id": item["created_by"]},
                {"_id": 0, "first_name": 1, "last_name": 1},
            )
            item["created_by_name"] = (
                f"{user['first_name']} {user['last_name']}" if user else None
            )

    return result


@router.get("/search")
async def search_customers(
    q: str = Query("", min_length=0),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_permission("customers:view")),
):
    return await customer_service.search_customers(q, limit)


@router.get("/{customer_id}")
async def get_customer(
    customer_id: str,
    current_user: User = Depends(require_permission("customers:view")),
):
    customer = await customer_service.get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("")
async def create_customer(
    data: CustomerCreate,
    current_user: User = Depends(require_permission("customers:create")),
):
    doc = data.model_dump()
    doc["created_by"] = current_user.id
    return await customer_service.create(doc)


@router.put("/{customer_id}")
async def update_customer(
    customer_id: str,
    data: CustomerUpdate,
    current_user: User = Depends(require_permission("customers:edit")),
):
    existing = await customer_service.get_by_id(customer_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = data.model_dump(exclude_unset=True)
    return await customer_service.update(customer_id, update_data, current_user.id)


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    current_user: User = Depends(require_permission("customers:delete")),
):
    existing = await customer_service.get_by_id(customer_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")

    deleted = await customer_service.soft_delete(customer_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}
