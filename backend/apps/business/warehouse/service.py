from core.base_service import BaseCRUDService

class WarehouseService(BaseCRUDService):
    """Warehouse CRUD service"""
    
    def __init__(self):
        super().__init__(collection_name="warehouses")
    
    async def get_by_unique_id(self, unique_id: str):
        """Get warehouse by unique_id"""
        return await self.get_by_field("unique_id", unique_id)

# Singleton instance
warehouse_service = WarehouseService()
