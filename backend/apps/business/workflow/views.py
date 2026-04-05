from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone
import os
import re
import shutil
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

from core.auth import get_current_user
from core.permissions import require_permission
from core.database import get_database
from core.file_utils import validate_upload, safe_filename
from .models import Comment, Remark, Document
from .schemas import (
    DocumentCreate, DocumentUpdate, DocumentResponse,
    CommentCreate, CommentUpdate, CommentResponse,
    RemarkCreate, RemarkUpdate, RemarkResponse,
    WorkflowTemplateCreate, WorkflowTemplateUpdate, WorkflowTemplateResponse,
    ActivityLogResponse
)

router = APIRouter()

# Document Management
@router.get("/documents/", response_model=List[DocumentResponse])
async def get_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    category: Optional[str] = Query(None),
    related_entity_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user = Depends(require_permission("leads:view")),
    db = Depends(get_database)
):
    """Get all documents with filtering"""
    
    filter_dict = {"is_deleted": False, "is_active": True}
    
    if category:
        filter_dict["category"] = category
    
    if related_entity_id:
        filter_dict["$or"] = [
            {"related_entity_id": related_entity_id},
            {"related_lead_id": related_entity_id},
            {"related_task_id": related_entity_id}
        ]
    
    if search:
        escaped = re.escape(search)
        filter_dict["$or"] = [
            {"title": {"$regex": escaped, "$options": "i"}},
            {"description": {"$regex": escaped, "$options": "i"}},
            {"file_name": {"$regex": escaped, "$options": "i"}},
            {"tags": {"$regex": escaped, "$options": "i"}}
        ]
    
    documents = await db.documents.find(filter_dict).skip(skip).limit(limit).sort("created_at", -1).to_list(length=limit)
    return [
        DocumentResponse(
            id=str(doc["_id"]),
            **{k: v for k, v in doc.items() if k != "_id"}
        ) for doc in documents
    ]

@router.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: str = None,
    description: str = None,
    category: str = "general",
    tags: str = "",  # Comma-separated tags
    related_entity_id: str = None,
    related_lead_id: str = None,
    related_task_id: str = None,
    current_user = Depends(require_permission("leads:edit")),
    db = Depends(get_database)
):
    """Upload new document"""
    
    # Validate file upload
    await validate_upload(file)

    # Create upload directory
    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate safe unique filename
    unique_filename = safe_filename(file.filename)
    file_path = upload_dir / unique_filename

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.exception(f"Could not save file: {e}")
        raise HTTPException(status_code=500, detail="Operation failed. Please try again.")
    finally:
        file.file.close()
    
    # Parse tags
    tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
    
    document_data = {
        "_id": f"doc_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "title": title or file.filename,
        "description": description,
        "category": category,
        "file_name": file.filename,
        "file_path": str(file_path),
        "file_size": file_path.stat().st_size,
        "mime_type": file.content_type,
        "tags": tag_list,
        "related_entity_id": related_entity_id,
        "related_lead_id": related_lead_id,
        "related_task_id": related_task_id,
        "version": "1.0",
        "is_public": False,
        "is_active": True,
        "download_count": 0,
        "created_by": current_user.id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "is_deleted": False
    }
    
    await db.documents.insert_one(document_data)
    
    return DocumentResponse(
        id=document_data["_id"],
        **{k: v for k, v in document_data.items() if k not in ["_id"]}
    )

# Comment Management
@router.get("/comments/", response_model=List[CommentResponse])
async def get_comments(
    related_entity_type: str = Query(...),
    related_entity_id: str = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user = Depends(require_permission("leads:view")),
    db = Depends(get_database)
):
    """Get comments for an entity"""
    
    filter_dict = {
        "related_entity_type": related_entity_type,
        "related_entity_id": related_entity_id,
        "is_deleted": False,
        "is_active": True
    }
    
    comments = await db.comments.find(filter_dict).skip(skip).limit(limit).sort("created_at", -1).to_list(length=limit)
    
    # Get user names for comments
    user_ids = [comment["created_by"] for comment in comments]
    users = await db.users.find({"_id": {"$in": user_ids}}).to_list(length=None)
    user_dict = {user["_id"]: user.get("name", user.get("username", "Unknown")) for user in users}
    
    comment_responses = []
    for comment in comments:
        replies_count = await db.comments.count_documents({
            "parent_comment_id": str(comment["_id"]),
            "is_deleted": False,
            "is_active": True
        })
        
        comment_responses.append(CommentResponse(
            id=str(comment["_id"]),
            created_by_name=user_dict.get(comment["created_by"]),
            replies_count=replies_count,
            **{k: v for k, v in comment.items() if k != "_id"}
        ))
    
    return comment_responses

