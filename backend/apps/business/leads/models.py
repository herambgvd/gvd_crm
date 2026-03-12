from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
from decimal import Decimal
from enum import Enum
import uuid


class LeadStatus(str, Enum):
    new_lead = "new_lead"
    under_review = "under_review"
    solution_design = "solution_design"
    proposal_submitted = "proposal_submitted"
    under_negotiation = "under_negotiation"
    poc_evaluation = "poc_evaluation"
    price_finalization = "price_finalization"
    pi_issued = "pi_issued"
    order_won = "order_won"
    order_processing = "order_processing"
    project_execution = "project_execution"
    project_completed = "project_completed"
    lost = "lost"


class LeadPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class Lead(BaseModel):
    """Lead model for sales prospects"""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str
    project_name: Optional[str] = None

    # Customer link
    customer_id: Optional[str] = None

    # Consultant involvement
    is_consultant_involved: bool = False
    consultant_entity_id: Optional[str] = None  # entity of type=consultant

    # Bidder entities (one or more)
    bidder_entity_ids: List[str] = Field(default_factory=list)

    status: LeadStatus = LeadStatus.new_lead
    priority: LeadPriority = LeadPriority.medium
    expected_value: Optional[Decimal] = None
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None
    additional_information: Optional[Dict[str, str]] = None
    created_by: str
    assigned_to: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeadInvolvement(BaseModel):
    """Lead involvement tracking model — tracks entities (consultants, distributors, SIs) per lead"""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    entity_id: str                      # entity (consultant / distributor / SI)
    involvement_type: str               # "consultant", "distributor", "si"
    status: str = "active"              # active, negotiation, on_hold, win, lose
    notes: Optional[str] = None
    assigned_boqs: List[str] = Field(default_factory=list)
    sales_order_ids: List[str] = Field(default_factory=list)
    invoice_ids: List[str] = Field(default_factory=list)
    payment_ids: List[str] = Field(default_factory=list)
    warranty_ids: List[str] = Field(default_factory=list)
    additional_information: Optional[Dict[str, Any]] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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