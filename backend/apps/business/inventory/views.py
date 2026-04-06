"""
Inventory Management API Endpoints

Pipeline: Factory Order -> In-Transit -> Receive (splits to Main stock)
          -> Transfer (Main -> Demo | Sales) -> Demand Forecasts
          RMA runs as a parallel track.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

from core.permissions import require_permission
from apps.authentication.models import User

from .schemas import (
    FactoryOrderCreate, FactoryOrderUpdate, FactoryOrderResponse,
    InTransitCreate, InTransitUpdate, InTransitResponse,
    QuickReceive, PartialReceive,
    StockMovementCreate, StockMovementResponse,
    DemandForecastCreate, DemandForecastUpdate, DemandForecastConvert, DemandForecastResponse,
    RMACreate, RMAUpdate, RMAReturnToStock, RMAReturnToCustomer, RMAResponse,
    StockTransfer,
    InventorySummary,
)

from .service import (
    factory_order_service,
    in_transit_service,
    stock_movement_service,
    demand_forecast_service,
    rma_service,
    perform_stock_transfer,
)

from .models import (
    FactoryOrderStatus,
    InTransitStatus,
    StockType,
    StockMovementType,
    RMAStatus,
)

router = APIRouter()


# ─────────────────── Response Helpers ───────────────────

def _parse_dt(dt):
    if isinstance(dt, str):
        return datetime.fromisoformat(dt.replace("Z", "+00:00"))
    return dt


def _factory_order_response(doc):
    for f in ["order_date", "expected_delivery_date", "created_at", "updated_at"]:
        if doc.get(f):
            doc[f] = _parse_dt(doc[f])
    return FactoryOrderResponse(**doc)


def _in_transit_response(doc):
    for f in ["ship_date", "estimated_arrival", "actual_arrival", "created_at", "updated_at"]:
        if doc.get(f):
            doc[f] = _parse_dt(doc[f])
    return InTransitResponse(**doc)


def _movement_response(doc):
    for f in ["grn_date", "created_at"]:
        if doc.get(f):
            doc[f] = _parse_dt(doc[f])
    return StockMovementResponse(**doc)



def _forecast_response(doc):
    for f in ["period_start_date", "period_end_date", "converted_at", "created_at", "updated_at"]:
        if doc.get(f):
            doc[f] = _parse_dt(doc[f])
    return DemandForecastResponse(**doc)


def _rma_response(doc):
    for f in [
        "received_date", "diagnosis_date", "repair_start_date", "repair_end_date",
        "closed_date", "returned_to_stock_date", "return_date", "created_at", "updated_at",
    ]:
        if doc.get(f):
            doc[f] = _parse_dt(doc[f])
    return RMAResponse(**doc)


# =======================================================================
#                         FACTORY ORDERS
# =======================================================================

@router.post("/factory-orders", response_model=FactoryOrderResponse)
async def create_factory_order(
    data: FactoryOrderCreate,
    current_user: User = Depends(require_permission("inventory:create")),
):
    """Create a new factory order (PO to manufacturer)"""
    try:
        doc = await factory_order_service.create_order(data.model_dump(), user_id=current_user.id)
        return _factory_order_response(doc)
    except ValueError as e:
        logger.exception(f"Operation failed: {e}")
        raise HTTPException(status_code=400, detail="Operation failed. Please try again.")


@router.get("/factory-orders")
async def list_factory_orders(
    current_user: User = Depends(require_permission("inventory:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    factory_name: Optional[str] = None,
    sop_id: Optional[str] = None,
    current_state_id: Optional[str] = None,
):
    result = await factory_order_service.list_orders(
        page=page, page_size=page_size, status=status, search=search,
        factory_name=factory_name, sop_id=sop_id, current_state_id=current_state_id,
        current_user_id=current_user.id, is_superuser=current_user.is_superuser,
    )
    result["items"] = [_factory_order_response(doc) for doc in result["items"]]
    return result


@router.get("/factory-orders/{order_id}", response_model=FactoryOrderResponse)
async def get_factory_order(
    order_id: str,
    current_user: User = Depends(require_permission("inventory:view")),
):
    doc = await factory_order_service.get_by_id(order_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Factory order not found")
    return _factory_order_response(doc)


@router.put("/factory-orders/{order_id}", response_model=FactoryOrderResponse)
async def update_factory_order(
    order_id: str,
    data: FactoryOrderUpdate,
    current_user: User = Depends(require_permission("inventory:update")),
):
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("status"):
        update_data["status"] = update_data["status"].value
    doc = await factory_order_service.update(order_id, update_data, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Factory order not found")
    return _factory_order_response(doc)


@router.post("/factory-orders/{order_id}/submit", response_model=FactoryOrderResponse)
async def submit_factory_order(
    order_id: str,
    current_user: User = Depends(require_permission("inventory:update")),
):
    doc = await factory_order_service.update_status(order_id, FactoryOrderStatus.SUBMITTED, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Factory order not found")
    return _factory_order_response(doc)


@router.post("/factory-orders/{order_id}/confirm", response_model=FactoryOrderResponse)
async def confirm_factory_order(
    order_id: str,
    current_user: User = Depends(require_permission("inventory:update")),
):
    doc = await factory_order_service.update_status(order_id, FactoryOrderStatus.CONFIRMED, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Factory order not found")
    return _factory_order_response(doc)


@router.post("/factory-orders/{order_id}/cancel", response_model=FactoryOrderResponse)
async def cancel_factory_order(
    order_id: str,
    current_user: User = Depends(require_permission("inventory:delete")),
):
    doc = await factory_order_service.update_status(order_id, FactoryOrderStatus.CANCELLED, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Factory order not found")
    return _factory_order_response(doc)


@router.delete("/factory-orders/{order_id}")
async def delete_factory_order(
    order_id: str,
    current_user: User = Depends(require_permission("inventory:delete")),
):
    success = await factory_order_service.delete(order_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Factory order not found")
    return {"message": "Factory order deleted"}


# =======================================================================
#                      IN-TRANSIT INVENTORY
# =======================================================================

@router.post("/in-transit", response_model=InTransitResponse)
async def create_shipment(
    data: InTransitCreate,
    current_user: User = Depends(require_permission("inventory:create")),
):
    """Create in-transit record when factory ships items"""
    try:
        doc = await in_transit_service.create_shipment(data.model_dump(), user_id=current_user.id)
        return _in_transit_response(doc)
    except ValueError as e:
        logger.exception(f"Operation failed: {e}")
        raise HTTPException(status_code=400, detail="Operation failed. Please try again.")


@router.get("/in-transit")
async def list_shipments(
    current_user: User = Depends(require_permission("inventory:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
):
    result = await in_transit_service.list_shipments(
        page=page, page_size=page_size, status=status, search=search,
    )
    result["items"] = [_in_transit_response(doc) for doc in result["items"]]
    return result


@router.get("/in-transit/{shipment_id}", response_model=InTransitResponse)
async def get_shipment(
    shipment_id: str,
    current_user: User = Depends(require_permission("inventory:view")),
):
    doc = await in_transit_service.get_by_id(shipment_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return _in_transit_response(doc)


@router.put("/in-transit/{shipment_id}", response_model=InTransitResponse)
async def update_shipment(
    shipment_id: str,
    data: InTransitUpdate,
    current_user: User = Depends(require_permission("inventory:update")),
):
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("status"):
        update_data["status"] = update_data["status"].value
    doc = await in_transit_service.update(shipment_id, update_data, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return _in_transit_response(doc)


@router.post("/in-transit/{shipment_id}/receive", response_model=InTransitResponse)
async def receive_shipment_full(
    shipment_id: str,
    data: QuickReceive,
    current_user: User = Depends(require_permission("inventory:create")),
):
    """Receive ALL items from a shipment into Main stock at once"""
    try:
        doc = await in_transit_service.quick_receive(
            shipment_id=shipment_id,
            notes=data.notes,
            user_id=current_user.id,
        )
        return _in_transit_response(doc)
    except ValueError as e:
        logger.exception(f"Operation failed: {e}")
        raise HTTPException(status_code=400, detail="Operation failed. Please try again.")


@router.post("/in-transit/{shipment_id}/partial-receive", response_model=InTransitResponse)
async def receive_shipment_partial(
    shipment_id: str,
    data: PartialReceive,
    current_user: User = Depends(require_permission("inventory:create")),
):
    """Receive only specified quantities — for partial/split deliveries"""
    try:
        doc = await in_transit_service.partial_receive(
            shipment_id=shipment_id,
            received_items=[i.model_dump() for i in data.items],
            notes=data.notes,
            user_id=current_user.id,
        )
        return _in_transit_response(doc)
    except ValueError as e:
        logger.exception(f"Operation failed: {e}")
        raise HTTPException(status_code=400, detail="Operation failed. Please try again.")


@router.delete("/in-transit/{shipment_id}")
async def delete_shipment(
    shipment_id: str,
    current_user: User = Depends(require_permission("inventory:delete")),
):
    success = await in_transit_service.delete(shipment_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return {"message": "Shipment deleted"}


# =======================================================================
#          STOCK TRANSFER  (Main -> Demo | Sales, etc.)
# =======================================================================

@router.post("/stock-transfer")
async def transfer_stock(
    data: StockTransfer,
    current_user: User = Depends(require_permission("inventory:update")),
):
    """Split / move stock between Main, Demo, and Sales buckets.

    After delivery, use this to allocate units: Main -> Demo and Main -> Sales.
    """
    try:
        updated = await perform_stock_transfer(
            product_id=data.product_id,
            from_type=data.from_stock_type,
            to_type=data.to_stock_type,
            quantity=data.quantity,
            user_id=current_user.id,
            reason=data.reason,
            notes=data.notes,
        )
        return {
            "message": (
                f"Transferred {data.quantity} units "
                f"from {data.from_stock_type.value} to {data.to_stock_type.value}"
            ),
            "product_id": data.product_id,
            "quantity_transferred": data.quantity,
            "from_type": data.from_stock_type.value,
            "to_type": data.to_stock_type.value,
            "updated_stock": {
                "demo_quantity": updated.get("demo_quantity", 0),
                "sales_quantity": updated.get("sales_quantity", 0),
                "rma_quantity": updated.get("rma_quantity", 0),
                "total_quantity": updated.get("total_quantity", 0),
            },
        }
    except ValueError as e:
        logger.exception(f"Operation failed: {e}")
        raise HTTPException(status_code=400, detail="Operation failed. Please try again.")


# =======================================================================
#                      STOCK MOVEMENTS (Audit Log)
# =======================================================================

@router.get("/stock-movements")
async def list_stock_movements(
    current_user: User = Depends(require_permission("inventory:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    product_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    reference_type: Optional[str] = None,
    search: Optional[str] = None,
):
    result = await stock_movement_service.list_movements(
        page=page,
        page_size=page_size,
        product_id=product_id,
        movement_type=movement_type,
        reference_type=reference_type,
        search=search,
    )
    result["items"] = [_movement_response(doc) for doc in result["items"]]
    return result


@router.get("/stock-movements/{movement_id}", response_model=StockMovementResponse)
async def get_stock_movement(
    movement_id: str,
    current_user: User = Depends(require_permission("inventory:view")),
):
    doc = await stock_movement_service.get_by_id(movement_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Movement not found")
    return _movement_response(doc)





# =======================================================================
#                      DEMAND FORECASTS
# =======================================================================

@router.post("/demand-forecasts", response_model=DemandForecastResponse)
async def create_demand_forecast(
    data: DemandForecastCreate,
    current_user: User = Depends(require_permission("inventory:create")),
):
    try:
        doc = await demand_forecast_service.create_forecast(data.model_dump(), user_id=current_user.id)
        return _forecast_response(doc)
    except ValueError as e:
        logger.exception(f"Operation failed: {e}")
        raise HTTPException(status_code=400, detail="Operation failed. Please try again.")


@router.get("/demand-forecasts")
async def list_demand_forecasts(
    current_user: User = Depends(require_permission("inventory:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_converted: Optional[bool] = None,
    product_id: Optional[str] = None,
    forecast_period: Optional[str] = None,
):
    result = await demand_forecast_service.list_forecasts(
        page=page,
        page_size=page_size,
        is_converted=is_converted,
        product_id=product_id,
        forecast_period=forecast_period,
    )
    result["items"] = [_forecast_response(doc) for doc in result["items"]]
    return result


@router.get("/demand-forecasts/{forecast_id}", response_model=DemandForecastResponse)
async def get_demand_forecast(
    forecast_id: str,
    current_user: User = Depends(require_permission("inventory:view")),
):
    doc = await demand_forecast_service.get_by_id(forecast_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Demand forecast not found")
    return _forecast_response(doc)


@router.put("/demand-forecasts/{forecast_id}", response_model=DemandForecastResponse)
async def update_demand_forecast(
    forecast_id: str,
    data: DemandForecastUpdate,
    current_user: User = Depends(require_permission("inventory:update")),
):
    doc = await demand_forecast_service.update(
        forecast_id, data.model_dump(exclude_unset=True), user_id=current_user.id,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Demand forecast not found")
    return _forecast_response(doc)


@router.post("/demand-forecasts/{forecast_id}/convert", response_model=FactoryOrderResponse)
async def convert_forecast_to_factory_order(
    forecast_id: str,
    data: DemandForecastConvert,
    current_user: User = Depends(require_permission("inventory:create")),
):
    """Convert demand forecast to factory order using live stock (not snapshot)"""
    try:
        doc = await demand_forecast_service.convert_to_factory_order(
            forecast_id, data.model_dump(), user_id=current_user.id,
        )
        return _factory_order_response(doc)
    except ValueError as e:
        logger.exception(f"Operation failed: {e}")
        raise HTTPException(status_code=400, detail="Operation failed. Please try again.")


@router.delete("/demand-forecasts/{forecast_id}")
async def delete_demand_forecast(
    forecast_id: str,
    current_user: User = Depends(require_permission("inventory:delete")),
):
    success = await demand_forecast_service.delete(forecast_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Demand forecast not found")
    return {"message": "Demand forecast deleted"}


# =======================================================================
#                             RMA
# =======================================================================

@router.post("/rma", response_model=RMAResponse)
async def create_rma(
    data: RMACreate,
    current_user: User = Depends(require_permission("inventory:create")),
):
    try:
        doc = await rma_service.create_rma(data.model_dump(), user_id=current_user.id)
        return _rma_response(doc)
    except ValueError as e:
        logger.exception(f"Operation failed: {e}")
        raise HTTPException(status_code=400, detail="Operation failed. Please try again.")


@router.get("/rma")
async def list_rmas(
    current_user: User = Depends(require_permission("inventory:view")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    entity_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    is_warranty: Optional[bool] = None,
    sop_id: Optional[str] = None,
    current_state_id: Optional[str] = None,
):
    result = await rma_service.list_rmas(
        page=page,
        page_size=page_size,
        status=status,
        entity_id=entity_id,
        assigned_to=assigned_to,
        is_warranty=is_warranty,
        sop_id=sop_id,
        current_state_id=current_state_id,
        current_user_id=current_user.id,
        is_superuser=current_user.is_superuser,
    )
    result["items"] = [_rma_response(doc) for doc in result["items"]]
    return result


@router.get("/rma/{rma_id}", response_model=RMAResponse)
async def get_rma(
    rma_id: str,
    current_user: User = Depends(require_permission("inventory:view")),
):
    doc = await rma_service.get_by_id(rma_id)
    if not doc:
        raise HTTPException(status_code=404, detail="RMA not found")
    return _rma_response(doc)


@router.put("/rma/{rma_id}", response_model=RMAResponse)
async def update_rma(
    rma_id: str,
    data: RMAUpdate,
    current_user: User = Depends(require_permission("inventory:update")),
):
    from .service import get_product_info
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("status"):
        update_data["status"] = update_data["status"].value
    # Re-enrich product info if product_id is being changed
    if "product_id" in update_data:
        product = await get_product_info(update_data["product_id"])
        if not product:
            raise HTTPException(status_code=400, detail="Product not found")
        update_data["product_name"] = product["name"]
        update_data["product_sku"] = product["sku"]
    # Map category/subcategory to stored field names
    if "category" in update_data:
        update_data["product_category"] = update_data.pop("category")
    if "subcategory" in update_data:
        update_data["product_subcategory"] = update_data.pop("subcategory")
    doc = await rma_service.update(rma_id, update_data, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="RMA not found")
    return _rma_response(doc)


@router.post("/rma/{rma_id}/start-repair", response_model=RMAResponse)
async def start_rma_repair(
    rma_id: str,
    current_user: User = Depends(require_permission("inventory:update")),
):
    doc = await rma_service.update_status(
        rma_id,
        RMAStatus.REPAIRING,
        {"repair_start_date": datetime.utcnow().isoformat()},
        user_id=current_user.id,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="RMA not found")
    return _rma_response(doc)


@router.post("/rma/{rma_id}/complete-repair", response_model=RMAResponse)
async def complete_rma_repair(
    rma_id: str,
    resolution_notes: Optional[str] = None,
    current_user: User = Depends(require_permission("inventory:update")),
):
    doc = await rma_service.update_status(
        rma_id,
        RMAStatus.REPAIRED,
        {"resolution_notes": resolution_notes},
        user_id=current_user.id,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="RMA not found")
    return _rma_response(doc)


@router.post("/rma/{rma_id}/return-to-stock", response_model=RMAResponse)
async def return_rma_to_stock(
    rma_id: str,
    data: RMAReturnToStock,
    current_user: User = Depends(require_permission("inventory:update")),
):
    """Return repaired RMA item back to stock"""
    try:
        doc = await rma_service.return_to_stock(
            rma_id, data.stock_type, user_id=current_user.id, notes=data.notes,
        )
        if not doc:
            raise HTTPException(status_code=404, detail="RMA not found")
        return _rma_response(doc)
    except ValueError as e:
        logger.exception(f"Operation failed: {e}")
        raise HTTPException(status_code=400, detail="Operation failed. Please try again.")


@router.post("/rma/{rma_id}/return-to-customer", response_model=RMAResponse)
async def return_rma_to_customer(
    rma_id: str,
    data: RMAReturnToCustomer,
    current_user: User = Depends(require_permission("inventory:update")),
):
    """Return RMA item to customer — does NOT count as a sale"""
    try:
        doc = await rma_service.return_to_customer(
            rma_id,
            data.tracking_number,
            user_id=current_user.id,
            notes=data.notes,
        )
        if not doc:
            raise HTTPException(status_code=404, detail="RMA not found")
        return _rma_response(doc)
    except ValueError as e:
        logger.exception(f"Operation failed: {e}")
        raise HTTPException(status_code=400, detail="Operation failed. Please try again.")


@router.post("/rma/{rma_id}/scrap", response_model=RMAResponse)
async def scrap_rma_item(
    rma_id: str,
    notes: Optional[str] = None,
    current_user: User = Depends(require_permission("inventory:delete")),
):
    """Scrap an unrepairable RMA item"""
    try:
        doc = await rma_service.scrap_item(rma_id, user_id=current_user.id, notes=notes)
        if not doc:
            raise HTTPException(status_code=404, detail="RMA not found")
        return _rma_response(doc)
    except ValueError as e:
        logger.exception(f"Operation failed: {e}")
        raise HTTPException(status_code=400, detail="Operation failed. Please try again.")
