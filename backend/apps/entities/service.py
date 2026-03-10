"""
Entity Service — uses BaseCRUDService for consistent patterns
"""

from core.base_service import BaseCRUDService


class EntityService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="entities")

    async def list_entities(
        self,
        page: int = 1,
        page_size: int = 20,
        entity_type: str = None,
        status: str = None,
        search: str = None,
        city: str = None,
        state: str = None,
    ):
        """List entities with filters and pagination."""
        query = {"is_deleted": {"$ne": True}}

        if entity_type:
            query["entity_type"] = entity_type
        if status:
            query["status"] = status
        if city:
            query["city"] = {"$regex": city, "$options": "i"}
        if state:
            query["state"] = {"$regex": state, "$options": "i"}
        if search:
            query["$or"] = [
                {"company_name": {"$regex": search, "$options": "i"}},
                {"contact_person": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"gstin": {"$regex": search, "$options": "i"}},
            ]

        from core.pagination import paginate

        return await paginate(
            collection=self.collection,
            query=query,
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
        )

    async def search_entities(self, term: str, limit: int = 10):
        """Quick-search for entity connections (autocomplete)."""
        if not term:
            return []

        query = {
            "is_deleted": {"$ne": True},
            "status": "active",
            "$or": [
                {"company_name": {"$regex": term, "$options": "i"}},
                {"contact_person": {"$regex": term, "$options": "i"}},
            ],
        }

        docs = (
            await self.collection
            .find(query, {"_id": 0, "id": 1, "company_name": 1, "entity_type": 1, "contact_person": 1})
            .limit(limit)
            .to_list(limit)
        )
        return docs


# Singleton
entity_service = EntityService()
