"""
Workflow Engine Models

Defines SOP Workflows, States, Transitions, Form Fields, and Transition Logs.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class FormField(BaseModel):
    """A single form field attached to a transition."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    type: str = "text"  # text, number, date, select, textarea, file
    required: bool = False
    placeholder: str = ""
    options: List[str] = Field(default_factory=list)  # for select type
    default_value: str = ""


class SOPState(BaseModel):
    """A single state (node) in the SOP pipeline."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    position: int = 0
    color: str = "#3B82F6"
    description: str = ""
    is_start: bool = False
    is_end: bool = False


class SOPTransition(BaseModel):
    """An allowed transition between two states."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_state_id: str
    to_state_id: str
    name: str  # action label, e.g. "Send Proposal"
    form_fields: List[FormField] = Field(default_factory=list)


class SOPWorkflow(BaseModel):
    """A complete SOP workflow definition."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    module: str  # sales, support, inventory
    version: int = 1
    is_active: bool = True
    states: List[SOPState] = Field(default_factory=list)
    transitions: List[SOPTransition] = Field(default_factory=list)
    created_by: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TransitionLog(BaseModel):
    """Audit log for a transition executed on a record."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    record_id: str
    record_type: str  # lead, ticket, sales_order, etc.
    module: str
    sop_id: str
    sop_version: int = 1
    from_state_id: Optional[str] = None  # null for initial assignment
    from_state_name: Optional[str] = None
    to_state_id: str
    to_state_name: str
    transition_id: Optional[str] = None  # null for initial assignment
    transition_name: Optional[str] = None
    form_data: Dict[str, Any] = Field(default_factory=dict)
    performed_by: str = ""
    performed_by_name: str = ""
    performed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: str = ""
