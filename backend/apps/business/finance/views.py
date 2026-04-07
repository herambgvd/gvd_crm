"""
Finance Views — Invoices, Payments, Allocations

All endpoints use service layer with server-side pagination (page/page_size).
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from core.permissions import require_permission
from .service import invoice_service, payment_service, payment_allocation_service
from .schemas import (
    InvoiceCreate, InvoiceUpdate,
    PaymentCreate, PaymentUpdate,
    PaymentAllocationCreate,
)

router = APIRouter()


# ─────────────────── Invoice Endpoints ───────────────────

@router.get("/invoices/stats")
async def get_invoice_stats(
    current_user=Depends(require_permission("finance:view")),
):
    """Get invoice summary stats."""
    return await invoice_service.get_stats()


@router.get("/invoices")
async def get_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(require_permission("finance:view")),
):
    """List invoices with server-side pagination."""
    return await invoice_service.list_invoices(
        page=page, page_size=page_size,
        status=status, entity_id=entity_id, search=search,
    )


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    current_user=Depends(require_permission("finance:view")),
):
    """Get a single invoice."""
    invoice = await invoice_service.get_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("/invoices")
async def create_invoice(
    data: InvoiceCreate,
    current_user=Depends(require_permission("finance:create")),
):
    """Create a new invoice."""
    existing = await invoice_service.get_by_field("invoice_number", data.invoice_number)
    if existing:
        raise HTTPException(status_code=400, detail="Invoice number already exists")

    return await invoice_service.create_invoice(
        data.model_dump(exclude_unset=True), user_id=current_user.id,
    )


@router.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    current_user=Depends(require_permission("finance:edit")),
):
    """Update an invoice."""
    existing = await invoice_service.get_by_id(invoice_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if existing.get("status") not in ("draft", "pending", "sent"):
        restricted = {"items", "currency"}
        update_fields = set(data.model_dump(exclude_unset=True).keys())
        if restricted & update_fields:
            raise HTTPException(status_code=400, detail=f"Cannot update {restricted & update_fields} on {existing['status']} invoice")

    update_dict = data.model_dump(exclude_unset=True)
    updated = await invoice_service.update_invoice(invoice_id, update_dict, user_id=current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return updated


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    current_user=Depends(require_permission("finance:delete")),
):
    """Soft-delete an invoice."""
    invoice = await invoice_service.get_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    allocs = await payment_allocation_service.get_allocations_for_invoice(invoice_id)
    if allocs:
        raise HTTPException(status_code=400, detail="Cannot delete invoice with payment allocations")

    deleted = await invoice_service.delete(invoice_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}


@router.get("/invoices/{invoice_id}/outstanding-amount")
async def get_outstanding_amount(
    invoice_id: str,
    current_user=Depends(require_permission("finance:view")),
):
    """Get outstanding amount for an invoice."""
    invoice = await invoice_service.get_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    total_allocated = await payment_allocation_service.get_total_allocated(invoice_id)
    total_amount = float(invoice.get("total_amount", 0))
    outstanding = total_amount - total_allocated

    return {
        "invoice_id": invoice_id,
        "total_amount": total_amount,
        "allocated_amount": total_allocated,
        "outstanding_amount": outstanding,
        "is_fully_paid": outstanding <= 0,
    }


# ─────────────────── Payment Endpoints ───────────────────

@router.get("/payments/stats")
async def get_payment_stats(
    current_user=Depends(require_permission("finance:view")),
):
    """Get payment summary stats."""
    return await payment_service.get_stats()


@router.get("/payments")
async def get_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(require_permission("finance:view")),
):
    """List payments with server-side pagination."""
    return await payment_service.list_payments(
        page=page, page_size=page_size,
        status=status, entity_id=entity_id,
        payment_method=payment_method, search=search,
    )


@router.get("/payments/{payment_id}")
async def get_payment(
    payment_id: str,
    current_user=Depends(require_permission("finance:view")),
):
    """Get a single payment."""
    payment = await payment_service.get_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.post("/payments")
async def create_payment(
    data: PaymentCreate,
    current_user=Depends(require_permission("finance:create")),
):
    """Create a new payment."""
    existing = await payment_service.get_by_field("payment_reference", data.payment_reference)
    if existing:
        raise HTTPException(status_code=400, detail="Payment reference already exists")

    return await payment_service.create_payment(
        data.model_dump(exclude_unset=True), user_id=current_user.id,
    )


@router.put("/payments/{payment_id}")
async def update_payment(
    payment_id: str,
    data: PaymentUpdate,
    current_user=Depends(require_permission("finance:edit")),
):
    """Update a payment."""
    existing = await payment_service.get_by_id(payment_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Payment not found")

    if existing.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot update completed payment")

    update_dict = data.model_dump(exclude_unset=True)
    updated = await payment_service.update(payment_id, update_dict, user_id=current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Payment not found")
    return updated


@router.delete("/payments/{payment_id}")
async def delete_payment(
    payment_id: str,
    current_user=Depends(require_permission("finance:delete")),
):
    """Soft-delete a payment."""
    payment = await payment_service.get_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot delete completed payment")

    deleted = await payment_service.delete(payment_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment deleted successfully"}


# ─────────────────── Payment Allocation Endpoints ───────────────────

@router.post("/payments/{payment_id}/allocate")
async def allocate_payment(
    payment_id: str,
    data: PaymentAllocationCreate,
    current_user=Depends(require_permission("finance:edit")),
):
    """Allocate a payment to an invoice."""
    payment = await payment_service.get_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    invoice = await invoice_service.get_by_id(data.invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if float(data.allocated_amount) > float(payment.get("amount", 0)):
        raise HTTPException(status_code=400, detail="Allocation amount cannot exceed payment amount")

    alloc_data = {
        "payment_id": payment_id,
        **data.model_dump(),
    }
    return await payment_allocation_service.create_allocation(alloc_data, user_id=current_user.id)