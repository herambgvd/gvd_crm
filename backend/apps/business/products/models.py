from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from decimal import Decimal
import uuid

class Product(BaseModel):
    """Product model for inventory management - includes warehouse stock tracking"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    sku: str = Field(..., min_length=1, max_length=100)
    category: str
    subcategory: Optional[str] = None
    unit_price: Decimal = Field(..., gt=0)
    cost_price: Optional[Decimal] = None
    currency: str = "USD"
    unit_of_measure: str = "piece"  # piece, kg, meter, etc.
    specifications: Optional[Dict[str, Any]] = None
    images: List[str] = Field(default_factory=list)
    documents: List[str] = Field(default_factory=list)
    is_active: bool = True
    
    # ─── Stock Quantities (integrated from warehouse_stock) ───
    total_quantity: int = Field(default=0, ge=0)       # Total physical stock
    sales_quantity: int = Field(default=0, ge=0)       # Available for sale
    demo_quantity: int = Field(default=0, ge=0)        # Demo reserved
    rma_quantity: int = Field(default=0, ge=0)         # Under repair/return
    
    # ─── Pipeline Quantities (not in warehouse yet) ───
    ordered_quantity: int = Field(default=0, ge=0)     # Factory PO placed
    in_transit_quantity: int = Field(default=0, ge=0)  # On the way
    
    # ─── Stock Thresholds ───
    min_stock_level: int = Field(default=0, ge=0)
    max_stock_level: Optional[int] = None
    reorder_point: int = Field(default=0, ge=0)
    
    # ─── Location in Warehouse ───
    warehouse_id: Optional[str] = None  # Reference to Warehouse collection
    
    # ─── Stock Dates ───
    last_received_date: Optional[datetime] = None
    last_issued_date: Optional[datetime] = None
    last_stock_take_date: Optional[datetime] = None
    
    # Legacy field for backward compatibility (computed)
    @property
    def stock_quantity(self) -> int:
        return self.total_quantity
    
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductCategory(BaseModel):
    """Product category model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    parent_category_id: Optional[str] = None
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StockMovement(BaseModel):
    """Stock movement tracking model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    movement_type: str  # in, out, adjustment, transfer
    quantity: int = Field(..., ne=0)  # positive for in, negative for out
    reference_type: Optional[str] = None  # sales_order, purchase_order, etc.
    reference_id: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))