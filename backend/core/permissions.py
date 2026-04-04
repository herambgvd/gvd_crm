"""
Real RBAC Permission System

Provides middleware and utilities for enforcing role-based access control.
Permissions are stored as codenames in the format: "resource:action"
e.g., "products:create", "leads:edit", "inventory:stock_in"

Usage in views:
    @router.get("/")
    async def list_items(current_user: User = Depends(require_permission("products:view"))):
        ...

    @router.post("/")
    async def create_item(current_user: User = Depends(require_permission("products:create"))):
        ...
"""

from functools import lru_cache
from typing import List, Optional
from fastapi import Depends, HTTPException, status
import logging

from .auth import get_current_user
from .database import get_database

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────
# Default Permissions Registry
# ────────────────────────────────────────────────

DEFAULT_PERMISSIONS = [
    # Users
    {"name": "View Users", "codename": "users:view", "resource": "users", "action": "view"},
    {"name": "Create Users", "codename": "users:create", "resource": "users", "action": "create"},
    {"name": "Edit Users", "codename": "users:edit", "resource": "users", "action": "edit"},
    {"name": "Delete Users", "codename": "users:delete", "resource": "users", "action": "delete"},
    # Teams
    {"name": "View Teams", "codename": "teams:view", "resource": "teams", "action": "view"},
    {"name": "Create Teams", "codename": "teams:create", "resource": "teams", "action": "create"},
    {"name": "Edit Teams", "codename": "teams:edit", "resource": "teams", "action": "edit"},
    {"name": "Delete Teams", "codename": "teams:delete", "resource": "teams", "action": "delete"},
    # Roles
    {"name": "View Roles", "codename": "roles:view", "resource": "roles", "action": "view"},
    {"name": "Create Roles", "codename": "roles:create", "resource": "roles", "action": "create"},
    {"name": "Edit Roles", "codename": "roles:edit", "resource": "roles", "action": "edit"},
    {"name": "Delete Roles", "codename": "roles:delete", "resource": "roles", "action": "delete"},
    # Entities
    {"name": "View Entities", "codename": "entities:view", "resource": "entities", "action": "view"},
    {"name": "Create Entities", "codename": "entities:create", "resource": "entities", "action": "create"},
    {"name": "Edit Entities", "codename": "entities:edit", "resource": "entities", "action": "edit"},
    {"name": "Delete Entities", "codename": "entities:delete", "resource": "entities", "action": "delete"},
    # Customers
    {"name": "View Customers", "codename": "customers:view", "resource": "customers", "action": "view"},
    {"name": "Create Customers", "codename": "customers:create", "resource": "customers", "action": "create"},
    {"name": "Edit Customers", "codename": "customers:edit", "resource": "customers", "action": "edit"},
    {"name": "Delete Customers", "codename": "customers:delete", "resource": "customers", "action": "delete"},
    # Products
    {"name": "View Products", "codename": "products:view", "resource": "products", "action": "view"},
    {"name": "Create Products", "codename": "products:create", "resource": "products", "action": "create"},
    {"name": "Edit Products", "codename": "products:edit", "resource": "products", "action": "edit"},
    {"name": "Delete Products", "codename": "products:delete", "resource": "products", "action": "delete"},
    # Inventory
    {"name": "View Inventory", "codename": "inventory:view", "resource": "inventory", "action": "view"},
    {"name": "Stock In", "codename": "inventory:stock_in", "resource": "inventory", "action": "stock_in"},
    {"name": "Stock Out", "codename": "inventory:stock_out", "resource": "inventory", "action": "stock_out"},
    {"name": "Adjust Stock", "codename": "inventory:adjust", "resource": "inventory", "action": "adjust"},
    # Enquiries
    {"name": "View Enquiries", "codename": "enquiries:view", "resource": "enquiries", "action": "view"},
    {"name": "Create Enquiries", "codename": "enquiries:create", "resource": "enquiries", "action": "create"},
    {"name": "Edit Enquiries", "codename": "enquiries:edit", "resource": "enquiries", "action": "edit"},
    {"name": "Delete Enquiries", "codename": "enquiries:delete", "resource": "enquiries", "action": "delete"},
    {"name": "Convert Enquiries", "codename": "enquiries:convert", "resource": "enquiries", "action": "convert"},
    # Leads
    {"name": "View Leads", "codename": "leads:view", "resource": "leads", "action": "view"},
    {"name": "Create Leads", "codename": "leads:create", "resource": "leads", "action": "create"},
    {"name": "Edit Leads", "codename": "leads:edit", "resource": "leads", "action": "edit"},
    {"name": "Delete Leads", "codename": "leads:delete", "resource": "leads", "action": "delete"},
    {"name": "Assign Leads", "codename": "leads:assign", "resource": "leads", "action": "assign"},
    # Orders
    {"name": "View Orders", "codename": "orders:view", "resource": "orders", "action": "view"},
    {"name": "Create Orders", "codename": "orders:create", "resource": "orders", "action": "create"},
    {"name": "Edit Orders", "codename": "orders:edit", "resource": "orders", "action": "edit"},
    {"name": "Delete Orders", "codename": "orders:delete", "resource": "orders", "action": "delete"},
    {"name": "Approve Orders", "codename": "orders:approve", "resource": "orders", "action": "approve"},
    # Finance
    {"name": "View Finance", "codename": "finance:view", "resource": "finance", "action": "view"},
    {"name": "Create Finance", "codename": "finance:create", "resource": "finance", "action": "create"},
    {"name": "Edit Finance", "codename": "finance:edit", "resource": "finance", "action": "edit"},
    {"name": "Delete Finance", "codename": "finance:delete", "resource": "finance", "action": "delete"},
    # Support
    {"name": "View Support", "codename": "support:view", "resource": "support", "action": "view"},
    {"name": "Create Support", "codename": "support:create", "resource": "support", "action": "create"},
    {"name": "Edit Support", "codename": "support:edit", "resource": "support", "action": "edit"},
    {"name": "Delete Support", "codename": "support:delete", "resource": "support", "action": "delete"},
    {"name": "Escalate Support", "codename": "support:escalate", "resource": "support", "action": "escalate"},
    # Workflows (SOP Builder)
    {"name": "View Workflows", "codename": "workflows:view", "resource": "workflows", "action": "view"},
    {"name": "Create Workflows", "codename": "workflows:create", "resource": "workflows", "action": "create"},
    {"name": "Edit Workflows", "codename": "workflows:edit", "resource": "workflows", "action": "edit"},
    {"name": "Delete Workflows", "codename": "workflows:delete", "resource": "workflows", "action": "delete"},
]

