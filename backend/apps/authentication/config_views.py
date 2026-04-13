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
    platform_name: str = "Stackless"
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
            "platform_name": "Stackless",
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


class TestEmailRequest(BaseModel):
    email: str


@router.post("/test-email")
async def test_email(
    data: TestEmailRequest,
    current_user: User = Depends(require_permission("users:edit")),
):
    """Send a test email using current SMTP config. Returns the exact error if it fails."""
    import smtplib
    import ssl
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    import logging

    log = logging.getLogger(__name__)
    db = get_database()
    config = await db.config.find_one({}, {"_id": 0})

    if not config:
        raise HTTPException(status_code=400, detail="SMTP not configured. Save your settings first.")

    missing = []
    if not config.get("smtp_host"):
        missing.append("SMTP Host")
    if not config.get("smtp_username"):
        missing.append("SMTP Username")
    if not config.get("smtp_password"):
        missing.append("SMTP Password")
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing)}")

    subject = "Stackless — Test Email"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f172a;">SMTP Configuration Test</h2>
        <p>This is a test email from your Stackless CRM to verify SMTP settings.</p>
        <p>If you are seeing this, your email configuration is working correctly.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Sent at {datetime.now(timezone.utc).isoformat()}</p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    from_email = config.get("smtp_from_email") or config.get("smtp_username")
    from_name = config.get("smtp_from_name", "Stackless CRM")
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = data.email
    msg.attach(MIMEText(html_body, "html"))

    try:
        smtp_port = int(config.get("smtp_port", 587) or 587)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid SMTP port: {config.get('smtp_port')}")

    try:
        if config.get("smtp_use_ssl"):
            context = ssl.create_default_context()
            server = smtplib.SMTP_SSL(config["smtp_host"], smtp_port, context=context, timeout=15)
        else:
            server = smtplib.SMTP(config["smtp_host"], smtp_port, timeout=15)
            if config.get("smtp_use_tls"):
                server.starttls(context=ssl.create_default_context())

        server.login(config["smtp_username"], config["smtp_password"])
        server.sendmail(from_email, data.email, msg.as_string())
        server.quit()
        log.info(f"Test email sent to {data.email}")
        return {"message": f"Test email sent to {data.email}"}

    except smtplib.SMTPAuthenticationError as e:
        raise HTTPException(status_code=400, detail=f"Authentication failed. Check username/password. ({e.smtp_code}: {e.smtp_error.decode() if isinstance(e.smtp_error, bytes) else e.smtp_error})")
    except smtplib.SMTPConnectError as e:
        raise HTTPException(status_code=400, detail=f"Cannot connect to {config['smtp_host']}:{smtp_port} — {e}")
    except smtplib.SMTPServerDisconnected as e:
        raise HTTPException(status_code=400, detail=f"Server disconnected: {e}. Try toggling TLS/SSL.")
    except smtplib.SMTPException as e:
        raise HTTPException(status_code=400, detail=f"SMTP error: {e}")
    except OSError as e:
        raise HTTPException(status_code=400, detail=f"Network error: {e}. Check host and port.")
    except Exception as e:
        log.exception("Test email failed")
        raise HTTPException(status_code=400, detail=f"Failed: {str(e)[:200]}")
