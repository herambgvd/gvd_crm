"""
Inventory Management Service Layer

Business logic for all inventory operations using BaseCRUDService pattern
"""

from typing import Any, Dict, List, Optional
from decimal import Decimal
from datetime import datetime, timezone
import uuid

from core.base_service import BaseCRUDService, serialize_document
from core.database import get_database
from core.pagination import paginate

# Import product service for stock updates
from apps.business.products.service import ProductService

from .models import (
    FactoryOrderStatus,
    InTransitStatus,
    StockType,
    StockMovementType,
    RMAStatus,
)


# ─────────────────── Helper Functions ───────────────────

async def get_product_info(product_id: str) -> Optional[Dict[str, Any]]:
    """Get product name, SKU, and category from products collection"""
    db = get_database()
    product = await db.products.find_one(
        {"id": product_id, "is_deleted": {"$ne": True}},
        {"_id": 0, "id": 1, "name": 1, "sku": 1, "category": 1, "cost_price": 1}
    )
    return product


async def get_entity_info(entity_id: str) -> Optional[Dict[str, Any]]:
    """Get entity name from entities collection"""
    db = get_database()
    entity = await db.entities.find_one(
        {"id": entity_id, "is_deleted": {"$ne": True}},
        {"_id": 0, "id": 1, "name": 1}
    )
    return entity


async def get_user_name(user_id: str) -> Optional[str]:
    """Get user's full name from users collection"""
    db = get_database()
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "full_name": 1, "username": 1}
    )
    if user:
        return user.get("full_name") or user.get("username")
    return None


