"""
Enquiry Models

An enquiry is the first touchpoint with a potential customer.
Fields: Date, Project Name, Entity connections (multiple), Person Name,
Details, Budget, Status, Remarks (multiple), Comments (multiple).

Enquiries can be converted to Leads.
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from decimal import Decimal
from enum import Enum
import uuid


class EnquiryStatus(str, Enum):
    NEW = "new"
    IN_REVIEW = "in_review"
    QUALIFIED = "qualified"
    CONVERTED = "converted"
    REJECTED = "rejected"
    ON_HOLD = "on_hold"
    CLOSED = "closed"


class EnquirySource(str, Enum):
    WALK_IN = "walk_in"
    PHONE = "phone"
    EMAIL = "email"
    WEBSITE = "website"
    REFERRAL = "referral"
    SOCIAL_MEDIA = "social_media"
    TRADE_SHOW = "trade_show"
    OTHER = "other"


class EnquiryPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class EntityConnection(BaseModel):
    """Reference to a connected entity"""
    entity_id: str
    entity_name: str = ""
    entity_type: str = ""
    role: str = ""  # e.g. consultant, dealer, end_customer


class Enquiry(BaseModel):
    """Main Enquiry model"""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    enquiry_number: str = ""
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    project_name: str = Field(..., min_length=1, max_length=300)
    person_name: str = Field(..., min_length=1, max_length=200)
    person_email: Optional[str] = None
    person_phone: Optional[str] = None
    details: Optional[str] = None
    budget: Optional[Decimal] = None
    currency: str = "INR"
    source: EnquirySource = EnquirySource.WALK_IN
    priority: EnquiryPriority = EnquiryPriority.MEDIUM
    status: EnquiryStatus = EnquiryStatus.NEW
    entity_connections: List[EntityConnection] = Field(default_factory=list)
    assigned_to: Optional[str] = None
    converted_lead_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    is_deleted: bool = False
    created_by: str = ""
    updated_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EnquiryRemark(BaseModel):
    """Remark / internal note on an enquiry"""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    enquiry_id: str
    content: str = Field(..., min_length=1)
    is_important: bool = False
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EnquiryComment(BaseModel):
    """Comment / discussion entry on an enquiry"""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    enquiry_id: str
    content: str = Field(..., min_length=1)
    parent_comment_id: Optional[str] = None
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
