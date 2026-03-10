"""
Enquiry API Views

Full CRUD for enquiries, remarks, comments, plus convert-to-lead endpoint.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from core.auth import get_current_user
from core.permissions import require_permission
from core.database import get_database
from apps.authentication.models import User

from .schemas import (
    EnquiryCreate, EnquiryUpdate, EnquiryResponse,
    RemarkCreate, RemarkResponse,
    CommentCreate, CommentUpdate, CommentResponse,
    ConvertToLeadRequest,
)
from .service import enquiry_service, remark_service, comment_service

router = APIRouter(tags=["enquiries"])


# ──────────────────────────────────────────────
# Enquiry CRUD
# ──────────────────────────────────────────────

@router.get("")
async def list_enquiries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("enquiries:view")),
):
    """List enquiries with pagination and filters."""
    result = await enquiry_service.list_enquiries(
        page=page,
        page_size=page_size,
        status=status,
        priority=priority,
        source=source,
        search=search,
        assigned_to=assigned_to,
    )

    db = get_database()

    # Enrich with counts and user names
    enriched_items = []
    for enq in result["items"]:
        enq["remarks_count"] = await db.enquiry_remarks.count_documents(
            {"enquiry_id": enq["id"], "is_deleted": {"$ne": True}}
        )
        enq["comments_count"] = await db.enquiry_comments.count_documents(
            {"enquiry_id": enq["id"], "is_deleted": {"$ne": True}}
        )

        # Resolve assigned_to name
        if enq.get("assigned_to"):
            user = await db.users.find_one({"id": enq["assigned_to"]}, {"_id": 0, "first_name": 1, "last_name": 1})
            enq["assigned_to_name"] = f"{user['first_name']} {user['last_name']}" if user else None

        # Resolve created_by name
        if enq.get("created_by"):
            user = await db.users.find_one({"id": enq["created_by"]}, {"_id": 0, "first_name": 1, "last_name": 1})
            enq["created_by_name"] = f"{user['first_name']} {user['last_name']}" if user else None

        enriched_items.append(enq)

    result["items"] = enriched_items
    return result


@router.get("/{enquiry_id}")
async def get_enquiry(
    enquiry_id: str,
    current_user: User = Depends(require_permission("enquiries:view")),
):
    """Get a single enquiry by ID."""
    enq = await enquiry_service.get_by_id(enquiry_id)
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    db = get_database()

    # Enrich
    enq["remarks_count"] = await db.enquiry_remarks.count_documents(
        {"enquiry_id": enq["id"], "is_deleted": {"$ne": True}}
    )
    enq["comments_count"] = await db.enquiry_comments.count_documents(
        {"enquiry_id": enq["id"], "is_deleted": {"$ne": True}}
    )

    if enq.get("assigned_to"):
        user = await db.users.find_one({"id": enq["assigned_to"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        enq["assigned_to_name"] = f"{user['first_name']} {user['last_name']}" if user else None

    if enq.get("created_by"):
        user = await db.users.find_one({"id": enq["created_by"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        enq["created_by_name"] = f"{user['first_name']} {user['last_name']}" if user else None

    return enq


@router.post("")
async def create_enquiry(
    data: EnquiryCreate,
    current_user: User = Depends(require_permission("enquiries:create")),
):
    """Create a new enquiry."""
    enq = await enquiry_service.create_enquiry(data.model_dump(), current_user.id)
    return enq


@router.put("/{enquiry_id}")
async def update_enquiry(
    enquiry_id: str,
    data: EnquiryUpdate,
    current_user: User = Depends(require_permission("enquiries:edit")),
):
    """Update an enquiry."""
    existing = await enquiry_service.get_by_id(enquiry_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    updated = await enquiry_service.update_enquiry(
        enquiry_id, data.model_dump(exclude_unset=True), current_user.id
    )
    return updated


@router.delete("/{enquiry_id}")
async def delete_enquiry(
    enquiry_id: str,
    current_user: User = Depends(require_permission("enquiries:delete")),
):
    """Soft-delete an enquiry."""
    deleted = await enquiry_service.soft_delete(enquiry_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return {"message": "Enquiry deleted successfully"}


# ──────────────────────────────────────────────
# Convert to Lead
# ──────────────────────────────────────────────

@router.post("/{enquiry_id}/convert")
async def convert_enquiry_to_lead(
    enquiry_id: str,
    data: ConvertToLeadRequest,
    current_user: User = Depends(require_permission("enquiries:convert")),
):
    """Convert an enquiry into a lead."""
    try:
        lead = await enquiry_service.convert_to_lead(
            enquiry_id, current_user.id, data.model_dump()
        )
        return {"message": "Enquiry converted to lead", "lead": lead}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ──────────────────────────────────────────────
# Remarks
# ──────────────────────────────────────────────

@router.get("/{enquiry_id}/remarks")
async def list_remarks(
    enquiry_id: str,
    current_user: User = Depends(require_permission("enquiries:view")),
):
    """Get all remarks for an enquiry."""
    # Verify enquiry exists
    enq = await enquiry_service.get_by_id(enquiry_id)
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    return await remark_service.list_remarks(enquiry_id)


@router.post("/{enquiry_id}/remarks")
async def add_remark(
    enquiry_id: str,
    data: RemarkCreate,
    current_user: User = Depends(require_permission("enquiries:edit")),
):
    """Add a remark to an enquiry."""
    enq = await enquiry_service.get_by_id(enquiry_id)
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    remark = await remark_service.add_remark(
        enquiry_id=enquiry_id,
        content=data.content,
        is_important=data.is_important,
        user_id=current_user.id,
        user_name=current_user.full_name,
    )
    return remark


@router.delete("/{enquiry_id}/remarks/{remark_id}")
async def delete_remark(
    enquiry_id: str,
    remark_id: str,
    current_user: User = Depends(require_permission("enquiries:edit")),
):
    """Delete a remark."""
    deleted = await remark_service.soft_delete(remark_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Remark not found")
    return {"message": "Remark deleted"}


# ──────────────────────────────────────────────
# Comments
# ──────────────────────────────────────────────

@router.get("/{enquiry_id}/comments")
async def list_comments(
    enquiry_id: str,
    current_user: User = Depends(require_permission("enquiries:view")),
):
    """Get all comments for an enquiry."""
    enq = await enquiry_service.get_by_id(enquiry_id)
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    return await comment_service.list_comments(enquiry_id)


@router.post("/{enquiry_id}/comments")
async def add_comment(
    enquiry_id: str,
    data: CommentCreate,
    current_user: User = Depends(require_permission("enquiries:edit")),
):
    """Add a comment to an enquiry."""
    enq = await enquiry_service.get_by_id(enquiry_id)
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    comment = await comment_service.add_comment(
        enquiry_id=enquiry_id,
        content=data.content,
        user_id=current_user.id,
        user_name=current_user.full_name,
        parent_comment_id=data.parent_comment_id,
    )
    return comment


@router.put("/{enquiry_id}/comments/{comment_id}")
async def update_comment(
    enquiry_id: str,
    comment_id: str,
    data: CommentUpdate,
    current_user: User = Depends(require_permission("enquiries:edit")),
):
    """Update a comment."""
    updated = await comment_service.update_comment(comment_id, data.content, current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Comment not found")
    return updated


@router.delete("/{enquiry_id}/comments/{comment_id}")
async def delete_comment(
    enquiry_id: str,
    comment_id: str,
    current_user: User = Depends(require_permission("enquiries:edit")),
):
    """Delete a comment."""
    deleted = await comment_service.soft_delete(comment_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment deleted"}
