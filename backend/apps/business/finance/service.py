"""
Finance Module Service Layer — uses BaseCRUDService for consistent patterns.

Services:
    InvoiceService           — invoices collection
    PaymentService           — payments collection
    PaymentAllocationService — payment_allocations collection
    TaxConfigurationService  — tax_configurations collection
"""

from typing import Any, Dict, List, Optional
from decimal import Decimal
from datetime import datetime, timezone

from core.base_service import BaseCRUDService, serialize_document
from core.database import get_database


# ─────────────────── Invoice Service ───────────────────

class InvoiceService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="invoices")

    def _calculate_totals(self, items: List[Dict]) -> tuple:
        """Calculate subtotal, tax, and total from line items."""
        subtotal = Decimal("0")
        total_tax = Decimal("0")
        processed_items = []

        for item in items:
            qty = item.get("quantity", 0)
            price = Decimal(str(item.get("unit_price", 0)))
            tax_rate = Decimal(str(item.get("tax_rate", 0)))

            item_total = qty * price
            tax_amount = item_total * (tax_rate / 100)

            processed_items.append({
                **item,
                "total_price": float(item_total),
                "tax_amount": float(tax_amount),
            })
            subtotal += item_total
            total_tax += tax_amount

        return processed_items, float(subtotal), float(total_tax), float(subtotal + total_tax)

    async def create_invoice(self, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create invoice with auto-calculated totals."""
        items = data.get("items", [])
        if items:
            processed_items, subtotal, tax_amount, total_amount = self._calculate_totals(items)
            data["items"] = processed_items
            data["subtotal"] = subtotal
            data["tax_amount"] = tax_amount
            data["discount_amount"] = 0
            data["total_amount"] = total_amount

        data["status"] = data.get("status", "draft")
        data["issue_date"] = data.get("issue_date") or datetime.now(timezone.utc).isoformat()
        return await self.create(data, user_id=user_id)

    async def update_invoice(self, invoice_id: str, data: Dict[str, Any], user_id: str) -> Optional[Dict[str, Any]]:
        """Update invoice; recalculate totals if items change."""
        if "items" in data and data["items"]:
            processed_items, subtotal, tax_amount, total_amount = self._calculate_totals(data["items"])
            data["items"] = processed_items
            data["subtotal"] = subtotal
            data["tax_amount"] = tax_amount
            data["total_amount"] = total_amount

        return await self.update(invoice_id, data, user_id=user_id)

    async def list_invoices(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        entity_id: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: int = -1,
    ) -> Dict[str, Any]:
        """List invoices with filters and server-side pagination."""
        query: Dict[str, Any] = {}
        if status:
            query["status"] = status
        if entity_id:
            query["entity_id"] = entity_id
        if search:
            query["$or"] = [
                {"invoice_number": {"$regex": search, "$options": "i"}},
                {"notes": {"$regex": search, "$options": "i"}},
            ]
        return await self.list(query=query, page=page, page_size=page_size, sort=[(sort_by, sort_order)])

    async def get_stats(self) -> Dict[str, Any]:
        """Invoice summary stats."""
        total = await self.count()
        draft = await self.count({"status": "draft"})
        sent = await self.count({"status": "sent"})
        paid = await self.count({"status": "paid"})
        overdue = await self.count({"status": "overdue"})
        cancelled = await self.count({"status": "cancelled"})
        return {"total": total, "draft": draft, "sent": sent, "paid": paid, "overdue": overdue, "cancelled": cancelled}


# ─────────────────── Payment Service ───────────────────

class PaymentService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="payments")

    async def create_payment(self, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create a new payment."""
        data["status"] = data.get("status", "pending")
        data["payment_date"] = data.get("payment_date") or datetime.now(timezone.utc).isoformat()
        return await self.create(data, user_id=user_id)

    async def list_payments(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        entity_id: Optional[str] = None,
        payment_method: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: int = -1,
    ) -> Dict[str, Any]:
        """List payments with filters and server-side pagination."""
        query: Dict[str, Any] = {}
        if status:
            query["status"] = status
        if entity_id:
            query["entity_id"] = entity_id
        if payment_method:
            query["payment_method"] = payment_method
        if search:
            query["$or"] = [
                {"payment_reference": {"$regex": search, "$options": "i"}},
                {"transaction_id": {"$regex": search, "$options": "i"}},
                {"notes": {"$regex": search, "$options": "i"}},
            ]
        return await self.list(query=query, page=page, page_size=page_size, sort=[(sort_by, sort_order)])

    async def get_stats(self) -> Dict[str, Any]:
        """Payment summary stats."""
        total = await self.count()
        pending = await self.count({"status": "pending"})
        completed = await self.count({"status": "completed"})
        failed = await self.count({"status": "failed"})
        refunded = await self.count({"status": "refunded"})
        return {"total": total, "pending": pending, "completed": completed, "failed": failed, "refunded": refunded}


# ─────────────────── Payment Allocation Service ───────────────────

class PaymentAllocationService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="payment_allocations")

    async def create_allocation(self, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create a payment allocation."""
        data["allocation_date"] = datetime.now(timezone.utc).isoformat()
        return await self.create(data, user_id=user_id)

    async def get_allocations_for_invoice(self, invoice_id: str) -> List[Dict[str, Any]]:
        """Get all allocations for an invoice."""
        return await self.find_many(query={"invoice_id": invoice_id})

    async def get_total_allocated(self, invoice_id: str) -> float:
        """Sum allocated amounts for an invoice."""
        allocations = await self.get_allocations_for_invoice(invoice_id)
        return sum(float(a.get("allocated_amount", 0)) for a in allocations)


# ─────────────────── Tax Configuration Service ───────────────────

class TaxConfigurationService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="tax_configurations")

    async def list_active(self) -> List[Dict[str, Any]]:
        """List active tax configurations."""
        return await self.find_many(query={"is_active": True}, sort=[("name", 1)])


# ─────────────────── Singleton Instances ───────────────────

invoice_service = InvoiceService()
payment_service = PaymentService()
payment_allocation_service = PaymentAllocationService()
tax_configuration_service = TaxConfigurationService()
