from fastapi import APIRouter, Depends
from apps.authentication.views import router as auth_router
from apps.authentication.team_views import router as team_router
from apps.authentication.config_views import router as config_router
from apps.business.leads.views import router as leads_router
from apps.business.products.views import router as products_router
from apps.business.orders.views import router as orders_router
from apps.business.finance.views import router as finance_router
from apps.business.workflow.views import router as workflow_router
from apps.business.inventory.views import router as inventory_router
from apps.business.warehouse.views import router as warehouse_router
from apps.workflow_engine.views import router as workflow_engine_router
from apps.tasks.views import router as tasks_router
from apps.import_engine.views import router as import_engine_router
from apps.support.views import router as support_router
from apps.support.ticket_views import router as ticket_lifecycle_router

# Standalone entity module + customer master
from apps.entities.views import router as entity_router
from apps.entities.customer_views import router as customer_router
from apps.business.leads.assignment_views import router as assignment_router
from apps.business.leads.lead_document_views import router as lead_document_router
from apps.business.leads.lead_involvement_views import router as lead_involvement_router
from apps.business.workflow.comment_views import router as comment_router
from apps.business.workflow.remark_views import router as remark_router
from apps.business.workflow.notification_views import router as notification_router
from apps.business.workflow.document_views import router as document_router
from apps.business.workflow.template_views import router as template_router
from apps.business.workflow.warranty_views import router as warranty_router
from core.auth import get_current_user
from core.database import get_database

# Main API router
api_router = APIRouter(prefix="/api/v1")

# Health check endpoint
@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "GVD CRM API",
        "version": "1.0.0"
    }

# Dashboard endpoints
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user = Depends(get_current_user)):
    """Get dashboard statistics for Sales, Support, and Inventory tabs."""
    db = get_database()
    nd = {"is_deleted": {"$ne": True}}

    # ── Sales stats ──
    leads_count = await db.leads.count_documents(nd)
    leads_by_state = await db.leads.aggregate([
        {"$match": nd}, {"$group": {"_id": "$current_state_name", "count": {"$sum": 1}}}
    ]).to_list(50)

    revenue_result = await db.sales_orders.aggregate([
        {"$match": nd},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$total_amount", 0]}}}}},
    ]).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0

    pipeline_result = await db.leads.aggregate([
        {"$match": {**nd, "expected_value": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$expected_value", 0]}}}}},
    ]).to_list(1)
    pipeline_value = pipeline_result[0]["total"] if pipeline_result else 0

    sales_orders_count = await db.sales_orders.count_documents(nd)
    boqs_count = await db.boqs.count_documents(nd)
    customers_count = await db.customers.count_documents(nd)
    entities_count = await db.entities.count_documents(nd)

    # ── Support stats ──
    collections = await db.list_collection_names()
    tickets_count = await db.tickets.count_documents(nd) if "tickets" in collections else 0
    tickets_by_state = []
    if "tickets" in collections:
        tickets_by_state = await db.tickets.aggregate([
            {"$match": nd}, {"$group": {"_id": "$current_state_name", "count": {"$sum": 1}}}
        ]).to_list(50)

    # ── Inventory stats ──
    products_count = await db.products.count_documents(nd)
    factory_orders_count = await db.factory_orders.count_documents(nd) if "factory_orders" in collections else 0
    rma_count = await db.rma_records.count_documents(nd) if "rma_records" in collections else 0

    low_stock_count = await db.products.count_documents({
        **nd, "is_active": True,
        "$expr": {"$lte": [{"$ifNull": ["$total_quantity", 0]}, {"$ifNull": ["$min_stock_level", 0]}]}
    })

    stock_value_result = await db.products.aggregate([
        {"$match": {**nd, "is_active": True}},
        {"$group": {"_id": None, "total": {"$sum": {
            "$multiply": [{"$toDouble": {"$ifNull": ["$unit_price", 0]}}, {"$ifNull": ["$total_quantity", 0]}]
        }}}},
    ]).to_list(1)
    stock_value = stock_value_result[0]["total"] if stock_value_result else 0

    return {
        "sales": {
            "total_leads": leads_count,
            "leads_by_state": {r["_id"]: r["count"] for r in leads_by_state if r["_id"]},
            "total_revenue": total_revenue,
            "pipeline_value": pipeline_value,
            "sales_orders": sales_orders_count,
            "boqs": boqs_count,
            "customers": customers_count,
            "entities": entities_count,
        },
        "support": {
            "total_tickets": tickets_count,
            "tickets_by_state": {r["_id"]: r["count"] for r in tickets_by_state if r["_id"]},
        },
        "inventory": {
            "total_products": products_count,
            "factory_orders": factory_orders_count,
            "rma_records": rma_count,
            "low_stock": low_stock_count,
            "stock_value": stock_value,
        },
    }

# Include authentication routes
api_router.include_router(auth_router, tags=["Authentication"])
api_router.include_router(team_router, tags=["Teams"])
api_router.include_router(config_router, tags=["Config"])

# Include business module routes
api_router.include_router(leads_router, prefix="/leads", tags=["Leads"])
api_router.include_router(products_router, prefix="/products", tags=["Products & Inventory"])

# Orders - mount WITHOUT prefix (internal routes already have /boqs/, /sales-orders/, /purchase-orders/)
api_router.include_router(orders_router, tags=["Orders & BOQ"])

# Finance - mount WITHOUT prefix (internal routes already have /invoices/, /payments/)
api_router.include_router(finance_router, tags=["Finance & Payments"])

# Workflow (legacy routes at /workflow/tasks/, etc.)
api_router.include_router(workflow_router, prefix="/workflow", tags=["Workflow"])

# Support - main routes + ticket lifecycle sub-resources
api_router.include_router(support_router, prefix="/support", tags=["Support & Tickets"])
api_router.include_router(ticket_lifecycle_router, prefix="/support", tags=["Ticket Lifecycle"])

# New standalone resource routers
api_router.include_router(entity_router, prefix="/entities", tags=["Entities"])
api_router.include_router(customer_router, prefix="/customers", tags=["Customers"])
api_router.include_router(assignment_router, prefix="/assignments", tags=["Assignments"])
api_router.include_router(lead_document_router, prefix="/lead-documents", tags=["Lead Documents"])
api_router.include_router(lead_involvement_router, prefix="/lead-involvements", tags=["Lead Involvements"])
api_router.include_router(comment_router, prefix="/comments", tags=["Comments"])
api_router.include_router(remark_router, prefix="/remarks", tags=["Remarks"])
api_router.include_router(notification_router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(document_router, prefix="/documents", tags=["Documents"])
api_router.include_router(template_router, prefix="/templates", tags=["Templates"])
api_router.include_router(warranty_router, prefix="/warranties", tags=["Warranties"])

# Inventory Management
api_router.include_router(inventory_router, prefix="/inventory", tags=["Inventory Management"])
api_router.include_router(warehouse_router, prefix="/warehouses", tags=["Warehouses"])

# Workflow Engine (SOP Builder)
api_router.include_router(workflow_engine_router, prefix="/workflow-engine", tags=["Workflow Engine"])

# Tasks (Todo)
api_router.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])

# Import Engine
api_router.include_router(import_engine_router, prefix="/import", tags=["Import Engine"])