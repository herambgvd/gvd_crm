"""
Orders Views — BOQs, Sales Orders, Purchase Orders

All endpoints use service layer with server-side pagination (page/page_size).
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone

from core.permissions import require_permission
from core.database import get_database
from .service import boq_service, sales_order_service, purchase_order_service
from .schemas import (
    BOQCreate, BOQUpdate,
    SalesOrderCreate, SalesOrderUpdate,
    PurchaseOrderCreate, PurchaseOrderUpdate,
)

router = APIRouter(tags=["orders"])


# ─────────────────── BOQ Endpoints ───────────────────

@router.get("/boqs/")
async def get_boqs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    status: Optional[str] = Query(None),
    lead_id: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(require_permission("orders:view")),
):
    """List BOQs with server-side pagination."""
    return await boq_service.list_boqs(
        page=page, page_size=page_size,
        status=status, lead_id=lead_id, entity_id=entity_id, search=search,
    )


@router.get("/boqs/{boq_id}")
async def get_boq(
    boq_id: str,
    current_user=Depends(require_permission("orders:view")),
):
    """Get a single BOQ."""
    boq = await boq_service.get_by_id(boq_id)
    if not boq:
        raise HTTPException(status_code=404, detail="BOQ not found")
    return boq


@router.get("/boqs/{boq_id}/version-history")
async def get_boq_version_history(
    boq_id: str,
    current_user=Depends(require_permission("orders:view")),
):
    """Get version history for a BOQ."""
    boq = await boq_service.get_by_id(boq_id)
    if not boq:
        raise HTTPException(status_code=404, detail="BOQ not found")
    snapshots = await boq_service.get_version_history(boq_id)

    # Transform raw snapshots into the shape the frontend expects
    formatted = []
    for snap in snapshots:
        v_from = int(snap.get("version", 1))
        v_to = v_from + 1
        formatted.append({
            "version_from": v_from,
            "version_to": v_to,
            "timestamp": snap.get("snapshot_at") or snap.get("updated_at", ""),
            "updated_by": snap.get("updated_by_on_save") or snap.get("updated_by", ""),
            "change_summary": f"Updated from v{v_from} to v{v_to}",
            "detailed_changes": [],
            "impact_analysis": None,
            "total_amount": snap.get("total_amount", 0),
            "items_count": len(snap.get("items", [])),
        })

    return {
        "boq_id": boq_id,
        "boq_number": boq.get("boq_number") or boq.get("name", ""),
        "project_name": boq.get("project_name", ""),
        "current_version": boq.get("version", 1),
        "version_history": formatted,
    }


@router.post("/boqs/")
async def create_boq(
    data: BOQCreate,
    current_user=Depends(require_permission("orders:create")),
):
    """Create a new BOQ."""
    return await boq_service.create_boq(
        data.model_dump(exclude_unset=True), user_id=current_user.id,
    )


@router.put("/boqs/{boq_id}")
async def update_boq(
    boq_id: str,
    data: BOQUpdate,
    current_user=Depends(require_permission("orders:edit")),
):
    """Update a BOQ."""
    updated = await boq_service.update_boq(
        boq_id, data.model_dump(exclude_unset=True), user_id=current_user.id,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="BOQ not found")
    return updated


@router.delete("/boqs/{boq_id}")
async def delete_boq(
    boq_id: str,
    current_user=Depends(require_permission("orders:delete")),
):
    """Soft-delete a BOQ."""
    deleted = await boq_service.delete(boq_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="BOQ not found")
    return {"message": "BOQ deleted successfully"}


# ─────────────────── Sales Order Endpoints ───────────────────

@router.get("/sales-orders/stats")
async def get_sales_order_stats(
    current_user=Depends(require_permission("orders:view")),
):
    """Get sales order summary stats."""
    return await sales_order_service.get_stats()


@router.get("/sales-orders/")
async def get_sales_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    status: Optional[str] = Query(None),
    lead_id: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(require_permission("orders:view")),
):
    """List sales orders with server-side pagination."""
    return await sales_order_service.list_sales_orders(
        page=page, page_size=page_size,
        status=status, lead_id=lead_id, entity_id=entity_id, assigned_to=assigned_to, search=search,
    )


@router.get("/sales-orders/preview/{boq_id}")
async def generate_sales_order_preview(
    boq_id: str,
    current_user=Depends(require_permission("orders:view")),
):
    """Generate a sales order preview from a BOQ."""
    boq = await boq_service.get_by_id(boq_id)
    if not boq:
        raise HTTPException(status_code=404, detail="BOQ not found")

    return {
        "boq_id": boq_id,
        "entity_id": boq.get("entity_id"),
        "lead_id": boq.get("lead_id"),
        "items": boq.get("items", []),
        "subtotal": boq.get("subtotal", 0),
        "tax_amount": boq.get("tax_amount", 0),
        "discount_amount": boq.get("discount_amount", 0),
        "total_amount": boq.get("total_amount", 0),
        "terms_and_conditions": boq.get("terms_conditions", ""),
        "notes": boq.get("notes", ""),
    }


@router.post("/sales-orders/generate")
async def generate_sales_order(
    data: dict,
    current_user=Depends(require_permission("orders:create")),
):
    """Generate a sales order from a BOQ."""
    boq_id = data.get("boqId")
    template_id = data.get("templateId")

    if not boq_id:
        raise HTTPException(status_code=400, detail="boqId is required")

    boq = await boq_service.get_by_id(boq_id)
    if not boq:
        raise HTTPException(status_code=404, detail="BOQ not found")

    return await sales_order_service.generate_from_boq(boq, user_id=current_user.id, template_id=template_id)


@router.get("/sales-orders/template/{order_id}")
async def get_sales_order_template(
    order_id: str,
    current_user=Depends(require_permission("orders:view")),
):
    """Get the template associated with a sales order."""
    order = await sales_order_service.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")

    db = get_database()
    template_id = order.get("template_id")
    if template_id:
        template = await db.templates.find_one({"id": template_id}, {"_id": 0})
        if template:
            return template

    default_template = await db.templates.find_one(
        {"is_default": True, "template_type": "sales_order"}, {"_id": 0}
    )
    return default_template or {"message": "No template found", "template_id": None}


@router.get("/sales-orders/{order_id}")
async def get_sales_order(
    order_id: str,
    current_user=Depends(require_permission("orders:view")),
):
    """Get a single sales order."""
    order = await sales_order_service.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    return order


@router.post("/sales-orders/")
async def create_sales_order(
    data: SalesOrderCreate,
    current_user=Depends(require_permission("orders:create")),
):
    """Create a new Proforma Invoice (sales order)."""
    return await sales_order_service.create_sales_order(
        data.model_dump(exclude_unset=True), user_id=current_user.id,
    )


@router.put("/sales-orders/{order_id}")
async def update_sales_order(
    order_id: str,
    data: SalesOrderUpdate,
    current_user=Depends(require_permission("orders:edit")),
):
    """Update a sales order."""
    updated = await sales_order_service.update_sales_order(
        order_id, data.model_dump(exclude_unset=True), user_id=current_user.id,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Sales order not found")
    return updated


@router.delete("/sales-orders/{order_id}")
async def delete_sales_order(
    order_id: str,
    current_user=Depends(require_permission("orders:delete")),
):
    """Soft-delete a sales order."""
    deleted = await sales_order_service.delete(order_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Sales order not found")
    return {"message": "Sales order deleted successfully"}


# ─────────────────── Purchase Order Endpoints ───────────────────

@router.get("/purchase-orders/stats")
async def get_purchase_order_stats(
    current_user=Depends(require_permission("orders:view")),
):
    """Get purchase order summary stats."""
    return await purchase_order_service.get_stats()


@router.get("/purchase-orders/")
async def get_purchase_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(require_permission("orders:view")),
):
    """List purchase orders with server-side pagination."""
    return await purchase_order_service.list_purchase_orders(
        page=page, page_size=page_size,
        status=status, vendor_id=vendor_id, search=search,
    )


@router.get("/purchase-orders/{order_id}")
async def get_purchase_order(
    order_id: str,
    current_user=Depends(require_permission("orders:view")),
):
    """Get a single purchase order."""
    order = await purchase_order_service.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return order


@router.post("/purchase-orders/")
async def create_purchase_order(
    data: PurchaseOrderCreate,
    current_user=Depends(require_permission("orders:create")),
):
    """Create a new purchase order."""
    existing = await purchase_order_service.get_by_field("po_number", data.po_number)
    if existing:
        raise HTTPException(status_code=400, detail="PO number already exists")

    return await purchase_order_service.create_purchase_order(
        data.model_dump(exclude_unset=True), user_id=current_user.id,
    )


@router.put("/purchase-orders/{order_id}")
async def update_purchase_order(
    order_id: str,
    data: PurchaseOrderUpdate,
    current_user=Depends(require_permission("orders:edit")),
):
    """Update a purchase order."""
    updated = await purchase_order_service.update_purchase_order(
        order_id, data.model_dump(exclude_unset=True), user_id=current_user.id,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return updated


@router.delete("/purchase-orders/{order_id}")
async def delete_purchase_order(
    order_id: str,
    current_user=Depends(require_permission("orders:delete")),
):
    """Soft-delete a purchase order."""
    deleted = await purchase_order_service.delete(order_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return {"message": "Purchase order deleted successfully"}