@router.post("/comments/", response_model=CommentResponse)
async def create_comment(
    comment: CommentCreate,
    current_user = Depends(require_permission("leads:edit")),
    db = Depends(get_database)
):
    """Create new comment"""
    
    # Validate parent comment if provided
    if comment.parent_comment_id:
        parent_comment = await db.comments.find_one({
            "_id": comment.parent_comment_id,
            "is_deleted": False
        })
        if not parent_comment:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    
    comment_data = {
        "_id": f"comment_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        **comment.dict(),
        "is_active": True,
        "created_by": current_user.id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "is_deleted": False
    }
    
    await db.comments.insert_one(comment_data)
    
    return CommentResponse(
        id=comment_data["_id"],
        created_by_name=current_user.full_name,
        replies_count=0,
        **{k: v for k, v in comment_data.items() if k not in ["_id"]}
    )

# Remark/Note Management
@router.get("/remarks/", response_model=List[RemarkResponse])
async def get_remarks(
    related_entity_type: str = Query(...),
    related_entity_id: str = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    category: Optional[str] = Query(None),
    is_important: Optional[bool] = Query(None),
    current_user = Depends(require_permission("leads:view")),
    db = Depends(get_database)
):
    """Get remarks for an entity"""
    
    filter_dict = {
        "related_entity_type": related_entity_type,
        "related_entity_id": related_entity_id,
        "is_deleted": False,
        "is_active": True
    }
    
    if category:
        filter_dict["category"] = category
    
    if is_important is not None:
        filter_dict["is_important"] = is_important
    
    remarks = await db.remarks.find(filter_dict).skip(skip).limit(limit).sort("created_at", -1).to_list(length=limit)
    
    # Get user names for remarks
    user_ids = [remark["created_by"] for remark in remarks]
    users = await db.users.find({"_id": {"$in": user_ids}}).to_list(length=None)
    user_dict = {user["_id"]: user.get("name", user.get("username", "Unknown")) for user in users}
    
    return [
        RemarkResponse(
            id=str(remark["_id"]),
            created_by_name=user_dict.get(remark["created_by"]),
            **{k: v for k, v in remark.items() if k != "_id"}
        ) for remark in remarks
    ]

@router.post("/remarks/", response_model=RemarkResponse)
async def create_remark(
    remark: RemarkCreate,
    current_user = Depends(require_permission("leads:edit")),
    db = Depends(get_database)
):
    """Create new remark"""
    
    remark_data = {
        "_id": f"remark_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        **remark.dict(),
        "is_active": True,
        "created_by": current_user.id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "is_deleted": False
    }
    
    await db.remarks.insert_one(remark_data)
    
    return RemarkResponse(
        id=remark_data["_id"],
        created_by_name=current_user.full_name,
        **{k: v for k, v in remark_data.items() if k not in ["_id"]}
    )

# Activity Logs
@router.get("/activity-logs/", response_model=List[ActivityLogResponse])
async def get_activity_logs(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(require_permission("leads:view")),
    db = Depends(get_database)
):
    """Get activity logs with filtering"""
    
    filter_dict = {}
    
    if entity_type:
        filter_dict["entity_type"] = entity_type
    
    if entity_id:
        filter_dict["entity_id"] = entity_id
    
    if action:
        filter_dict["action"] = action
    
    logs = await db.activity_logs.find(filter_dict).skip(skip).limit(limit).sort("created_at", -1).to_list(length=limit)
    
    # Get user names for logs
    user_ids = [log["created_by"] for log in logs]
    users = await db.users.find({"_id": {"$in": user_ids}}).to_list(length=None)
    user_dict = {user["_id"]: user.get("name", user.get("username", "Unknown")) for user in users}
    
    return [
        ActivityLogResponse(
            id=str(log["_id"]),
            created_by_name=user_dict.get(log["created_by"]),
            **{k: v for k, v in log.items() if k != "_id"}
        ) for log in logs
    ]

# Utility function to log activity
async def log_activity(
    db,
    entity_type: str,
    entity_id: str,
    action: str,
    description: str,
    user_id: str,
    metadata: dict = None
):
    """Log user activity"""
    
    activity_data = {
        "_id": f"log_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "description": description,
        "metadata": metadata or {},
        "created_by": user_id,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.activity_logs.insert_one(activity_data)