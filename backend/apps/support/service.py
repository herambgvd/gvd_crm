"""
Support Module Service Layer — uses BaseCRUDService for consistent patterns.

Services:
    TicketService        — tickets collection
    IssueLoggingService  — issue_logging collection
    EscalationService    — escalations collection
    ResolutionService    — resolutions collection
    TroubleshootingService — troubleshooting_actions collection
    CustomerFeedbackService — customer_feedback collection
    SystemEnvironmentService — system_environments collection
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

    async def get_ticket_with_sub_resources(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        """Get a ticket with all its sub-resources for detail view."""
        ticket = await self.get_by_id(ticket_id)
        if not ticket:
            return None

        db = get_database()

        # Fetch all sub-resources in parallel-style (sequential but fast)
        issue_logging = await db.issue_logging.find(
            {"ticket_id": ticket_id, "is_deleted": {"$ne": True}}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)

        system_environment = await db.system_environments.find(
            {"ticket_id": ticket_id, "is_deleted": {"$ne": True}}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)

        troubleshooting_actions = await db.troubleshooting_actions.find(
            {"ticket_id": ticket_id}, {"_id": 0}
        ).sort("performed_at", -1).to_list(100)

        escalations = await db.escalations.find(
            {"ticket_id": ticket_id, "is_deleted": {"$ne": True}}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)

        resolutions = await db.resolutions.find(
            {"ticket_id": ticket_id, "is_deleted": {"$ne": True}}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)

        feedback = await db.customer_feedback.find(
            {"ticket_id": ticket_id, "is_deleted": {"$ne": True}}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)

        # Collect user IDs for name resolution
        user_ids = set()
        if ticket.get("assigned_to"):
            user_ids.add(ticket["assigned_to"])
        if ticket.get("created_by"):
            user_ids.add(ticket["created_by"])
        for esc in escalations:
            if esc.get("escalated_to"):
                user_ids.add(esc["escalated_to"])
            if esc.get("escalated_by"):
                user_ids.add(esc["escalated_by"])
        for res in resolutions:
            if res.get("resolved_by"):
                user_ids.add(res["resolved_by"])

        user_dict = {}
        if user_ids:
            users = await db.users.find(
                {"id": {"$in": list(user_ids)}}, {"_id": 0, "id": 1, "name": 1, "username": 1}
            ).to_list(None)
            user_dict = {u["id"]: u.get("name", u.get("username", "Unknown")) for u in users}

        ticket["assigned_to_name"] = user_dict.get(ticket.get("assigned_to"))
        ticket["created_by_name"] = user_dict.get(ticket.get("created_by"))

        return {
            "ticket": ticket,
            "issue_logging": issue_logging,
            "system_environment": system_environment,
            "troubleshooting_actions": troubleshooting_actions,
            "escalation": escalations,
            "resolution": resolutions,
            "customer_feedback": feedback,
        }


# ─────────────────── Issue Logging Service ───────────────────

class IssueLoggingService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="issue_logging")

    def _generate_issue_number(self) -> str:
        return f"ISS-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

    async def create_issue(
        self, data: Dict[str, Any], user_id: str
    ) -> Dict[str, Any]:
        data["issue_number"] = self._generate_issue_number()
        data["status"] = "open"
        return await self.create(data, user_id=user_id)

    async def list_issues(
        self,
        page: int = 1,
        page_size: int = 20,
        ticket_id: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if ticket_id:
            query["ticket_id"] = ticket_id
        if severity:
            query["severity"] = severity
        if status:
            query["status"] = status
        if search:
            escaped = re.escape(search)
            query["$or"] = [
                {"title": {"$regex": escaped, "$options": "i"}},
                {"description": {"$regex": escaped, "$options": "i"}},
                {"issue_number": {"$regex": escaped, "$options": "i"}},
            ]
        return await self.list(query=query, page=page, page_size=page_size)


# ─────────────────── Escalation Service ───────────────────

class EscalationService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="escalations")

    async def create_escalation(
        self, data: Dict[str, Any], user_id: str
    ) -> Dict[str, Any]:
        data["status"] = "pending"
        data["escalated_by"] = user_id
        return await self.create(data, user_id=user_id)

    async def list_escalations(
        self,
        page: int = 1,
        page_size: int = 20,
        ticket_id: Optional[str] = None,
        status: Optional[str] = None,
        escalation_level: Optional[int] = None,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if ticket_id:
            query["ticket_id"] = ticket_id
        if status:
            query["status"] = status
        if escalation_level:
            query["escalation_level"] = escalation_level
        return await self.list(query=query, page=page, page_size=page_size)


# ─────────────────── Resolution Service ───────────────────

class ResolutionService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="resolutions")

    async def create_resolution(
        self, data: Dict[str, Any], user_id: str
    ) -> Dict[str, Any]:
        data["status"] = "implemented"
        data["resolved_by"] = user_id
        return await self.create(data, user_id=user_id)

    async def list_resolutions(
        self,
        page: int = 1,
        page_size: int = 20,
        ticket_id: Optional[str] = None,
        resolution_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if ticket_id:
            query["ticket_id"] = ticket_id
        if resolution_type:
            query["resolution_type"] = resolution_type
        return await self.list(query=query, page=page, page_size=page_size)


# ─────────────────── Troubleshooting Service ───────────────────

class TroubleshootingService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="troubleshooting_actions")

    async def create_action(
        self, data: Dict[str, Any], user_id: str
    ) -> Dict[str, Any]:
        data["performed_by"] = user_id
        data["performed_at"] = datetime.now(timezone.utc).isoformat()
        return await self.create(data, user_id=user_id)

    async def list_actions(
        self,
        ticket_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 100,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if ticket_id:
            query["ticket_id"] = ticket_id
        return await self.list(
            query=query, page=page, page_size=page_size,
            sort=[("performed_at", -1)],
        )


# ─────────────────── Customer Feedback Service ───────────────────

class CustomerFeedbackService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="customer_feedback")

    async def list_feedback(
        self,
        page: int = 1,
        page_size: int = 20,
        ticket_id: Optional[str] = None,
        feedback_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if ticket_id:
            query["ticket_id"] = ticket_id
        if feedback_type:
            query["feedback_type"] = feedback_type
        if status:
            query["status"] = status
        if search:
            escaped = re.escape(search)
            query["$or"] = [
                {"subject": {"$regex": escaped, "$options": "i"}},
                {"message": {"$regex": escaped, "$options": "i"}},
                {"customer_name": {"$regex": escaped, "$options": "i"}},
            ]
        return await self.list(query=query, page=page, page_size=page_size)


# ─────────────────── System Environment Service ───────────────────

class SystemEnvironmentService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="system_environments")

    async def list_environments(
        self,
        ticket_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 100,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if ticket_id:
            query["ticket_id"] = ticket_id
        return await self.list(query=query, page=page, page_size=page_size)


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
issue_logging_service = IssueLoggingService()
escalation_service = EscalationService()
resolution_service = ResolutionService()
troubleshooting_service = TroubleshootingService()
customer_feedback_service = CustomerFeedbackService()
system_environment_service = SystemEnvironmentService()
knowledge_base_service = KnowledgeBaseService()
