from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from decimal import Decimal
from .models import LeadStatus, LeadPriority


# ── Lead Schemas ──

class LeadCreate(BaseModel):
    source: str = Field(..., min_length=1)
    project_name: Optional[str] = None

    # Customer master link
    customer_id: Optional[str] = None

    # Consultant involvement
    is_consultant_involved: bool = False
    consultant_entity_id: Optional[str] = None

    # Bidder entities
    bidder_entity_ids: List[str] = Field(default_factory=list)

    status: LeadStatus = LeadStatus.new_lead
    priority: LeadPriority = LeadPriority.medium
    expected_value: Optional[Decimal] = None
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None
    additional_information: Optional[Dict[str, str]] = None
    assigned_to: Optional[str] = None


class LeadUpdate(BaseModel):
    source: Optional[str] = Field(None, min_length=1)
    project_name: Optional[str] = None
    customer_id: Optional[str] = None
    is_consultant_involved: Optional[bool] = None
    consultant_entity_id: Optional[str] = None
    bidder_entity_ids: Optional[List[str]] = None
    status: Optional[LeadStatus] = None
    priority: Optional[LeadPriority] = None
    expected_value: Optional[Decimal] = None
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None
    additional_information: Optional[Dict[str, str]] = None
    assigned_to: Optional[str] = None


class LeadResponse(BaseModel):
    model_config = {"extra": "ignore"}

    id: str = ""
    source: str = ""
    project_name: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    is_consultant_involved: bool = False
    consultant_entity_id: Optional[str] = None
    bidder_entity_ids: List[str] = Field(default_factory=list)
    status: str = "new_lead"
    priority: str = "medium"
    expected_value: Optional[Decimal] = None
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None
    additional_information: Optional[Dict[str, str]] = None
    created_by: Optional[str] = None
    assigned_to: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class LeadInvolvementCreate(BaseModel):
    lead_id: str
    entity_id: str
    involvement_type: str = "consultant"  # consultant, distributor, si
    status: str = "active"               # active, negotiation, on_hold, win, lose
    notes: Optional[str] = None
    assigned_boqs: List[str] = Field(default_factory=list)
    sales_order_ids: List[str] = Field(default_factory=list)
    invoice_ids: List[str] = Field(default_factory=list)
    payment_ids: List[str] = Field(default_factory=list)
    warranty_ids: List[str] = Field(default_factory=list)
    additional_information: Optional[Dict[str, Any]] = None

class LeadInvolvementUpdate(BaseModel):
    involvement_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_boqs: Optional[List[str]] = None
    sales_order_ids: Optional[List[str]] = None
    invoice_ids: Optional[List[str]] = None
    payment_ids: Optional[List[str]] = None
    warranty_ids: Optional[List[str]] = None
    additional_information: Optional[Dict[str, Any]] = None

class LeadInvolvementResponse(BaseModel):
    model_config = {"extra": "ignore"}

    id: str = ""
    lead_id: str = ""
    entity_id: str = ""
    entity_name: Optional[str] = None   # enriched from entities collection
    entity_city: Optional[str] = None   # enriched from entities collection
    involvement_type: str = "consultant"
    status: str = "active"
    notes: Optional[str] = None
    assigned_boqs: List[str] = Field(default_factory=list)
    sales_order_ids: List[str] = Field(default_factory=list)
    invoice_ids: List[str] = Field(default_factory=list)
    payment_ids: List[str] = Field(default_factory=list)
    warranty_ids: List[str] = Field(default_factory=list)
    additional_information: Optional[Dict[str, Any]] = None
    created_by: str = ""
    created_at: Optional[datetime] = None

# Lead Document Schemas
class LeadDocumentCreate(BaseModel):
    lead_id: str
    document_id: str
    document_type: str = "general"
    description: Optional[str] = None

class LeadDocumentResponse(BaseModel):
    model_config = {"extra": "ignore"}

    id: str = ""
    lead_id: str = ""
    document_id: str = ""
    document_type: str = "general"
    description: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_by: str = ""
    uploaded_by_name: Optional[str] = None  # enriched from users collection
    created_at: Optional[datetime] = None

# Lead Assignment Schemas
class LeadAssignmentCreate(BaseModel):
    lead_id: str
    user_id: str
    role: str = "assigned"
    notes: Optional[str] = None

class LeadAssignmentResponse(BaseModel):
    model_config = {"extra": "ignore"}

    id: str = ""
    lead_id: str = ""
    user_id: str = ""
    user_name: Optional[str] = None       # enriched from users collection
    user_email: Optional[str] = None      # enriched from users collection
    role: str = "assigned"
    notes: Optional[str] = None
    assigned_by: str = ""
    assigned_by_name: Optional[str] = None  # enriched from users collection
    created_by: str = ""
    created_at: Optional[datetime] = None