from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid

from core.auth import get_current_user
from core.permissions import require_permission
from core.database import get_database
from apps.authentication.models import User

router = APIRouter(tags=["comments"])


@router.get("/lead/{lead_id}")
async def get_lead_comments(
    lead_id: str,
    current_user: User = Depends(require_permission("leads:view"))
):
    """Get all comments for a lead"""
    db = get_database()

    comments = await db.comments.find(
        {'entity_type': 'lead', 'entity_id': lead_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)

    result = []
    for comment in comments:
        if isinstance(comment.get('created_at'), str):
            comment['created_at'] = datetime.fromisoformat(comment['created_at'])
        if isinstance(comment.get('updated_at'), str):
            comment['updated_at'] = datetime.fromisoformat(comment['updated_at'])
        result.append(comment)

    return result


@router.post("")
async def create_comment(
    data: dict,
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Create a new comment"""
    db = get_database()

    comment = {
        'id': str(uuid.uuid4()),
        'content': data.get('content', data.get('comment', '')),
        'entity_type': data.get('entity_type', 'lead'),
        'entity_id': data.get('entity_id', data.get('lead_id', '')),
        'author_id': current_user.id,
        'author_name': current_user.full_name,
        'is_internal': data.get('is_internal', False),
        'attachments': data.get('attachments', []),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }

    await db.comments.insert_one(comment)

    comment['created_at'] = datetime.fromisoformat(comment['created_at'])
    comment['updated_at'] = datetime.fromisoformat(comment['updated_at'])
    return comment


@router.put("/{comment_id}")
async def update_comment(
    comment_id: str,
    comment: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Update a comment"""
    db = get_database()

    update_data = {'updated_at': datetime.now(timezone.utc).isoformat()}
    if comment is not None:
        update_data['content'] = comment

    result = await db.comments.update_one(
        {'id': comment_id},
        {'$set': update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")

    updated = await db.comments.find_one({'id': comment_id}, {'_id': 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return updated


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: str,
    current_user: User = Depends(require_permission("leads:edit"))
):
    """Delete a comment"""
    db = get_database()

    result = await db.comments.delete_one({'id': comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")

    return {"message": "Comment deleted successfully"}
