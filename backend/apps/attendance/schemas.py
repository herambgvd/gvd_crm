"""Attendance Schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PunchRequest(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None


class LocationSchema(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    ip: Optional[str] = None


class AttendanceResponse(BaseModel):
    model_config = {"extra": "ignore"}

    id: str = ""
    user_id: str = ""
    user_name: str = ""
    date: str = ""
    punch_in_at: Optional[datetime] = None
    punch_in_location: Optional[LocationSchema] = None
    punch_out_at: Optional[datetime] = None
    punch_out_location: Optional[LocationSchema] = None
    total_hours: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AttendanceUpdate(BaseModel):
    """Admin-only — manual corrections."""
    punch_in_at: Optional[datetime] = None
    punch_out_at: Optional[datetime] = None
