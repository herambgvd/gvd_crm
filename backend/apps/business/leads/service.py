"""
Lead Management Service — uses BaseCRUDService for consistent patterns
"""

from typing import Any, Dict, List, Optional
from core.base_service import BaseCRUDService, serialize_document
from core.database import get_database
from core.pagination import paginate
from datetime import datetime, timezone
import re
import uuid


class LeadService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="leads")

    async def list_leads(
        self,
        page: int = 1,
        page_size: int = 20,
        status: str = None,
        priority: str = None,
        assigned_to: str = None,
        search: str = None,
        sort_by: str = "created_at",
        sort_order: int = -1,
        current_user_id: str = None,
        is_superuser: bool = True,
        sop_id: str = None,
        current_state_id: str = None,
    ) -> Dict[str, Any]:
        """List leads with filters and server-side pagination.

        Non-superusers only see leads they created or are assigned to.
        """
        query: Dict[str, Any] = {}

        # Access restriction: team-based data access control
        from core.data_access import build_access_query, merge_access_filter
        access_filter = await build_access_query(current_user_id, is_superuser)
        query = merge_access_filter(query, access_filter)

        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if assigned_to:
            query["assigned_to"] = assigned_to
        if sop_id:
            query["sop_id"] = sop_id
        if current_state_id:
            query["current_state_id"] = current_state_id
        if search:
            escaped = re.escape(search)
            search_filter = [
                {"project_name": {"$regex": escaped, "$options": "i"}},
                {"source": {"$regex": escaped, "$options": "i"}},
                {"notes": {"$regex": escaped, "$options": "i"}},
            ]
            # Merge search $or with access $or if both present
            if "$or" in query:
                query["$and"] = [{"$or": query.pop("$or")}, {"$or": search_filter}]
            else:
                query["$or"] = search_filter

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

        # Single aggregation for state counts
        pipeline = [
            {"$match": base},
            {"$group": {"_id": "$current_state_name", "count": {"$sum": 1}}},
        ]
        state_results = await col.aggregate(pipeline).to_list(50)
        by_state = {r["_id"]: r["count"] for r in state_results if r["_id"]}

        # Pipeline value
        value_pipeline = [
            {"$match": {**base, "expected_value": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": None, "total_value": {"$sum": {"$toDouble": {"$ifNull": ["$expected_value", 0]}}}}},
        ]
        value_result = await col.aggregate(value_pipeline).to_list(1)
        total_value = value_result[0]["total_value"] if value_result else 0

        return {
            "total": total,
            "by_state": by_state,
            "pipeline_value": total_value,
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
