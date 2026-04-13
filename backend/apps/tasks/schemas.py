"""Task Schemas — request/response validation."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ChecklistItemSchema(BaseModel):
    id: Optional[str] = None
    text: str = Field(..., min_length=1)
    done: bool = False


class TaskAttachmentSchema(BaseModel):
    id: Optional[str] = None
    name: str
    url: str


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = ""
    due_date: Optional[datetime] = None
    status: str = "todo"
    priority: str = "medium"
    labels: List[str] = Field(default_factory=list)
    collaborators: List[str] = Field(default_factory=list)
    checklist: List[ChecklistItemSchema] = Field(default_factory=list)
    attachments: List[TaskAttachmentSchema] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    labels: Optional[List[str]] = None
    collaborators: Optional[List[str]] = None
    checklist: Optional[List[ChecklistItemSchema]] = None
    attachments: Optional[List[TaskAttachmentSchema]] = None


class TaskResponse(BaseModel):
    model_config = {"extra": "ignore"}

    id: str = ""
    title: str = ""
    description: str = ""
    due_date: Optional[datetime] = None
    status: str = "todo"
    priority: str = "medium"
    labels: List[str] = Field(default_factory=list)
    created_by: str = ""
    created_by_name: Optional[str] = None
    collaborators: List[str] = Field(default_factory=list)
    collaborator_names: List[str] = Field(default_factory=list)
    checklist: List[ChecklistItemSchema] = Field(default_factory=list)
    attachments: List[TaskAttachmentSchema] = Field(default_factory=list)
    comment_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TaskCommentCreate(BaseModel):
    comment: str = Field(..., min_length=1)


class TaskCommentResponse(BaseModel):
    model_config = {"extra": "ignore"}

    id: str = ""
    task_id: str = ""
    user_id: str = ""
    user_name: str = ""
    comment: str = ""
    created_at: Optional[datetime] = None
