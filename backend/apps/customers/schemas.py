"""
Customer Schemas — request/response validation for the customers collection.
Customers are end-clients (the companies we sell to), completely separate from entities.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CustomerCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=300)
    contact_person: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(default="", max_length=20)
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = "India"
    gstin: Optional[str] = None
    pan: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"


class CustomerUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=300)
    contact_person: Optional[str] = Field(None, min_length=1, max_length=200)
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class CustomerResponse(BaseModel):
    id: str
    company_name: str = ""
    contact_person: str = ""
    phone: str = ""
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = "India"
    gstin: Optional[str] = None
    pan: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
