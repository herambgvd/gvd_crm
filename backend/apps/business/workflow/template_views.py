from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone
from pathlib import Path
from pydantic import BaseModel, Field
import uuid
import shutil

from core.auth import get_current_user
from core.permissions import require_permission
from core.database import get_database
from apps.authentication.models import User

router = APIRouter(tags=["templates"])

HEADER_UPLOAD_DIR = Path("uploads/templates/headers")
FOOTER_UPLOAD_DIR = Path("uploads/templates/footers")
HEADER_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
FOOTER_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    type: str = Field(default="boq", alias="template_type")  # boq, invoice, sales_order, payment, warranty
    category: str = "general"
    content: Optional[str] = ""
    variables: List[str] = Field(default_factory=list)
    is_active: bool = True
    is_default: bool = False
    # Company details
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    company_website: Optional[str] = None
    company_gst: Optional[str] = None
    terms_and_conditions: Optional[str] = None

    class Config:
        populate_by_name = True


class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    type: Optional[str] = Field(None, alias="template_type")
    category: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    # Company details
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    company_website: Optional[str] = None
    company_gst: Optional[str] = None
    terms_and_conditions: Optional[str] = None

    class Config:
        populate_by_name = True


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: str = "boq"
    category: str = "general"
    content: Optional[str] = ""
    variables: List[str] = []
    is_active: bool = True
    is_default: bool = False
    header_image_url: Optional[str] = None
    footer_image_url: Optional[str] = None
    # Company details
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    company_website: Optional[str] = None
    company_gst: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime


def _parse_template(template: dict) -> dict:
    if isinstance(template.get('created_at'), str):
        template['created_at'] = datetime.fromisoformat(template['created_at'])
    if isinstance(template.get('updated_at'), str):
        template['updated_at'] = datetime.fromisoformat(template['updated_at'])
    
    # Map template_type to type for frontend compatibility
    if 'template_type' in template and 'type' not in template:
        template['type'] = template.pop('template_type')
    
    # Map header_image/footer_image to header_image_url/footer_image_url
    if 'header_image' in template:
        template['header_image_url'] = f"/{template.pop('header_image')}" if template.get('header_image') else None
    if 'footer_image' in template:
        template['footer_image_url'] = f"/{template.pop('footer_image')}" if template.get('footer_image') else None
    
    return template


@router.get("", response_model=List[TemplateResponse])
async def get_templates(
    template_type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_permission("leads:view"))
):
    """Get all templates"""
    db = get_database()

    filter_dict = {}
    if template_type:
        # Support both old 'template_type' and new 'type' field
        filter_dict['$or'] = [{'template_type': template_type}, {'type': template_type}]
    if category:
        filter_dict['category'] = category
    if is_active is not None:
        filter_dict['is_active'] = is_active

    templates = await db.templates.find(filter_dict, {'_id': 0}).sort(
        'created_at', -1
    ).to_list(100)

    result = []
    for t in templates:
        t = _parse_template(t)
        result.append(TemplateResponse(**t))

    return result


@router.post("", response_model=TemplateResponse)
async def create_template(
    data: TemplateCreate,
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Create a new template"""
    db = get_database()

    template_data = data.model_dump(by_alias=False)
    # Store as 'type' field for consistent access
    template = {
        'id': str(uuid.uuid4()),
        **template_data,
        'created_by': current_user.id,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }

    await db.templates.insert_one(template)
    template.pop('_id', None)

    template = _parse_template(template)
    return TemplateResponse(**template)


@router.get("/default/{template_type}", response_model=TemplateResponse)
async def get_default_template(
    template_type: str,
    current_user: User = Depends(require_permission("leads:view"))
):
    """Get the default template for a type"""
    db = get_database()

    # Support both old 'template_type' and new 'type' field
    template = await db.templates.find_one(
        {'$or': [{'template_type': template_type}, {'type': template_type}], 'is_default': True, 'is_active': True},
        {'_id': 0}
    )

    if not template:
        # Fallback to first active template of this type
        template = await db.templates.find_one(
            {'$or': [{'template_type': template_type}, {'type': template_type}], 'is_active': True},
            {'_id': 0}
        )

    if not template:
        raise HTTPException(status_code=404, detail="No template found for this type")

    template = _parse_template(template)
    return TemplateResponse(**template)


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    current_user: User = Depends(require_permission("leads:view"))
):
    """Get a specific template"""
    db = get_database()

    template = await db.templates.find_one({'id': template_id}, {'_id': 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template = _parse_template(template)
    return TemplateResponse(**template)


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    data: TemplateUpdate,
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Update a template"""
    db = get_database()

    update_dict = data.model_dump(exclude_unset=True)
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()

    result = await db.templates.update_one(
        {'id': template_id},
        {'$set': update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")

    return await get_template(template_id, current_user)


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Delete a template"""
    db = get_database()

    result = await db.templates.delete_one({'id': template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")

    return {"message": "Template deleted successfully"}


@router.post("/{template_id}/upload-header")
async def upload_template_header(
    template_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Upload header image for a template"""
    db = get_database()

    template = await db.templates.find_one({'id': template_id}, {'_id': 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    file_extension = Path(file.filename).suffix
    filename = f"{template_id}_header{file_extension}"
    file_path = HEADER_UPLOAD_DIR / filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
    finally:
        file.file.close()

    relative_path = f"uploads/templates/headers/{filename}"
    await db.templates.update_one(
        {'id': template_id},
        {'$set': {
            'header_image': relative_path,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "Header image uploaded", "file_path": relative_path}


@router.post("/{template_id}/upload-footer")
async def upload_template_footer(
    template_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Upload footer image for a template"""
    db = get_database()

    template = await db.templates.find_one({'id': template_id}, {'_id': 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    file_extension = Path(file.filename).suffix
    filename = f"{template_id}_footer{file_extension}"
    file_path = FOOTER_UPLOAD_DIR / filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
    finally:
        file.file.close()

    relative_path = f"uploads/templates/footers/{filename}"
    await db.templates.update_one(
        {'id': template_id},
        {'$set': {
            'footer_image': relative_path,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "Footer image uploaded", "file_path": relative_path}
