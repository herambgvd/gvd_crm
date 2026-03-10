"""
Product & Inventory Service — uses BaseCRUDService for consistent patterns
"""

from typing import Any, Dict, List, Optional
from decimal import Decimal
from core.base_service import BaseCRUDService, serialize_document
from core.database import get_database
from core.pagination import paginate
from datetime import datetime, timezone
import uuid


class ProductService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="products")

    async def get_by_sku(self, sku: str) -> Optional[Dict[str, Any]]:
        """Get a product by SKU."""
        return await self.get_by_field("sku", sku)

    async def list_products(
        self,
        page: int = 1,
        page_size: int = 20,
        category: str = None,
        subcategory: str = None,
        search: str = None,
        is_active: bool = None,
        warehouse_location: str = None,
        low_stock_only: bool = False,
        out_of_stock_only: bool = False,
        has_stock: bool = None,
    ) -> Dict[str, Any]:
        """List products with filters and server-side pagination."""
        query: Dict[str, Any] = {}

        if category:
            query["category"] = category
        if subcategory:
            query["subcategory"] = subcategory
        if is_active is not None:
            query["is_active"] = is_active
        if warehouse_location:
            query["warehouse_location"] = warehouse_location
        if low_stock_only:
            query["$expr"] = {"$lte": ["$total_quantity", "$min_stock_level"]}
        if out_of_stock_only:
            query["total_quantity"] = 0
        if has_stock:
            query["total_quantity"] = {"$gt": 0}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"sku": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
            ]

        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
        )

    async def get_low_stock(self, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """Get products where total_quantity <= min_stock_level."""
        db = get_database()

        base_query = {
            "$expr": {"$lte": ["$total_quantity", "$min_stock_level"]},
            "is_active": True,
            "is_deleted": {"$ne": True},
        }

        return await paginate(
            collection=db.products,
            query=base_query,
            page=page,
            page_size=page_size,
            sort=[("total_quantity", 1)],
            projection={"_id": 0},
        )

    # ─────────────────── Stock Management Methods ───────────────────

    async def increment_ordered(
        self,
        product_id: str,
        quantity: int,
        user_id: str
    ):
        """Increment ordered quantity (factory PO placed)"""
        product = await self.get_by_id(product_id)
        if not product:
            return
        new_qty = product.get("ordered_quantity", 0) + quantity
        await self.update(product_id, {"ordered_quantity": new_qty}, user_id=user_id)

    async def decrement_ordered(
        self,
        product_id: str,
        quantity: int,
        user_id: str
    ):
        """Decrement ordered quantity (shipped from factory)"""
        product = await self.get_by_id(product_id)
        if not product:
            return
        new_qty = max(0, product.get("ordered_quantity", 0) - quantity)
        await self.update(product_id, {"ordered_quantity": new_qty}, user_id=user_id)

    async def increment_in_transit(
        self,
        product_id: str,
        quantity: int,
        user_id: str
    ):
        """Increment in-transit quantity"""
        product = await self.get_by_id(product_id)
        if not product:
            return
        new_qty = product.get("in_transit_quantity", 0) + quantity
        await self.update(product_id, {"in_transit_quantity": new_qty}, user_id=user_id)

    async def decrement_in_transit(
        self,
        product_id: str,
        quantity: int,
        user_id: str
    ):
        """Decrement in-transit quantity"""
        product = await self.get_by_id(product_id)
        if not product:
            return
        new_qty = max(0, product.get("in_transit_quantity", 0) - quantity)
        await self.update(product_id, {"in_transit_quantity": new_qty}, user_id=user_id)

    async def receive_stock(
        self,
        product_id: str,
        quantity: int,
        stock_type: str,  # main, demo, sales, rma
        cost_price: Decimal,
        user_id: str,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Receive stock into warehouse"""
        product = await self.get_by_id(product_id)
        if not product:
            raise ValueError(f"Product not found: {product_id}")
        
        # Calculate new quantities
        total = product.get("total_quantity", 0) + quantity
        
        # Update specific stock type
        type_field = f"{stock_type}_quantity"
        type_qty = product.get(type_field, 0) + quantity
        
        update_data = {
            "total_quantity": total,
            type_field: type_qty,
            "last_received_date": datetime.now(timezone.utc).isoformat(),
            # Legacy compatibility
            "stock_quantity": total,
        }
        
        updated = await self.update(product_id, update_data, user_id=user_id)
        return updated

    async def transfer_stock(
        self,
        product_id: str,
        from_type: str,  # main, demo, sales, rma
        to_type: str,
        quantity: int,
        user_id: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Transfer stock between types (e.g., sales to demo)"""
        product = await self.get_by_id(product_id)
        if not product:
            raise ValueError(f"Product not found: {product_id}")
        
        from_field = f"{from_type}_quantity"
        to_field = f"{to_type}_quantity"
        
        current_from = product.get(from_field, 0)
        current_to = product.get(to_field, 0)
        
        if current_from < quantity:
            raise ValueError(f"Insufficient {from_type} stock. Available: {current_from}, Requested: {quantity}")
        
        new_from = current_from - quantity
        new_to = current_to + quantity
        
        update_data = {
            from_field: new_from,
            to_field: new_to,
        }
        
        updated = await self.update(product_id, update_data, user_id=user_id)
        
        # Create stock movement record (lazy import to avoid circular dependency)
        from apps.business.inventory.service import stock_movement_service
        from apps.business.inventory.models import StockMovementType, StockType
        
        # Determine movement type based on transfer direction
        movement_type = StockMovementType.ADJUSTMENT_IN  # Default fallback
        if from_type == "sales" and to_type == "demo":
            movement_type = StockMovementType.DEMO_ISSUED
        elif from_type == "demo" and to_type == "sales":
            movement_type = StockMovementType.DEMO_RETURNED
        elif from_type == "rma" and to_type == "sales":
            movement_type = StockMovementType.RMA_TO_SALES
        
        # Map to StockType enum
        from_stock_type = getattr(StockType, from_type.upper(), None)
        to_stock_type = getattr(StockType, to_type.upper(), None)
        
        await stock_movement_service.create_movement(
            product_id=product_id,
            movement_type=movement_type,
            quantity=quantity,
            user_id=user_id,
            from_stock_type=from_stock_type,
            to_stock_type=to_stock_type,
            previous_quantity=current_from,
            new_quantity=new_from,
            reference_type="stock_transfer",
            reason=reason,
        )
        
        return updated

    async def issue_stock(
        self,
        product_id: str,
        stock_type: str,  # main, demo, sales, rma
        quantity: int,
        user_id: str,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Deduct stock from a specific stock type"""
        product = await self.get_by_id(product_id)
        if not product:
            raise ValueError(f"Product not found: {product_id}")

        type_field = f"{stock_type}_quantity"
        current_qty = product.get(type_field, 0)
        if current_qty < quantity:
            raise ValueError(
                f"Insufficient {stock_type} stock. Available: {current_qty}, Requested: {quantity}"
            )

        total = product.get("total_quantity", 0) - quantity
        update_data = {
            "total_quantity": total,
            type_field: current_qty - quantity,
            "last_issued_date": datetime.now(timezone.utc).isoformat(),
            "stock_quantity": total,
        }
        return await self.update(product_id, update_data, user_id=user_id)

    async def get_stock_summary(self) -> Dict[str, Any]:
        """Get overall stock summary across all products"""
        db = get_database()
        
        pipeline = [
            {"$match": {"is_deleted": {"$ne": True}, "is_active": {"$ne": False}}},
            {
                "$group": {
                    "_id": None,
                    "total_products": {"$sum": 1},
                    "total_sales_quantity": {"$sum": "$sales_quantity"},
                    "total_demo_quantity": {"$sum": "$demo_quantity"},
                    "total_rma_quantity": {"$sum": "$rma_quantity"},
                    "total_ordered_quantity": {"$sum": "$ordered_quantity"},
                    "total_in_transit_quantity": {"$sum": "$in_transit_quantity"},
                    "total_stock_value": {
                        "$sum": {
                            "$multiply": [
                                {"$ifNull": ["$total_quantity", 0]},
                                {"$ifNull": ["$unit_price", 0]}
                            ]
                        }
                    }
                }
            }
        ]
        
        result = await db.products.aggregate(pipeline).to_list(1)
        
        if result:
            summary = result[0]
            del summary["_id"]
        else:
            summary = {
                "total_products": 0,
                "total_sales_quantity": 0,
                "total_demo_quantity": 0,
                "total_rma_quantity": 0,
                "total_ordered_quantity": 0,
                "total_in_transit_quantity": 0,
                "total_stock_value": 0,
            }
        
        # Count low stock and out of stock
        low_stock_count = await db.products.count_documents({
            "$expr": {"$and": [
                {"$gt": ["$total_quantity", 0]},
                {"$lte": ["$total_quantity", "$min_stock_level"]}
            ]},
            "is_active": {"$ne": False},
            "is_deleted": {"$ne": True},
        })
        
        out_of_stock_count = await db.products.count_documents({
            "total_quantity": 0,
            "is_active": {"$ne": False},
            "is_deleted": {"$ne": True},
        })
        
        summary["low_stock_count"] = low_stock_count
        summary["out_of_stock_count"] = out_of_stock_count
        
        return summary


class ProductCategoryService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="product_categories")

    async def list_categories(
        self,
        page: int = 1,
        page_size: int = 100,
        is_active: bool = None,
        search: str = None,
        parent_only: bool = False,
        parent_id: str = None,
    ) -> Dict[str, Any]:
        """List product categories with optional filtering."""
        query: Dict[str, Any] = {}

        if is_active is not None:
            query["is_active"] = is_active
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        if parent_only:
            query["$or"] = [
                {"parent_category_id": None},
                {"parent_category_id": {"$exists": False}},
            ]
        if parent_id:
            query["parent_category_id"] = parent_id

        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("name", 1)],
        )

    async def get_all_active(self) -> List[Dict[str, Any]]:
        """Get all active categories (for dropdowns)."""
        return await self.find_many(
            query={"$or": [{"is_active": True}, {"is_active": {"$exists": False}}]},
            sort=[("name", 1)],
        )

    async def get_subcategories(self, parent_id: str) -> List[Dict[str, Any]]:
        """Get all active subcategories for a given parent category."""
        return await self.find_many(
            query={
                "parent_category_id": parent_id,
                "$or": [{"is_active": True}, {"is_active": {"$exists": False}}]
            },
            sort=[("name", 1)],
        )

    async def get_category_tree(self) -> List[Dict[str, Any]]:
        """Get all active categories structured as a tree (parent with children)."""
        all_cats = await self.find_many(
            query={"$or": [{"is_active": True}, {"is_active": {"$exists": False}}]},
            sort=[("name", 1)],
        )

        # Separate parents and children
        parents = []
        children_map: Dict[str, List[Dict[str, Any]]] = {}

        for cat in all_cats:
            pid = cat.get("parent_category_id")
            if not pid:
                parents.append(cat)
            else:
                children_map.setdefault(pid, []).append(cat)

        # Attach children to parents
        tree = []
        for parent in parents:
            parent["subcategories"] = children_map.get(parent["id"], [])
            tree.append(parent)

        return tree


class MovementCategoryService(BaseCRUDService):
    """Service for managing stock movement categories (Demo, POC, Faulty, etc.)"""
    
    def __init__(self):
        super().__init__(collection_name="movement_categories")

    async def get_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        """Get category by code."""
        return await self.get_by_field("code", code.upper())

    async def list_categories(
        self,
        page: int = 1,
        page_size: int = 50,
        is_active: bool = None,
        search: str = None,
    ) -> Dict[str, Any]:
        """List movement categories with optional filters."""
        query: Dict[str, Any] = {}
        
        if is_active is not None:
            query["is_active"] = is_active
        else:
            query["$or"] = [{"is_active": True}, {"is_active": {"$exists": False}}]
            
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"code": {"$regex": search, "$options": "i"}},
            ]
        
        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("name", 1)],
        )

    async def get_all_active(self) -> List[Dict[str, Any]]:
        """Get all active movement categories."""
        return await self.find_many(
            query={"$or": [{"is_active": True}, {"is_active": {"$exists": False}}]},
            sort=[("name", 1)],
        )


class StockMovementService(BaseCRUDService):
    """Enhanced Stock Movement Service with full tracking capabilities."""
    
    def __init__(self):
        super().__init__(collection_name="stock_movements")

    async def create_movement(
        self,
        data: Dict[str, Any],
        user_id: str,
    ) -> Dict[str, Any]:
        """
        Create a stock movement and optionally update product stock.
        """
        from fastapi import HTTPException

        db = get_database()

        # Get product
        product = await db.products.find_one(
            {"id": data["product_id"], "is_deleted": {"$ne": True}}, {"_id": 0}
        )
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        # Get movement category to determine direction
        category = await db.movement_categories.find_one(
            {"id": data["category_id"], "is_deleted": {"$ne": True}}, {"_id": 0}
        )
        if not category:
            raise HTTPException(status_code=404, detail="Movement category not found")

        quantity = data.get("quantity", 0)
        direction = category.get("direction", "out")
        affects_stock = category.get("affects_stock", True)
        
        # Calculate stock change based on direction
        if direction == "out":
            actual_qty = -abs(quantity)
        elif direction == "in":
            actual_qty = abs(quantity)
        else:
            actual_qty = quantity  # transfer - handled differently

        previous_qty = product.get("stock_quantity", 0)
        new_qty = previous_qty + actual_qty if affects_stock else previous_qty

        if affects_stock and new_qty < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Current: {previous_qty}, Requested: {abs(actual_qty)}",
            )

        # Generate UID if not provided
        if not data.get("uid"):
            data["uid"] = f"SM-{uuid.uuid4().hex[:8].upper()}"

        # Build movement document
        movement_data = {
            **data,
            "previous_quantity": previous_qty,
            "new_quantity": new_qty,
            "status": "pending",
        }

        movement = await self.create(movement_data, user_id=user_id)

        # Update product stock if affects_stock
        if affects_stock:
            now = datetime.now(timezone.utc).isoformat()
            await db.products.update_one(
                {"id": data["product_id"]},
                {"$set": {"stock_quantity": new_qty, "updated_at": now, "updated_by": user_id}},
            )

        return movement

    async def update_shipping_info(
        self,
        movement_id: str,
        shipping_data: Dict[str, Any],
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Update shipping information for a movement."""
        update_data = {
            **shipping_data,
            "status": "shipped",
        }
        return await self.update(movement_id, update_data, user_id=user_id)

    async def update_receiving_info(
        self,
        movement_id: str,
        receiving_data: Dict[str, Any],
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Update receiving information for a movement."""
        update_data = {
            **receiving_data,
            "status": "received",
        }
        return await self.update(movement_id, update_data, user_id=user_id)

    async def list_movements(
        self,
        page: int = 1,
        page_size: int = 20,
        category_id: str = None,
        product_id: str = None,
        entity_id: str = None,
        status: str = None,
        search: str = None,
    ) -> Dict[str, Any]:
        """List stock movements with filters."""
        query: Dict[str, Any] = {}

        if category_id:
            query["category_id"] = category_id
        if product_id:
            query["product_id"] = product_id
        if entity_id:
            query["entity_id"] = entity_id
        if status:
            query["status"] = status
        if search:
            query["$or"] = [
                {"uid": {"$regex": search, "$options": "i"}},
                {"notes": {"$regex": search, "$options": "i"}},
                {"location_from": {"$regex": search, "$options": "i"}},
                {"location_to": {"$regex": search, "$options": "i"}},
            ]

        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
        )

    async def get_movement_with_details(self, movement_id: str) -> Optional[Dict[str, Any]]:
        """Get a movement with all related details populated."""
        db = get_database()
        
        movement = await self.get_by_id(movement_id)
        if not movement:
            return None

        # Get category details
        if movement.get("category_id"):
            category = await db.movement_categories.find_one(
                {"id": movement["category_id"]}, {"_id": 0}
            )
            if category:
                movement["category_name"] = category.get("name")
                movement["category_code"] = category.get("code")

        # Get product details
        if movement.get("product_id"):
            product = await db.products.find_one(
                {"id": movement["product_id"]}, {"_id": 0}
            )
            if product:
                movement["product_name"] = product.get("name")
                movement["product_sku"] = product.get("sku")

        # Get entity details
        if movement.get("entity_id"):
            entity = await db.entities.find_one(
                {"id": movement["entity_id"]}, {"_id": 0}
            )
            if entity:
                movement["entity_name"] = entity.get("name")

        # Get assigned users details
        if movement.get("assigned_user_ids"):
            users = []
            for uid in movement["assigned_user_ids"]:
                user = await db.users.find_one({"id": uid}, {"_id": 0})
                if user:
                    users.append({
                        "id": user["id"],
                        "name": user.get("name") or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                        "email": user.get("email"),
                    })
            movement["assigned_users"] = users

        return movement


class MovementCommentService(BaseCRUDService):
    """Service for stock movement comments."""
    
    def __init__(self):
        super().__init__(collection_name="movement_comments")

    async def list_by_movement(
        self,
        movement_id: str,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """Get comments for a specific movement."""
        return await self.list(
            query={"movement_id": movement_id},
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
        )

    async def create_comment(
        self,
        movement_id: str,
        comment: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """Create a comment for a movement."""
        data = {
            "movement_id": movement_id,
            "comment": comment,
        }
        return await self.create(data, user_id=user_id)


# Singletons
product_service = ProductService()
category_service = ProductCategoryService()
movement_category_service = MovementCategoryService()
stock_movement_service = StockMovementService()
movement_comment_service = MovementCommentService()
