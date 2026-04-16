"""
Team-Based Data Access Control

Rules:
1. Superuser/Admin -> sees everything
2. Team Leader -> sees all data from their team members
3. Team Member -> sees only their own data (created_by OR assigned_to)
4. Data Access Grant -> leader can grant member A access to member B's data

Usage in services:
    from core.data_access import build_access_query, merge_access_filter

    access_filter = await build_access_query(user_id, is_superuser)
    query = merge_access_filter(query, access_filter)
"""

import logging
from typing import Any, Dict, List, Optional
from core.database import get_database

logger = logging.getLogger(__name__)

# Cache teams per request (cleared on each call)
_team_cache: Dict[str, Any] = {}


async def get_user_team_context(user_id: str) -> Dict[str, Any]:
    """
    Get the user's team context:
    - teams they lead
    - teams they belong to
    - their visible user IDs (self + granted access)
    """
    if user_id in _team_cache:
        return _team_cache[user_id]

    db = get_database()

    # Find teams where user is leader
    led_teams = await db.teams.find(
        {"leader_id": user_id, "is_deleted": {"$ne": True}},
        {"_id": 0, "id": 1, "member_ids": 1}
    ).to_list(20)

    # Find teams where user is member
    member_teams = await db.teams.find(
        {"member_ids": user_id, "is_deleted": {"$ne": True}},
        {"_id": 0, "id": 1, "leader_id": 1, "member_ids": 1}
    ).to_list(20)

    # Collect all member IDs from teams user leads
    led_member_ids = set()
    for team in led_teams:
        led_member_ids.update(team.get("member_ids", []))

    # Get data access grants (where this user is the grantee)
    grants = await db.data_access_grants.find(
        {"grantee_id": user_id, "is_deleted": {"$ne": True}},
        {"_id": 0, "target_user_id": 1}
    ).to_list(100)
    granted_user_ids = {g["target_user_id"] for g in grants}

    context = {
        "is_leader": len(led_teams) > 0,
        "led_teams": led_teams,
        "member_teams": member_teams,
        "led_member_ids": led_member_ids,
        "granted_user_ids": granted_user_ids,
    }

    _team_cache[user_id] = context
    return context


async def _is_admin_role(user_id: str) -> bool:
    """Check if user has the Admin role (full access to all modules)."""
    db = get_database()
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "role_id": 1})
    if not user or not user.get("role_id"):
        return False
    role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0, "name": 1})
    return role and role.get("name", "").lower() == "admin"


async def build_access_query(user_id: str, is_superuser: bool = False) -> Dict[str, Any]:
    """
    Build a MongoDB query filter that restricts data to what the user can see.

    Returns a dict to merge into your existing query.
    Returns {} for superusers and admin-role users (no restriction).
    """
    if is_superuser:
        return {}

    # Users with Admin role also see everything
    if await _is_admin_role(user_id):
        return {}

    ctx = await get_user_team_context(user_id)

    # Collect all user IDs whose data this user can see
    visible_user_ids = {user_id}  # always see own data

    # If leader, see all team members' data
    visible_user_ids.update(ctx["led_member_ids"])

    # Add granted access
    visible_user_ids.update(ctx["granted_user_ids"])

    visible_list = list(visible_user_ids)

    return {
        "$or": [
            {"created_by": {"$in": visible_list}},
            {"assigned_to": {"$in": visible_list}},
        ]
    }


def merge_access_filter(query: Dict[str, Any], access_filter: Dict[str, Any]) -> Dict[str, Any]:
    """Safely merge access filter into an existing query that may already have $or."""
    if not access_filter:
        return query

    # If both have $or, combine with $and
    if "$or" in query and "$or" in access_filter:
        existing_or = query.pop("$or")
        if "$and" in query:
            query["$and"].extend([{"$or": existing_or}, access_filter])
        else:
            query["$and"] = [{"$or": existing_or}, access_filter]
    elif "$or" in access_filter:
        if "$and" in query:
            query["$and"].append(access_filter)
        else:
            query["$and"] = [access_filter]
    else:
        query.update(access_filter)

    return query


async def clear_access_cache():
    """Clear the in-memory cache. Call after team/grant changes."""
    global _team_cache
    _team_cache = {}
