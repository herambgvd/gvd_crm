from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from decimal import Decimal
import uuid

# Entity Models
class Entity(BaseModel):
    """Entity model for companies/organizations"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., description="consultant, project, oem, distributor, dealer")
    registration_number: Optional[str] = None
    tax_number: Optional[str] = None
    primary_contact_name: str
    primary_contact_email: Optional[str] = None
    primary_contact_phone: str
    address: Optional[Dict[str, str]] = None
    website: Optional[str] = None
    status: str = "active"  # active, inactive, suspended
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Lead Models
class Lead(BaseModel):
    """Lead model for sales prospects"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str
    channel: str  # consultant, project, oem, distributor, dealer
    entity_id: Optional[str] = None
    project_name: Optional[str] = None
    contact_name: str
    contact_email: Optional[str] = None
    contact_phone: str
    company: str
    status: str = "new"  # new, qualified, contacted, converted, lost
    priority: str = "medium"  # low, medium, high, urgent
    expected_value: Optional[Decimal] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None
    additional_information: Optional[Dict[str, str]] = None
    created_by: str
    assigned_to: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Product Models
class Product(BaseModel):
    """Product model for inventory management"""
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
    stock_quantity: int = Field(default=0, ge=0)
    min_stock_level: int = Field(default=0, ge=0)
    max_stock_level: Optional[int] = None
    specifications: Optional[Dict[str, Any]] = None
    images: List[str] = Field(default_factory=list)
    documents: List[str] = Field(default_factory=list)
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# BOQ (Bill of Quantities) Models
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
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Invoice Models
class InvoiceItem(BaseModel):
    """Invoice item model"""
    product_id: str
    product_name: str
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    total_price: Decimal = Field(..., gt=0)
    tax_rate: Decimal = Field(default=0, ge=0)
    tax_amount: Decimal = Field(default=0)

class Invoice(BaseModel):
    """Invoice model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str = Field(..., min_length=1, max_length=100)
    sales_order_id: Optional[str] = None
    entity_id: str
    type: str = "sales"  # sales, purchase, credit_note, debit_note
    items: List[InvoiceItem] = Field(default_factory=list)
    subtotal: Decimal = Field(default=0)
    tax_amount: Decimal = Field(default=0)
    discount_amount: Decimal = Field(default=0)
    total_amount: Decimal = Field(default=0)
    currency: str = "USD"
    status: str = "draft"  # draft, sent, paid, overdue, cancelled
    issue_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    billing_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Payment Models
class Payment(BaseModel):
    """Payment model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_reference: str = Field(..., min_length=1, max_length=100)
    invoice_id: Optional[str] = None
    entity_id: str
    amount: Decimal = Field(..., gt=0)
    currency: str = "USD"
    payment_method: str = "bank_transfer"  # cash, bank_transfer, credit_card, check, etc.
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"  # pending, completed, failed, refunded
    transaction_id: Optional[str] = None
    gateway_response: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Assignment Models
class Assignment(BaseModel):
    """Assignment model for task assignment"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    type: str = "task"  # task, lead_followup, order_processing, etc.
    status: str = "pending"  # pending, in_progress, completed, cancelled
    priority: str = "medium"  # low, medium, high, urgent
    assigned_to: str
    assigned_by: str
    related_entity_type: Optional[str] = None  # lead, sales_order, invoice, etc.
    related_entity_id: Optional[str] = None
    due_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Comment Models
class Comment(BaseModel):
    """Comment model for entity comments"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str = Field(..., min_length=1)
    entity_type: str  # lead, sales_order, invoice, etc.
    entity_id: str
    author_id: str
    is_internal: bool = False  # Internal comments vs customer-visible
    attachments: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Document Models
class Document(BaseModel):
    """Document model for file management"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    file_path: str
    file_size: int = Field(..., gt=0)
    mime_type: str
    entity_type: Optional[str] = None  # lead, sales_order, invoice, etc.
    entity_id: Optional[str] = None
    category: str = "general"  # contract, invoice, receipt, specification, etc.
    is_public: bool = False
    uploaded_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Warranty Models
class Warranty(BaseModel):
    """Warranty model for product warranties"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    sales_order_id: Optional[str] = None
    serial_number: Optional[str] = None
    warranty_type: str = "manufacturer"  # manufacturer, extended, service
    duration_months: int = Field(..., gt=0)
    start_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_date: datetime
    status: str = "active"  # active, expired, claimed, voided
    terms_conditions: Optional[str] = None
    claim_history: List[Dict[str, Any]] = Field(default_factory=list)
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))