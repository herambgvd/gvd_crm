from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

# BOQ Schemas
class BOQItemCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str = ""
    product_code: str = ""
    item_name: str = ""        # display name used by frontend
    product_name: str = ""     # backward-compat alias
    description: str = ""
    specifications: Any = None  # list[str] or str
    quantity: int = Field(1, gt=0)
    unit: str = ""
    unit_price: float = 0
    price: float = 0            # selling price (used for totals)
    percentage: float = 0       # markup %
    total_price: float = 0

class BOQItemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str = ""
    product_code: str = ""
    item_name: str = ""
    product_name: str = ""
    description: str = ""
    specifications: Any = None
    quantity: int = 0
    unit: str = ""
    unit_price: float = 0
    price: float = 0
    percentage: float = 0
    total_price: float = 0

class BOQCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = ""
    description: Optional[str] = None
    lead_id: Optional[str] = None
    entity_id: Optional[str] = None
    involvement_id: Optional[str] = None
    channel: str = "direct"
    from_data: Dict[str, Any] = Field(default_factory=dict)
    to_data: Dict[str, Any] = Field(default_factory=dict)
    project_name: Optional[str] = None
    boq_number: Optional[str] = None
    items: List[BOQItemCreate] = Field(default_factory=list)
    tax_percentage: float = 0
    currency: str = "INR"
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None

class BOQUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[str] = None
    entity_id: Optional[str] = None
    involvement_id: Optional[str] = None
    channel: Optional[str] = None
    from_data: Optional[Dict[str, Any]] = None
    to_data: Optional[Dict[str, Any]] = None
    project_name: Optional[str] = None
    boq_number: Optional[str] = None
    items: Optional[List[BOQItemCreate]] = None
    tax_percentage: Optional[float] = None
    currency: Optional[str] = None
    valid_until: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None

class BOQResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = ""
    name: str = ""
    description: Optional[str] = None
    lead_id: Optional[str] = None
    entity_id: Optional[str] = None
    involvement_id: Optional[str] = None
    channel: str = "direct"
    from_data: Dict[str, Any] = Field(default_factory=dict)
    to_data: Dict[str, Any] = Field(default_factory=dict)
    project_name: Optional[str] = None
    boq_number: Optional[str] = None
    version: int = 1
    items: List[BOQItemResponse] = Field(default_factory=list)
    subtotal: float = 0
    tax_percentage: float = 0
    tax_amount: float = 0
    discount_amount: float = 0
    total_amount: float = 0
    currency: str = "INR"
    valid_until: Optional[datetime] = None
    status: str = "draft"
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Sales Order Schemas
class SalesOrderItemCreate(BaseModel):
    product_id: str
    product_name: str
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    delivery_date: Optional[datetime] = None

class SalesOrderItemResponse(BaseModel):
    product_id: str = ""
    product_name: str = ""
    quantity: int = 0
    unit_price: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")
    delivery_date: Optional[datetime] = None

class SalesOrderCreate(BaseModel):
    order_number: str = Field(..., min_length=1, max_length=100)
    lead_id: Optional[str] = None
    entity_id: str
    boq_id: Optional[str] = None
    customer_po_number: Optional[str] = None
    items: List[SalesOrderItemCreate] = Field(default_factory=list)
    currency: str = "USD"
    priority: str = "normal"
    expected_delivery_date: Optional[datetime] = None
    billing_address: Optional[Dict[str, str]] = None
    shipping_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class SalesOrderUpdate(BaseModel):
    customer_po_number: Optional[str] = None
    items: Optional[List[SalesOrderItemCreate]] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    expected_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    billing_address: Optional[Dict[str, str]] = None
    shipping_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class SalesOrderResponse(BaseModel):
    id: str = ""
    order_number: str = ""
    lead_id: Optional[str] = None
    entity_id: str = ""
    boq_id: Optional[str] = None
    customer_po_number: Optional[str] = None
    items: List[SalesOrderItemResponse] = Field(default_factory=list)
    subtotal: Decimal = Decimal("0")
    tax_amount: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    currency: str = "USD"
    status: str = "draft"
    priority: str = "normal"
    order_date: Optional[datetime] = None
    expected_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    billing_address: Optional[Dict[str, str]] = None
    shipping_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    notes: Optional[str] = None
    created_by: str = ""
    assigned_to: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Purchase Order Schemas
class PurchaseOrderItemCreate(BaseModel):
    product_id: str
    product_name: str
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    expected_delivery_date: Optional[datetime] = None

class PurchaseOrderItemResponse(BaseModel):
    product_id: str = ""
    product_name: str = ""
    quantity: int = 0
    unit_price: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")
    expected_delivery_date: Optional[datetime] = None

class PurchaseOrderCreate(BaseModel):
    po_number: str = Field(..., min_length=1, max_length=100)
    vendor_id: str
    sales_order_id: Optional[str] = None
    items: List[PurchaseOrderItemCreate] = Field(default_factory=list)
    currency: str = "USD"
    expected_delivery_date: Optional[datetime] = None
    delivery_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None

class PurchaseOrderUpdate(BaseModel):
    items: Optional[List[PurchaseOrderItemCreate]] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    expected_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    delivery_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None

class PurchaseOrderResponse(BaseModel):
    id: str = ""
    po_number: str = ""
    vendor_id: str = ""
    sales_order_id: Optional[str] = None
    items: List[PurchaseOrderItemResponse] = Field(default_factory=list)
    subtotal: Decimal = Decimal("0")
    tax_amount: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    currency: str = "USD"
    status: str = "draft"
    order_date: Optional[datetime] = None
    expected_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    delivery_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None