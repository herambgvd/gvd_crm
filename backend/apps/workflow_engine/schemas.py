"""
Workflow Engine Schemas — Request/Response validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ────────────────── Form Field Schemas ──────────────────

class FormFieldSchema(BaseModel):
    id: Optional[str] = None
    label: str = Field(..., min_length=1)
    type: str = Field(default="text")  # text, number, date, select, textarea, file
    required: bool = False
    placeholder: str = ""
    options: List[str] = Field(default_factory=list)
    default_value: str = ""


# ────────────────── State Schemas ──────────────────

class SOPStateSchema(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1)
    position: int = 0
    color: str = "#3B82F6"
    description: str = ""
    is_start: bool = False
    is_end: bool = False


# ────────────────── Transition Schemas ──────────────────

class SOPTransitionSchema(BaseModel):
    id: Optional[str] = None
    from_state_id: str = Field(..., min_length=1)
    to_state_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    form_fields: List[FormFieldSchema] = Field(default_factory=list)


# ────────────────── SOP CRUD Schemas ──────────────────

VALID_MODULES = {"sales", "support", "inventory"}

class SOPCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    module: str = Field(..., min_length=1)
    states: List[SOPStateSchema] = Field(default_factory=list)
    transitions: List[SOPTransitionSchema] = Field(default_factory=list)


class SOPUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    states: Optional[List[SOPStateSchema]] = None
    transitions: Optional[List[SOPTransitionSchema]] = None


class SOPResponse(BaseModel):
    model_config = {"extra": "ignore"}

    id: str = ""
    name: str = ""
    description: str = ""
    module: str = ""
    version: int = 1
    is_active: bool = True
    states: List[SOPStateSchema] = Field(default_factory=list)
    transitions: List[SOPTransitionSchema] = Field(default_factory=list)
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ────────────────── Transition Execution Schemas ──────────────────

class TransitionExecuteRequest(BaseModel):
    record_type: str = Field(..., min_length=1)
    record_id: str = Field(..., min_length=1)
    transition_id: str = Field(..., min_length=1)
    form_data: Dict[str, Any] = Field(default_factory=dict)
    notes: str = ""


class TransitionLogResponse(BaseModel):
    model_config = {"extra": "ignore"}

    id: str = ""
    record_id: str = ""
    record_type: str = ""
    module: str = ""
    sop_id: str = ""
    sop_version: int = 1
    from_state_id: Optional[str] = None
    from_state_name: Optional[str] = None
    to_state_id: str = ""
    to_state_name: str = ""
    transition_id: Optional[str] = None
    transition_name: Optional[str] = None
    form_data: Dict[str, Any] = Field(default_factory=dict)
    performed_by: str = ""
    performed_by_name: str = ""
    performed_at: Optional[datetime] = None
    notes: str = ""


# ────────────────── SOP Assignment Schema ──────────────────

class SOPAssignRequest(BaseModel):
    """Assign an SOP to a record (used when creating/updating a record)."""
    sop_id: str = Field(..., min_length=1)
