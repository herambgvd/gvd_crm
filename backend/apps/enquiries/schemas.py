"""
Enquiry Schemas — request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ─── Entity Connection ───────────────────────────

class EntityConnectionIn(BaseModel):
    entity_id: str
    role: str = ""  # consultant, dealer, end_customer, etc.


class EntityConnectionOut(BaseModel):
    entity_id: str
    entity_name: str = ""
    entity_type: str = ""
    role: str = ""


# ─── Enquiry CRUD ────────────────────────────────

class EnquiryCreate(BaseModel):
    project_name: str = Field(..., min_length=1, max_length=300)
    person_name: str = Field(..., min_length=1, max_length=200)
    person_email: Optional[str] = None
    person_phone: Optional[str] = None
    date: Optional[datetime] = None
    details: Optional[str] = None
    budget: Optional[float] = None
    currency: str = "INR"
    source: str = "walk_in"
    priority: str = "medium"
    entity_connections: List[EntityConnectionIn] = Field(default_factory=list)
    assigned_to: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class EnquiryUpdate(BaseModel):
    project_name: Optional[str] = Field(None, min_length=1, max_length=300)
    person_name: Optional[str] = Field(None, min_length=1, max_length=200)
    person_email: Optional[str] = None
    person_phone: Optional[str] = None
    date: Optional[datetime] = None
    details: Optional[str] = None
    budget: Optional[float] = None
    currency: Optional[str] = None
    source: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    entity_connections: Optional[List[EntityConnectionIn]] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None


class EnquiryResponse(BaseModel):
    id: str = ""
    enquiry_number: str = ""
    date: Optional[datetime] = None
    project_name: str = ""
    person_name: str = ""
    person_email: Optional[str] = None
    person_phone: Optional[str] = None
    details: Optional[str] = None
    budget: Optional[float] = None
    currency: str = "INR"
    source: str = "walk_in"
    priority: str = "medium"
    status: str = "new"
    entity_connections: List[EntityConnectionOut] = Field(default_factory=list)
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    converted_lead_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    remarks_count: int = 0
    comments_count: int = 0
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─── Remarks ─────────────────────────────────────

class RemarkCreate(BaseModel):
    content: str = Field(..., min_length=1)
    is_important: bool = False


class RemarkResponse(BaseModel):
    id: str = ""
    enquiry_id: str = ""
    content: str = ""
    is_important: bool = False
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None


# ─── Comments ────────────────────────────────────

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    parent_comment_id: Optional[str] = None


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)


class CommentResponse(BaseModel):
    id: str = ""
    enquiry_id: str = ""
    content: str = ""
    parent_comment_id: Optional[str] = None
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─── Convert to Lead ────────────────────────────

class ConvertToLeadRequest(BaseModel):
    """Data needed to convert an enquiry into a lead"""
    title: Optional[str] = None  # if blank, uses project_name
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
