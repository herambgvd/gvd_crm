"""
Orders Module Service Layer — uses BaseCRUDService for consistent patterns.

Services:
    BOQService            — boqs collection
    SalesOrderService     — sales_orders collection
    PurchaseOrderService  — purchase_orders collection
"""

import uuid
from typing import Any, Dict, List, Optional
from decimal import Decimal
from datetime import datetime, timezone

from core.base_service import BaseCRUDService, serialize_document


def _calculate_totals(items: List[Dict]) -> tuple:
    """Calculate subtotal, tax, discount, and total from line items."""
    subtotal = Decimal("0")
    processed = []
    for item in items:
        qty = item.get("quantity", 0)
        price = Decimal(str(item.get("unit_price", 0)))
        item_total = qty * price
        processed.append({**item, "total_price": float(item_total)})
        subtotal += item_total
    return processed, float(subtotal), 0.0, 0.0, float(subtotal)


# ─────────────────── BOQ Service ───────────────────

class BOQService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="boqs")

    async def create_boq(self, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create BOQ with auto-calculated totals."""
        items = data.get("items", [])
        if items:
            processed, subtotal, tax, discount, total = _calculate_totals(items)
            data["items"] = processed
            data["subtotal"] = subtotal
            data["tax_amount"] = tax
            data["discount_amount"] = discount
            data["total_amount"] = total

        data["status"] = data.get("status", "draft")
        data["version"] = data.get("version", 1)
        return await self.create(data, user_id=user_id)

    async def update_boq(self, boq_id: str, data: Dict[str, Any], user_id: str) -> Optional[Dict[str, Any]]:
        """Update BOQ; recalculate totals if items change."""
        if "items" in data and data["items"]:
            processed, subtotal, tax, discount, total = _calculate_totals(data["items"])
            data["items"] = processed
            data["subtotal"] = subtotal
            data["tax_amount"] = tax
            data["discount_amount"] = discount
            data["total_amount"] = total
        return await self.update(boq_id, data, user_id=user_id)

    async def list_boqs(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        lead_id: Optional[str] = None,
        entity_id: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: int = -1,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if status:
            query["status"] = status
        if lead_id:
            query["lead_id"] = lead_id
        if entity_id:
            query["entity_id"] = entity_id
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"project_name": {"$regex": search, "$options": "i"}},
            ]
        return await self.list(query=query, page=page, page_size=page_size, sort=[(sort_by, sort_order)])


# ─────────────────── Sales Order Service ───────────────────

class SalesOrderService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="sales_orders")

    async def create_sales_order(self, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create sales order with auto-calculated totals."""
        items = data.get("items", [])
        if items:
            processed, subtotal, tax, discount, total = _calculate_totals(items)
            data["items"] = processed
            data["subtotal"] = subtotal
            data["tax_amount"] = tax
            data["discount_amount"] = discount
            data["total_amount"] = total

        data["status"] = data.get("status", "pending")
        data["order_date"] = data.get("order_date") or datetime.now(timezone.utc).isoformat()
        return await self.create(data, user_id=user_id)

    async def generate_from_boq(self, boq: Dict[str, Any], user_id: str, template_id: Optional[str] = None) -> Dict[str, Any]:
        """Generate a sales order from a BOQ document."""
        order_number = f"SO-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        data = {
            "order_number": order_number,
            "boq_id": boq.get("id"),
            "template_id": template_id,
            "entity_id": boq.get("entity_id"),
            "lead_id": boq.get("lead_id"),
            "items": boq.get("items", []),
            "subtotal": boq.get("subtotal", 0),
            "tax_amount": boq.get("tax_amount", 0),
            "discount_amount": boq.get("discount_amount", 0),
            "total_amount": boq.get("total_amount", 0),
            "status": "draft",
        }
        return await self.create(data, user_id=user_id)

    async def update_sales_order(self, order_id: str, data: Dict[str, Any], user_id: str) -> Optional[Dict[str, Any]]:
        """Update sales order; recalculate totals if items change."""
        if "items" in data and data["items"]:
            processed, subtotal, tax, discount, total = _calculate_totals(data["items"])
            data["items"] = processed
            data["subtotal"] = subtotal
            data["tax_amount"] = tax
            data["discount_amount"] = discount
            data["total_amount"] = total
        return await self.update(order_id, data, user_id=user_id)

    async def list_sales_orders(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        entity_id: Optional[str] = None,
        assigned_to: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: int = -1,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if status:
            query["status"] = status
        if entity_id:
            query["entity_id"] = entity_id
        if assigned_to:
            query["assigned_to"] = assigned_to
        if search:
            query["$or"] = [
                {"order_number": {"$regex": search, "$options": "i"}},
                {"notes": {"$regex": search, "$options": "i"}},
            ]
        return await self.list(query=query, page=page, page_size=page_size, sort=[(sort_by, sort_order)])

    async def get_stats(self) -> Dict[str, Any]:
        total = await self.count()
        pending = await self.count({"status": "pending"})
        confirmed = await self.count({"status": "confirmed"})
        processing = await self.count({"status": "processing"})
        shipped = await self.count({"status": "shipped"})
        delivered = await self.count({"status": "delivered"})
        cancelled = await self.count({"status": "cancelled"})
        return {
            "total": total, "pending": pending, "confirmed": confirmed,
            "processing": processing, "shipped": shipped,
            "delivered": delivered, "cancelled": cancelled,
        }


# ─────────────────── Purchase Order Service ───────────────────

class PurchaseOrderService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="purchase_orders")

    async def create_purchase_order(self, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create purchase order with auto-calculated totals."""
        items = data.get("items", [])
        if items:
            processed, subtotal, tax, discount, total = _calculate_totals(items)
            data["items"] = processed
            data["subtotal"] = subtotal
            data["tax_amount"] = tax
            data["discount_amount"] = discount
            data["total_amount"] = total

        data["status"] = data.get("status", "draft")
        data["order_date"] = data.get("order_date") or datetime.now(timezone.utc).isoformat()
        return await self.create(data, user_id=user_id)

    async def update_purchase_order(self, order_id: str, data: Dict[str, Any], user_id: str) -> Optional[Dict[str, Any]]:
        """Update purchase order; recalculate totals if items change."""
        if "items" in data and data["items"]:
            processed, subtotal, tax, discount, total = _calculate_totals(data["items"])
            data["items"] = processed
            data["subtotal"] = subtotal
            data["tax_amount"] = tax
            data["discount_amount"] = discount
            data["total_amount"] = total
        return await self.update(order_id, data, user_id=user_id)

    async def list_purchase_orders(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        vendor_id: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: int = -1,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if status:
            query["status"] = status
        if vendor_id:
            query["vendor_id"] = vendor_id
        if search:
            query["$or"] = [
                {"po_number": {"$regex": search, "$options": "i"}},
                {"notes": {"$regex": search, "$options": "i"}},
            ]
        return await self.list(query=query, page=page, page_size=page_size, sort=[(sort_by, sort_order)])

    async def get_stats(self) -> Dict[str, Any]:
        total = await self.count()
        draft = await self.count({"status": "draft"})
        sent = await self.count({"status": "sent"})
        confirmed = await self.count({"status": "confirmed"})
        received = await self.count({"status": "received"})
        cancelled = await self.count({"status": "cancelled"})
        return {
            "total": total, "draft": draft, "sent": sent,
            "confirmed": confirmed, "received": received,
            "cancelled": cancelled,
        }


# ─────────────────── Singleton Instances ───────────────────

boq_service = BOQService()
sales_order_service = SalesOrderService()
purchase_order_service = PurchaseOrderService()
