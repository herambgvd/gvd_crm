"""
Migration Script: Assign existing records to Legacy SOPs

Creates a "Legacy" SOP for each module with states matching the old hardcoded
statuses, then assigns all existing records to their corresponding SOP and state.

Usage:
    cd backend
    source .venv/bin/activate
    python scripts/migrate_to_sop.py
"""

import asyncio
import sys
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Add backend root to path so core.config can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

MONGO_URL = settings.MONGODB_URL
DB_NAME = settings.DATABASE_NAME


def make_state(name, position, color, is_start=False, is_end=False):
    return {
        "id": str(uuid.uuid4()),
        "name": name,
        "position": position,
        "color": color,
        "description": "",
        "is_start": is_start,
        "is_end": is_end,
    }


# ── Legacy SOP Definitions ──────────────────────────────────────────────────

LEGACY_SOPS = {
    "sales": {
        "name": "Legacy Sales SOP",
        "description": "Auto-migrated from hardcoded lead statuses",
        "module": "sales",
        "states": [
            make_state("New Lead", 0, "#3B82F6", is_start=True),
            make_state("Under Review", 1, "#0EA5E9"),
            make_state("Solution Design", 2, "#8B5CF6"),
            make_state("Proposal Submitted", 3, "#6366F1"),
            make_state("Under Negotiation", 4, "#F59E0B"),
            make_state("POC / Tech Eval", 5, "#F97316"),
            make_state("Price Finalization", 6, "#EAB308"),
            make_state("PI Issued", 7, "#84CC16"),
            make_state("Order Won", 8, "#10B981"),
            make_state("Order Processing", 9, "#059669"),
            make_state("Project Execution", 10, "#14B8A6"),
            make_state("Project Completed", 11, "#06B6D4", is_end=True),
            make_state("Lost", 12, "#EF4444", is_end=True),
        ],
    },
    "support": {
        "name": "Legacy Support SOP",
        "description": "Auto-migrated from hardcoded ticket statuses",
        "module": "support",
        "states": [
            make_state("Open", 0, "#3B82F6", is_start=True),
            make_state("In Progress", 1, "#F59E0B"),
            make_state("Escalated", 2, "#EF4444"),
            make_state("Resolved", 3, "#10B981", is_end=True),
            make_state("Closed", 4, "#6B7280", is_end=True),
        ],
    },
    "inventory": {
        "name": "Legacy Inventory SOP",
        "description": "Auto-migrated from hardcoded factory order/RMA statuses",
        "module": "inventory",
        "states": [
            make_state("Draft", 0, "#6B7280", is_start=True),
            make_state("Submitted", 1, "#3B82F6"),
            make_state("Confirmed", 2, "#8B5CF6"),
            make_state("Shipped", 3, "#F59E0B"),
            make_state("Received", 4, "#10B981", is_end=True),
            make_state("Cancelled", 5, "#EF4444", is_end=True),
        ],
    },
}

# Map old status values to state names
STATUS_TO_STATE_NAME = {
    # Leads
    "new_lead": "New Lead",
    "under_review": "Under Review",
    "solution_design": "Solution Design",
    "proposal_submitted": "Proposal Submitted",
    "under_negotiation": "Under Negotiation",
    "poc_evaluation": "POC / Tech Eval",
    "price_finalization": "Price Finalization",
    "pi_issued": "PI Issued",
    "order_won": "Order Won",
    "order_processing": "Order Processing",
    "project_execution": "Project Execution",
    "project_completed": "Project Completed",
    "lost": "Lost",
    # Support
    "open": "Open",
    "new": "Open",
    "in_progress": "In Progress",
    "troubleshooting": "In Progress",
    "pending_customer": "In Progress",
    "pending_vendor": "In Progress",
    "escalated": "Escalated",
    "resolved": "Resolved",
    "closed": "Closed",
    "cancelled": "Closed",
    # Inventory
    "draft": "Draft",
    "submitted": "Submitted",
    "confirmed": "Confirmed",
    "partially_shipped": "Shipped",
    "shipped": "Shipped",
    "partially_received": "Received",
    "received": "Received",
    "cancelled": "Cancelled",
    # RMA
    "under_review": "Under Review",
    "repairing": "In Progress",
    "repaired": "Received",
    "returned_to_stock": "Received",
    "scrapped": "Cancelled",
    "returned_to_customer": "Received",
}


