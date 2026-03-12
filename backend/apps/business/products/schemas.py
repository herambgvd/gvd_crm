from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from decimal import Decimal

# Product Schemas
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    sku: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1)
    subcategory: Optional[str] = None
    unit_price: Decimal = Field(..., gt=0)
    cost_price: Optional[Decimal] = None
    currency: str = "USD"
    unit_of_measure: str = "piece"
    specifications: Optional[Dict[str, Any]] = None
    images: List[str] = Field(default_factory=list)
    documents: List[str] = Field(default_factory=list)
    # Stock fields (optional on create, defaults to 0)
    total_quantity: int = Field(default=0, ge=0)
    sales_quantity: int = Field(default=0, ge=0)
    demo_quantity: int = Field(default=0, ge=0)
    rma_quantity: int = Field(default=0, ge=0)
    ordered_quantity: int = Field(default=0, ge=0)
    in_transit_quantity: int = Field(default=0, ge=0)
    min_stock_level: int = Field(default=0, ge=0)
    max_stock_level: Optional[int] = None
    reorder_point: int = Field(default=0, ge=0)
    warehouse_id: Optional[str] = None  # Reference to Warehouse
    is_active: bool = True
    # Legacy field - maps to sales_quantity
    stock_quantity: Optional[int] = Field(None, ge=0)

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    unit_price: Optional[Decimal] = Field(None, gt=0)
    cost_price: Optional[Decimal] = None
    currency: Optional[str] = None
    unit_of_measure: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    images: Optional[List[str]] = None
    documents: Optional[List[str]] = None
    is_active: Optional[bool] = None
    # Stock fields (optional on update)
    total_quantity: Optional[int] = Field(None, ge=0)
    sales_quantity: Optional[int] = Field(None, ge=0)
    demo_quantity: Optional[int] = Field(None, ge=0)
    rma_quantity: Optional[int] = Field(None, ge=0)
    ordered_quantity: Optional[int] = Field(None, ge=0)
    in_transit_quantity: Optional[int] = Field(None, ge=0)
    min_stock_level: Optional[int] = Field(None, ge=0)
    max_stock_level: Optional[int] = None
    reorder_point: Optional[int] = Field(None, ge=0)
    warehouse_id: Optional[str] = None  # Reference to Warehouse
    # Legacy field - maps to sales_quantity
    stock_quantity: Optional[int] = Field(None, ge=0)

class ProductResponse(BaseModel):
    id: str = ""
    name: str = ""
    description: Optional[str] = None
    sku: str = ""
    category: str = ""
    subcategory: Optional[str] = None
    unit_price: Decimal = Decimal("0")
    cost_price: Optional[Decimal] = None
    currency: str = "USD"
    unit_of_measure: str = "piece"
    specifications: Optional[Dict[str, Any]] = None
    images: List[str] = Field(default_factory=list)
    documents: List[str] = Field(default_factory=list)
    is_active: bool = True
    # Stock quantities
    total_quantity: int = 0
    sales_quantity: int = 0
    demo_quantity: int = 0
    rma_quantity: int = 0
    ordered_quantity: int = 0
    in_transit_quantity: int = 0
    # Stock thresholds
    min_stock_level: int = 0
    max_stock_level: Optional[int] = None
    reorder_point: int = 0
    # Location
    warehouse_id: Optional[str] = None
    warehouse_name: Optional[str] = None  # Populated on read
    # Stock dates
    last_received_date: Optional[datetime] = None
    last_issued_date: Optional[datetime] = None
    last_stock_take_date: Optional[datetime] = None
    # Legacy compatibility
    stock_quantity: int = 0  # Same as total_quantity
    # Frontend-friendly aliases (populated by _product_response)
    product_name: str = ""   # alias for name
    product_code: str = ""   # alias for sku
    unit: str = ""           # alias for unit_of_measure
    # Metadata
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Stock Transfer Schema
class StockTransferRequest(BaseModel):
    from_type: str = Field(..., description="Source stock type: main, demo, sales, rma")
    to_type: str = Field(..., description="Target stock type: main, demo, sales, rma")
    quantity: int = Field(..., gt=0)
    reason: Optional[str] = None