async def generate_number(prefix: str, collection_name: str, field: str) -> str:
    """Generate sequential number like FO-2026-0001 using atomic counter (race-condition safe)"""
    db = get_database()
    year = datetime.now().year
    counter_key = f"{prefix}-{year}"
    result = await db.counters.find_one_and_update(
        {"_id": counter_key},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return f"{prefix}-{year}-{result['seq']:04d}"


# ─────────────────── Factory Order Service ───────────────────

class FactoryOrderService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="factory_orders")

    async def create_order(
        self,
        data: Dict[str, Any],
        user_id: str,
    ) -> Dict[str, Any]:
        """Create a new factory order with product info enrichment"""
        
        # Generate order number if not provided
        if not data.get("order_number"):
            data["order_number"] = await generate_number("FO", "factory_orders", "order_number")
        
        # Enrich items with product info and calculate totals
        items = data.get("items", [])
        subtotal = Decimal("0")
        
        enriched_items = []
        for item in items:
            product = await get_product_info(item["product_id"])
            if not product:
                raise ValueError(f"Product not found: {item['product_id']}")
            
            unit_price = Decimal(str(item.get("unit_price", 0)))
            quantity = item.get("quantity_ordered", 0)
            total_price = unit_price * quantity
            subtotal += total_price
            
            enriched_items.append({
                "product_id": item["product_id"],
                "product_name": product["name"],
                "product_sku": product["sku"],
                "quantity_ordered": quantity,
                "quantity_shipped": 0,
                "quantity_received": 0,
                "unit_price": float(unit_price),
                "total_price": float(total_price),
                "expected_delivery_date": item.get("expected_delivery_date"),
                "notes": item.get("notes"),
            })
        
        data["items"] = enriched_items
        data["subtotal"] = float(subtotal)
        
        tax = Decimal(str(data.get("tax_amount", 0)))
        shipping = Decimal(str(data.get("shipping_cost", 0)))
        discount = Decimal(str(data.get("discount_amount", 0)))
        data["total_amount"] = float(subtotal + tax + shipping - discount)
        
        data["status"] = FactoryOrderStatus.DRAFT.value
        data["order_date"] = datetime.now(timezone.utc).isoformat()
        
        doc = await self.create(data, user_id=user_id)
        
        # Update warehouse stock ordered_quantity
        await self._update_ordered_quantities(enriched_items, user_id)
        
        return doc

    async def _update_ordered_quantities(
        self, 
        items: List[Dict[str, Any]], 
        user_id: str
    ):
        """Update ordered_quantity in products collection"""
        for item in items:
            await product_service.increment_ordered(
                product_id=item["product_id"],
                quantity=item["quantity_ordered"],
                user_id=user_id
            )

    async def list_orders(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
        factory_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List factory orders with filters"""
        query: Dict[str, Any] = {}
        
        if status:
            query["status"] = status
        if factory_name:
            query["factory_name"] = {"$regex": factory_name, "$options": "i"}
        if search:
            query["$or"] = [
                {"order_number": {"$regex": search, "$options": "i"}},
                {"factory_name": {"$regex": search, "$options": "i"}},
            ]
        
        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
        )

    async def update_status(
        self,
        order_id: str,
        new_status: FactoryOrderStatus,
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Update factory order status"""
        return await self.update(
            order_id,
            {"status": new_status.value},
            user_id=user_id
        )

    async def mark_shipped(
        self,
        order_id: str,
        shipped_items: List[Dict[str, Any]],
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Mark items as shipped and update quantities"""
        order = await self.get_by_id(order_id)
        if not order:
            return None
        
        items = order.get("items", [])
        all_shipped = True
        
        for shipped_item in shipped_items:
            for item in items:
                if item["product_id"] == shipped_item["product_id"]:
                    item["quantity_shipped"] = min(
                        item["quantity_shipped"] + shipped_item["quantity"],
                        item["quantity_ordered"]
                    )
                    if item["quantity_shipped"] < item["quantity_ordered"]:
                        all_shipped = False
                    break
        
        new_status = FactoryOrderStatus.SHIPPED.value if all_shipped else FactoryOrderStatus.PARTIALLY_SHIPPED.value
        
        return await self.update(
            order_id,
            {"items": items, "status": new_status},
            user_id=user_id
        )


# ─────────────────── In-Transit Service ───────────────────

class InTransitService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="in_transit_inventory")

    async def create_shipment(
        self,
        data: Dict[str, Any],
        user_id: str,
    ) -> Dict[str, Any]:
        """Create in-transit record when factory ships"""
        factory_order = await factory_order_service.get_by_id(data["factory_order_id"])
        if not factory_order:
            raise ValueError("Factory order not found")
        
        # Generate shipment number
        if not data.get("shipment_number"):
            data["shipment_number"] = await generate_number("SHP", "in_transit_inventory", "shipment_number")
        
        data["factory_order_number"] = factory_order["order_number"]
        data["factory_name"] = factory_order["factory_name"]

        # Quantity guard: shipped qty must not exceed remaining to-ship per item
        fo_items_map = {fi["product_id"]: fi for fi in factory_order.get("items", [])}
        for item in data.get("items", []):
            fo_item = fo_items_map.get(item["product_id"])
            if not fo_item:
                raise ValueError(f"Product {item['product_id']} is not in factory order {factory_order['order_number']}")
            already_shipped = fo_item.get("quantity_shipped", 0)
            can_ship = fo_item["quantity_ordered"] - already_shipped
            if item["quantity"] > can_ship:
                raise ValueError(
                    f"Cannot ship {item['quantity']} units of '{fo_item['product_name']}'. "
                    f"Remaining to ship: {can_ship}"
                )

        # Enrich items
        enriched_items = []
        for item in data.get("items", []):
            product = await get_product_info(item["product_id"])
            if product:
                enriched_items.append({
                    "product_id": item["product_id"],
                    "product_name": product["name"],
                    "product_sku": product["sku"],
                    "quantity": item["quantity"],
                    "quantity_received": 0,
                })
        
        data["items"] = enriched_items
        data["status"] = InTransitStatus.IN_TRANSIT.value
        
        if data.get("ship_date"):
            if isinstance(data["ship_date"], datetime):
                data["ship_date"] = data["ship_date"].isoformat()
        else:
            data["ship_date"] = datetime.now(timezone.utc).isoformat()
        
        doc = await self.create(data, user_id=user_id)
        
        # Update factory order status
        await factory_order_service.mark_shipped(
            data["factory_order_id"],
            data["items"],
            user_id
        )
        
        # Update product stock in_transit_quantity
        for item in enriched_items:
            await product_service.increment_in_transit(
                product_id=item["product_id"],
                quantity=item["quantity"],
                user_id=user_id
            )
            # Decrement ordered quantity
            await product_service.decrement_ordered(
                product_id=item["product_id"],
                quantity=item["quantity"],
                user_id=user_id
            )
        
        return doc

    async def list_shipments(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List in-transit shipments"""
        query: Dict[str, Any] = {}
        
        if status:
            query["status"] = status
        if search:
            query["$or"] = [
                {"shipment_number": {"$regex": search, "$options": "i"}},
                {"factory_order_number": {"$regex": search, "$options": "i"}},
                {"tracking_number": {"$regex": search, "$options": "i"}},
            ]
        
        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
        )

    async def update_tracking(
        self,
        shipment_id: str,
        tracking_data: Dict[str, Any],
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Update shipping/tracking information"""
        return await self.update(shipment_id, tracking_data, user_id=user_id)

    async def quick_receive(
        self,
        shipment_id: str,
        notes: Optional[str],
        user_id: str,
    ) -> Dict[str, Any]:
        """Receive all items from a shipment directly into main stock (no GRN required)"""
        shipment = await self.get_by_id(shipment_id)
        if not shipment:
            raise ValueError("Shipment not found")

        if shipment.get("status") == InTransitStatus.DELIVERED.value:
            raise ValueError("Shipment already received")

        for item in shipment.get("items", []):
            qty = item.get("quantity", 0) - item.get("quantity_received", 0)
            if qty <= 0:
                continue

            product = await get_product_info(item["product_id"])
            cost_price = Decimal(str(product.get("cost_price", 0))) if product else Decimal("0")

            # Receive directly into sales stock
            await product_service.receive_stock(
                product_id=item["product_id"],
                quantity=qty,
                stock_type="sales",
                cost_price=cost_price,
                user_id=user_id,
                reference_type="in_transit",
                reference_id=shipment_id,
            )
            # Decrement in-transit
            await product_service.decrement_in_transit(
                product_id=item["product_id"],
                quantity=qty,
                user_id=user_id,
            )
            # Audit movement
            await stock_movement_service.create_movement(
                product_id=item["product_id"],
                movement_type=StockMovementType.GOODS_RECEIVED,
                quantity=qty,
                to_stock_type=StockType.SALES,
                reference_type="in_transit",
                reference_id=shipment_id,
                reference_number=shipment.get("shipment_number"),
                user_id=user_id,
            )

        # Mark all items as received
        updated_items = [
            {**it, "quantity_received": it.get("quantity", 0)}
            for it in shipment.get("items", [])
        ]

        await self._update_factory_order_on_receive(shipment, user_id)

        return await self.update(
            shipment_id,
            {
                "status": InTransitStatus.DELIVERED.value,
                "actual_arrival": datetime.now(timezone.utc).isoformat(),
                "items": updated_items,
                "notes": notes,
            },
            user_id=user_id,
        )

    async def _update_factory_order_on_receive(
        self, shipment: Dict[str, Any], user_id: str
    ) -> None:
        """Sync factory order received quantities after a shipment is received"""
        factory_order = await factory_order_service.get_by_id(shipment["factory_order_id"])
        if not factory_order:
            return

        items = factory_order.get("items", [])
        all_received = True
        for shipment_item in shipment.get("items", []):
            for fo_item in items:
                if fo_item["product_id"] == shipment_item["product_id"]:
                    fo_item["quantity_received"] = (
                        fo_item.get("quantity_received", 0) + shipment_item.get("quantity", 0)
                    )
                    if fo_item["quantity_received"] < fo_item["quantity_ordered"]:
                        all_received = False
                    break

        new_status = (
            FactoryOrderStatus.RECEIVED.value if all_received
            else FactoryOrderStatus.PARTIALLY_RECEIVED.value
        )
        await factory_order_service.update(
            factory_order["id"],
            {"items": items, "status": new_status},
            user_id=user_id,
        )

    async def partial_receive(
        self,
        shipment_id: str,
        received_items: List[Dict[str, Any]],
        notes: Optional[str],
        user_id: str,
    ) -> Dict[str, Any]:
        """Receive only specified quantities from a shipment (partial delivery support)"""
        shipment = await self.get_by_id(shipment_id)
        if not shipment:
            raise ValueError("Shipment not found")

        if shipment.get("status") == InTransitStatus.DELIVERED.value:
            raise ValueError("Shipment already fully received")

        recv_map = {it["product_id"]: it.get("quantity_received", 0) for it in received_items}
        updated_items = list(shipment.get("items", []))
        all_fully_received = True

        for item in updated_items:
            qty_to_receive = recv_map.get(item["product_id"], 0)
            if qty_to_receive <= 0:
                if item.get("quantity_received", 0) < item.get("quantity", 0):
                    all_fully_received = False
                continue

            remaining = item.get("quantity", 0) - item.get("quantity_received", 0)
            qty_to_receive = min(qty_to_receive, remaining)
            if qty_to_receive <= 0:
                continue

            product = await get_product_info(item["product_id"])
            cost_price = Decimal(str(product.get("cost_price", 0))) if product else Decimal("0")

            await product_service.receive_stock(
                product_id=item["product_id"],
                quantity=qty_to_receive,
                stock_type="sales",
                cost_price=cost_price,
                user_id=user_id,
                reference_type="in_transit",
                reference_id=shipment_id,
            )
            await product_service.decrement_in_transit(
                product_id=item["product_id"],
                quantity=qty_to_receive,
                user_id=user_id,
            )
            await stock_movement_service.create_movement(
                product_id=item["product_id"],
                movement_type=StockMovementType.GOODS_RECEIVED,
                quantity=qty_to_receive,
                to_stock_type=StockType.SALES,
                reference_type="in_transit",
                reference_id=shipment_id,
                reference_number=shipment.get("shipment_number"),
                user_id=user_id,
            )

            item["quantity_received"] = item.get("quantity_received", 0) + qty_to_receive
            if item["quantity_received"] < item.get("quantity", 0):
                all_fully_received = False

        new_status = (
            InTransitStatus.DELIVERED.value if all_fully_received
            else InTransitStatus.IN_TRANSIT.value
        )
        if all_fully_received:
            await self._update_factory_order_on_receive(
                {**shipment, "items": updated_items}, user_id
            )

        actual_arrival = datetime.now(timezone.utc).isoformat() if all_fully_received else None
        return await self.update(
            shipment_id,
            {
                "status": new_status,
                "items": updated_items,
                "notes": notes,
                **({"actual_arrival": actual_arrival} if actual_arrival else {}),
            },
            user_id=user_id,
        )


# ─────────────────── Stock Movement Service ───────────────────

class StockMovementService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="inventory_movements")

    async def create_movement(
        self,
        product_id: str,
        movement_type: StockMovementType,
        quantity: int,
        user_id: str,
        from_stock_type: Optional[StockType] = None,
        to_stock_type: Optional[StockType] = None,
        previous_quantity: int = 0,
        new_quantity: int = 0,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
        reference_number: Optional[str] = None,
        grn_number: Optional[str] = None,
        entity_id: Optional[str] = None,
        warehouse_location: Optional[str] = None,
        batch_number: Optional[str] = None,
        serial_numbers: Optional[List[str]] = None,
        reason: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a stock movement record"""
        product = await get_product_info(product_id)
        entity_name = None
        if entity_id:
            entity = await get_entity_info(entity_id)
            entity_name = entity.get("name") if entity else None
        
        # Get user name
        user_name = await get_user_name(user_id)
        
        data = {
            "product_id": product_id,
            "product_name": product["name"] if product else "",
            "product_sku": product["sku"] if product else "",
            "movement_type": movement_type.value,
            "from_stock_type": from_stock_type.value if from_stock_type else None,
            "to_stock_type": to_stock_type.value if to_stock_type else None,
            "quantity": quantity,
            "previous_quantity": previous_quantity,
            "new_quantity": new_quantity,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "reference_number": reference_number,
            "grn_number": grn_number,
            "entity_id": entity_id,
            "entity_name": entity_name,
            "warehouse_location": warehouse_location or "main",
            "batch_number": batch_number,
            "serial_numbers": serial_numbers or [],
            "reason": reason,
            "notes": notes,
            "created_by_name": user_name,
        }
        
        return await self.create(data, user_id=user_id)

    async def list_movements(
        self,
        page: int = 1,
        page_size: int = 20,
        product_id: Optional[str] = None,
        movement_type: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        reference_type: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List stock movements with filters"""
        query: Dict[str, Any] = {}
        
        if product_id:
            query["product_id"] = product_id
        if movement_type:
            query["movement_type"] = movement_type
        if reference_type:
            query["reference_type"] = reference_type
        if from_date:
            query["created_at"] = {"$gte": from_date.isoformat()}
        if to_date:
            if "created_at" in query:
                query["created_at"]["$lte"] = to_date.isoformat()
            else:
                query["created_at"] = {"$lte": to_date.isoformat()}
        if search:
            query["$or"] = [
                {"product_name": {"$regex": search, "$options": "i"}},
                {"product_sku": {"$regex": search, "$options": "i"}},
                {"reference_number": {"$regex": search, "$options": "i"}},
                {"reason": {"$regex": search, "$options": "i"}},
            ]
        
        result = await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
        )
        
        # Enrich with user names (for older records that don't have it stored)
        for item in result.get("items", []):
            if not item.get("created_by_name") and item.get("created_by"):
                item["created_by_name"] = await get_user_name(item["created_by"])
        
        return result


# ─────────────────── Demo Approval Service ───────────────────

class DemoApprovalService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="demo_approvals")

    async def create_request(
        self,
        data: Dict[str, Any],
        user_id: str,
    ) -> Dict[str, Any]:
        """Create a demo stock approval request"""
        # Generate request number
        data["request_number"] = await generate_number("DEMO", "demo_approvals", "request_number")
        
        # Get product info
        product = await get_product_info(data["product_id"])
        if not product:
            raise ValueError("Product not found")
        
        data["product_name"] = product["name"]
        data["product_sku"] = product["sku"]
        
        # Get current stock levels
        stock = await warehouse_stock_service.get_or_create(data["product_id"], user_id)
        data["current_demo_quantity"] = stock.get("demo_quantity", 0)
        data["current_sales_quantity"] = stock.get("sales_quantity", 0)
        
        # Get entity info if provided
        if data.get("entity_id"):
            entity = await get_entity_info(data["entity_id"])
            data["entity_name"] = entity.get("name") if entity else None
        
        data["status"] = DemoApprovalStatus.PENDING.value
        data["requested_by"] = user_id
        data["requested_at"] = datetime.now(timezone.utc).isoformat()
        
        return await self.create(data, user_id=user_id)

    async def review_request(
        self,
        request_id: str,
        review_data: Dict[str, Any],
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Review (approve/reject) a demo request"""
        request = await self.get_by_id(request_id)
        if not request:
            return None
        
        if request.get("status") != DemoApprovalStatus.PENDING.value:
            raise ValueError("Request is not in pending status")
        
        status = review_data.get("status")
        update_data = {
            "status": status.value if isinstance(status, DemoApprovalStatus) else status,
            "reviewed_by": user_id,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }
        
        if status == DemoApprovalStatus.APPROVED or status == "approved":
            approved_qty = review_data.get("approved_quantity") or request.get("requested_quantity")
            update_data["approved_quantity"] = approved_qty
            
            # Transfer stock from MAIN to DEMO (received stock lands in MAIN after delivery)
            await product_service.transfer_stock(
                product_id=request["product_id"],
                from_type=StockType.MAIN.value,
                to_type=StockType.DEMO.value,
                quantity=approved_qty,
                user_id=user_id,
                reason=f"Demo approval: {request['request_number']}",
            )
            await stock_movement_service.create_movement(
                product_id=request["product_id"],
                movement_type=StockMovementType.MAIN_TO_DEMO,
                quantity=approved_qty,
                from_stock_type=StockType.MAIN,
                to_stock_type=StockType.DEMO,
                reference_type="demo_approval",
                reference_id=request_id,
                reason=f"Demo approval: {request['request_number']}",
                user_id=user_id,
            )
            
            # Create allocation if entity is specified
            if request.get("entity_id"):
                allocation = await stock_allocation_service.create({
                    "product_id": request["product_id"],
                    "product_name": request["product_name"],
                    "product_sku": request["product_sku"],
                    "stock_type": StockType.DEMO.value,
                    "quantity": approved_qty,
                    "reference_type": "demo_approval",
                    "reference_id": request_id,
                    "entity_id": request["entity_id"],
                    "entity_name": request.get("entity_name"),
                    "demo_issued_date": datetime.now(timezone.utc).isoformat(),
                    "demo_return_date": request.get("expected_return_date"),
                    "demo_status": "issued",
                    "allocated_by": user_id,
                }, user_id=user_id)
                update_data["allocation_id"] = allocation["id"]
        else:
            update_data["rejection_reason"] = review_data.get("rejection_reason")
        
        if review_data.get("notes"):
            update_data["notes"] = review_data["notes"]
        
        return await self.update(request_id, update_data, user_id=user_id)

    async def list_requests(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        requested_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List demo approval requests"""
        query: Dict[str, Any] = {}
        
        if status:
            query["status"] = status
        if requested_by:
            query["requested_by"] = requested_by
        
        result = await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
        )
        
        # Enrich with user names
        for item in result.get("items", []):
            if item.get("requested_by"):
                item["requested_by_name"] = await get_user_name(item["requested_by"])
            if item.get("reviewed_by"):
                item["reviewed_by_name"] = await get_user_name(item["reviewed_by"])
        
        return result


# ─────────────────── Stock Allocation Service ───────────────────

class StockAllocationService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="stock_allocations")

    async def list_allocations(
        self,
        page: int = 1,
        page_size: int = 20,
        stock_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        demo_status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List stock allocations"""
        query: Dict[str, Any] = {}
        
        if stock_type:
            query["stock_type"] = stock_type
        if entity_id:
            query["entity_id"] = entity_id
        if demo_status:
            query["demo_status"] = demo_status
        
        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("allocated_at", -1)],
        )

    async def return_demo(
        self,
        allocation_id: str,
        return_to_sales: bool,
        user_id: str,
        notes: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Mark demo allocation as returned"""
        allocation = await self.get_by_id(allocation_id)
        if not allocation:
            return None
        
        if allocation.get("demo_status") != "issued":
            raise ValueError("Demo is not in issued status")
        
        # Transfer stock back
        if return_to_sales:
            await product_service.transfer_stock(
                product_id=allocation["product_id"],
                from_type=StockType.DEMO.value,
                to_type=StockType.SALES.value,
                quantity=allocation["quantity"],
                user_id=user_id,
                reason="Demo returned to sales stock",
            )
            await stock_movement_service.create_movement(
                product_id=allocation["product_id"],
                movement_type=StockMovementType.DEMO_TO_SALES,
                quantity=allocation["quantity"],
                from_stock_type=StockType.DEMO,
                to_stock_type=StockType.SALES,
                reference_type="demo_return",
                reference_id=allocation_id,
                reason="Demo unit returned",
                user_id=user_id,
            )
        
        update_data = {
            "demo_status": "returned",
            "demo_return_date": datetime.now(timezone.utc).isoformat(),
        }
        if notes:
            update_data["notes"] = notes
        
        return await self.update(allocation_id, update_data, user_id=user_id)


# ─────────────────── Demand Forecast Service ───────────────────

class DemandForecastService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="demand_forecasts")

    async def create_forecast(
        self,
        data: Dict[str, Any],
        user_id: str,
    ) -> Dict[str, Any]:
        """Create a demand forecast"""
        # Generate forecast number
        data["forecast_number"] = await generate_number("FC", "demand_forecasts", "forecast_number")
        
        product = await get_product_info(data["product_id"])
        if not product:
            raise ValueError("Product not found")
        
        data["product_name"] = product["name"]
        data["product_sku"] = product["sku"]
        data["product_category"] = product.get("category")
        
        # Get current stock levels directly from product
        current_sales = product.get("sales_quantity", 0)
        current_pipeline = (
            product.get("ordered_quantity", 0) +
            product.get("in_transit_quantity", 0)
        )
        data["current_stock"] = current_sales
        data["current_pipeline"] = current_pipeline
        
        # Calculate recommended order quantity
        forecasted = data.get("forecasted_demand", 0)
        data["recommended_order_qty"] = max(0, forecasted - current_sales - current_pipeline)
        
        return await self.create(data, user_id=user_id)

    async def convert_to_factory_order(
        self,
        forecast_id: str,
        order_data: Dict[str, Any],
        user_id: str,
    ) -> Dict[str, Any]:
        """Convert forecast to factory order"""
        forecast = await self.get_by_id(forecast_id)
        if not forecast:
            raise ValueError("Forecast not found")
        
        if forecast.get("is_converted_to_po"):
            raise ValueError("Forecast already converted to PO")

        # Recalculate recommended quantity from live stock (forecast snapshot may be stale)
        live_product = await get_product_info(forecast["product_id"])
        if live_product:
            live_stock = live_product.get("total_quantity", 0)
            live_pipeline = (
                live_product.get("ordered_quantity", 0)
                + live_product.get("in_transit_quantity", 0)
            )
            live_recommended = max(0, forecast.get("forecasted_demand", 0) - live_stock - live_pipeline)
        else:
            live_recommended = forecast.get("recommended_order_qty", 0)

        quantity = order_data.get("order_quantity") or live_recommended
        unit_price = order_data.get("unit_price", 0)
        
        # Create factory order
        factory_order = await factory_order_service.create_order({
            "factory_name": order_data["factory_name"],
            "factory_contact": order_data.get("factory_contact"),
            "items": [{
                "product_id": forecast["product_id"],
                "quantity_ordered": quantity,
                "unit_price": unit_price,
                "expected_delivery_date": order_data.get("expected_delivery_date"),
            }],
            "expected_delivery_date": order_data.get("expected_delivery_date"),
            "notes": order_data.get("notes"),
            "forecast_id": forecast_id,
        }, user_id=user_id)
        
        # Update forecast
        await self.update(forecast_id, {
            "is_converted_to_po": True,
            "factory_order_id": factory_order["id"],
            "converted_at": datetime.now(timezone.utc).isoformat(),
            "converted_by": user_id,
        }, user_id=user_id)
        
        return factory_order

    async def list_forecasts(
        self,
        page: int = 1,
        page_size: int = 20,
        is_converted: Optional[bool] = None,
        product_id: Optional[str] = None,
        forecast_period: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List demand forecasts"""
        query: Dict[str, Any] = {}
        
        if is_converted is not None:
            query["is_converted_to_po"] = is_converted
        if product_id:
            query["product_id"] = product_id
        if forecast_period:
            query["forecast_period"] = forecast_period
        
        result = await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
        )
        
        for item in result.get("items", []):
            if item.get("created_by"):
                item["created_by_name"] = await get_user_name(item["created_by"])
        
        return result


# ─────────────────── RMA Service ───────────────────

class RMAService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="rma_records")

    async def create_rma(
        self,
        data: Dict[str, Any],
        user_id: str,
    ) -> Dict[str, Any]:
        """Create an RMA record"""
        # Generate RMA number
        data["rma_number"] = await generate_number("RMA", "rma_records", "rma_number")
        
        product = await get_product_info(data["product_id"])
        if not product:
            raise ValueError("Product not found")
        
        data["product_name"] = product["name"]
        data["product_sku"] = product["sku"]
        
        entity = await get_entity_info(data["entity_id"])
        if not entity:
            raise ValueError("Entity not found")
        data["entity_name"] = entity["name"]
        
        data["status"] = RMAStatus.RECEIVED.value
        data["received_date"] = datetime.now(timezone.utc).isoformat()
        
        doc = await self.create(data, user_id=user_id)
        
        # Add to RMA stock
        await product_service.receive_stock(
            product_id=data["product_id"],
            quantity=data.get("quantity", 1),
            stock_type=StockType.RMA.value,
            cost_price=Decimal("0"),
            user_id=user_id,
            reference_type="rma",
            reference_id=doc["id"],
        )
        await stock_movement_service.create_movement(
            product_id=data["product_id"],
            movement_type=StockMovementType.RMA_RECEIVED,
            quantity=data.get("quantity", 1),
            to_stock_type=StockType.RMA,
            reference_type="rma",
            reference_id=doc["id"],
            user_id=user_id,
        )
        
        return doc

    async def update_status(
        self,
        rma_id: str,
        status: RMAStatus,
        update_data: Dict[str, Any],
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Update RMA status"""
        update_data["status"] = status.value
        
        if status == RMAStatus.REPAIRED:
            update_data["repair_end_date"] = datetime.now(timezone.utc).isoformat()
        elif status in [RMAStatus.RETURNED_TO_STOCK, RMAStatus.RETURNED_TO_CUSTOMER, RMAStatus.SCRAPPED]:
            update_data["closed_date"] = datetime.now(timezone.utc).isoformat()
        
        return await self.update(rma_id, update_data, user_id=user_id)

    async def return_to_stock(
        self,
        rma_id: str,
        stock_type: StockType,
        user_id: str,
        notes: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Return repaired item to stock"""
        rma = await self.get_by_id(rma_id)
        if not rma:
            return None
        
        if rma.get("returned_to_stock"):
            raise ValueError("Item already returned to stock")
        
        allowed_statuses = [RMAStatus.REPAIRED.value, RMAStatus.UNDER_REVIEW.value]
        if rma.get("status") not in allowed_statuses:
            raise ValueError(f"RMA must be in repaired status. Current: {rma.get('status')}")
        
        # Transfer from RMA to target stock type
        await product_service.transfer_stock(
            product_id=rma["product_id"],
            from_type=StockType.RMA.value,
            to_type=stock_type.value,
            quantity=rma.get("quantity", 1),
            user_id=user_id,
            reason=f"RMA {rma['rma_number']} repaired and returned to stock",
        )
        # Determine correct movement type
        _rma_movement_map = {
            StockType.SALES: StockMovementType.RMA_TO_SALES,
            StockType.DEMO: StockMovementType.RMA_TO_SALES,  # edge case, log as rma_to_sales
        }
        movement_type = _rma_movement_map.get(stock_type, StockMovementType.RMA_TO_SALES)
        await stock_movement_service.create_movement(
            product_id=rma["product_id"],
            movement_type=movement_type,
            quantity=rma.get("quantity", 1),
            from_stock_type=StockType.RMA,
            to_stock_type=stock_type,
            reference_type="rma",
            reference_id=rma_id,
            reason=f"RMA {rma['rma_number']} returned to stock",
            user_id=user_id,
        )
        
        return await self.update(rma_id, {
            "status": RMAStatus.RETURNED_TO_STOCK.value,
            "returned_to_stock": True,
            "returned_to_stock_date": datetime.now(timezone.utc).isoformat(),
            "stock_type_returned_to": stock_type.value,
            "closed_date": datetime.now(timezone.utc).isoformat(),
            "resolution_notes": notes,
        }, user_id=user_id)

    async def return_to_customer(
        self,
        rma_id: str,
        tracking_number: Optional[str],
        user_id: str,
        notes: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Return item to customer"""
        rma = await self.get_by_id(rma_id)
        if not rma:
            return None
        
        # Remove from RMA stock (returned to customer, not a sale)
        await product_service.issue_stock(
            product_id=rma["product_id"],
            stock_type=StockType.RMA.value,
            quantity=rma.get("quantity", 1),
            user_id=user_id,
            reference_type="rma_return",
            reference_id=rma_id,
        )
        await stock_movement_service.create_movement(
            product_id=rma["product_id"],
            movement_type=StockMovementType.RMA_RETURNED_TO_CUSTOMER,
            quantity=rma.get("quantity", 1),
            from_stock_type=StockType.RMA,
            reference_type="rma_return",
            reference_id=rma_id,
            entity_id=rma["entity_id"],
            reason=f"RMA {rma['rma_number']} returned to customer",
            user_id=user_id,
        )
        
        return await self.update(rma_id, {
            "status": RMAStatus.RETURNED_TO_CUSTOMER.value,
            "returned_to_customer": True,
            "return_tracking_number": tracking_number,
            "return_date": datetime.now(timezone.utc).isoformat(),
            "closed_date": datetime.now(timezone.utc).isoformat(),
            "resolution_notes": notes,
        }, user_id=user_id)

    async def scrap_item(
        self,
        rma_id: str,
        user_id: str,
        notes: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Scrap unrepairable item"""
        rma = await self.get_by_id(rma_id)
        if not rma:
            return None
        
        # Remove from RMA stock (scrapped)
        await product_service.issue_stock(
            product_id=rma["product_id"],
            stock_type=StockType.RMA.value,
            quantity=rma.get("quantity", 1),
            user_id=user_id,
            reference_type="rma_scrap",
            reference_id=rma_id,
        )
        await stock_movement_service.create_movement(
            product_id=rma["product_id"],
            movement_type=StockMovementType.RMA_SCRAPPED,
            quantity=rma.get("quantity", 1),
            from_stock_type=StockType.RMA,
            reference_type="rma_scrap",
            reference_id=rma_id,
            reason=f"RMA {rma['rma_number']} scrapped",
            user_id=user_id,
        )
        
        return await self.update(rma_id, {
            "status": RMAStatus.SCRAPPED.value,
            "resolution_type": "scrapped",
            "closed_date": datetime.now(timezone.utc).isoformat(),
            "resolution_notes": notes,
        }, user_id=user_id)

    async def list_rmas(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        entity_id: Optional[str] = None,
        assigned_to: Optional[str] = None,
        is_warranty: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """List RMA records"""
        query: Dict[str, Any] = {}
        
        if status:
            query["status"] = status
        if entity_id:
            query["entity_id"] = entity_id
        if assigned_to:
            query["assigned_to"] = assigned_to
        if is_warranty is not None:
            query["is_warranty_claim"] = is_warranty
        
        result = await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
        )
        
        for item in result.get("items", []):
            if item.get("created_by"):
                item["created_by_name"] = await get_user_name(item["created_by"])
            if item.get("assigned_to"):
                item["assigned_to_name"] = await get_user_name(item["assigned_to"])
        
        return result


# ─────────────────── Service Instances ───────────────────

factory_order_service = FactoryOrderService()
in_transit_service = InTransitService()
stock_movement_service = StockMovementService()
demand_forecast_service = DemandForecastService()
rma_service = RMAService()
product_service = ProductService()


# ─────────────────── Stock Transfer Helper ───────────────────

async def perform_stock_transfer(
    product_id: str,
    from_type: "StockType",
    to_type: "StockType",
    quantity: int,
    user_id: str,
    reason: Optional[str] = None,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """Transfer stock between types and record audit movement in one call"""
    updated = await product_service.transfer_stock(
        product_id=product_id,
        from_type=from_type.value,
        to_type=to_type.value,
        quantity=quantity,
        user_id=user_id,
        reason=reason,
    )
    _movement_map = {
        (StockType.SALES, StockType.DEMO): StockMovementType.DEMO_ISSUED,
        (StockType.DEMO, StockType.SALES): StockMovementType.DEMO_RETURNED,
        (StockType.RMA, StockType.SALES): StockMovementType.RMA_TO_SALES,
    }
    movement_type = _movement_map.get((from_type, to_type), StockMovementType.ADJUSTMENT_OUT)
    await stock_movement_service.create_movement(
        product_id=product_id,
        movement_type=movement_type,
        quantity=quantity,
        from_stock_type=from_type,
        to_stock_type=to_type,
        reason=reason,
        notes=notes,
        user_id=user_id,
    )
    return updated
