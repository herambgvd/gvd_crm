"""
Entity Models
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class EntityType(str, Enum):
    consultant = "consultant"
    dealer = "dealer"
    si = "si"  # System Integrator
    distributor = "distributor"
    manufacturer = "manufacturer"
    end_customer = "end_customer"
    other = "other"


class EntityStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    blacklisted = "blacklisted"


class Entity(BaseModel):
    """Entity model — consultants, dealers, system integrators, etc."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: str = "consultant"
    company_name: str = ""
    contact_person: str = ""
    email: Optional[str] = None
    phone: str = ""
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = "India"
    gstin: Optional[str] = None
    pan: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    status: str = "active"
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False
