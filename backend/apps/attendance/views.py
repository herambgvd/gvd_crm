"""Attendance Views — punch in/out, history, team, admin, export."""

import csv
import io
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from apps.authentication.models import User
from core.auth import get_current_user
from core.database import get_database

from .schemas import (
    AttendanceResponse,
    AttendanceUpdate,
    PunchRequest,
)
from .service import attendance_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Attendance"])


def _get_client_ip(request: Request) -> Optional[str]:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


async def _is_leader(user_id: str) -> bool:
    db = get_database()
    count = await db.teams.count_documents(
        {"leader_id": user_id, "is_deleted": {"$ne": True}}
    )
    return count > 0


# ── Punch endpoints ───────────────────────────────────────────────────

@router.post("/punch-in", response_model=AttendanceResponse)
async def punch_in(
    data: PunchRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    user_name = f"{current_user.first_name} {current_user.last_name}".strip() or current_user.email
    ip = _get_client_ip(request)
    doc = await attendance_service.punch_in(
        user_id=current_user.id,
        user_name=user_name,
        lat=data.lat,
        lng=data.lng,
        ip=ip,
    )
    return AttendanceResponse(**doc)


@router.post("/punch-out", response_model=AttendanceResponse)
async def punch_out(
    data: PunchRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    ip = _get_client_ip(request)
    doc = await attendance_service.punch_out(
        user_id=current_user.id,
        lat=data.lat,
        lng=data.lng,
        ip=ip,
    )
    return AttendanceResponse(**doc)


# ── User queries ──────────────────────────────────────────────────────

@router.get("/today")
async def get_today(current_user: User = Depends(get_current_user)):
    record = await attendance_service.get_today_record(current_user.id)
    return record or {}


@router.get("/my")
async def my_history(
    current_user: User = Depends(get_current_user),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    result = await attendance_service.list_user_history(
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )
    result["items"] = [AttendanceResponse(**r).model_dump() for r in result["items"]]
    return result


# ── Team & Admin queries ──────────────────────────────────────────────

@router.get("/team")
async def team_attendance(
    current_user: User = Depends(get_current_user),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    if not await _is_leader(current_user.id) and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only team leaders can view team attendance")

    result = await attendance_service.list_team_attendance(
        leader_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        user_id_filter=user_id,
        page=page,
        page_size=page_size,
    )
    result["items"] = [AttendanceResponse(**r).model_dump() for r in result["items"]]
    return result


@router.get("/all")
async def all_attendance(
    current_user: User = Depends(get_current_user),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await attendance_service.list_all_attendance(
        start_date=start_date,
        end_date=end_date,
        user_id_filter=user_id,
        page=page,
        page_size=page_size,
    )
    result["items"] = [AttendanceResponse(**r).model_dump() for r in result["items"]]
    return result


# ── Export ────────────────────────────────────────────────────────────

@router.get("/export")
async def export_csv(
    current_user: User = Depends(get_current_user),
    scope: str = Query("my", description="my | team | all"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
):
    """Export attendance as CSV. Scope controls which records (my/team/all)."""
    query: dict = {}
    if scope == "my":
        query["user_id"] = current_user.id
    elif scope == "team":
        if not await _is_leader(current_user.id) and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Only team leaders can export team data")
        db = get_database()
        led = await db.teams.find(
            {"leader_id": current_user.id, "is_deleted": {"$ne": True}},
            {"_id": 0, "member_ids": 1},
        ).to_list(50)
        member_ids = set()
        for t in led:
            member_ids.update(t.get("member_ids", []))
        member_ids.add(current_user.id)
        query["user_id"] = {"$in": list(member_ids)}
    elif scope == "all":
        if not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Admin access required")
    else:
        raise HTTPException(status_code=400, detail="scope must be my | team | all")

    if user_id:
        query["user_id"] = user_id
    if start_date or end_date:
        date_filter: dict = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date
        query["date"] = date_filter

    records = await attendance_service.find_all_for_export(query)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "User", "Punch In", "Punch Out", "Hours", "Punch In IP", "Punch Out IP"])
    for r in records:
        pin = r.get("punch_in_at", "")
        pout = r.get("punch_out_at", "") or ""
        pin_loc = r.get("punch_in_location") or {}
        pout_loc = r.get("punch_out_location") or {}
        writer.writerow([
            r.get("date", ""),
            r.get("user_name", ""),
            pin,
            pout,
            r.get("total_hours", "") or "",
            pin_loc.get("ip", "") if isinstance(pin_loc, dict) else "",
            pout_loc.get("ip", "") if isinstance(pout_loc, dict) else "",
        ])

    output.seek(0)
    filename = f"attendance_{scope}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Admin update ──────────────────────────────────────────────────────

@router.delete("/{record_id}")
async def admin_delete_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
):
    """Admin — reset/delete an attendance record. User can punch in again after this."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")

    existing = await attendance_service.get_by_id(record_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Record not found")

    await attendance_service.soft_delete(record_id, user_id=current_user.id)
    return {"message": "Attendance record reset. User can punch in again."}


@router.put("/{record_id}", response_model=AttendanceResponse)
async def admin_update_record(
    record_id: str,
    data: AttendanceUpdate,
    current_user: User = Depends(get_current_user),
):
    """Admin manual correction — fix punch-in/out times."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")

    # Recalculate hours if both punch times present
    existing = await attendance_service.get_by_id(record_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Record not found")

    pin = update_data.get("punch_in_at") or existing.get("punch_in_at")
    pout = update_data.get("punch_out_at") or existing.get("punch_out_at")
    if pin and pout:
        if isinstance(pin, str):
            pin = datetime.fromisoformat(pin.replace("Z", "+00:00"))
        if isinstance(pout, str):
            pout = datetime.fromisoformat(pout.replace("Z", "+00:00"))
        update_data["total_hours"] = round((pout - pin).total_seconds() / 3600, 2)

    doc = await attendance_service.update(record_id, update_data, user_id=current_user.id)
    return AttendanceResponse(**doc)
