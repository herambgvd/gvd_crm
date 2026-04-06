"""
Entity API Views

Full CRUD with proper validation, pagination, and bulk upload.
Replaces the old entity_views.py that lived inside leads/ with raw dicts.
"""

from fastapi import APIRouter, Body, Depends, HTTPException, Query, UploadFile, File
from typing import List, Optional
import csv
import io

from core.auth import get_current_user
from core.permissions import require_permission
from core.database import get_database
from apps.authentication.models import User

from .schemas import EntityCreate, EntityUpdate, TeamMemberCreate, TeamMemberUpdate
from .service import entity_service

router = APIRouter(tags=["entities"])


# ──────────────────────────────────────────────
# CRUD
# ──────────────────────────────────────────────

@router.get("")
async def list_entities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    entity_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("entities:view")),
):
    """List entities with pagination and filters."""
    result = await entity_service.list_entities(
        page=page,
        page_size=page_size,
        entity_type=entity_type,
        status=status,
        search=search,
        city=city,
        state=state,
    )

    # Enrich with creator names
    db = get_database()
    for item in result["items"]:
        if item.get("created_by"):
            user = await db.users.find_one(
                {"id": item["created_by"]},
                {"_id": 0, "first_name": 1, "last_name": 1},
            )
            item["created_by_name"] = (
                f"{user['first_name']} {user['last_name']}" if user else None
            )

    return result


@router.get("/search")
async def search_entities(
    q: str = Query("", min_length=0),
    limit: int = Query(10, ge=1, le=50),
    entity_type: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("entities:view")),
):
    """Quick search / autocomplete for entity connections."""
    return await entity_service.search_entities(q, limit, entity_type)


@router.get("/{entity_id}")
async def get_entity(
    entity_id: str,
    current_user: User = Depends(require_permission("entities:view")),
):
    """Get a single entity by ID."""
    entity = await entity_service.get_by_id(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


@router.post("")
async def create_entity(
    data: EntityCreate,
    current_user: User = Depends(require_permission("entities:create")),
):
    """Create a new entity with validated data."""
    doc = data.model_dump()
    doc["created_by"] = current_user.id
    entity = await entity_service.create(doc)
    return entity


@router.put("/{entity_id}")
async def update_entity(
    entity_id: str,
    data: EntityUpdate,
    current_user: User = Depends(require_permission("entities:edit")),
):
    """Update an entity."""
    existing = await entity_service.get_by_id(entity_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Entity not found")

    update_data = data.model_dump(exclude_unset=True)
    updated = await entity_service.update(entity_id, update_data, current_user.id)
    return updated


@router.delete("/{entity_id}")
async def delete_entity(
    entity_id: str,
    current_user: User = Depends(require_permission("entities:delete")),
):
    """Soft-delete an entity."""
    deleted = await entity_service.soft_delete(entity_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entity not found")
    return {"message": "Entity deleted successfully"}


@router.post("/bulk-delete")
async def bulk_delete_entities(
    ids: List[str] = Body(..., embed=True),
    current_user: User = Depends(require_permission("entities:delete")),
):
    """Bulk soft-delete entities by list of IDs. Max 100 at a time."""
    if not ids or len(ids) > 100:
        raise HTTPException(status_code=400, detail="Provide 1-100 entity IDs")
    count = await entity_service.bulk_soft_delete(ids, user_id=current_user.id)
    return {"deleted": count, "message": f"{count} entities deleted"}


# ──────────────────────────────────────────────
# Bulk Upload
# ──────────────────────────────────────────────

@router.post("/bulk-upload")
async def bulk_upload_entities(
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("entities:create")),
):
    """Bulk upload entities from CSV file."""
    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    created_count = 0
    errors = []

    for idx, row in enumerate(reader, start=1):
        try:
            doc = {
                "entity_type": row.get("entity_type", "consultant"),
                "company_name": row.get("company_name", ""),
                "contact_person": row.get("contact_person", ""),
                "phone": row.get("phone", ""),
                "email": row.get("email"),
                "address": row.get("address"),
                "city": row.get("city"),
                "state": row.get("state"),
                "pincode": row.get("pincode"),
                "gstin": row.get("gstin"),
                "pan": row.get("pan"),
                "website": row.get("website"),
                "notes": row.get("notes"),
                "status": "active",
                "created_by": current_user.id,
            }
            await entity_service.create(doc)
            created_count += 1
        except Exception as e:
            errors.append({"row": idx, "error": str(e)})

    return {
        "message": f"Successfully uploaded {created_count} entities",
        "success_count": created_count,
        "errors": errors,
    }


# ──────────────────────────────────────────────
# Team Members
# ──────────────────────────────────────────────

@router.get("/{entity_id}/team-members")
async def list_team_members(
    entity_id: str,
    current_user: User = Depends(require_permission("entities:view")),
):
    """List all team members for an entity."""
    from core.database import get_database
    db = get_database()
    docs = await db.entity_team_members.find(
        {"entity_id": entity_id, "is_deleted": {"$ne": True}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(200)
    return docs


@router.post("/{entity_id}/team-members")
async def create_team_member(
    entity_id: str,
    data: TeamMemberCreate,
    current_user: User = Depends(require_permission("entities:edit")),
):
    """Add a team member to an entity."""
    entity = await entity_service.get_by_id(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    doc = data.model_dump()
    doc["entity_id"] = entity_id
    doc["created_by"] = current_user.id
    return await entity_service.create_team_member(doc)


@router.put("/{entity_id}/team-members/{member_id}")
async def update_team_member(
    entity_id: str,
    member_id: str,
    data: TeamMemberUpdate,
    current_user: User = Depends(require_permission("entities:edit")),
):
    """Update a team member."""
    from core.database import get_database
    from datetime import datetime, timezone
    db = get_database()
    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.entity_team_members.find_one_and_update(
        {"id": member_id, "entity_id": entity_id, "is_deleted": {"$ne": True}},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Team member not found")
    result.pop("_id", None)
    return result


@router.delete("/{entity_id}/team-members/{member_id}")
async def delete_team_member(
    entity_id: str,
    member_id: str,
    current_user: User = Depends(require_permission("entities:edit")),
):
    """Soft-delete a team member."""
    from core.database import get_database
    from datetime import datetime, timezone
    db = get_database()
    result = await db.entity_team_members.update_one(
        {"id": member_id, "entity_id": entity_id},
        {"$set": {"is_deleted": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    return {"message": "Team member removed"}
