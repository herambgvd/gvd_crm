"""
Support Module Service Layer — uses BaseCRUDService for consistent patterns.

Services:
    TicketService        — tickets collection
    KnowledgeBaseService — knowledge_base collection
"""

from typing import Any, Dict, List, Optional
from core.base_service import BaseCRUDService, serialize_document
from core.database import get_database
from datetime import datetime, timezone
import re
import uuid


# ─────────────────── Ticket Service ───────────────────

class TicketService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="tickets")

    def _generate_ticket_number(self) -> str:
        return f"TKT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

    async def create_ticket(
        self, data: Dict[str, Any], user_id: str
    ) -> Dict[str, Any]:
        """Create a new ticket with auto-generated ticket_number."""
        data["ticket_number"] = self._generate_ticket_number()
        data["status"] = data.get("status", "new")
        return await self.create(data, user_id=user_id)

    async def list_tickets(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_to: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        sop_id: Optional[str] = None,
        current_state_id: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: int = -1,
        current_user_id: Optional[str] = None,
        is_superuser: bool = True,
    ) -> Dict[str, Any]:
        """List tickets with filters and server-side pagination."""
        query: Dict[str, Any] = {}

        # Access restriction: team-based data access control
        from core.data_access import build_access_query, merge_access_filter
        if current_user_id:
            access_filter = await build_access_query(current_user_id, is_superuser)
            query = merge_access_filter(query, access_filter)

        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if assigned_to:
            query["assigned_to"] = assigned_to
        if category:
            query["category"] = category
        if sop_id:
            query["sop_id"] = sop_id
        if current_state_id:
            query["current_state_id"] = current_state_id
        if search:
            escaped = re.escape(search)
            query["$or"] = [
                {"title": {"$regex": escaped, "$options": "i"}},
                {"description": {"$regex": escaped, "$options": "i"}},
                {"ticket_number": {"$regex": escaped, "$options": "i"}},
                {"customer_name": {"$regex": escaped, "$options": "i"}},
                {"product_name": {"$regex": escaped, "$options": "i"}},
                {"project_name": {"$regex": escaped, "$options": "i"}},
            ]

        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[(sort_by, sort_order)],
        )

    async def update_status(
        self, ticket_id: str, status: str, user_id: str, extra: Optional[Dict] = None
    ) -> Optional[Dict[str, Any]]:
        """Update ticket status with optional extra fields."""
        update_data: Dict[str, Any] = {"status": status}
        if extra:
            update_data.update(extra)
        if status in ("resolved", "closed"):
            update_data["closed_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update(ticket_id, update_data, user_id=user_id)

    async def get_stats(self) -> Dict[str, Any]:
        """Get ticket statistics for dashboard."""
        col = self.collection
        base = {"is_deleted": {"$ne": True}}

        total = await col.count_documents(base)
        open_count = await col.count_documents({**base, "status": "new"})
        in_progress = await col.count_documents({**base, "status": "troubleshooting"})
        escalated = await col.count_documents({**base, "status": "escalated"})
        resolved = await col.count_documents({**base, "status": "resolved"})
        closed = await col.count_documents({**base, "status": "closed"})

        # Status distribution
        status_pipeline = [
            {"$match": base},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        status_dist = await col.aggregate(status_pipeline).to_list(None)

        # Priority distribution
        priority_pipeline = [
            {"$match": base},
            {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
        ]
        priority_dist = await col.aggregate(priority_pipeline).to_list(None)

        return {
            "total": total,
            "open": open_count,
            "in_progress": in_progress,
            "escalated": escalated,
            "resolved": resolved,
            "closed": closed,
            "status_distribution": {item["_id"]: item["count"] for item in status_dist if item["_id"]},
            "priority_distribution": {item["_id"]: item["count"] for item in priority_dist if item["_id"]},
        }


# ─────────────────── Knowledge Base Service ───────────────────

class KnowledgeBaseService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="knowledge_base")

    async def list_articles(
        self,
        page: int = 1,
        page_size: int = 20,
        category: Optional[str] = None,
        search: Optional[str] = None,
        is_public: bool = True,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if is_public:
            query["is_public"] = True
        if category:
            query["category"] = category
        if search:
            escaped = re.escape(search)
            query["$or"] = [
                {"title": {"$regex": escaped, "$options": "i"}},
                {"content": {"$regex": escaped, "$options": "i"}},
            ]
        return await self.list(
            query=query, page=page, page_size=page_size,
            sort=[("view_count", -1)],
        )


# ─────────────────── Singleton instances ───────────────────

ticket_service = TicketService()
knowledge_base_service = KnowledgeBaseService()
