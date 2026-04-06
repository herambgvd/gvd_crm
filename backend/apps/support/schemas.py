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
    # SOP workflow fields
    sop_id: Optional[str] = None
    sop_version: Optional[int] = None
    current_state_id: Optional[str] = None
    current_state_name: Optional[str] = None

    created_by: str = ""
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    is_deleted: bool = False


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
