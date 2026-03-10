from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Document Schemas
class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str = "general"
    file_name: str
    file_path: str
    file_size: int = Field(..., gt=0)
    mime_type: str
    tags: List[str] = Field(default_factory=list)
    related_entity_id: Optional[str] = None
    related_lead_id: Optional[str] = None
    related_task_id: Optional[str] = None
    version: str = "1.0"
    is_public: bool = False

class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    related_entity_id: Optional[str] = None
    related_lead_id: Optional[str] = None
    related_task_id: Optional[str] = None
    version: Optional[str] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None

class DocumentResponse(BaseModel):
    id: str = ""
    title: str = ""
    description: Optional[str] = None
    category: str = "general"
    file_name: str = ""
    file_path: str = ""
    file_size: int = 0
    mime_type: str = ""
    tags: List[str] = Field(default_factory=list)
    related_entity_id: Optional[str] = None
    related_lead_id: Optional[str] = None
    related_task_id: Optional[str] = None
    version: str = "1.0"
    is_public: bool = False
    is_active: bool = True
    download_count: int = 0
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Comment Schemas
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    related_entity_type: str  # "task", "lead", "entity", "document"
    related_entity_id: str
    parent_comment_id: Optional[str] = None
    is_internal: bool = False
    attachments: List[str] = Field(default_factory=list)

class CommentUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1)
    is_internal: Optional[bool] = None
    is_active: Optional[bool] = None

class CommentResponse(BaseModel):
    id: str = ""
    content: str = ""
    related_entity_type: str = ""
    related_entity_id: str = ""
    parent_comment_id: Optional[str] = None
    is_internal: bool = False
    is_active: bool = True
    attachments: List[str] = Field(default_factory=list)
    replies_count: int = 0
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Remark/Note Schemas
class RemarkCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: str = Field(..., min_length=1)
    category: str = "general"
    related_entity_type: str  # "entity", "lead", "task", "invoice"
    related_entity_id: str
    is_important: bool = False
    reminder_date: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)

class RemarkUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = None
    is_important: Optional[bool] = None
    reminder_date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None

class RemarkResponse(BaseModel):
    id: str = ""
    title: Optional[str] = None
    content: str = ""
    category: str = "general"
    related_entity_type: str = ""
    related_entity_id: str = ""
    is_important: bool = False
    is_active: bool = True
    reminder_date: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Workflow Template Schemas
class WorkflowStepCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    order: int = Field(..., ge=1)
    estimated_hours: Optional[float] = Field(None, gt=0)
    required_role: Optional[str] = None
    is_approval_required: bool = False

class WorkflowTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str = "general"
    steps: List[WorkflowStepCreate] = Field(default_factory=list)
    is_active: bool = True

class WorkflowTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    steps: Optional[List[WorkflowStepCreate]] = None
    is_active: Optional[bool] = None

class WorkflowStepResponse(BaseModel):
    name: str = ""
    description: Optional[str] = None
    order: int = 1
    estimated_hours: Optional[float] = None
    required_role: Optional[str] = None
    is_approval_required: bool = False

class WorkflowTemplateResponse(BaseModel):
    id: str = ""
    name: str = ""
    description: Optional[str] = None
    category: str = "general"
    steps: List[WorkflowStepResponse] = Field(default_factory=list)
    is_active: bool = True
    usage_count: int = 0
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Activity Log Schema
class ActivityLogResponse(BaseModel):
    id: str = ""
    entity_type: str = ""
    entity_id: str = ""
    action: str = ""
    description: str = ""
    metadata: Optional[Dict[str, Any]] = None
    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None