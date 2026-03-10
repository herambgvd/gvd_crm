"""
Support Module Schemas — aligned with GVD CRM domain (surveillance/CCTV support).

All response schemas use defaults so partial MongoDB docs won't crash serialization.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ─────────────────── Ticket Schemas ───────────────────

class TicketCreate(BaseModel):
    """Fields sent from TicketForm.js"""
    title: Optional[str] = None
    description: Optional[str] = None
    ticket_type: str = ""                # Camera, NVR, VMS, Integration, etc.
    product_category: Optional[str] = None
    product_name: Optional[str] = None
    model_number: Optional[str] = None
    firmware_software_version: Optional[str] = None
    customer_name: str = Field(..., min_length=1, max_length=200)
    customer_entity_id: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    project_name: Optional[str] = None
    location_site: Optional[str] = None
    priority: str = "Medium"             # Low, Medium, High, Critical
    sla_category: str = "No SLA"         # No SLA, Warranty, AMC
    category: str = "general"
    assigned_to: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    due_date: Optional[datetime] = None


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    ticket_type: Optional[str] = None
    product_category: Optional[str] = None
    product_name: Optional[str] = None
    model_number: Optional[str] = None
    firmware_software_version: Optional[str] = None
    customer_name: Optional[str] = None
    customer_entity_id: Optional[str] = None
    project_name: Optional[str] = None
    location_site: Optional[str] = None
    priority: Optional[str] = None
    sla_category: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    resolution: Optional[str] = None
    due_date: Optional[datetime] = None


class TicketResponse(BaseModel):
    id: str = ""
    ticket_number: str = ""
    title: Optional[str] = None
    description: Optional[str] = None
    ticket_type: str = ""
    product_category: Optional[str] = None
    product_name: Optional[str] = None
    model_number: Optional[str] = None
    firmware_software_version: Optional[str] = None
    customer_name: str = ""
    customer_entity_id: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    project_name: Optional[str] = None
    location_site: Optional[str] = None
    priority: str = "Medium"
    sla_category: str = "No SLA"
    status: str = "new"
    category: str = "general"
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    resolution: Optional[str] = None
    resolution_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    is_deleted: bool = False


# ─────────────────── Issue Logging Schemas ───────────────────

class IssueCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    ticket_id: Optional[str] = None
    severity: str = "medium"         # low, medium, high, critical
    category: str = "technical"
    steps_to_reproduce: Optional[str] = None
    expected_behavior: Optional[str] = None
    actual_behavior: Optional[str] = None


class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None     # open, investigating, in_progress, resolved, closed
    resolution: Optional[str] = None
    tags: Optional[List[str]] = None


class IssueResponse(BaseModel):
    id: str = ""
    issue_number: str = ""
    title: str = ""
    description: str = ""
    ticket_id: Optional[str] = None
    severity: str = "medium"
    status: str = "open"
    category: str = "technical"
    steps_to_reproduce: Optional[str] = None
    expected_behavior: Optional[str] = None
    actual_behavior: Optional[str] = None
    resolution: Optional[str] = None
    resolution_date: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─────────────────── Escalation Schemas ───────────────────

class EscalationCreate(BaseModel):
    ticket_id: Optional[str] = None
    escalation_reason: str = Field(..., min_length=1)
    escalated_to: str
    escalation_level: int = Field(..., ge=1, le=5)
    notes: Optional[str] = None
    due_date: Optional[datetime] = None


class EscalationUpdate(BaseModel):
    status: Optional[str] = None     # pending, acknowledged, resolved
    escalated_to: Optional[str] = None
    escalation_level: Optional[int] = Field(None, ge=1, le=5)
    resolution: Optional[str] = None
    notes: Optional[str] = None


class EscalationResponse(BaseModel):
    id: str = ""
    ticket_id: Optional[str] = None
    escalation_reason: str = ""
    escalated_to: str = ""
    escalated_to_name: Optional[str] = None
    escalation_level: int = 1
    status: str = "pending"
    resolution: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
    escalated_by: str = ""
    escalated_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─────────────────── Resolution Schemas ───────────────────

class ResolutionCreate(BaseModel):
    ticket_id: Optional[str] = None
    resolution_type: str = "fix"     # fix, workaround, explanation, duplicate
    description: str = Field(..., min_length=1)
    steps_taken: Optional[str] = None
    time_spent_hours: Optional[float] = Field(None, gt=0)
    requires_followup: bool = False
    followup_date: Optional[datetime] = None


class ResolutionUpdate(BaseModel):
    resolution_type: Optional[str] = None
    description: Optional[str] = None
    steps_taken: Optional[str] = None
    time_spent_hours: Optional[float] = Field(None, gt=0)
    status: Optional[str] = None     # draft, implemented, verified
    requires_followup: Optional[bool] = None
    followup_date: Optional[datetime] = None


class ResolutionResponse(BaseModel):
    id: str = ""
    ticket_id: Optional[str] = None
    resolution_type: str = "fix"
    description: str = ""
    steps_taken: Optional[str] = None
    time_spent_hours: Optional[float] = None
    status: str = "implemented"
    requires_followup: bool = False
    followup_date: Optional[datetime] = None
    resolved_by: str = ""
    resolved_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─────────────────── Troubleshooting Action Schemas ───────────────────

class TroubleshootingActionCreate(BaseModel):
    ticket_id: Optional[str] = None
    action_type: str = "diagnostic"  # diagnostic, fix_attempt, workaround, escalation
    description: str = Field(..., min_length=1)
    command_executed: Optional[str] = None
    result: Optional[str] = None
    success: bool = False
    time_spent_minutes: Optional[int] = Field(None, gt=0)
    next_steps: Optional[str] = None


class TroubleshootingActionResponse(BaseModel):
    id: str = ""
    ticket_id: Optional[str] = None
    action_type: str = "diagnostic"
    description: str = ""
    command_executed: Optional[str] = None
    result: Optional[str] = None
    success: bool = False
    time_spent_minutes: Optional[int] = None
    next_steps: Optional[str] = None
    performed_by: str = ""
    performed_by_name: Optional[str] = None
    performed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─────────────────── Customer Feedback Schemas ───────────────────

class CustomerFeedbackCreate(BaseModel):
    ticket_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    feedback_type: str = "general"   # complaint, suggestion, compliment, general
    subject: Optional[str] = None
    message: str = Field(..., min_length=1)
    rating: Optional[int] = Field(None, ge=1, le=5)


class CustomerFeedbackUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    message: Optional[str] = None
    status: Optional[str] = None     # new, reviewed, addressed, closed
    internal_notes: Optional[str] = None


class CustomerFeedbackResponse(BaseModel):
    id: str = ""
    ticket_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    feedback_type: str = "general"
    subject: Optional[str] = None
    message: str = ""
    rating: Optional[int] = None
    status: str = "new"
    internal_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─────────────────── System Environment Schemas ───────────────────

class SystemEnvironmentCreate(BaseModel):
    ticket_id: Optional[str] = None
    name: str
    type: str = "production"
    description: Optional[str] = None
    server_details: Optional[Dict[str, Any]] = None
    database_details: Optional[Dict[str, Any]] = None
    configuration: Optional[Dict[str, Any]] = None


class SystemEnvironmentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    server_details: Optional[Dict[str, Any]] = None
    database_details: Optional[Dict[str, Any]] = None
    configuration: Optional[Dict[str, Any]] = None


class SystemEnvironmentResponse(BaseModel):
    id: str = ""
    ticket_id: Optional[str] = None
    name: str = ""
    type: str = "production"
    description: Optional[str] = None
    server_details: Optional[Dict[str, Any]] = None
    database_details: Optional[Dict[str, Any]] = None
    configuration: Optional[Dict[str, Any]] = None
    is_active: bool = True
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─────────────────── Knowledge Base Schemas ───────────────────

class KnowledgeBaseArticleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    category: str = "general"
    tags: List[str] = Field(default_factory=list)
    is_public: bool = True
    difficulty_level: str = "beginner"
    estimated_read_time: Optional[int] = Field(None, gt=0)


class KnowledgeBaseArticleResponse(BaseModel):
    id: str = ""
    title: str = ""
    content: str = ""
    category: str = "general"
    tags: List[str] = Field(default_factory=list)
    is_public: bool = True
    difficulty_level: str = "beginner"
    estimated_read_time: Optional[int] = None
    view_count: int = 0
    helpful_votes: int = 0
    not_helpful_votes: int = 0
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None