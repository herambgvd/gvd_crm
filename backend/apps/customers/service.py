"""
Customer Service — uses the dedicated 'customers' MongoDB collection.
"""

from core.base_service import BaseCRUDService


class CustomerService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="customers")

    async def list_customers(
        self,
        page: int = 1,
        page_size: int = 20,
        status: str = None,
        search: str = None,
        city: str = None,
        state: str = None,
    ):
        query = {"is_deleted": {"$ne": True}}

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

    async def search_customers(self, term: str, limit: int = 10):
        query = {"is_deleted": {"$ne": True}, "status": "active"}
        if term:
            query["$or"] = [
                {"company_name": {"$regex": term, "$options": "i"}},
                {"contact_person": {"$regex": term, "$options": "i"}},
            ]

        docs = (
            await self.collection
            .find(query, {"_id": 0, "id": 1, "company_name": 1, "contact_person": 1, "phone": 1, "email": 1})
            .limit(limit)
            .to_list(limit)
        )
        return docs


customer_service = CustomerService()
