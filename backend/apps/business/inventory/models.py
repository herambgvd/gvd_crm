"""
Inventory Management Models

This module implements Option B - Separate Ledger approach for comprehensive inventory tracking:

1. FactoryOrder - Purchase orders placed to factory/manufacturer
2. InTransitInventory - Items shipped by factory but not yet received
3. WarehouseStock - Main stock with breakdown (Demo/Sales/RMA)
4. StockAllocation - Detailed allocation tracking
5. StockMovement - Comprehensive audit trail
6. DemoApproval - Demo stock replenishment workflow
7. DemandForecast - Order booking / future planning
8. RMARecord - Repair tracking with customer details

Flow: Factory PO → In-Transit → Warehouse Stock → (Demo/Sales/RMA) → Customer
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from decimal import Decimal
from enum import Enum
import uuid


# ─────────────────── Enums ───────────────────

class FactoryOrderStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    CONFIRMED = "confirmed"
    PARTIALLY_SHIPPED = "partially_shipped"
    SHIPPED = "shipped"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class InTransitStatus(str, Enum):
    PENDING_PICKUP = "pending_pickup"
    IN_TRANSIT = "in_transit"
    CUSTOMS_HOLD = "customs_hold"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    EXCEPTION = "exception"


class StockType(str, Enum):
    MAIN = "main"           # Received but not allocated
    DEMO = "demo"           # Reserved for demonstrations
    SALES = "sales"         # Available for selling
    RMA = "rma"             # Under repair/return


class StockMovementType(str, Enum):
    # Inbound
    GOODS_RECEIVED = "goods_received"       # in-transit received → sales stock
    RMA_RECEIVED = "rma_received"           # customer return → rma stock

    # Outbound
    SOLD = "sold"                           # sales order confirmed
    SCRAPPED = "scrapped"
    LOST = "lost"
    RMA_RETURNED_TO_CUSTOMER = "rma_returned_to_customer"

    # Transfers
    DEMO_ISSUED = "demo_issued"             # sales → demo
    DEMO_RETURNED = "demo_returned"         # demo → sales
    RMA_TO_SALES = "rma_to_sales"           # rma → sales (after repair)
    RMA_SCRAPPED = "rma_scrapped"           # rma → scrapped

    # Adjustments
    ADJUSTMENT_IN = "adjustment_in"
    ADJUSTMENT_OUT = "adjustment_out"
    STOCK_TAKE = "stock_take"


class RMAStatus(str, Enum):
    RECEIVED = "received"
    UNDER_REVIEW = "under_review"
    REPAIRING = "repairing"
    REPAIRED = "repaired"
    RETURNED_TO_STOCK = "returned_to_stock"
    SCRAPPED = "scrapped"
    RETURNED_TO_CUSTOMER = "returned_to_customer"


# ─────────────────── Models ───────────────────

class FactoryOrderItem(BaseModel):
    """Individual item in a factory order"""
    product_id: str
    product_name: str
    product_sku: str
    quantity_ordered: int = Field(..., gt=0)
    quantity_shipped: int = Field(default=0, ge=0)
    quantity_received: int = Field(default=0, ge=0)
    unit_price: Decimal = Field(..., ge=0)
    total_price: Decimal = Field(..., ge=0)
    expected_delivery_date: Optional[datetime] = None
    notes: Optional[str] = None


class FactoryOrder(BaseModel):
    """
    Purchase Order placed to factory/manufacturer
    This represents orders you place to your suppliers
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(..., min_length=1, max_length=100)
    factory_name: str = Field(..., min_length=1, max_length=200)
    factory_contact: Optional[Dict[str, str]] = None  # name, email, phone
    
    items: List[FactoryOrderItem] = Field(default_factory=list)
    
    subtotal: Decimal = Field(default=Decimal("0"))
    tax_amount: Decimal = Field(default=Decimal("0"))
    shipping_cost: Decimal = Field(default=Decimal("0"))
    discount_amount: Decimal = Field(default=Decimal("0"))
    total_amount: Decimal = Field(default=Decimal("0"))
    currency: str = "INR"
    
    status: FactoryOrderStatus = FactoryOrderStatus.DRAFT
    order_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expected_delivery_date: Optional[datetime] = None
    
    shipping_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    
    # Linked to demand forecast
    forecast_id: Optional[str] = None
    
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InTransitItem(BaseModel):
    """Item tracking in transit"""
    product_id: str
    product_name: str
    product_sku: str
    quantity: int = Field(..., gt=0)
    quantity_received: int = Field(default=0, ge=0)


