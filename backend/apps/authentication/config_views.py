"""
Config Views — System Configuration Management
Platform branding and Email settings
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid

from core.auth import get_current_user
from core.permissions import require_permission
from core.database import get_database
from apps.authentication.models import User

router = APIRouter(prefix="/config", tags=["config"])


class ConfigUpdate(BaseModel):
    # Platform settings
    platform_name: Optional[str] = None
    company_name: Optional[str] = None
    company_tagline: Optional[str] = None
    support_email: Optional[str] = None
    support_phone: Optional[str] = None
    
    # SMTP settings
    smtp_host: Optional[str] = None
    smtp_port: Optional[str] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    smtp_use_tls: Optional[bool] = True
    smtp_use_ssl: Optional[bool] = False


class ConfigResponse(BaseModel):
    id: str
    platform_name: str = "Flowops"
    company_name: str = ""
    company_tagline: str = ""
    support_email: str = ""
    support_phone: str = ""
    smtp_host: str = ""
    smtp_port: str = ""
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = ""
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    updated_at: Optional[datetime] = None


@router.get("", response_model=ConfigResponse)
async def get_config(
    current_user: User = Depends(require_permission("users:view"))
):
    """Get system configuration"""
    db = get_database()
    
    config = await db.config.find_one({}, {"_id": 0})
    
    if not config:
        # Create default config if not exists
        config = {
            "id": str(uuid.uuid4()),
            "platform_name": "Flowops",
            "company_name": "",
            "company_tagline": "",
            "support_email": "",
            "support_phone": "",
            "smtp_host": "",
            "smtp_port": "",
            "smtp_username": "",
            "smtp_password": "",
            "smtp_from_email": "",
            "smtp_from_name": "",
            "smtp_use_tls": True,
            "smtp_use_ssl": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.config.insert_one(config)
        config.pop("_id", None)
    
    return ConfigResponse(**config)


@router.put("", response_model=ConfigResponse)
async def update_config(
    data: ConfigUpdate,
    current_user: User = Depends(require_permission("users:edit"))
):
    """Update system configuration"""
    db = get_database()
    
    update_dict = data.model_dump(exclude_unset=True)
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Check if config exists
    config = await db.config.find_one({})
    
    if config:
        await db.config.update_one(
            {"id": config["id"]},
            {"$set": update_dict}
        )
    else:
        # Create new config
        update_dict["id"] = str(uuid.uuid4())
        update_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.config.insert_one(update_dict)
    
    # Fetch and return updated config
    config = await db.config.find_one({}, {"_id": 0})
    return ConfigResponse(**config)
