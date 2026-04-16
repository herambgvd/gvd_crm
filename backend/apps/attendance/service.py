"""Attendance Service — punch in/out logic, team/admin queries."""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from core.base_service import BaseCRUDService
from core.database import get_database

logger = logging.getLogger(__name__)


def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


class AttendanceService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="attendance")

    async def get_today_record(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch today's attendance record for a user."""
        db = get_database()
        return await db.attendance.find_one(
            {
                "user_id": user_id,
                "date": _today_str(),
                "is_deleted": {"$ne": True},
            },
            {"_id": 0},
        )

    async def punch_in(
        self,
        user_id: str,
        user_name: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        ip: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create today's attendance record. Raises if already punched in."""
        existing = await self.get_today_record(user_id)
        if existing:
            from fastapi import HTTPException
            if existing.get("punch_out_at"):
                raise HTTPException(status_code=400, detail="Already completed attendance for today")
            raise HTTPException(status_code=400, detail="Already punched in today")

        now = datetime.now(timezone.utc)
        payload = {
            "user_id": user_id,
            "user_name": user_name,
            "date": _today_str(),
            "punch_in_at": now,
            "punch_in_location": {"lat": lat, "lng": lng, "ip": ip},
        }
        return await self.create(payload, user_id=user_id)

    async def punch_out(
        self,
        user_id: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        ip: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Close today's open record and calculate hours."""
        from fastapi import HTTPException

        # Find open record (could be today OR earlier day if user forgot)
        db = get_database()
        record = await db.attendance.find_one(
            {
                "user_id": user_id,
                "punch_out_at": None,
                "is_deleted": {"$ne": True},
            },
            {"_id": 0},
            sort=[("punch_in_at", -1)],
        )
        if not record:
            raise HTTPException(status_code=400, detail="No active punch-in found. Punch in first.")

        now = datetime.now(timezone.utc)
        punch_in_at = record["punch_in_at"]
        if isinstance(punch_in_at, str):
            punch_in_at = datetime.fromisoformat(punch_in_at.replace("Z", "+00:00"))

        delta_seconds = (now - punch_in_at).total_seconds()
        total_hours = round(delta_seconds / 3600, 2)

        update = {
            "punch_out_at": now,
            "punch_out_location": {"lat": lat, "lng": lng, "ip": ip},
            "total_hours": total_hours,
        }
        return await self.update(record["id"], update, user_id=user_id)

    async def list_user_history(
        self,
        user_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {"user_id": user_id}
        if start_date or end_date:
            date_filter: Dict[str, Any] = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            query["date"] = date_filter

        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("date", -1)],
        )

    async def list_team_attendance(
        self,
        leader_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        user_id_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """List attendance for all members of teams this user leads."""
        db = get_database()

        led_teams = await db.teams.find(
            {
                "$or": [{"leader_id": leader_id}, {"leader_ids": leader_id}],
                "is_deleted": {"$ne": True},
            },
            {"_id": 0, "member_ids": 1},
        ).to_list(50)

        member_ids = set()
        for team in led_teams:
            member_ids.update(team.get("member_ids", []))
        member_ids.add(leader_id)  # include self

        if not member_ids:
            return {"items": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 0}

        query: Dict[str, Any] = {"user_id": {"$in": list(member_ids)}}
        if user_id_filter and user_id_filter in member_ids:
            query["user_id"] = user_id_filter
        if start_date or end_date:
            date_filter: Dict[str, Any] = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            query["date"] = date_filter

        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("date", -1), ("user_name", 1)],
        )

    async def list_all_attendance(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        user_id_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """Admin — list all attendance records."""
        query: Dict[str, Any] = {}
        if user_id_filter:
            query["user_id"] = user_id_filter
        if start_date or end_date:
            date_filter: Dict[str, Any] = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            query["date"] = date_filter

        return await self.list(
            query=query,
            page=page,
            page_size=page_size,
            sort=[("date", -1), ("user_name", 1)],
        )

    async def find_all_for_export(
        self,
        query: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        return await self.find_many(query=query, sort=[("date", -1), ("user_name", 1)])


attendance_service = AttendanceService()