# Product Category Schemas
class ProductCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    parent_category_id: Optional[str] = None
    is_active: bool = True

class ProductCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    parent_category_id: Optional[str] = None
    is_active: Optional[bool] = None

class ProductCategoryResponse(BaseModel):
    id: str = ""
    name: str = ""
    description: Optional[str] = None
    parent_category_id: Optional[str] = None
    is_active: bool = True
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Stock Movement Category Schemas
class MovementCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20, description="Short code like DEMO, POC, FAULTY")
    description: Optional[str] = None
    affects_stock: bool = True  # Whether this movement type affects inventory count
    direction: str = Field("out", description="in, out, or transfer")
    is_active: bool = True


class MovementCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    description: Optional[str] = None
    affects_stock: Optional[bool] = None
    direction: Optional[str] = None
    is_active: Optional[bool] = None


class MovementCategoryResponse(BaseModel):
    id: str = ""
    name: str = ""
    code: str = ""
    description: Optional[str] = None
    affects_stock: bool = True
    direction: str = "out"
    is_active: bool = True
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Stock Movement Schemas (Enhanced)
class StockMovementCreate(BaseModel):
    category_id: str = Field(..., description="Movement category ID")
    entity_id: Optional[str] = Field(None, description="Linked entity ID")
    assigned_user_ids: List[str] = Field(default_factory=list, description="Assigned user IDs")
    location_from: Optional[str] = None
    location_to: Optional[str] = None
    request_date: Optional[datetime] = None
    uid: Optional[str] = Field(None, description="Reference number/description")
    product_category_id: Optional[str] = None
    product_subcategory_id: Optional[str] = None
    product_id: str
    quantity: int = Field(..., ge=1)
    notes: Optional[str] = None


class StockMovementUpdate(BaseModel):
    category_id: Optional[str] = None
    entity_id: Optional[str] = None
    assigned_user_ids: Optional[List[str]] = None
    location_from: Optional[str] = None
    location_to: Optional[str] = None
    request_date: Optional[datetime] = None
    uid: Optional[str] = None
    product_category_id: Optional[str] = None
    product_subcategory_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class ShippingInfoUpdate(BaseModel):
    ship_date: Optional[datetime] = None
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    shipped_by: Optional[str] = None
    shipping_notes: Optional[str] = None


class ReceivingInfoUpdate(BaseModel):
    received_date: Optional[datetime] = None
    received_by: Optional[str] = None
    condition_on_receipt: Optional[str] = None
    receiving_notes: Optional[str] = None


class StockMovementResponse(BaseModel):
    id: str = ""
    category_id: str = ""
    category_name: Optional[str] = None
    category_code: Optional[str] = None
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    assigned_user_ids: List[str] = []
    assigned_users: List[dict] = []
    location_from: Optional[str] = None
    location_to: Optional[str] = None
    request_date: Optional[datetime] = None
    uid: Optional[str] = None
    product_category_id: Optional[str] = None
    product_subcategory_id: Optional[str] = None
    product_id: str = ""
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    quantity: int = 0
    previous_quantity: Optional[int] = None
    new_quantity: Optional[int] = None
    status: str = "pending"
    notes: Optional[str] = None
    # Shipping info
    ship_date: Optional[datetime] = None
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    shipped_by: Optional[str] = None
    shipping_notes: Optional[str] = None
    # Receiving info
    received_date: Optional[datetime] = None
    received_by: Optional[str] = None
    condition_on_receipt: Optional[str] = None
    receiving_notes: Optional[str] = None
    # Audit
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Stock Movement Comment Schemas
class MovementCommentCreate(BaseModel):
    movement_id: str
    comment: str = Field(..., min_length=1)


class MovementCommentResponse(BaseModel):
    id: str = ""
    movement_id: str = ""
    comment: str = ""
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None