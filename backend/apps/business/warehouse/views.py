from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, Dict, Any
from datetime import datetime

from core.permissions import require_permission
from apps.authentication.models import User
from .schemas import WarehouseCreate, WarehouseUpdate, WarehouseResponse
from .service import warehouse_service

router = APIRouter(tags=["warehouses"])


def _warehouse_response(doc: Dict[str, Any]) -> WarehouseResponse:
    """Convert MongoDB document to WarehouseResponse"""
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    if isinstance(doc.get("updated_at"), str):
        doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    return WarehouseResponse(**doc)


@router.post("/", response_model=WarehouseResponse)
async def create_warehouse(
    warehouse_data: WarehouseCreate,
    current_user: User = Depends(require_permission("inventory:create")),
):
    """Create a new warehouse."""
    # Check unique_id uniqueness
    existing = await warehouse_service.get_by_unique_id(warehouse_data.unique_id)
    if existing:
        raise HTTPException(status_code=400, detail="Warehouse unique_id already exists")
    
    data = warehouse_data.model_dump()
    doc = await warehouse_service.create(data, user_id=current_user.id)
    return _warehouse_response(doc)


@router.get("/")
async def get_warehouses(
    current_user: User = Depends(require_permission("inventory:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
):
    """List all warehouses with pagination and filters."""
    query = {}
    
    if is_active is not None:
        query["is_active"] = is_active
    
    # Add search filter
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"unique_id": {"$regex": search, "$options": "i"}},
            {"manager": {"$regex": search, "$options": "i"}},
        ]
    
    result = await warehouse_service.list(
        query=query,
        page=page,
        page_size=page_size,
    )
    
    result["items"] = [_warehouse_response(doc) for doc in result["items"]]
    return result


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
async def get_warehouse(
    warehouse_id: str,
    current_user: User = Depends(require_permission("inventory:view")),
):
    """Get a single warehouse by ID."""
    doc = await warehouse_service.get_by_id(warehouse_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return _warehouse_response(doc)


@router.put("/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: str,
    warehouse_data: WarehouseUpdate,
    current_user: User = Depends(require_permission("inventory:edit")),
):
    """Update a warehouse."""
    update_dict = warehouse_data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Check unique_id uniqueness if being updated
    if "unique_id" in update_dict:
        existing = await warehouse_service.get_by_unique_id(update_dict["unique_id"])
        if existing and existing["id"] != warehouse_id:
            raise HTTPException(status_code=400, detail="Warehouse unique_id already exists")
    
    doc = await warehouse_service.update(warehouse_id, update_dict, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return _warehouse_response(doc)


@router.delete("/{warehouse_id}")
async def delete_warehouse(
    warehouse_id: str,
    current_user: User = Depends(require_permission("inventory:delete")),
):
    """Soft-delete a warehouse."""
    deleted = await warehouse_service.soft_delete(warehouse_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return {"message": "Warehouse deleted successfully"}
