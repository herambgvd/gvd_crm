"""
Team Views — CRUD for team management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
import re
import uuid

from core.auth import get_current_user
from core.database import get_database
from core.permissions import require_permission
from apps.authentication.models import User
from .team_schemas import TeamCreate, TeamUpdate, TeamResponse

router = APIRouter(prefix="/teams", tags=["teams"])


async def _enrich_team(team: dict, db) -> dict:
    """Add leader_name and members list to a team document."""
    if team.get("leader_id"):
        leader = await db.users.find_one(
            {"id": team["leader_id"]},
            {"_id": 0, "first_name": 1, "last_name": 1},
        )
        team["leader_name"] = (
            f"{leader['first_name']} {leader['last_name']}" if leader else None
        )

    member_ids = team.get("member_ids", [])
    members = []
    if member_ids:
        cursor = db.users.find(
            {"id": {"$in": member_ids}},
            {"_id": 0, "id": 1, "first_name": 1, "last_name": 1},
        )
        async for u in cursor:
            members.append({"id": u["id"], "name": f"{u['first_name']} {u['last_name']}"})
    team["members"] = members

    return team


@router.get("")
async def list_teams(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("teams:view")),
):
    """List teams with optional search."""
    db = get_database()
    query = {"is_deleted": {"$ne": True}}

    if search:
        escaped = re.escape(search)
        query["$or"] = [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"department": {"$regex": escaped, "$options": "i"}},
        ]

    total = await db.teams.count_documents(query)
    skip = (page - 1) * page_size
    docs = (
        await db.teams.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(page_size)
        .to_list(page_size)
    )

    items = []
    for doc in docs:
        items.append(await _enrich_team(doc, db))

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, -(-total // page_size)),
    }


@router.get("/{team_id}")
async def get_team(
    team_id: str,
    current_user: User = Depends(require_permission("teams:view")),
):
    """Get a single team by ID."""
    db = get_database()
    doc = await db.teams.find_one({"id": team_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Team not found")
    return await _enrich_team(doc, db)


@router.post("")
async def create_team(
    data: TeamCreate,
    current_user: User = Depends(require_permission("teams:create")),
):
    """Create a new team."""
    db = get_database()

    # Check name uniqueness
    existing = await db.teams.find_one({"name": data.name, "is_deleted": {"$ne": True}})
    if existing:
        raise HTTPException(status_code=400, detail="Team name already exists")

    doc = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "is_active": True,
        "is_deleted": False,
        "created_by": current_user.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.teams.insert_one(doc)
    doc.pop("_id", None)
    return await _enrich_team(doc, db)


@router.put("/{team_id}")
async def update_team(
    team_id: str,
    data: TeamUpdate,
    current_user: User = Depends(require_permission("teams:edit")),
):
    """Update a team."""
    db = get_database()

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Check name uniqueness if changing
    if "name" in update_data:
        existing = await db.teams.find_one(
            {"name": update_data["name"], "id": {"$ne": team_id}, "is_deleted": {"$ne": True}}
        )
        if existing:
            raise HTTPException(status_code=400, detail="Team name already exists")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.teams.update_one(
        {"id": team_id, "is_deleted": {"$ne": True}},
        {"$set": update_data},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")

    doc = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return await _enrich_team(doc, db)


@router.delete("/{team_id}")
async def delete_team(
    team_id: str,
    current_user: User = Depends(require_permission("teams:delete")),
):
    """Soft-delete a team."""
    db = get_database()
    result = await db.teams.update_one(
        {"id": team_id, "is_deleted": {"$ne": True}},
        {"$set": {"is_deleted": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted successfully"}


# ── Data Access Grants ──────────────────────────────────────────────

@router.get("/{team_id}/grants")
async def list_grants(
    team_id: str,
    current_user: User = Depends(get_current_user),
):
    """List all data access grants for a team. Only the team leader can view."""
    db = get_database()
    team = await db.teams.find_one({"id": team_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Only leader or superuser can manage grants
    if not current_user.is_superuser and team.get("leader_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Only team leader can manage access grants")

    grants = await db.data_access_grants.find(
        {"team_id": team_id, "is_deleted": {"$ne": True}},
        {"_id": 0}
    ).to_list(100)

    # Enrich with user names
    user_ids = set()
    for g in grants:
        user_ids.add(g.get("grantee_id", ""))
        user_ids.add(g.get("target_user_id", ""))

    users = await db.users.find(
        {"id": {"$in": list(user_ids)}},
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1}
    ).to_list(len(user_ids))
    user_map = {u["id"]: f"{u['first_name']} {u['last_name']}" for u in users}

    for g in grants:
        g["grantee_name"] = user_map.get(g.get("grantee_id"), "")
        g["target_user_name"] = user_map.get(g.get("target_user_id"), "")

    return grants


@router.post("/{team_id}/grants")
async def create_grant(
    team_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
):
    """
    Grant a team member access to another member's data.
    Body: { grantee_id, target_user_id }
    """
    db = get_database()
    team = await db.teams.find_one({"id": team_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if not current_user.is_superuser and team.get("leader_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Only team leader can grant access")

    grantee_id = data.get("grantee_id")
    target_user_id = data.get("target_user_id")

    if not grantee_id or not target_user_id:
        raise HTTPException(status_code=400, detail="grantee_id and target_user_id required")

    if grantee_id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot grant access to own data")

    # Verify both users are in the team
    team_members = set(team.get("member_ids", []))
    team_members.add(team.get("leader_id", ""))
    if grantee_id not in team_members or target_user_id not in team_members:
        raise HTTPException(status_code=400, detail="Both users must be in the team")

    # Check if grant already exists
    existing = await db.data_access_grants.find_one({
        "team_id": team_id,
        "grantee_id": grantee_id,
        "target_user_id": target_user_id,
        "is_deleted": {"$ne": True},
    })
    if existing:
        raise HTTPException(status_code=400, detail="Access already granted")

    now = datetime.now(timezone.utc).isoformat()
    grant = {
        "id": str(uuid.uuid4()),
        "team_id": team_id,
        "grantee_id": grantee_id,
        "target_user_id": target_user_id,
        "granted_by": current_user.id,
        "created_at": now,
        "is_deleted": False,
    }
    await db.data_access_grants.insert_one(grant)
    grant.pop("_id", None)

    # Clear access cache
    from core.data_access import clear_access_cache
    await clear_access_cache()

    return grant


@router.delete("/{team_id}/grants/{grant_id}")
async def revoke_grant(
    team_id: str,
    grant_id: str,
    current_user: User = Depends(get_current_user),
):
    """Revoke a data access grant."""
    db = get_database()
    team = await db.teams.find_one({"id": team_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if not current_user.is_superuser and team.get("leader_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Only team leader can revoke access")

    result = await db.data_access_grants.update_one(
        {"id": grant_id, "team_id": team_id, "is_deleted": {"$ne": True}},
        {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Grant not found")

    from core.data_access import clear_access_cache
    await clear_access_cache()

    return {"message": "Access revoked"}
