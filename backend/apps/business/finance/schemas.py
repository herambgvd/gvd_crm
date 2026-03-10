from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

# Invoice Schemas
class InvoiceItemCreate(BaseModel):
    product_id: str
    product_name: str
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    tax_rate: Decimal = Field(default=0, ge=0)

class InvoiceItemResponse(BaseModel):
    product_id: str = ""
    product_name: str = ""
    quantity: int = 0
    unit_price: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")
    tax_rate: Decimal = Decimal("0")
    tax_amount: Decimal = Decimal("0")

class InvoiceCreate(BaseModel):
    invoice_number: str = Field(..., min_length=1, max_length=100)
    sales_order_id: Optional[str] = None
    entity_id: str
    type: str = "sales"
    items: List[InvoiceItemCreate] = Field(default_factory=list)
    currency: str = "USD"
    due_date: Optional[datetime] = None
    billing_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None

class InvoiceUpdate(BaseModel):
    items: Optional[List[InvoiceItemCreate]] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    billing_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: str = ""
    invoice_number: str = ""
    sales_order_id: Optional[str] = None
    entity_id: str = ""
    type: str = "sales"
    items: List[InvoiceItemResponse] = Field(default_factory=list)
    subtotal: Decimal = Decimal("0")
    tax_amount: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    currency: str = "USD"
    status: str = "draft"
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    billing_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Payment Schemas
class PaymentCreate(BaseModel):
    payment_reference: str = Field(..., min_length=1, max_length=100)
    invoice_id: Optional[str] = None
    entity_id: str
    amount: Decimal = Field(..., gt=0)
    currency: str = "USD"
    payment_method: str = "bank_transfer"
    payment_date: Optional[datetime] = None
    transaction_id: Optional[str] = None
    gateway_response: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class PaymentUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = None
    payment_method: Optional[str] = None
    payment_date: Optional[datetime] = None
    status: Optional[str] = None
    transaction_id: Optional[str] = None
    gateway_response: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: str = ""
    payment_reference: str = ""
    invoice_id: Optional[str] = None
    entity_id: str = ""
    amount: Decimal = Decimal("0")
    currency: str = "USD"
    payment_method: str = "bank_transfer"
    payment_date: Optional[datetime] = None
    status: str = "pending"
    transaction_id: Optional[str] = None
    gateway_response: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Payment Allocation Schemas
class PaymentAllocationCreate(BaseModel):
    payment_id: str
    invoice_id: str
    allocated_amount: Decimal = Field(..., gt=0)
    notes: Optional[str] = None

class PaymentAllocationResponse(BaseModel):
    id: str = ""
    payment_id: str = ""
    invoice_id: str = ""
    allocated_amount: Decimal = Decimal("0")
    allocation_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_by: str = ""
    created_at: Optional[datetime] = None

# Tax Configuration Schemas
class TaxConfigurationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    rate: Decimal = Field(..., ge=0, le=100)
    type: str = "percentage"
    description: Optional[str] = None

class TaxConfigurationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    rate: Optional[Decimal] = Field(None, ge=0, le=100)
    type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class TaxConfigurationResponse(BaseModel):
    id: str = ""
    name: str = ""
    rate: Decimal = Decimal("0")
    type: str = "percentage"
    description: Optional[str] = None
    is_active: bool = True
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None