class InTransitInventory(BaseModel):
    """
    Tracks shipments from factory that are on the way
    Created when factory ships the order
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    factory_order_id: str
    factory_order_number: str
    factory_name: str
    
    shipment_number: Optional[str] = None
    items: List[InTransitItem] = Field(default_factory=list)
    
    status: InTransitStatus = InTransitStatus.PENDING_PICKUP
    
    # Shipping details
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    shipping_method: Optional[str] = None  # air, sea, road
    
    ship_date: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    
    origin_location: Optional[str] = None
    destination_location: Optional[str] = None
    current_location: Optional[str] = None
    
    notes: Optional[str] = None
    
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StockMovement(BaseModel):
    """
    Comprehensive audit trail for all inventory movements
    Every change to stock creates a movement record
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    product_id: str
    product_name: str
    product_sku: str
    
    movement_type: StockMovementType
    from_stock_type: Optional[StockType] = None
    to_stock_type: Optional[StockType] = None
    
    quantity: int  # positive for inbound, negative for outbound
    
    # Stock levels before and after
    previous_quantity: int = Field(default=0)
    new_quantity: int = Field(default=0)
    
    # Reference linking
    reference_type: Optional[str] = None  # factory_order, in_transit, sales_order, demo_approval, rma
    reference_id: Optional[str] = None
    reference_number: Optional[str] = None
    
    # For GRN (Goods Receipt Note)
    grn_number: Optional[str] = None
    grn_date: Optional[datetime] = None
    
    # Additional context
    entity_id: Optional[str] = None       # Customer/Vendor
    entity_name: Optional[str] = None
    
    warehouse_location: Optional[str] = None
    batch_number: Optional[str] = None
    serial_numbers: List[str] = Field(default_factory=list)
    
    reason: Optional[str] = None
    notes: Optional[str] = None
    
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DemandForecast(BaseModel):
    """
    Order Booking / Future demand planning
    Used to plan factory orders based on expected demand
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    forecast_number: str
    
    product_id: str
    product_name: str
    product_sku: str
    product_category: Optional[str] = None
    
    # Forecast details
    forecast_period: str  # e.g., "2026-Q1", "2026-03"
    period_start_date: datetime
    period_end_date: datetime
    
    # Quantities
    forecasted_demand: int = Field(..., ge=0)
    current_stock: int = Field(default=0, ge=0)        # Snapshot at creation
    current_pipeline: int = Field(default=0, ge=0)     # Ordered + In-transit
    recommended_order_qty: int = Field(default=0, ge=0)
    
    # Calculation basis
    historical_avg_monthly: Optional[int] = None
    growth_factor: Optional[Decimal] = None
    safety_stock_days: int = Field(default=30)
    
    confidence_level: Optional[str] = None  # low, medium, high
    
    notes: Optional[str] = None
    
    # Conversion tracking
    is_converted_to_po: bool = False
    factory_order_id: Optional[str] = None
    converted_at: Optional[datetime] = None
    converted_by: Optional[str] = None
    
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RMARecord(BaseModel):
    """
    Return Merchandise Authorization - tracks repair items
    Items received from customers for repair/replacement
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rma_number: str = Field(..., min_length=1, max_length=100)
    
    product_id: str
    product_name: str
    product_sku: str
    serial_number: Optional[str] = None
    
    quantity: int = Field(default=1, ge=1)
    
    # Customer info
    entity_id: str  # Customer
    entity_name: str
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    
    # RMA details
    status: RMAStatus = RMAStatus.RECEIVED
    issue_description: str
    issue_category: Optional[str] = None  # defective, damaged, wrong_item, etc.
    
    # Dates
    received_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    diagnosis_date: Optional[datetime] = None
    repair_start_date: Optional[datetime] = None
    repair_end_date: Optional[datetime] = None
    closed_date: Optional[datetime] = None
    
    # Resolution
    resolution_type: Optional[str] = None  # repaired, replaced, refund, scrapped
    resolution_notes: Optional[str] = None
    
    # If repaired and returning to stock
    returned_to_stock: bool = False
    returned_to_stock_date: Optional[datetime] = None
    stock_type_returned_to: Optional[StockType] = None
    
    # If returned to customer
    returned_to_customer: bool = False
    return_tracking_number: Optional[str] = None
    return_date: Optional[datetime] = None
    
    # Cost tracking
    repair_cost: Decimal = Field(default=Decimal("0"))
    is_warranty_claim: bool = False
    warranty_reference: Optional[str] = None
    
    # Link to original sale
    sales_order_id: Optional[str] = None
    invoice_id: Optional[str] = None
    
    notes: Optional[str] = None
    
    created_by: str
    assigned_to: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
