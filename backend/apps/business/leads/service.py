"""
Lead Management Service — uses BaseCRUDService for consistent patterns
"""

from typing import Any, Dict, List, Optional
from core.base_service import BaseCRUDService, serialize_document
from core.database import get_database
from core.pagination import paginate
from datetime import datetime, timezone
import uuid


class LeadService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="leads")

    async def list_leads(
        self,
        page: int = 1,
        page_size: int = 20,
        status: str = None,
        channel: str = None,
        priority: str = None,
        assigned_to: str = None,
        search: str = None,
        sort_by: str = "created_at",
        sort_order: int = -1,
    ) -> Dict[str, Any]:
        """List leads with filters and server-side pagination."""
        query: Dict[str, Any] = {}

        if status:
            query["status"] = status
        if channel:
            query["channel"] = channel
        if priority:
            query["priority"] = priority
        if assigned_to:
            query["assigned_to"] = assigned_to
        if search:
            query["$or"] = [
                {"contact_name": {"$regex": search, "$options": "i"}},
                {"company": {"$regex": search, "$options": "i"}},
                {"project_name": {"$regex": search, "$options": "i"}},
                {"contact_email": {"$regex": search, "$options": "i"}},
                {"contact_phone": {"$regex": search, "$options": "i"}},
                {"source": {"$regex": search, "$options": "i"}},
            ]

        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[(sort_by, sort_order)],
        )

    async def get_stats(self) -> Dict[str, Any]:
        """Get lead statistics for dashboard."""
        db = get_database()
        col = db.leads
        base = {"is_deleted": {"$ne": True}}

        total = await col.count_documents(base)
        new_count = await col.count_documents({**base, "status": "new"})
        qualified = await col.count_documents({**base, "status": "qualified"})
        contacted = await col.count_documents({**base, "status": "contacted"})
        converted = await col.count_documents({**base, "status": "converted"})
        lost = await col.count_documents({**base, "status": "lost"})

        # Pipeline value
        pipeline = [
            {"$match": {**base, "expected_value": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": None, "total_value": {"$sum": "$expected_value"}}},
        ]
        value_result = await col.aggregate(pipeline).to_list(1)
        total_value = value_result[0]["total_value"] if value_result else 0

        # By channel
        channel_pipeline = [
            {"$match": base},
            {"$group": {"_id": "$channel", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        by_channel = {
            doc["_id"]: doc["count"]
            for doc in await col.aggregate(channel_pipeline).to_list(20)
            if doc["_id"]
        }

        # By priority
        priority_pipeline = [
            {"$match": base},
            {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
        ]
        by_priority = {
            doc["_id"]: doc["count"]
            for doc in await col.aggregate(priority_pipeline).to_list(10)
            if doc["_id"]
        }

        return {
            "total": total,
            "by_status": {
                "new": new_count,
                "qualified": qualified,
                "contacted": contacted,
                "converted": converted,
                "lost": lost,
            },
            "by_channel": by_channel,
            "by_priority": by_priority,
            "pipeline_value": float(total_value),
            "conversion_rate": round((converted / total * 100), 1) if total > 0 else 0,
        }


class LeadAssignmentService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="assignments")

    async def get_lead_assignments(self, lead_id: str) -> List[Dict[str, Any]]:
        """Get all assignments for a lead."""
        return await self.find_many(
            query={"lead_id": lead_id},
            sort=[("created_at", -1)],
        )

    async def create_assignment(
        self,
        lead_id: str,
        user_id: str,
        assigned_by: str,
        role: str = "assigned",
        notes: str = None,
    ) -> Dict[str, Any]:
        """Create a lead assignment."""
        from fastapi import HTTPException

        db = get_database()
        lead = await db.leads.find_one(
            {"id": lead_id, "is_deleted": {"$ne": True}}, {"_id": 0}
        )
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        data = {
            "lead_id": lead_id,
            "user_id": user_id,
            "role": role,
            "notes": notes,
            "assigned_by": assigned_by,
        }
        return await self.create(data, user_id=assigned_by)


class LeadDocumentService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="lead_documents")

    async def get_lead_documents(self, lead_id: str) -> List[Dict[str, Any]]:
        """Get all documents for a lead."""
        return await self.find_many(
            query={"lead_id": lead_id},
            sort=[("created_at", -1)],
        )


class LeadInvolvementService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="lead_involvements")

    async def get_lead_involvements(self, lead_id: str) -> List[Dict[str, Any]]:
        """Get all involvements for a lead."""
        return await self.find_many(
            query={"lead_id": lead_id},
            sort=[("created_at", -1)],
        )


# Singletons
lead_service = LeadService()
lead_assignment_service = LeadAssignmentService()
lead_document_service = LeadDocumentService()
lead_involvement_service = LeadInvolvementService()