# Default roles with their permission codenames
DEFAULT_ROLES = {
    "admin": {
        "name": "Admin",
        "description": "Full access to all modules",
        "permissions": [p["codename"] for p in DEFAULT_PERMISSIONS],  # all permissions
    },
    "manager": {
        "name": "Manager",
        "description": "Can manage most modules, cannot manage users/roles",
        "permissions": [
            p["codename"] for p in DEFAULT_PERMISSIONS
            if p["resource"] not in ("users", "roles", "teams")
        ],
    },
    "sales": {
        "name": "Sales Executive",
        "description": "Access to leads, customers, entities, orders, products, finance",
        "permissions": [
            p["codename"] for p in DEFAULT_PERMISSIONS
            if p["resource"] in ("leads", "customers", "orders", "entities", "products", "finance")
            and p["action"] in ("view", "create", "edit")
        ],
    },
    "support": {
        "name": "Support Agent",
        "description": "Access to support tickets and knowledge base",
        "permissions": [
            p["codename"] for p in DEFAULT_PERMISSIONS
            if p["resource"] in ("support", "entities", "products")
            and p["action"] in ("view", "create", "edit", "escalate")
        ],
    },
    "inventory": {
        "name": "Inventory Manager",
        "description": "Manage products and inventory",
        "permissions": [
            p["codename"] for p in DEFAULT_PERMISSIONS
            if p["resource"] in ("products", "inventory")
        ],
    },
    "viewer": {
        "name": "Viewer",
        "description": "Read-only access to all modules",
        "permissions": [
            p["codename"] for p in DEFAULT_PERMISSIONS
            if p["action"] == "view"
        ],
    },
}


# ────────────────────────────────────────────────
# Permission Cache (per-request role lookup)
# ────────────────────────────────────────────────

_role_cache: dict = {}


async def _get_role_permissions(role_id: str) -> List[str]:
    """Get permission codenames for a role. Cached in-memory."""
    if role_id in _role_cache:
        return _role_cache[role_id]

    db = get_database()
    role_doc = await db.roles.find_one({"id": role_id}, {"_id": 0, "permissions": 1})

    if not role_doc:
        _role_cache[role_id] = []
        return []

    permissions = role_doc.get("permissions", [])
    _role_cache[role_id] = permissions
    return permissions


def clear_permission_cache():
    """Clear the in-memory permission cache (call after role updates)."""
    global _role_cache
    _role_cache = {}


# ────────────────────────────────────────────────
# Permission Dependency
# ────────────────────────────────────────────────

def require_permission(permission: str):
    """
    FastAPI dependency that checks if the current user has the required permission.

    Superusers bypass all permission checks.

    Usage:
        @router.get("/products")
        async def list_products(user: User = Depends(require_permission("products:view"))):
            ...
    """

    async def _check(current_user=Depends(get_current_user)):
        # Superuser bypasses all checks
        if current_user.is_superuser:
            return current_user

        # No role assigned → deny
        if not current_user.role_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No role assigned. Permission '{permission}' required.",
            )

        role_perms = await _get_role_permissions(current_user.role_id)

        if permission not in role_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required.",
            )

        return current_user

    return _check


def require_any_permission(*permissions: str):
    """
    Require at least ONE of the listed permissions.

    Usage:
        @router.get("/dashboard")
        async def dashboard(user = Depends(require_any_permission("leads:view", "orders:view"))):
            ...
    """

    async def _check(current_user=Depends(get_current_user)):
        if current_user.is_superuser:
            return current_user

        if not current_user.role_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No role assigned. One of {permissions} required.",
            )

        role_perms = await _get_role_permissions(current_user.role_id)

        if not any(p in role_perms for p in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of the following permissions required: {', '.join(permissions)}",
            )

        return current_user

    return _check


# ────────────────────────────────────────────────
# Seed Function (call on startup)
# ────────────────────────────────────────────────

async def seed_permissions_and_roles():
    """
    Upsert default permissions and roles into the database.
    Safe to call multiple times — uses codename/name as unique key.
    """
    db = get_database()

    # Seed permissions
    for perm in DEFAULT_PERMISSIONS:
        await db.permissions.update_one(
            {"codename": perm["codename"]},
            {"$setOnInsert": perm},
            upsert=True,
        )

    logger.info(f"Seeded {len(DEFAULT_PERMISSIONS)} permissions")

    # Seed roles (only if they don't exist)
    for role_key, role_data in DEFAULT_ROLES.items():
        existing = await db.roles.find_one({"name": role_data["name"]})
        if not existing:
            import uuid
            from datetime import datetime, timezone

            await db.roles.insert_one({
                "id": str(uuid.uuid4()),
                "name": role_data["name"],
                "description": role_data["description"],
                "permissions": role_data["permissions"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"Created default role: {role_data['name']}")
        else:
            logger.debug(f"Role '{role_data['name']}' already exists, skipping")

    logger.info("Permission and role seeding complete")