def build_transitions(states):
    """Create linear transitions between consecutive non-end states, plus transitions to end states."""
    transitions = []
    non_end = [s for s in states if not s["is_end"]]
    end_states = [s for s in states if s["is_end"]]

    # Linear chain
    for i in range(len(non_end) - 1):
        transitions.append({
            "id": str(uuid.uuid4()),
            "from_state_id": non_end[i]["id"],
            "to_state_id": non_end[i + 1]["id"],
            "name": f"Move to {non_end[i + 1]['name']}",
            "form_fields": [],
        })

    # From each non-end state to each end state
    for s in non_end:
        for end in end_states:
            # Skip if already covered by linear chain
            if any(t["from_state_id"] == s["id"] and t["to_state_id"] == end["id"] for t in transitions):
                continue
            transitions.append({
                "id": str(uuid.uuid4()),
                "from_state_id": s["id"],
                "to_state_id": end["id"],
                "name": f"Mark as {end['name']}",
                "form_fields": [],
            })

    return transitions


async def migrate():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    now = datetime.now(timezone.utc).isoformat()

    print("=" * 60)
    print("SOP Migration Script")
    print("=" * 60)

    # 1. Create Legacy SOPs
    sop_map = {}  # module -> sop doc
    state_name_to_id = {}  # (module, state_name) -> state_id

    for module, sop_def in LEGACY_SOPS.items():
        # Check if already exists
        existing = await db.sop_workflows.find_one(
            {"name": sop_def["name"], "is_deleted": {"$ne": True}}
        )
        if existing:
            print(f"  [SKIP] SOP '{sop_def['name']}' already exists (id: {existing['id']})")
            sop_map[module] = existing
            for s in existing.get("states", []):
                state_name_to_id[(module, s["name"])] = s["id"]
            continue

        transitions = build_transitions(sop_def["states"])
        sop_doc = {
            "id": str(uuid.uuid4()),
            **sop_def,
            "transitions": transitions,
            "version": 1,
            "is_active": True,
            "is_deleted": False,
            "created_by": "migration",
            "updated_by": "migration",
            "created_at": now,
            "updated_at": now,
        }
        await db.sop_workflows.insert_one(sop_doc)
        sop_doc.pop("_id", None)
        sop_map[module] = sop_doc
        for s in sop_def["states"]:
            state_name_to_id[(module, s["name"])] = s["id"]
        print(f"  [OK] Created SOP '{sop_def['name']}' with {len(sop_def['states'])} states, {len(transitions)} transitions")

    # 2. Migrate records
    collections_to_migrate = [
        ("leads", "sales", "lead"),
        ("tickets", "support", "ticket"),
        ("factory_orders", "inventory", "factory_order"),
        ("rma_records", "inventory", "rma"),
    ]

    for col_name, module, record_type in collections_to_migrate:
        sop = sop_map.get(module)
        if not sop:
            print(f"  [SKIP] No SOP for module '{module}'")
            continue

        sop_id = sop["id"]
        states = sop.get("states", [])
        start_state = next((s for s in states if s.get("is_start")), states[0] if states else None)

        if not start_state:
            print(f"  [SKIP] No start state in SOP for '{module}'")
            continue

        # Find records without sop_id
        cursor = db[col_name].find(
            {"sop_id": {"$exists": False}, "is_deleted": {"$ne": True}},
            {"_id": 0, "id": 1, "status": 1},
        )
        records = await cursor.to_list(10000)

        if not records:
            print(f"  [SKIP] No un-migrated records in '{col_name}'")
            continue

        migrated = 0
        for record in records:
            old_status = record.get("status", "").lower()
            state_name = STATUS_TO_STATE_NAME.get(old_status, start_state["name"])
            state_id = state_name_to_id.get((module, state_name), start_state["id"])
            resolved_name = state_name if state_name_to_id.get((module, state_name)) else start_state["name"]

            await db[col_name].update_one(
                {"id": record["id"]},
                {"$set": {
                    "sop_id": sop_id,
                    "sop_version": 1,
                    "current_state_id": state_id,
                    "current_state_name": resolved_name,
                    "updated_at": now,
                }},
            )
            migrated += 1

        print(f"  [OK] Migrated {migrated} records in '{col_name}' → SOP '{sop['name']}'")

    print()
    print("Migration complete!")
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
