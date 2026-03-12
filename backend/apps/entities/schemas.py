"""
Entity Schemas — request/response validation
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


# ─── Create / Update ────────────────────────────

class EntityCreate(BaseModel):
    entity_type: str = Field(..., min_length=1)
    company_name: str = Field(..., min_length=1, max_length=300)
    contact_person: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = None
    phone: str = Field(default="", max_length=20)
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = "India"
    gstin: Optional[str] = None
    pan: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    status: str = "active"


class EntityUpdate(BaseModel):
    entity_type: Optional[str] = None
    company_name: Optional[str] = Field(None, min_length=1, max_length=300)
    contact_person: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None


# ─── Response ────────────────────────────────────

class EntityResponse(BaseModel):
    id: str
    entity_type: str = ""
    company_name: str = ""
    contact_person: str = ""
    email: Optional[str] = None
    phone: str = ""
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = "India"
    gstin: Optional[str] = None
    pan: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    status: str = "active"
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─── Bulk Upload ─────────────────────────────────

class BulkUploadResponse(BaseModel):
    message: str
    success_count: int
    errors: list = Field(default_factory=list)


# ─── Team Members ─────────────────────────────────

class TeamMemberCreate(BaseModel):
    entity_id: str
    name: str = Field(..., min_length=1, max_length=200)
    designation: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_primary_contact: bool = False
    notes: Optional[str] = None


class TeamMemberUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    designation: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_primary_contact: Optional[bool] = None
    notes: Optional[str] = None


class TeamMemberResponse(BaseModel):
    id: str
    entity_id: str
    name: str = ""
    designation: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_primary_contact: bool = False
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
