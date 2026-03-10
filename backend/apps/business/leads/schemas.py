from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime
from decimal import Decimal


# ── Lead Schemas ──

class LeadCreate(BaseModel):
    source: str = Field(..., min_length=1)
    channel: str = Field(..., description="consultant, project, oem, distributor, dealer")
    entity_id: Optional[str] = None
    project_name: Optional[str] = None
    contact_name: str = Field(..., min_length=1)
    contact_email: Optional[EmailStr] = None
    contact_phone: str = Field(..., min_length=1)
    company: str = Field(..., min_length=1)
    priority: str = "medium"
    expected_value: Optional[Decimal] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None
    additional_information: Optional[Dict[str, str]] = None
    assigned_to: Optional[str] = None

class LeadUpdate(BaseModel):
    source: Optional[str] = Field(None, min_length=1)
    channel: Optional[str] = None
    entity_id: Optional[str] = None
    project_name: Optional[str] = None
    contact_name: Optional[str] = Field(None, min_length=1)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, min_length=1)
    company: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = None
    priority: Optional[str] = None
    expected_value: Optional[Decimal] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None
    additional_information: Optional[Dict[str, str]] = None
    assigned_to: Optional[str] = None

class LeadResponse(BaseModel):
    id: str = ""
    source: str = ""
    channel: str = ""
    entity_id: Optional[str] = None
    project_name: Optional[str] = None
    contact_name: str = ""
    contact_email: Optional[str] = None
    contact_phone: str = ""
    company: str = ""
    status: str = "new"
    priority: str = "medium"
    expected_value: Optional[Decimal] = None
    probability: Optional[int] = None
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None
    additional_information: Optional[Dict[str, str]] = None
    created_by: str = ""
    assigned_to: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Lead Involvement Schemas
class LeadInvolvementCreate(BaseModel):
    lead_id: str
    user_id: str
    role: str = "secondary"
    involvement_type: str = "assigned"
    notes: Optional[str] = None

class LeadInvolvementUpdate(BaseModel):
    role: Optional[str] = None
    involvement_type: Optional[str] = None
    notes: Optional[str] = None

class LeadInvolvementResponse(BaseModel):
    id: str = ""
    lead_id: str = ""
    user_id: str = ""
    role: str = "secondary"
    involvement_type: str = "assigned"
    notes: Optional[str] = None
    business_models: Optional[List[Dict[str, str]]] = None
    created_by: str = ""
    created_at: Optional[datetime] = None

# Lead Document Schemas
class LeadDocumentCreate(BaseModel):
    lead_id: str
    document_id: str
    document_type: str = "general"
    description: Optional[str] = None

class LeadDocumentResponse(BaseModel):
    id: str = ""
    lead_id: str = ""
    document_id: str = ""
    document_type: str = "general"
    description: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    uploaded_by: str = ""
    created_at: Optional[datetime] = None

# Lead Assignment Schemas
class LeadAssignmentCreate(BaseModel):
    lead_id: str
    user_id: str
    role: str = "assigned"
    notes: Optional[str] = None

class LeadAssignmentResponse(BaseModel):
    id: str = ""
    lead_id: str = ""
    user_id: str = ""
    role: str = "assigned"
    notes: Optional[str] = None
    assigned_by: str = ""
    created_by: str = ""
    created_at: Optional[datetime] = None