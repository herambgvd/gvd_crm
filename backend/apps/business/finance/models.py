from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from decimal import Decimal
import uuid

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


class PaymentAllocation(BaseModel):
    """Payment allocation to invoices model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_id: str
    invoice_id: str
    allocated_amount: Decimal = Field(..., gt=0)
    allocation_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaxConfiguration(BaseModel):
    """Tax configuration model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=100)
    rate: Decimal = Field(..., ge=0, le=100)
    type: str = "percentage"  # percentage, fixed
    description: Optional[str] = None
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AccountingEntry(BaseModel):
    """Accounting entry model for double-entry bookkeeping"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_code: str
    account_name: str
    debit_amount: Decimal = Field(default=0, ge=0)
    credit_amount: Decimal = Field(default=0, ge=0)
    reference_type: str  # invoice, payment, adjustment, etc.
    reference_id: str
    description: Optional[str] = None
    entry_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))