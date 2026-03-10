from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

# BOQ Schemas
class BOQItemCreate(BaseModel):
    product_id: str
    product_name: str
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    specifications: Optional[str] = None

class BOQItemResponse(BaseModel):
    product_id: str = ""
    product_name: str = ""
    quantity: int = 0
    unit_price: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")
    specifications: Optional[str] = None

class BOQCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    lead_id: Optional[str] = None
    entity_id: Optional[str] = None
    project_name: Optional[str] = None
    items: List[BOQItemCreate] = Field(default_factory=list)
    currency: str = "USD"
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None

class BOQUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    entity_id: Optional[str] = None
    project_name: Optional[str] = None
    items: Optional[List[BOQItemCreate]] = None
    currency: Optional[str] = None
    valid_until: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None

class BOQResponse(BaseModel):
    id: str = ""
    name: str = ""
    description: Optional[str] = None
    lead_id: Optional[str] = None
    entity_id: Optional[str] = None
    project_name: Optional[str] = None
    version: int = 1
    items: List[BOQItemResponse] = Field(default_factory=list)
    subtotal: Decimal = Decimal("0")
    tax_amount: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    currency: str = "USD"
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