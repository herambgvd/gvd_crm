from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from decimal import Decimal
import uuid

# BOQ Models
class BOQItem(BaseModel):
    """BOQ item model"""
    product_id: str
    product_name: str
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    total_price: Decimal = Field(..., gt=0)
    specifications: Optional[str] = None

class BOQ(BaseModel):
    """Bill of Quantities model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    lead_id: Optional[str] = None
    entity_id: Optional[str] = None
    project_name: Optional[str] = None
    version: int = Field(default=1, ge=1)
    items: List[BOQItem] = Field(default_factory=list)
    subtotal: Decimal = Field(default=0)
    tax_amount: Decimal = Field(default=0)
    discount_amount: Decimal = Field(default=0)
    total_amount: Decimal = Field(default=0)
    currency: str = "USD"
    valid_until: Optional[datetime] = None
    status: str = "draft"  # draft, sent, approved, rejected, expired
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Sales Order Models
class SalesOrderItem(BaseModel):
    """Sales order item model"""
    product_id: str
    product_name: str
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    total_price: Decimal = Field(..., gt=0)
    delivery_date: Optional[datetime] = None

class SalesOrder(BaseModel):
    """Sales order model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(..., min_length=1, max_length=100)
    lead_id: Optional[str] = None
    entity_id: str
    boq_id: Optional[str] = None
    customer_po_number: Optional[str] = None
    items: List[SalesOrderItem] = Field(default_factory=list)
    subtotal: Decimal = Field(default=0)
    tax_amount: Decimal = Field(default=0)
    discount_amount: Decimal = Field(default=0)
    total_amount: Decimal = Field(default=0)
    currency: str = "USD"
    status: str = "pending"  # pending, confirmed, processing, shipped, delivered, cancelled
    priority: str = "normal"  # low, normal, high, urgent
    order_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expected_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    billing_address: Optional[Dict[str, str]] = None
    shipping_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    assigned_to: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Purchase Order Models
class PurchaseOrderItem(BaseModel):
    """Purchase order item model"""
    product_id: str
    product_name: str
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    total_price: Decimal = Field(..., gt=0)
    expected_delivery_date: Optional[datetime] = None

class PurchaseOrder(BaseModel):
    """Purchase order model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    po_number: str = Field(..., min_length=1, max_length=100)
    vendor_id: str
    sales_order_id: Optional[str] = None
    items: List[PurchaseOrderItem] = Field(default_factory=list)
    subtotal: Decimal = Field(default=0)
    tax_amount: Decimal = Field(default=0)
    discount_amount: Decimal = Field(default=0)
    total_amount: Decimal = Field(default=0)
    currency: str = "USD"
    status: str = "draft"  # draft, sent, confirmed, shipped, received, cancelled
    order_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expected_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    delivery_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    lead_id: Optional[str] = None
    file_url: Optional[str] = None          # uploaded PO document from client
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderStatusHistory(BaseModel):
    """Order status history tracking model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_type: str  # sales_order, purchase_order, boq
    order_id: str
    previous_status: Optional[str] = None
    new_status: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    changed_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))