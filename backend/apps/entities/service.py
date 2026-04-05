"""
Entity Service — uses BaseCRUDService for consistent patterns
"""

import re

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
            query["city"] = {"$regex": re.escape(city), "$options": "i"}
        if state:
            query["state"] = {"$regex": re.escape(state), "$options": "i"}
        if search:
            escaped = re.escape(search)
            query["$or"] = [
                {"company_name": {"$regex": escaped, "$options": "i"}},
                {"contact_person": {"$regex": escaped, "$options": "i"}},
                {"email": {"$regex": escaped, "$options": "i"}},
                {"phone": {"$regex": escaped, "$options": "i"}},
                {"gstin": {"$regex": escaped, "$options": "i"}},
            ]

        from core.pagination import paginate

        return await paginate(
            collection=self.collection,
            query=query,
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
        )

    async def search_entities(self, term: str, limit: int = 10, entity_type: str = None):
        """Quick-search for entity connections (autocomplete), with optional type filter."""
        query = {"is_deleted": {"$ne": True}, "status": {"$ne": "inactive"}}
        if entity_type:
            query["entity_type"] = entity_type
        if term:
            escaped = re.escape(term)
            query["$or"] = [
                {"company_name": {"$regex": escaped, "$options": "i"}},
                {"contact_person": {"$regex": escaped, "$options": "i"}},
            ]

        docs = (
            await self.collection
            .find(query, {"_id": 0, "id": 1, "company_name": 1, "entity_type": 1, "contact_person": 1})
            .limit(limit)
            .to_list(limit)
        )
        return docs

    async def search_entities_by_type(self, term: str, entity_type: str, limit: int = 10):
        """Quick-search filtered by entity_type (e.g. end_customer, consultant)."""
        query = {
            "is_deleted": {"$ne": True},
            "status": {"$ne": "inactive"},
            "entity_type": entity_type,
        }
        if term:
            escaped = re.escape(term)
            query["$or"] = [
                {"company_name": {"$regex": escaped, "$options": "i"}},
                {"contact_person": {"$regex": escaped, "$options": "i"}},
            ]

        docs = (
            await self.collection
            .find(query, {
                "_id": 0, "id": 1, "company_name": 1, "entity_type": 1,
                "contact_person": 1, "phone": 1, "email": 1,
            })
            .limit(limit)
            .to_list(limit)
        )
        return docs


    async def create_team_member(self, doc: dict) -> dict:
        """Insert a TeamMember document into entity_team_members collection."""
        import uuid
        from datetime import datetime, timezone
        from core.database import get_database

        db = get_database()
        doc.setdefault("id", str(uuid.uuid4()))
        doc.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        doc.setdefault("updated_at", datetime.now(timezone.utc).isoformat())
        doc.setdefault("is_deleted", False)
        await db.entity_team_members.insert_one(doc)
        doc.pop("_id", None)
        return doc


# Singleton
entity_service = EntityService()
