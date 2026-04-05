from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone
from pathlib import Path
from pydantic import BaseModel, Field
import uuid
import shutil

import re

from core.auth import get_current_user
from core.permissions import require_permission
from core.database import get_database
from core.file_utils import validate_upload, safe_filename
from apps.authentication.models import User

router = APIRouter(tags=["documents"])


@router.get("")
async def get_documents(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    current_user: User = Depends(require_permission("leads:view"))
):
    """Get all documents with optional filtering"""
    db = get_database()

    filter_dict = {}

    if entity_type:
        filter_dict['entity_type'] = entity_type
    if entity_id:
        filter_dict['entity_id'] = entity_id
    if category:
        filter_dict['category'] = category
    if search:
        escaped = re.escape(search)
        filter_dict['$or'] = [
            {'name': {'$regex': escaped, '$options': 'i'}},
            {'description': {'$regex': escaped, '$options': 'i'}},
        ]

    documents = await db.documents.find(filter_dict, {'_id': 0}).sort(
        'created_at', -1
    ).skip(skip).limit(limit).to_list(limit)

    result = []
    for doc in documents:
        if isinstance(doc.get('created_at'), str):
            doc['created_at'] = datetime.fromisoformat(doc['created_at'])
        if isinstance(doc.get('updated_at'), str):
            doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
        result.append(doc)

    return result


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Upload a new document"""
    db = get_database()

    await validate_upload(file)

    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)

    unique_filename = safe_filename(file.filename)
    file_path = upload_dir / unique_filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
    finally:
        file.file.close()

    document = {
        'id': str(uuid.uuid4()),
        'name': file.filename,
        'description': None,
        'file_path': str(file_path),
        'file_size': file_path.stat().st_size,
        'mime_type': file.content_type,
        'entity_type': entity_type,
        'entity_id': entity_id,
        'category': 'general',
        'is_public': False,
        'uploaded_by': current_user.id,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }

    await db.documents.insert_one(document)

    document['created_at'] = datetime.fromisoformat(document['created_at'])
    document['updated_at'] = datetime.fromisoformat(document['updated_at'])
    return document
