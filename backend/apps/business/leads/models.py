from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from decimal import Decimal
import uuid


class Lead(BaseModel):
    """Lead model for sales prospects"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str
    channel: str  # consultant, project, oem, distributor, dealer
    entity_id: Optional[str] = None
    project_name: Optional[str] = None
    contact_name: str
    contact_email: Optional[str] = None
    contact_phone: str
    company: str
    status: str = "new"  # new, qualified, contacted, converted, lost
    priority: str = "medium"  # low, medium, high, urgent
    expected_value: Optional[Decimal] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None
    additional_information: Optional[Dict[str, str]] = None
    created_by: str
    assigned_to: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeadInvolvement(BaseModel):
    """Lead involvement tracking model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    user_id: str
    role: str  # primary, secondary, consultant, etc.
    involvement_type: str  # assigned, following, consulting, etc.
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeadDocument(BaseModel):
    """Lead document association model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    document_id: str
    document_type: str = "general"  # requirement, specification, contract, etc.
    description: Optional[str] = None
    uploaded_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))