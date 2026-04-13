"""Tasks Service — CRUD + collaborator-based access."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from core.base_service import BaseCRUDService
from core.database import get_database

logger = logging.getLogger(__name__)


class TaskService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="tasks")

    def _access_filter(self, user_id: str, is_superuser: bool = False) -> Dict[str, Any]:
        """User sees tasks they created OR are a collaborator on. Superuser sees all."""
        if is_superuser:
            return {}
        return {
            "$or": [
                {"created_by": user_id},
                {"collaborators": user_id},
            ]
        }

    async def list_tasks(
        self,
        user_id: str,
        is_superuser: bool = False,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
        filter_type: Optional[str] = None,  # "mine", "collaborating", "all"
    ) -> Dict[str, Any]:
        import re as regex_module

        query: Dict[str, Any] = {}

        if filter_type == "mine":
            query["created_by"] = user_id
        elif filter_type == "collaborating":
            query["collaborators"] = user_id
        else:
            if not is_superuser:
                query.update(self._access_filter(user_id))

        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if search:
            escaped = regex_module.escape(search)
            search_clause = [
                {"title": {"$regex": escaped, "$options": "i"}},
                {"description": {"$regex": escaped, "$options": "i"}},
            ]
            if "$or" in query:
                query["$and"] = [{"$or": query.pop("$or")}, {"$or": search_clause}]
            else:
                query["$or"] = search_clause

        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("due_date", 1), ("created_at", -1)],
        )

    async def get_calendar_tasks(
        self,
        user_id: str,
        is_superuser: bool,
        start: datetime,
        end: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch tasks with due_date within [start, end)."""
        query: Dict[str, Any] = {
            "due_date": {"$gte": start.isoformat(), "$lt": end.isoformat()},
        }
        if not is_superuser:
            query.update(self._access_filter(user_id))

        return await self.find_many(query=query, sort=[("due_date", 1)])

    async def enrich_users(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Add created_by_name and collaborator_names to tasks."""
        if not tasks:
            return tasks

        user_ids = set()
        for t in tasks:
            if t.get("created_by"):
                user_ids.add(t["created_by"])
            for c in t.get("collaborators", []):
                user_ids.add(c)

        if not user_ids:
            return tasks

        db = get_database()
        users = await db.users.find(
            {"id": {"$in": list(user_ids)}},
            {"_id": 0, "id": 1, "first_name": 1, "last_name": 1},
        ).to_list(len(user_ids))
        user_map = {
            u["id"]: f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()
            for u in users
        }

        # Get comment counts
        task_ids = [t["id"] for t in tasks]
        comment_counts = await db.task_comments.aggregate([
            {"$match": {"task_id": {"$in": task_ids}, "is_deleted": {"$ne": True}}},
            {"$group": {"_id": "$task_id", "count": {"$sum": 1}}},
        ]).to_list(len(task_ids))
        count_map = {c["_id"]: c["count"] for c in comment_counts}

        for t in tasks:
            t["created_by_name"] = user_map.get(t.get("created_by"), "")
            t["collaborator_names"] = [
                user_map.get(c, "") for c in t.get("collaborators", [])
            ]
            t["comment_count"] = count_map.get(t["id"], 0)

        return tasks

    async def can_access(self, task_id: str, user_id: str, is_superuser: bool) -> bool:
        task = await self.get_by_id(task_id)
        if not task:
            return False
        if is_superuser:
            return True
        return (
            task.get("created_by") == user_id
            or user_id in task.get("collaborators", [])
        )


class TaskCommentService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="task_comments")

    async def list_for_task(self, task_id: str) -> List[Dict[str, Any]]:
        return await self.find_many(
            query={"task_id": task_id},
            sort=[("created_at", 1)],
        )


task_service = TaskService()
task_comment_service = TaskCommentService()
