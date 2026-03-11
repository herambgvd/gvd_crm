#!/usr/bin/env python3
"""Seeder: create or update admin user

Creates an admin user with id 'admin@gvd.in' and password 'Gvd@6001'.
This script will:
- connect to the database
- seed default roles/permissions (so the Admin role exists)
- create or update the admin user document

Run with the backend virtualenv active:
    python backend/scripts/seed_admin.py
"""
import sys
import asyncio
import uuid
from pathlib import Path
from datetime import datetime, timezone
import logging

# Ensure the backend package root is on sys.path so we can import core.*
PRJ_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PRJ_ROOT))

from core.database import connect_database, disconnect_database, get_database
from core.permissions import seed_permissions_and_roles
from core.auth import auth_service

ADMIN_EMAIL = "admin@gvd.in"
ADMIN_PASSWORD = "Gvd@6001"

logger = logging.getLogger("seed_admin")
logging.basicConfig(level=logging.INFO)


async def main():
    await connect_database()
    db = get_database()

    # Ensure roles and permissions exist
    logger.info("Seeding permissions and roles (if missing)")
    try:
        await seed_permissions_and_roles()
    except Exception as e:
        logger.warning(f"Seeding roles failed (continuing): {e}")

    # Find Admin role id
    role_doc = await db.roles.find_one({"name": "Admin"}, {"_id": 0})
    if not role_doc:
        logger.error("Admin role not found after seeding. Aborting.")
        await disconnect_database()
        return

    admin_role_id = role_doc.get("id")
    if not admin_role_id:
        logger.error("Admin role document missing 'id' field. Aborting.")
        await disconnect_database()
        return

    # Prepare user document
    now_iso = datetime.now(timezone.utc).isoformat()
    hashed = auth_service.get_password_hash(ADMIN_PASSWORD)

    user_doc = {
        "id": ADMIN_EMAIL,  # per request: use this as id
        "username": "admin",
        "email": ADMIN_EMAIL,
        "first_name": "Admin",
        "last_name": "User",
        "hashed_password": hashed,
        "is_active": True,
        "is_superuser": True,
        "role_id": admin_role_id,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    # Insert or update
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing:
        logger.info("Admin user exists — updating password and flags")
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {
                "hashed_password": hashed,
                "is_active": True,
                "is_superuser": True,
                "role_id": admin_role_id,
                "updated_at": now_iso,
            }}
        )
        logger.info("Admin user updated")
    else:
        # Ensure username/email uniqueness
        try:
            await db.users.insert_one(user_doc)
            logger.info(f"Admin user created: {ADMIN_EMAIL}")
        except Exception as e:
            logger.error(f"Failed to create admin user: {e}")

    await disconnect_database()


if __name__ == "__main__":
    asyncio.run(main())
