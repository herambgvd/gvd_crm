from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure
import asyncio
import logging
from typing import Optional

from .config import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Database connection and management class"""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
        self._connected = False
    
    async def connect(self):
        """Establish database connection"""
        try:
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=5000,
                maxPoolSize=10,
                minPoolSize=1
            )
            
            # Test the connection
            await self.client.admin.command('ping')
            
            self.database = self.client[settings.DATABASE_NAME]
            self._connected = True
            
            logger.info(f"Connected to MongoDB database: {settings.DATABASE_NAME}")
            
            # Create indexes on startup
            await self._create_indexes()
            
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error connecting to database: {e}")
            raise
    
    async def disconnect(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            self._connected = False
            logger.info("Disconnected from MongoDB")
    
    async def _create_indexes(self):
        """Create database indexes for performance"""
        if self.database is None:
            return
        
        try:
            # User indexes
            await self.database.users.create_index("username", unique=True)
            await self.database.users.create_index("email", unique=True)
            await self.database.users.create_index([("created_at", -1)])
            
            # Lead indexes
            await self.database.leads.create_index([("created_at", -1)])
            await self.database.leads.create_index("status")
            await self.database.leads.create_index("assigned_to")
            await self.database.leads.create_index("entity_id")
            await self.database.leads.create_index([("contact_email", 1), ("contact_phone", 1)])
            
            # Product indexes
            await self.database.products.create_index("sku", unique=True)
            await self.database.products.create_index("category")
            await self.database.products.create_index("is_active")
            await self.database.products.create_index([("name", "text"), ("description", "text")])
            
            # Entity indexes
            await self.database.entities.create_index("name")
            await self.database.entities.create_index("type")
            await self.database.entities.create_index("status")
            await self.database.entities.create_index([("created_at", -1)])
            
            # Sales Order indexes
            await self.database.sales_orders.create_index("order_number", unique=True)
            await self.database.sales_orders.create_index("entity_id")
            await self.database.sales_orders.create_index("status")
            await self.database.sales_orders.create_index([("order_date", -1)])
            await self.database.sales_orders.create_index("assigned_to")
            
            # Purchase Order indexes
            await self.database.purchase_orders.create_index("po_number", unique=True)
            await self.database.purchase_orders.create_index("vendor_id")
            await self.database.purchase_orders.create_index("status")
            await self.database.purchase_orders.create_index([("order_date", -1)])
            
            # Invoice indexes
            await self.database.invoices.create_index("invoice_number", unique=True)
            await self.database.invoices.create_index("entity_id")
            await self.database.invoices.create_index("status")
            await self.database.invoices.create_index([("issue_date", -1)])
            await self.database.invoices.create_index("sales_order_id")
            
            # Payment indexes
            await self.database.payments.create_index("payment_reference", unique=True)
            await self.database.payments.create_index("invoice_id")
            await self.database.payments.create_index("entity_id")
            await self.database.payments.create_index("status")
            await self.database.payments.create_index([("payment_date", -1)])
            
            # BOQ indexes
            await self.database.boqs.create_index("lead_id")
            await self.database.boqs.create_index("entity_id")
            await self.database.boqs.create_index("status")
            await self.database.boqs.create_index([("created_at", -1)])
            
            # Support Ticket indexes
            await self.database.tickets.create_index("ticket_number", unique=True)
            await self.database.tickets.create_index("customer_id")
            await self.database.tickets.create_index("status")
            await self.database.tickets.create_index("priority")
            await self.database.tickets.create_index("assigned_to")
            await self.database.tickets.create_index([("created_at", -1)])
            
            # Document indexes
            await self.database.documents.create_index("entity_type")
            await self.database.documents.create_index("entity_id")
            await self.database.documents.create_index("uploaded_by")
            await self.database.documents.create_index([("created_at", -1)])
            
            # Comment indexes
            await self.database.comments.create_index([("entity_type", 1), ("entity_id", 1)])
            await self.database.comments.create_index("author_id")
            await self.database.comments.create_index([("created_at", -1)])
            
            # Assignment indexes
            await self.database.assignments.create_index("assigned_to")
            await self.database.assignments.create_index("assigned_by")
            await self.database.assignments.create_index("status")
            await self.database.assignments.create_index("due_date")
            await self.database.assignments.create_index([("created_at", -1)])
            

            # Role and Permission indexes
            await self.database.roles.create_index("name", unique=True)
            await self.database.permissions.create_index("codename", unique=True)
            await self.database.permissions.create_index([("resource", 1), ("action", 1)], unique=True)
            
            # Enquiry indexes (for upcoming enquiry module)
            await self.database.enquiries.create_index([("created_at", -1)])
            await self.database.enquiries.create_index("status")
            await self.database.enquiries.create_index("created_by")
            await self.database.enquiries.create_index([("project_name", "text"), ("details", "text")])
            await self.database.enquiry_remarks.create_index("enquiry_id")
            await self.database.enquiry_comments.create_index("enquiry_id")
            
            # Team indexes
            await self.database.teams.create_index("name", unique=True)
            await self.database.teams.create_index("leader_id")
            
            # Stock movement / inventory indexes (legacy)
            await self.database.stock_movements.create_index("product_id")
            await self.database.stock_movements.create_index("movement_type")
            await self.database.stock_movements.create_index([("created_at", -1)])
            await self.database.stock_alerts.create_index("product_id")
            await self.database.stock_alerts.create_index("status")
            
            # ─── Inventory Management Module Indexes ───
            
            # Factory Orders
            await self.database.factory_orders.create_index("order_number", unique=True)
            await self.database.factory_orders.create_index("factory_name")
            await self.database.factory_orders.create_index("status")
            await self.database.factory_orders.create_index([("created_at", -1)])
            await self.database.factory_orders.create_index("forecast_id")
            
            # In-Transit Inventory
            await self.database.in_transit_inventory.create_index("shipment_number", unique=True)
            await self.database.in_transit_inventory.create_index("factory_order_id")
            await self.database.in_transit_inventory.create_index("status")
            await self.database.in_transit_inventory.create_index("tracking_number")
            await self.database.in_transit_inventory.create_index([("created_at", -1)])
            
            # Warehouse Stock
            await self.database.warehouse_stock.create_index("product_id", unique=True)
            await self.database.warehouse_stock.create_index("product_sku")
            await self.database.warehouse_stock.create_index("warehouse_location")
            await self.database.warehouse_stock.create_index("is_active")
            await self.database.warehouse_stock.create_index([("product_name", "text")])
            
            # Inventory Movements (Audit Trail)
            await self.database.inventory_movements.create_index("product_id")
            await self.database.inventory_movements.create_index("movement_type")
            await self.database.inventory_movements.create_index("reference_type")
            await self.database.inventory_movements.create_index("reference_id")
            await self.database.inventory_movements.create_index([("created_at", -1)])
            
            # Stock Allocations
            await self.database.stock_allocations.create_index("product_id")
            await self.database.stock_allocations.create_index("stock_type")
            await self.database.stock_allocations.create_index("entity_id")
            await self.database.stock_allocations.create_index("demo_status")
            await self.database.stock_allocations.create_index([("allocated_at", -1)])
            
            # Demo Approvals
            await self.database.demo_approvals.create_index("request_number", unique=True)
            await self.database.demo_approvals.create_index("product_id")
            await self.database.demo_approvals.create_index("status")
            await self.database.demo_approvals.create_index("requested_by")
            await self.database.demo_approvals.create_index([("created_at", -1)])
            
            # Demand Forecasts
            await self.database.demand_forecasts.create_index("forecast_number", unique=True)
            await self.database.demand_forecasts.create_index("product_id")
            await self.database.demand_forecasts.create_index("forecast_period")
            await self.database.demand_forecasts.create_index("is_converted_to_po")
            await self.database.demand_forecasts.create_index([("created_at", -1)])
            
            # RMA Records
            await self.database.rma_records.create_index("rma_number", unique=True)
            await self.database.rma_records.create_index("product_id")
            await self.database.rma_records.create_index("entity_id")
            await self.database.rma_records.create_index("status")
            await self.database.rma_records.create_index("assigned_to")
            await self.database.rma_records.create_index("is_warranty_claim")
            await self.database.rma_records.create_index([("created_at", -1)])
            
            # GRN Records
            await self.database.grn_records.create_index("grn_number", unique=True)
            await self.database.grn_records.create_index("factory_order_id")
            await self.database.grn_records.create_index("in_transit_id")
            await self.database.grn_records.create_index([("created_at", -1)])
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.warning(f"Failed to create some indexes: {e}")
    
    def get_database(self) -> AsyncIOMotorDatabase:
        """Get database instance"""
        if not self._connected or self.database is None:
            raise ConnectionError("Database not connected")
        return self.database
    
    async def health_check(self) -> bool:
        """Check database health"""
        try:
            if not self.client:
                return False
            await self.client.admin.command('ping')
            return True
        except Exception:
            return False

# Global database manager instance
db_manager = DatabaseManager()

async def connect_database():
    """Connect to database on startup"""
    await db_manager.connect()

async def disconnect_database():
    """Disconnect from database on shutdown"""
    await db_manager.disconnect()

def get_database() -> AsyncIOMotorDatabase:
    """Get database instance for dependency injection"""
    return db_manager.get_database()

# Convenience function to get database (backwards compatibility)
def get_db() -> AsyncIOMotorDatabase:
    """Get database instance"""
    return get_database()