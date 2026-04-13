"""Attendance Models — simple punch in / punch out with location + IP capture."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class LocationInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lat: Optional[float] = None
    lng: Optional[float] = None
    ip: Optional[str] = None


class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str = ""
    date: str  # YYYY-MM-DD
    punch_in_at: datetime
    punch_in_location: Optional[LocationInfo] = None
    punch_out_at: Optional[datetime] = None
    punch_out_location: Optional[LocationInfo] = None
    total_hours: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False
