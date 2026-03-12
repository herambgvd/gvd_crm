"""
Product & Inventory Endpoints

Refactored to use BaseCRUDService-backed service layer with:
- Server-side pagination (paginate utility)
- Proper soft-delete (is_deleted convention)
- Decimal/datetime serialization via service
- Stock movement validation
"""

from fastapi import APIRouter, HTTPException, Depends, Query, File, UploadFile
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pathlib import Path
import uuid
import csv
import io

from core.permissions import require_permission
from apps.authentication.models import User
from .schemas import (
    ProductCreate, ProductUpdate, ProductResponse,
    ProductCategoryCreate, ProductCategoryUpdate, ProductCategoryResponse,
    MovementCategoryCreate, MovementCategoryUpdate, MovementCategoryResponse,
    StockMovementCreate, StockMovementUpdate, StockMovementResponse,
    ShippingInfoUpdate, ReceivingInfoUpdate,
    MovementCommentCreate, MovementCommentResponse,
    StockTransferRequest,
)
from .service import (
    product_service, 
    category_service, 
    movement_category_service,
    stock_movement_service,
    movement_comment_service,
)

router = APIRouter(tags=["products"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/products")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ─────────────────── Helper ───────────────────

def _product_response(doc: Dict[str, Any]) -> ProductResponse:
    """Convert a raw MongoDB document dict to ProductResponse."""
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    if isinstance(doc.get("updated_at"), str):
        doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    # Set stock_quantity for backward compatibility (same as total_quantity)
    doc["stock_quantity"] = doc.get("total_quantity", 0)
    # Populate frontend-friendly aliases
    doc["product_name"] = doc.get("name", "")
    doc["product_code"] = doc.get("sku", "")
    doc["unit"] = doc.get("unit_of_measure", "piece")
    return ProductResponse(**doc)


def _category_response(doc: Dict[str, Any]) -> ProductCategoryResponse:
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    if isinstance(doc.get("updated_at"), str):
        doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    return ProductCategoryResponse(**doc)


def _movement_response(doc: Dict[str, Any]) -> StockMovementResponse:
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    if isinstance(doc.get("updated_at"), str):
        doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    if isinstance(doc.get("request_date"), str):
        doc["request_date"] = datetime.fromisoformat(doc["request_date"])
    if isinstance(doc.get("ship_date"), str):
        doc["ship_date"] = datetime.fromisoformat(doc["ship_date"])
    if isinstance(doc.get("received_date"), str):
        doc["received_date"] = datetime.fromisoformat(doc["received_date"])
    return StockMovementResponse(**doc)


def _movement_category_response(doc: Dict[str, Any]) -> MovementCategoryResponse:
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    if isinstance(doc.get("updated_at"), str):
        doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    return MovementCategoryResponse(**doc)


def _comment_response(doc: Dict[str, Any]) -> MovementCommentResponse:
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return MovementCommentResponse(**doc)


# ──────────────── Product CRUD ────────────────

@router.post("/", response_model=ProductResponse)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(require_permission("products:create")),
):
    """Create a new product."""
    # Check SKU uniqueness
    existing = await product_service.get_by_sku(product_data.sku)
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")

    data = product_data.model_dump()
    
    # Handle legacy stock_quantity field
    if data.get("stock_quantity") is not None:
        stock_qty = data.pop("stock_quantity")
        # If sales_quantity not explicitly set, use stock_quantity
        if data.get("sales_quantity") == 0 or data.get("sales_quantity") is None:
            data["sales_quantity"] = stock_qty
        # Recalculate total_quantity
        data["total_quantity"] = (
            data.get("sales_quantity", 0) +
            data.get("demo_quantity", 0) +
            data.get("rma_quantity", 0)
        )
    
    doc = await product_service.create(data, user_id=current_user.id)
    return _product_response(doc)


@router.get("/")
async def get_products(
    current_user: User = Depends(require_permission("products:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    warehouse_location: Optional[str] = None,
    low_stock_only: Optional[bool] = None,
    out_of_stock_only: Optional[bool] = None,
    has_stock: Optional[bool] = None,
):
    """List products with server-side pagination and filtering."""
    result = await product_service.list_products(
        page=page,
        page_size=page_size,
        category=category,
        subcategory=subcategory,
        search=search,
        is_active=is_active,
        warehouse_location=warehouse_location,
        low_stock_only=low_stock_only or False,
        out_of_stock_only=out_of_stock_only or False,
        has_stock=has_stock,
    )
    result["items"] = [_product_response(doc) for doc in result["items"]]
    return result


@router.get("/stock-summary")
async def get_stock_summary(
    current_user: User = Depends(require_permission("inventory:view")),
):
    """Get overall stock summary across all products."""
    return await product_service.get_stock_summary()


@router.get("/low-stock")
async def get_low_stock_products(
    current_user: User = Depends(require_permission("inventory:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Get products where stock is at or below minimum level."""
    result = await product_service.get_low_stock(page=page, page_size=page_size)
    result["items"] = [_product_response(doc) for doc in result["items"]]
    return result


# ──────────────── Bulk Upload ─────────────────

@router.post("/bulk-upload")
async def bulk_upload_products(
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("products:create")),
):
    """Bulk upload products from CSV file."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    products_created = 0
    errors: list = []

    for row_num, row in enumerate(reader, start=2):
        try:
            # Normalise field names – accept both old and new naming
            stock_qty = int(row.get("stock_quantity") or row.get("quantity_in_stock") or 0)
            min_stock = int(row.get("min_stock_level") or row.get("minimum_stock_level") or 0)

            product_data = {
                "name": (row.get("name") or "").strip(),
                "sku": (row.get("sku") or f"SKU-{uuid.uuid4().hex[:8].upper()}").strip(),
                "description": (row.get("description") or "").strip(),
                "category": (row.get("category") or "").strip(),
                "subcategory": (row.get("subcategory") or "").strip() or None,
                "unit_price": float(row.get("unit_price") or 0),
                "cost_price": float(row.get("cost_price") or 0) or None,
                "unit_of_measure": (row.get("unit_of_measure") or row.get("unit") or "piece").strip(),
                "stock_quantity": stock_qty,
                "min_stock_level": min_stock,
                "is_active": True,
            }

            if not product_data["name"]:
                errors.append({"row": row_num, "error": "Name is required"})
                continue

            # Check duplicate SKU
            existing = await product_service.get_by_sku(product_data["sku"])
            if existing:
                errors.append({"row": row_num, "error": f"SKU '{product_data['sku']}' already exists"})
                continue

            await product_service.create(product_data, user_id=current_user.id)
            products_created += 1
        except Exception as e:
            errors.append({"row": row_num, "error": str(e)})

    return {
        "message": f"Successfully uploaded {products_created} products",
        "total_processed": products_created + len(errors),
        "success_count": products_created,
        "error_count": len(errors),
        "errors": errors[:20],
    }


# ─────────────── Category CRUD ────────────────

@router.post("/categories", response_model=ProductCategoryResponse)
async def create_product_category(
    category_data: ProductCategoryCreate,
    current_user: User = Depends(require_permission("products:create")),
):
    """Create a new product category."""
    data = category_data.model_dump()
    doc = await category_service.create(data, user_id=current_user.id)
    return _category_response(doc)


@router.get("/categories")
async def get_product_categories(
    current_user: User = Depends(require_permission("products:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100),
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    parent_only: bool = Query(False, description="Return only top-level categories"),
    parent_id: Optional[str] = Query(None, description="Return children of this parent"),
):
    """List product categories with pagination."""
    result = await category_service.list_categories(
        page=page,
        page_size=page_size,
        is_active=is_active,
        search=search,
        parent_only=parent_only,
        parent_id=parent_id,
    )
    result["items"] = [_category_response(doc) for doc in result["items"]]
    return result


@router.get("/categories/all")
async def get_all_categories(
    current_user: User = Depends(require_permission("products:view")),
):
    """Get all active categories (for dropdowns)."""
    categories = await category_service.get_all_active()
    return [_category_response(doc) for doc in categories]


@router.get("/categories/tree")
async def get_category_tree(
    current_user: User = Depends(require_permission("products:view")),
):
    """Get categories structured as a tree (parents with subcategories nested)."""
    tree = await category_service.get_category_tree()
    result = []
    for parent in tree:
        p = _category_response({k: v for k, v in parent.items() if k != "subcategories"})
        p_dict = p.model_dump()
        p_dict["subcategories"] = [_category_response(sub).model_dump() for sub in parent.get("subcategories", [])]
        result.append(p_dict)
    return result


@router.get("/categories/{category_id}/subcategories")
async def get_subcategories(
    category_id: str,
    current_user: User = Depends(require_permission("products:view")),
):
    """Get active subcategories for a parent category."""
    subcategories = await category_service.get_subcategories(category_id)
    return [_category_response(doc) for doc in subcategories]


@router.put("/categories/{category_id}", response_model=ProductCategoryResponse)
async def update_product_category(
    category_id: str,
    category_data: ProductCategoryUpdate,
    current_user: User = Depends(require_permission("products:edit")),
):
    """Update a product category."""
    update_dict = category_data.model_dump(exclude_unset=True)
    doc = await category_service.update(category_id, update_dict, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Category not found")
    return _category_response(doc)


@router.delete("/categories/{category_id}")
async def delete_product_category(
    category_id: str,
    current_user: User = Depends(require_permission("products:delete")),
):
    """Soft-delete a product category."""
    deleted = await category_service.soft_delete(category_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}


# ──────────── Movement Category CRUD ─────────────

@router.post("/movement-categories", response_model=MovementCategoryResponse)
async def create_movement_category(
    category_data: MovementCategoryCreate,
    current_user: User = Depends(require_permission("inventory:manage")),
):
    """Create a new movement category (Demo, POC, Faulty, etc.)."""
    # Check if code already exists
    existing = await movement_category_service.get_by_code(category_data.code)
    if existing:
        raise HTTPException(status_code=400, detail="Category code already exists")
    
    data = category_data.model_dump()
    data["code"] = data["code"].upper()
    doc = await movement_category_service.create(data, user_id=current_user.id)
    return _movement_category_response(doc)


@router.get("/movement-categories")
async def get_movement_categories(
    current_user: User = Depends(require_permission("inventory:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
):
    """List all movement categories."""
    result = await movement_category_service.list_categories(
        page=page,
        page_size=page_size,
        search=search,
    )
    result["items"] = [_movement_category_response(doc) for doc in result["items"]]
    return result


@router.get("/movement-categories/all")
async def get_all_movement_categories(
    current_user: User = Depends(require_permission("inventory:view")),
):
    """Get all active movement categories (for dropdowns)."""
    categories = await movement_category_service.get_all_active()
    return [_movement_category_response(doc) for doc in categories]


@router.get("/movement-categories/{category_id}", response_model=MovementCategoryResponse)
async def get_movement_category(
    category_id: str,
    current_user: User = Depends(require_permission("inventory:view")),
):
    """Get a single movement category."""
    doc = await movement_category_service.get_by_id(category_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Movement category not found")
    return _movement_category_response(doc)


@router.put("/movement-categories/{category_id}", response_model=MovementCategoryResponse)
async def update_movement_category(
    category_id: str,
    category_data: MovementCategoryUpdate,
    current_user: User = Depends(require_permission("inventory:manage")),
):
    """Update a movement category."""
    update_dict = category_data.model_dump(exclude_unset=True)
    if "code" in update_dict:
        update_dict["code"] = update_dict["code"].upper()
    doc = await movement_category_service.update(category_id, update_dict, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Movement category not found")
    return _movement_category_response(doc)


@router.delete("/movement-categories/{category_id}")
async def delete_movement_category(
    category_id: str,
    current_user: User = Depends(require_permission("inventory:manage")),
):
    """Soft-delete a movement category."""
    deleted = await movement_category_service.soft_delete(category_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Movement category not found")
    return {"message": "Movement category deleted successfully"}


# ──────────── Stock Movement CRUD ─────────────

@router.post("/movements", response_model=StockMovementResponse)
async def create_stock_movement(
    movement_data: StockMovementCreate,
    current_user: User = Depends(require_permission("inventory:stock_out")),
):
    """Create a stock movement with full tracking."""
    data = movement_data.model_dump()
    doc = await stock_movement_service.create_movement(data, user_id=current_user.id)
    # Get full details
    full_doc = await stock_movement_service.get_movement_with_details(doc["id"])
    return _movement_response(full_doc)


@router.get("/movements")
async def get_stock_movements(
    current_user: User = Depends(require_permission("inventory:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[str] = None,
    product_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
):
    """Get paginated stock movements with filters."""
    result = await stock_movement_service.list_movements(
        category_id=category_id,
        product_id=product_id,
        entity_id=entity_id,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
    )
    result["items"] = [_movement_response(doc) for doc in result["items"]]
    return result


@router.get("/movements/{movement_id}", response_model=StockMovementResponse)
async def get_stock_movement(
    movement_id: str,
    current_user: User = Depends(require_permission("inventory:view")),
):
    """Get a single stock movement with full details."""
    doc = await stock_movement_service.get_movement_with_details(movement_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    return _movement_response(doc)


@router.put("/movements/{movement_id}", response_model=StockMovementResponse)
async def update_stock_movement(
    movement_id: str,
    movement_data: StockMovementUpdate,
    current_user: User = Depends(require_permission("inventory:edit")),
):
    """Update a stock movement (limited fields)."""
    update_dict = movement_data.model_dump(exclude_unset=True)
    doc = await stock_movement_service.update(movement_id, update_dict, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    full_doc = await stock_movement_service.get_movement_with_details(movement_id)
    return _movement_response(full_doc)


@router.put("/movements/{movement_id}/shipping")
async def update_movement_shipping(
    movement_id: str,
    shipping_data: ShippingInfoUpdate,
    current_user: User = Depends(require_permission("inventory:edit")),
):
    """Update shipping information for a movement."""
    data = shipping_data.model_dump(exclude_unset=True)
    doc = await stock_movement_service.update_shipping_info(movement_id, data, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    full_doc = await stock_movement_service.get_movement_with_details(movement_id)
    return _movement_response(full_doc)


@router.put("/movements/{movement_id}/receiving")
async def update_movement_receiving(
    movement_id: str,
    receiving_data: ReceivingInfoUpdate,
    current_user: User = Depends(require_permission("inventory:edit")),
):
    """Update receiving information for a movement."""
    data = receiving_data.model_dump(exclude_unset=True)
    doc = await stock_movement_service.update_receiving_info(movement_id, data, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    full_doc = await stock_movement_service.get_movement_with_details(movement_id)
    return _movement_response(full_doc)


@router.delete("/movements/{movement_id}")
async def delete_stock_movement(
    movement_id: str,
    current_user: User = Depends(require_permission("inventory:delete")),
):
    """Soft-delete a stock movement."""
    deleted = await stock_movement_service.soft_delete(movement_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    return {"message": "Stock movement deleted successfully"}


# ──────────── Movement Comments ─────────────

@router.post("/movements/{movement_id}/comments", response_model=MovementCommentResponse)
async def create_movement_comment(
    movement_id: str,
    comment_data: MovementCommentCreate,
    current_user: User = Depends(require_permission("inventory:view")),
):
    """Add a comment to a stock movement."""
    # Verify movement exists
    movement = await stock_movement_service.get_by_id(movement_id)
    if not movement:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    
    doc = await movement_comment_service.create_comment(
        movement_id=movement_id,
        comment=comment_data.comment,
        user_id=current_user.id,
    )
    return _comment_response(doc)


@router.get("/movements/{movement_id}/comments")
async def get_movement_comments(
    movement_id: str,
    current_user: User = Depends(require_permission("inventory:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """Get comments for a stock movement."""
    from core.database import get_database
    db = get_database()
    
    result = await movement_comment_service.list_by_movement(
        movement_id=movement_id,
        page=page,
        page_size=page_size,
    )
    
    # Populate user names
    items = []
    for doc in result["items"]:
        user = await db.users.find_one({"id": doc.get("created_by")}, {"_id": 0})
        if user:
            doc["created_by_name"] = user.get("name") or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        items.append(_comment_response(doc))
    
    result["items"] = items
    return result


# Legacy endpoints for backward compatibility
@router.get("/stock-movements/all")
async def get_all_stock_movements_legacy(
    current_user: User = Depends(require_permission("inventory:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Get all stock movements (legacy endpoint)."""
    result = await stock_movement_service.list_movements(
        page=page,
        page_size=page_size,
    )
    result["items"] = [_movement_response(doc) for doc in result["items"]]
    return result


# ──────────────── Stock Transfer Route ─────────────────

@router.post("/{product_id}/transfer-stock", response_model=ProductResponse)
async def transfer_product_stock(
    product_id: str,
    transfer_data: StockTransferRequest,
    current_user: User = Depends(require_permission("inventory:edit")),
):
    """Transfer stock between types (e.g., main to demo)."""
    try:
        doc = await product_service.transfer_stock(
            product_id=product_id,
            from_type=transfer_data.from_type,
            to_type=transfer_data.to_type,
            quantity=transfer_data.quantity,
            user_id=current_user.id,
            reason=transfer_data.reason,
        )
        return _product_response(doc)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ──────────────── Single Product Routes ─────────────────
# NOTE: These routes must come AFTER all specific routes (movements, categories, etc.)
# because /{product_id} would otherwise match paths like /movements

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user: User = Depends(require_permission("products:view")),
):
    """Get a single product by ID."""
    doc = await product_service.get_by_id(product_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return _product_response(doc)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user: User = Depends(require_permission("products:edit")),
):
    """Update a product."""
    update_dict = product_data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Handle legacy stock_quantity field
    if "stock_quantity" in update_dict:
        stock_qty = update_dict.pop("stock_quantity")
        # Get current product to know current stock breakdown
        current_product = await product_service.get_by_id(product_id)
        if current_product:
            # If sales_quantity not in update, set it to stock_quantity
            if "sales_quantity" not in update_dict:
                update_dict["sales_quantity"] = stock_qty
            # Recalculate total_quantity
            update_dict["total_quantity"] = (
                update_dict.get("sales_quantity", current_product.get("sales_quantity", 0)) +
                update_dict.get("demo_quantity", current_product.get("demo_quantity", 0)) +
                update_dict.get("rma_quantity", current_product.get("rma_quantity", 0))
            )

    doc = await product_service.update(product_id, update_dict, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return _product_response(doc)


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(require_permission("products:delete")),
):
    """Soft-delete a product."""
    deleted = await product_service.soft_delete(product_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}


# ──────────── File Upload ─────────────────────

@router.post("/{product_id}/upload-image")
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("products:edit")),
):
    """Upload a product image."""
    from core.database import get_database

    db = get_database()

    # Verify product exists
    product = await product_service.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Generate unique filename
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = UPLOAD_DIR / filename

    # Save file
    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # Update product images
    relative_path = f"uploads/products/{filename}"
    now = datetime.now(timezone.utc).isoformat()
    await db.products.update_one(
        {"id": product_id},
        {
            "$push": {"images": relative_path},
            "$set": {"updated_at": now, "updated_by": current_user.id},
        },
    )

    return {"message": "Image uploaded successfully", "file_path": relative_path}
