"""
Inventory Management API Schemas

Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

from .models import (
    FactoryOrderStatus,
    InTransitStatus,
    StockType,
    StockMovementType,
    RMAStatus,
)


# ─────────────────── Factory Order Schemas ───────────────────

class FactoryOrderItemCreate(BaseModel):
    product_id: str
    quantity_ordered: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    expected_delivery_date: Optional[datetime] = None
    notes: Optional[str] = None


class FactoryOrderItemUpdate(BaseModel):
    quantity_ordered: Optional[int] = Field(None, gt=0)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    expected_delivery_date: Optional[datetime] = None
    notes: Optional[str] = None


class FactoryOrderItemResponse(BaseModel):
    product_id: str = ""
    product_name: str = ""
    product_sku: str = ""
    quantity_ordered: int = 0
    quantity_shipped: int = 0
    quantity_received: int = 0
    unit_price: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")
    expected_delivery_date: Optional[datetime] = None
    notes: Optional[str] = None


class FactoryOrderCreate(BaseModel):
    order_number: Optional[str] = Field(None, max_length=100)  # Auto-generated if not provided
    factory_name: str = Field(..., min_length=1, max_length=200)
    factory_contact: Optional[Dict[str, str]] = None
    items: List[FactoryOrderItemCreate] = Field(..., min_length=1)
    tax_amount: Decimal = Field(default=Decimal("0"))
    shipping_cost: Decimal = Field(default=Decimal("0"))
    discount_amount: Decimal = Field(default=Decimal("0"))
    currency: str = "INR"
    expected_delivery_date: Optional[datetime] = None
    shipping_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    forecast_id: Optional[str] = None


class FactoryOrderUpdate(BaseModel):
    factory_name: Optional[str] = Field(None, min_length=1, max_length=200)
    factory_contact: Optional[Dict[str, str]] = None
    tax_amount: Optional[Decimal] = None
    shipping_cost: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    status: Optional[FactoryOrderStatus] = None
    expected_delivery_date: Optional[datetime] = None
    shipping_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None


class FactoryOrderResponse(BaseModel):
    id: str = ""
    order_number: str = ""
    factory_name: str = ""
    factory_contact: Optional[Dict[str, str]] = None
    items: List[FactoryOrderItemResponse] = Field(default_factory=list)
    subtotal: Decimal = Decimal("0")
    tax_amount: Decimal = Decimal("0")
    shipping_cost: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    currency: str = "INR"
    status: str = "draft"
    order_date: Optional[datetime] = None
    expected_delivery_date: Optional[datetime] = None
    shipping_address: Optional[Dict[str, str]] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    forecast_id: Optional[str] = None
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─────────────────── In-Transit Schemas ───────────────────

class InTransitItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)


class InTransitItemResponse(BaseModel):
    product_id: str = ""
    product_name: str = ""
    product_sku: str = ""
    quantity: int = 0
    quantity_received: int = 0


class InTransitCreate(BaseModel):
    factory_order_id: str
    shipment_number: Optional[str] = None
    items: List[InTransitItemCreate] = Field(..., min_length=1)
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    shipping_method: Optional[str] = None
    ship_date: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None
    origin_location: Optional[str] = None
    destination_location: Optional[str] = None
    notes: Optional[str] = None


class InTransitUpdate(BaseModel):
    status: Optional[InTransitStatus] = None
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    shipping_method: Optional[str] = None
    ship_date: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    current_location: Optional[str] = None
    notes: Optional[str] = None


class InTransitResponse(BaseModel):
    id: str = ""
    factory_order_id: str = ""
    factory_order_number: str = ""
    factory_name: str = ""
    shipment_number: Optional[str] = None
    items: List[InTransitItemResponse] = Field(default_factory=list)
    status: str = "pending_pickup"
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    shipping_method: Optional[str] = None
    ship_date: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    origin_location: Optional[str] = None
    destination_location: Optional[str] = None
    current_location: Optional[str] = None
    notes: Optional[str] = None
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─────────────────── Stock Movement Schemas ───────────────────

class StockMovementCreate(BaseModel):
    product_id: str
    movement_type: StockMovementType
    from_stock_type: Optional[StockType] = None
    to_stock_type: Optional[StockType] = None
    quantity: int = Field(...)
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    reference_number: Optional[str] = None
    grn_number: Optional[str] = None
    grn_date: Optional[datetime] = None
    entity_id: Optional[str] = None
    warehouse_location: Optional[str] = None
    batch_number: Optional[str] = None
    serial_numbers: List[str] = Field(default_factory=list)
    reason: Optional[str] = None
    notes: Optional[str] = None


class StockMovementResponse(BaseModel):
    id: str = ""
    product_id: str = ""
    product_name: str = ""
    product_sku: str = ""
    movement_type: str = ""
    from_stock_type: Optional[str] = None
    to_stock_type: Optional[str] = None
    quantity: int = 0
    previous_quantity: int = 0
    new_quantity: int = 0
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    reference_number: Optional[str] = None
    grn_number: Optional[str] = None
    grn_date: Optional[datetime] = None
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    warehouse_location: Optional[str] = None
    batch_number: Optional[str] = None
    serial_numbers: List[str] = Field(default_factory=list)
    reason: Optional[str] = None
    notes: Optional[str] = None
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None


# ─────────────────── Demand Forecast Schemas ───────────────────

class DemandForecastCreate(BaseModel):
    product_id: str
    forecast_period: str = Field(..., min_length=1)  # e.g., "2026-Q1"
    period_start_date: datetime
    period_end_date: datetime
    forecasted_demand: int = Field(..., ge=0)
    historical_avg_monthly: Optional[int] = None
    growth_factor: Optional[Decimal] = None
    safety_stock_days: int = Field(default=30, ge=0)
    confidence_level: Optional[str] = None
    notes: Optional[str] = None


class DemandForecastUpdate(BaseModel):
    forecasted_demand: Optional[int] = Field(None, ge=0)
    historical_avg_monthly: Optional[int] = None
    growth_factor: Optional[Decimal] = None
    safety_stock_days: Optional[int] = Field(None, ge=0)
    confidence_level: Optional[str] = None
    notes: Optional[str] = None


class DemandForecastConvert(BaseModel):
    """Convert forecast to factory order"""
    factory_name: str = Field(..., min_length=1)
    factory_contact: Optional[Dict[str, str]] = None
    order_quantity: Optional[int] = Field(None, gt=0)  # If None, uses recommended_order_qty
    unit_price: Decimal = Field(..., ge=0)
    expected_delivery_date: Optional[datetime] = None
    notes: Optional[str] = None


class DemandForecastResponse(BaseModel):
    id: str = ""
    forecast_number: str = ""
    product_id: str = ""
    product_name: str = ""
    product_sku: str = ""
    product_category: Optional[str] = None
    forecast_period: str = ""
    period_start_date: Optional[datetime] = None
    period_end_date: Optional[datetime] = None
    forecasted_demand: int = 0
    current_stock: int = 0
    current_pipeline: int = 0
    recommended_order_qty: int = 0
    historical_avg_monthly: Optional[int] = None
    growth_factor: Optional[Decimal] = None
    safety_stock_days: int = 30
    confidence_level: Optional[str] = None
    notes: Optional[str] = None
    is_converted_to_po: bool = False
    factory_order_id: Optional[str] = None
    converted_at: Optional[datetime] = None
    converted_by: Optional[str] = None
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─────────────────── RMA Schemas ───────────────────

class RMACreate(BaseModel):
    product_id: str
    serial_number: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    entity_id: str
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    issue_description: str = Field(..., min_length=1)
    issue_category: Optional[str] = None
    sales_order_id: Optional[str] = None
    invoice_id: Optional[str] = None
    is_warranty_claim: bool = False
    warranty_reference: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


class RMAUpdate(BaseModel):
    status: Optional[RMAStatus] = None
    issue_description: Optional[str] = None
    issue_category: Optional[str] = None
    diagnosis_date: Optional[datetime] = None
    repair_start_date: Optional[datetime] = None
    repair_end_date: Optional[datetime] = None
    resolution_type: Optional[str] = None
    resolution_notes: Optional[str] = None
    repair_cost: Optional[Decimal] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


class RMAReturnToStock(BaseModel):
    stock_type: StockType = StockType.SALES
    notes: Optional[str] = None


class RMAReturnToCustomer(BaseModel):
    tracking_number: Optional[str] = None
    return_date: Optional[datetime] = None
    notes: Optional[str] = None


class RMAResponse(BaseModel):
    id: str = ""
    rma_number: str = ""
    product_id: str = ""
    product_name: str = ""
    product_sku: str = ""
    serial_number: Optional[str] = None
    quantity: int = 1
    entity_id: str = ""
    entity_name: str = ""
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    status: str = "received"
    issue_description: str = ""
    issue_category: Optional[str] = None
    received_date: Optional[datetime] = None
    diagnosis_date: Optional[datetime] = None
    repair_start_date: Optional[datetime] = None
    repair_end_date: Optional[datetime] = None
    closed_date: Optional[datetime] = None
    resolution_type: Optional[str] = None
    resolution_notes: Optional[str] = None
    returned_to_stock: bool = False
    returned_to_stock_date: Optional[datetime] = None
    stock_type_returned_to: Optional[str] = None
    returned_to_customer: bool = False
    return_tracking_number: Optional[str] = None
    return_date: Optional[datetime] = None
    repair_cost: Decimal = Decimal("0")
    is_warranty_claim: bool = False
    warranty_reference: Optional[str] = None
    sales_order_id: Optional[str] = None
    invoice_id: Optional[str] = None
    notes: Optional[str] = None
    created_by: str = ""
    created_by_name: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─────────────────── Receive Schemas ───────────────────

class QuickReceive(BaseModel):
    """Receive ALL items from a shipment at once into Main stock"""
    notes: Optional[str] = None


class PartialReceiveItem(BaseModel):
    product_id: str
    quantity_received: int = Field(..., ge=1)


class PartialReceive(BaseModel):
    """Receive only specified quantities — for partial/split deliveries"""
    items: List[PartialReceiveItem] = Field(..., min_length=1)
    notes: Optional[str] = None


# ─────────────────── Stock Transfer Schema ───────────────────

class StockTransfer(BaseModel):
    """Transfer stock between types (e.g., Main to Demo, Demo to Sales)"""
    product_id: str
    from_stock_type: StockType
    to_stock_type: StockType
    quantity: int = Field(..., gt=0)
    reason: Optional[str] = None
    notes: Optional[str] = None


# ─────────────────── Dashboard/Summary Schemas ───────────────────

class InventorySummary(BaseModel):
    total_products: int = 0
    total_stock_value: Decimal = Decimal("0")
    total_sales_quantity: int = 0
    total_demo_quantity: int = 0
    total_rma_quantity: int = 0
    total_ordered_quantity: int = 0
    total_in_transit_quantity: int = 0
    low_stock_count: int = 0
    out_of_stock_count: int = 0
    active_rma_count: int = 0


class ProductStockSummary(BaseModel):
    product_id: str = ""
    product_name: str = ""
    product_sku: str = ""
    total_quantity: int = 0
    available_for_sale: int = 0
    demo_quantity: int = 0
    rma_quantity: int = 0
    pipeline_quantity: int = 0  # ordered + in_transit
    stock_status: str = "normal"  # normal, low, critical, out_of_stock
