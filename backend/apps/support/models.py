from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid

class TicketPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING_CUSTOMER = "pending_customer"
    PENDING_VENDOR = "pending_vendor"
    RESOLVED = "resolved"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class Ticket(BaseModel):
    """Support ticket model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_number: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    status: TicketStatus = TicketStatus.OPEN
    priority: TicketPriority = TicketPriority.NORMAL
    category: str = "general"  # technical, billing, feature_request, bug, etc.
    subcategory: Optional[str] = None
    source: str = "email"  # email, phone, web, chat, etc.
    customer_id: str
    assigned_to: Optional[str] = None
    assigned_team: Optional[str] = None
    created_by: str
    resolution: Optional[str] = None
    resolution_date: Optional[datetime] = None
    first_response_date: Optional[datetime] = None
    last_activity_date: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    custom_fields: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CustomerFeedback(BaseModel):
    """Customer feedback model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: Optional[str] = None
    customer_id: str
    rating: int = Field(..., ge=1, le=5)
    feedback_type: str = "service"  # service, product, feature, etc.
    subject: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    suggestions: Optional[str] = None
    is_anonymous: bool = False
    status: str = "received"  # received, reviewed, addressed, closed
    reviewed_by: Optional[str] = None
    review_date: Optional[datetime] = None
    response: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class IssueLogging(BaseModel):
    """Issue logging model for internal issue tracking"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    issue_number: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    severity: str = "medium"  # low, medium, high, critical
    type: str = "bug"  # bug, enhancement, task, story
    status: str = "open"  # open, in_progress, resolved, closed
    component: Optional[str] = None
    version: Optional[str] = None
    environment: str = "production"  # development, staging, production
    reported_by: str
    assigned_to: Optional[str] = None
    reproducible: bool = True
    steps_to_reproduce: Optional[str] = None
    expected_behavior: Optional[str] = None
    actual_behavior: Optional[str] = None
    resolution: Optional[str] = None
    resolution_date: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Resolution(BaseModel):
    """Resolution model for ticket resolutions"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    resolution_type: str = "solved"  # solved, workaround, duplicate, invalid, etc.
    description: str = Field(..., min_length=1)
    resolution_steps: Optional[str] = None
    time_spent_minutes: Optional[int] = Field(None, gt=0)
    root_cause: Optional[str] = None
    preventive_measures: Optional[str] = None
    resolved_by: str
    reviewed_by: Optional[str] = None
    review_date: Optional[datetime] = None
    customer_satisfaction: Optional[int] = Field(None, ge=1, le=5)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Escalation(BaseModel):
    """Escalation model for ticket escalations"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    escalation_level: int = Field(..., ge=1, le=5)
    reason: str = Field(..., min_length=1)
    escalated_from: str
    escalated_to: str
    escalated_by: str
    notes: Optional[str] = None
    auto_escalated: bool = False
    resolution_deadline: Optional[datetime] = None
    resolved_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TroubleshootingAction(BaseModel):
    """Troubleshooting action model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    action_type: str = "investigation"  # investigation, fix_attempt, test, etc.
    description: str = Field(..., min_length=1)
    steps_taken: Optional[str] = None
    outcome: Optional[str] = None
    time_spent_minutes: Optional[int] = Field(None, gt=0)
    was_successful: Optional[bool] = None
    next_action_required: Optional[str] = None
    performed_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SystemEnvironment(BaseModel):
    """System environment model for tracking customer environments"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    environment_name: str = Field(..., min_length=1, max_length=100)
    environment_type: str = "production"  # development, staging, production
    description: Optional[str] = None
    operating_system: Optional[str] = None
    browser: Optional[str] = None
    version: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    is_active: bool = True
    last_updated_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))