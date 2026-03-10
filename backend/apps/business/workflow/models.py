from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import uuid

class Assignment(BaseModel):
    """Assignment model for task assignment"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    type: str = "task"  # task, lead_followup, order_processing, etc.
    status: str = "pending"  # pending, in_progress, completed, cancelled
    priority: str = "medium"  # low, medium, high, urgent
    assigned_to: str
    assigned_by: str
    related_entity_type: Optional[str] = None  # lead, sales_order, invoice, etc.
    related_entity_id: Optional[str] = None
    due_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Comment(BaseModel):
    """Comment model for entity comments"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str = Field(..., min_length=1)
    entity_type: str  # lead, sales_order, invoice, etc.
    entity_id: str
    author_id: str
    is_internal: bool = False  # Internal comments vs customer-visible
    attachments: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Document(BaseModel):
    """Document model for file management"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    file_path: str
    file_size: int = Field(..., gt=0)
    mime_type: str
    entity_type: Optional[str] = None  # lead, sales_order, invoice, etc.
    entity_id: Optional[str] = None
    category: str = "general"  # contract, invoice, receipt, specification, etc.
    is_public: bool = False
    uploaded_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Warranty(BaseModel):
    """Warranty model for product warranties"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    sales_order_id: Optional[str] = None
    serial_number: Optional[str] = None
    warranty_type: str = "manufacturer"  # manufacturer, extended, service
    duration_months: int = Field(..., gt=0)
    start_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_date: datetime
    status: str = "active"  # active, expired, claimed, voided
    terms_conditions: Optional[str] = None
    claim_history: List[Dict[str, Any]] = Field(default_factory=list)
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))



class Remark(BaseModel):
    """Remark model for general remarks on entities"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str = Field(..., min_length=1)
    entity_type: str  # lead, sales_order, invoice, etc.
    entity_id: str
    type: str = "general"  # general, follow_up, issue, resolution, etc.
    is_important: bool = False
    author_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Template(BaseModel):
    """Template model for document templates"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    type: str = "document"  # document, email, contract, etc.
    category: str = "general"  # invoice, quotation, contract, etc.
    content: str = Field(..., min_length=1)
    variables: List[str] = Field(default_factory=list)  # List of template variables
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))