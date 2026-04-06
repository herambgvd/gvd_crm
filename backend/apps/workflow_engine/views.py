"""
Workflow Engine Views — SOP CRUD and transition execution endpoints.
"""

from typing import Optional
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from apps.authentication.models import User
from core.auth import get_current_user
from core.permissions import require_permission

from .schemas import (
    SOPCreate,
    SOPResponse,
    SOPUpdate,
    SOPAssignRequest,
    TransitionExecuteRequest,
    TransitionLogResponse,
)
from .service import sop_service, transition_service

router = APIRouter(tags=["Workflow Engine"])


# ────────────────── SOP Management ──────────────────


@router.post("/sops", response_model=SOPResponse)
async def create_sop(
    data: SOPCreate,
    current_user: User = Depends(require_permission("workflows:create")),
):
    """Create a new SOP workflow."""
    from .schemas import VALID_MODULES

    if data.module not in VALID_MODULES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Module must be one of: {', '.join(VALID_MODULES)}",
        )

    payload = data.model_dump()
    doc = await sop_service.create_sop(payload, user_id=current_user.id)
    return SOPResponse(**doc)


@router.get("/sops")
async def list_sops(
    current_user: User = Depends(require_permission("workflows:view")),
    module: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List SOP workflows with optional module filter."""
    query = {}
    if module:
        query["module"] = module
    if is_active is not None:
        query["is_active"] = is_active

    result = await sop_service.list(
        query=query,
        page=page,
        page_size=page_size,
        sort=[("module", 1), ("name", 1)],
    )
    result["items"] = [SOPResponse(**doc).model_dump() for doc in result["items"]]
    return result


@router.get("/sops/module/{module}")
async def list_sops_by_module(
    module: str,
    current_user: User = Depends(get_current_user),
):
    """List active SOPs for a specific module."""
    from .schemas import VALID_MODULES

    if module not in VALID_MODULES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Module must be one of: {', '.join(VALID_MODULES)}",
        )

    sops = await sop_service.list_by_module(module, active_only=True)
    return [SOPResponse(**doc).model_dump() for doc in sops]


@router.get("/sops/{sop_id}", response_model=SOPResponse)
async def get_sop(
    sop_id: str,
    current_user: User = Depends(require_permission("workflows:view")),
):
    """Get a single SOP by ID."""
    doc = await sop_service.get_by_id(sop_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOP not found.",
        )
    return SOPResponse(**doc)


@router.put("/sops/{sop_id}", response_model=SOPResponse)
async def update_sop(
    sop_id: str,
    data: SOPUpdate,
    current_user: User = Depends(require_permission("workflows:edit")),
):
    """Update an SOP. Increments version if states/transitions change."""
    payload = data.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )

    doc = await sop_service.update_sop(sop_id, payload, user_id=current_user.id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOP not found.",
        )
    return SOPResponse(**doc)


@router.delete("/sops/{sop_id}")
async def delete_sop(
    sop_id: str,
    current_user: User = Depends(require_permission("workflows:delete")),
):
    """Soft delete (deactivate) an SOP."""
    deleted = await sop_service.soft_delete(sop_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOP not found.",
        )
    return {"message": "SOP deleted successfully."}


# ────────────────── Transition Execution ──────────────────


@router.post("/transitions/execute")
async def execute_transition(
    data: TransitionExecuteRequest,
    current_user: User = Depends(get_current_user),
):
    """Execute a state transition on a record."""
    user_name = f"{current_user.first_name} {current_user.last_name}".strip()
    log = await transition_service.execute_transition(
        record_type=data.record_type,
        record_id=data.record_id,
        transition_id=data.transition_id,
        form_data=data.form_data,
        user_id=current_user.id,
        user_name=user_name or current_user.email,
        notes=data.notes,
    )
    return TransitionLogResponse(**log)


@router.get("/transitions/available/{record_type}/{record_id}")
async def get_available_transitions(
    record_type: str,
    record_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get transitions available from the record's current state."""
    return await transition_service.get_available_transitions(record_type, record_id)


@router.get("/transitions/logs/{record_type}/{record_id}")
async def get_transition_logs(
    record_type: str,
    record_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get transition history for a record."""
    logs = await transition_service.get_record_history(record_type, record_id)
    return [TransitionLogResponse(**log).model_dump() for log in logs]


# ────────────────── SOP Assignment ──────────────────


@router.post("/assign/{record_type}/{record_id}")
async def assign_sop(
    record_type: str,
    record_id: str,
    data: SOPAssignRequest,
    current_user: User = Depends(get_current_user),
):
    """Assign an SOP to a record and set it to the start state."""
    user_name = f"{current_user.first_name} {current_user.last_name}".strip()
    result = await transition_service.assign_sop_to_record(
        record_type=record_type,
        record_id=record_id,
        sop_id=data.sop_id,
        user_id=current_user.id,
        user_name=user_name or current_user.email,
    )
    return result


# ────────────────── Stats ──────────────────


@router.get("/stats/{module}")
async def get_workflow_stats(
    module: str,
    sop_id: str = Query(..., description="SOP ID to get stats for"),
    current_user: User = Depends(get_current_user),
):
    """Get state-wise record counts for a module's SOP."""
    return await sop_service.get_stats(module, sop_id)


# ────────────────── File Upload for Transitions ──────────────────

UPLOAD_DIR = Path("uploads/transitions")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_transition_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a file for use in transition form data. Returns the file URL."""
    from core.file_utils import validate_upload, safe_filename

    await validate_upload(file)
    filename = safe_filename(file.filename)
    filepath = UPLOAD_DIR / filename

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    return {
        "filename": file.filename,
        "path": f"uploads/transitions/{filename}",
        "url": f"/uploads/transitions/{filename}",
    }
