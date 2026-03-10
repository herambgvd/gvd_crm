"""
Team Model, Schemas, Service, and Views

Teams group users under a leader. Used for assignment routing, support escalation, etc.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Schemas ─────────────────────────────────────

class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    leader_id: Optional[str] = None
    member_ids: List[str] = Field(default_factory=list)
    department: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    leader_id: Optional[str] = None
    member_ids: Optional[List[str]] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class TeamResponse(BaseModel):
    id: str
    name: str = ""
    description: Optional[str] = None
    leader_id: Optional[str] = None
    leader_name: Optional[str] = None
    member_ids: List[str] = Field(default_factory=list)
    members: List[dict] = Field(default_factory=list)  # [{id, name}]
    department: Optional[str] = None
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
