from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class WarehouseCreate(BaseModel):
    unique_id: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    address: Optional[str] = None
    manager: Optional[str] = None
    contact_number: Optional[str] = None

class WarehouseUpdate(BaseModel):
    unique_id: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    address: Optional[str] = None
    manager: Optional[str] = None
    contact_number: Optional[str] = None
    is_active: Optional[bool] = None

class WarehouseResponse(BaseModel):
    id: str = ""
    unique_id: str = ""
    name: str = ""
    address: Optional[str] = None
    manager: Optional[str] = None
    contact_number: Optional[str] = None
    is_active: bool = True
    created_by: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
