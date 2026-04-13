"""Tasks Views — REST endpoints for tasks and comments."""

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from apps.authentication.models import User
from core.auth import get_current_user
from core.file_utils import safe_filename, validate_upload

from .schemas import (
    TaskCommentCreate,
    TaskCommentResponse,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from .service import task_comment_service, task_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Tasks"])

UPLOAD_DIR = Path("uploads/tasks")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ── Tasks CRUD ────────────────────────────────────────────────────────

@router.post("", response_model=TaskResponse)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
):
    payload = data.model_dump()
    doc = await task_service.create(payload, user_id=current_user.id)
    enriched = await task_service.enrich_users([doc])
    return TaskResponse(**enriched[0])


@router.get("")
async def list_tasks(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    filter_type: Optional[str] = Query(None, description="mine | collaborating"),
):
    result = await task_service.list_tasks(
        user_id=current_user.id,
        is_superuser=current_user.is_superuser,
        page=page,
        page_size=page_size,
        status=status,
        priority=priority,
        search=search,
        filter_type=filter_type,
    )
    result["items"] = await task_service.enrich_users(result["items"])
    result["items"] = [TaskResponse(**t).model_dump() for t in result["items"]]
    return result


@router.get("/calendar")
async def calendar_tasks(
    start: str = Query(..., description="ISO date: 2026-04-01"),
    end: str = Query(..., description="ISO date: 2026-05-01"),
    current_user: User = Depends(get_current_user),
):
    try:
        start_dt = datetime.fromisoformat(start).replace(tzinfo=timezone.utc)
        end_dt = datetime.fromisoformat(end).replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    tasks = await task_service.get_calendar_tasks(
        user_id=current_user.id,
        is_superuser=current_user.is_superuser,
        start=start_dt,
        end=end_dt,
    )
    tasks = await task_service.enrich_users(tasks)
    return [TaskResponse(**t).model_dump() for t in tasks]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    if not await task_service.can_access(task_id, current_user.id, current_user.is_superuser):
        raise HTTPException(status_code=404, detail="Task not found")

    doc = await task_service.get_by_id(task_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")

    enriched = await task_service.enrich_users([doc])
    return TaskResponse(**enriched[0])


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
):
    if not await task_service.can_access(task_id, current_user.id, current_user.is_superuser):
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = data.model_dump(exclude_unset=True)
    doc = await task_service.update(task_id, update_data, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")

    enriched = await task_service.enrich_users([doc])
    return TaskResponse(**enriched[0])


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    if not await task_service.can_access(task_id, current_user.id, current_user.is_superuser):
        raise HTTPException(status_code=404, detail="Task not found")

    deleted = await task_service.soft_delete(task_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}


# ── Comments ──────────────────────────────────────────────────────────

@router.get("/{task_id}/comments")
async def list_comments(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    if not await task_service.can_access(task_id, current_user.id, current_user.is_superuser):
        raise HTTPException(status_code=404, detail="Task not found")

    comments = await task_comment_service.list_for_task(task_id)
    return [TaskCommentResponse(**c).model_dump() for c in comments]


@router.post("/{task_id}/comments", response_model=TaskCommentResponse)
async def create_comment(
    task_id: str,
    data: TaskCommentCreate,
    current_user: User = Depends(get_current_user),
):
    if not await task_service.can_access(task_id, current_user.id, current_user.is_superuser):
        raise HTTPException(status_code=404, detail="Task not found")

    user_name = f"{current_user.first_name} {current_user.last_name}".strip()
    doc = await task_comment_service.create(
        {
            "task_id": task_id,
            "user_id": current_user.id,
            "user_name": user_name or current_user.email,
            "comment": data.comment,
        },
        user_id=current_user.id,
    )
    return TaskCommentResponse(**doc)


@router.delete("/{task_id}/comments/{comment_id}")
async def delete_comment(
    task_id: str,
    comment_id: str,
    current_user: User = Depends(get_current_user),
):
    comment = await task_comment_service.get_by_id(comment_id)
    if not comment or comment.get("task_id") != task_id:
        raise HTTPException(status_code=404, detail="Comment not found")

    if not current_user.is_superuser and comment.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete others' comments")

    await task_comment_service.soft_delete(comment_id, user_id=current_user.id)
    return {"message": "Comment deleted"}


# ── Attachment Upload ─────────────────────────────────────────────────

@router.post("/{task_id}/upload")
async def upload_attachment(
    task_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not await task_service.can_access(task_id, current_user.id, current_user.is_superuser):
        raise HTTPException(status_code=404, detail="Task not found")

    await validate_upload(file)
    filename = safe_filename(file.filename)
    filepath = UPLOAD_DIR / filename

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    return {
        "name": file.filename,
        "url": f"/uploads/tasks/{filename}",
    }
