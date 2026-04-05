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

        # Access restriction: non-superusers see only their leads
        if not is_superuser and current_user_id:
            db = get_database()
            assigned_lead_ids = [
                doc["lead_id"]
                async for doc in db.assignments.find(
                    {"user_id": current_user_id, "is_deleted": {"$ne": True}},
                    {"_id": 0, "lead_id": 1},
                )
            ]
            query["$or"] = [
                {"created_by": current_user_id},
                {"id": {"$in": assigned_lead_ids}},
            ]

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

        all_statuses = [
            "new_lead", "under_review", "solution_design", "proposal_submitted",
            "under_negotiation", "poc_evaluation", "price_finalization", "pi_issued",
            "order_won", "order_processing", "project_execution", "project_completed",
            "lost",
        ]
        by_status = {}
        for s in all_statuses:
            by_status[s] = await col.count_documents({**base, "status": s})

        # Pipeline value
        pipeline = [
            {"$match": {**base, "expected_value": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": None, "total_value": {"$sum": "$expected_value"}}},
        ]
        value_result = await col.aggregate(pipeline).to_list(1)
        total_value = value_result[0]["total_value"] if value_result else 0

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

        won = by_status.get("order_won", 0) + by_status.get("order_processing", 0) + \
              by_status.get("project_execution", 0) + by_status.get("project_completed", 0)

        return {
            "total": total,
            "by_status": by_status,
            "by_priority": by_priority,
            "pipeline_value": float(total_value),
            "conversion_rate": round((won / total * 100), 1) if total > 0 else 0,
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
