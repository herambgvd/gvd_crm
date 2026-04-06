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

import re

from core.base_service import BaseCRUDService, serialize_document
from core.database import get_database


def _calculate_totals(items: List[Dict], tax_percentage: float = 0) -> tuple:
    """Calculate subtotal, tax, discount, and total from line items.
    Uses selling price (price) when set, falls back to unit_price."""
    subtotal = 0.0
    processed = []
    for item in items:
        qty = item.get("quantity", 0) or 0
        # Use selling price if set and non-zero, otherwise fall back to unit_price
        selling_price = float(item.get("price") or item.get("unit_price") or 0)
        item_total = qty * selling_price
        processed.append({**item, "total_price": item_total})
        subtotal += item_total
    tax_amount = round(subtotal * tax_percentage / 100, 2)
    total = round(subtotal + tax_amount, 2)
    return processed, round(subtotal, 2), tax_amount, 0.0, total


# ─────────────────── BOQ Service ───────────────────

class BOQService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="boqs")

    async def create_boq(self, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create BOQ with auto-calculated totals."""
        items = data.get("items", [])
        tax_pct = float(data.get("tax_percentage", 0) or 0)
        if items:
            processed, subtotal, tax, discount, total = _calculate_totals(items, tax_pct)
            data["items"] = processed
            data["subtotal"] = subtotal
            data["tax_amount"] = tax
            data["discount_amount"] = discount
            data["total_amount"] = total

        # Auto-generate name if not provided
        if not data.get("name"):
            data["name"] = f"BOQ-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

        data["status"] = data.get("status", "draft")
        data["version"] = data.get("version", 1)
        boq = await self.create(data, user_id=user_id)

        # Update LeadInvolvement.assigned_boqs if involvement_id is set
        involvement_id = data.get("involvement_id")
        if involvement_id and boq.get("id"):
            db = get_database()
            await db.lead_involvements.update_one(
                {"id": involvement_id},
                {"$addToSet": {"assigned_boqs": boq["id"]}},
            )

        return boq

    async def update_boq(self, boq_id: str, data: Dict[str, Any], user_id: str) -> Optional[Dict[str, Any]]:
        """Update BOQ; snapshot current version, recalculate totals if items or tax change."""
        # Fetch current state for version snapshot
        current = await self.get_by_id(boq_id)
        if not current:
            return None

        items = data.get("items")
        if items is not None:
            tax_pct = float(data.get("tax_percentage", 0) or 0)
            if not tax_pct:
                tax_pct = float(current.get("tax_percentage", 0))
            processed, subtotal, tax, discount, total = _calculate_totals(items, tax_pct)
            data["items"] = processed
            data["subtotal"] = subtotal
            data["tax_amount"] = tax
            data["discount_amount"] = discount
            data["total_amount"] = total
        elif "tax_percentage" in data:
            tax_pct = float(data["tax_percentage"] or 0)
            _, subtotal, tax, discount, total = _calculate_totals(current.get("items", []), tax_pct)
            data["subtotal"] = subtotal
            data["tax_amount"] = tax
            data["discount_amount"] = discount
            data["total_amount"] = total

        # Snapshot current state into boq_versions before applying update
        db = get_database()
        snapshot = {k: v for k, v in current.items() if k != "_id"}
        snapshot["boq_id"] = boq_id
        snapshot["snapshot_at"] = datetime.now(timezone.utc).isoformat()
        snapshot["updated_by_on_save"] = user_id
        await db.boq_versions.insert_one(snapshot)

        # Increment version number
        data["version"] = int(current.get("version", 1)) + 1

        return await self.update(boq_id, data, user_id=user_id)

    async def get_version_history(self, boq_id: str) -> List[Dict[str, Any]]:
        """Return version history for a BOQ from the boq_versions collection."""
        db = get_database()
        cursor = db.boq_versions.find(
            {"boq_id": boq_id}, {"_id": 0}
        ).sort("version", -1)
        versions = await cursor.to_list(length=100)
        return versions

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
        current_user_id: Optional[str] = None,
        is_superuser: bool = True,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}

        # Access restriction: team-based data access control
        from core.data_access import build_access_query, merge_access_filter
        if current_user_id:
            access_filter = await build_access_query(current_user_id, is_superuser)
            query = merge_access_filter(query, access_filter)
        if status:
            query["status"] = status
        if lead_id:
            query["lead_id"] = lead_id
        if entity_id:
            query["entity_id"] = entity_id
        if search:
            escaped = re.escape(search)
            query["$or"] = [
                {"name": {"$regex": escaped, "$options": "i"}},
                {"description": {"$regex": escaped, "$options": "i"}},
                {"project_name": {"$regex": escaped, "$options": "i"}},
            ]
        return await self.list(query=query, page=page, page_size=page_size, sort=[(sort_by, sort_order)])


# ─────────────────── Sales Order Service ───────────────────

class SalesOrderService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="sales_orders")

    async def create_sales_order(self, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create Proforma Invoice with auto-calculated totals."""
        items = data.get("items", [])
        tax_pct = float(data.get("tax_percentage", 0) or 0)
        if items:
            processed, subtotal, tax, discount, total = _calculate_totals(items, tax_pct)
            data["items"] = processed
            data["subtotal"] = subtotal
            data["tax_amount"] = tax
            data["discount_amount"] = discount
            data["total_amount"] = total

        # Auto-generate pi_number if not provided
        if not data.get("pi_number"):
            data["pi_number"] = f"PI-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        data["order_number"] = data.get("order_number") or data["pi_number"]

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
            current = await self.get_by_id(order_id)
            tax_pct = float(
                data["tax_percentage"] if data.get("tax_percentage") is not None
                else (current.get("tax_percentage", 0) if current else 0)
            )
            processed, subtotal, tax, discount, total = _calculate_totals(data["items"], tax_pct)
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
        lead_id: Optional[str] = None,
        entity_id: Optional[str] = None,
        assigned_to: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: int = -1,
        current_user_id: Optional[str] = None,
        is_superuser: bool = True,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}

        # Access restriction: team-based data access control
        from core.data_access import build_access_query, merge_access_filter
        if current_user_id:
            access_filter = await build_access_query(current_user_id, is_superuser)
            query = merge_access_filter(query, access_filter)
        if status:
            query["status"] = status
        if lead_id:
            query["lead_id"] = lead_id
        if entity_id:
            query["entity_id"] = entity_id
        if assigned_to:
            query["assigned_to"] = assigned_to
        if search:
            escaped = re.escape(search)
            query["$or"] = [
                {"order_number": {"$regex": escaped, "$options": "i"}},
                {"notes": {"$regex": escaped, "$options": "i"}},
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
        current_user_id: Optional[str] = None,
        is_superuser: bool = True,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}

        # Access restriction: team-based data access control
        from core.data_access import build_access_query, merge_access_filter
        if current_user_id:
            access_filter = await build_access_query(current_user_id, is_superuser)
            query = merge_access_filter(query, access_filter)
        if status:
            query["status"] = status
        if vendor_id:
            query["vendor_id"] = vendor_id
        if search:
            escaped = re.escape(search)
            query["$or"] = [
                {"po_number": {"$regex": escaped, "$options": "i"}},
                {"notes": {"$regex": escaped, "$options": "i"}},
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
