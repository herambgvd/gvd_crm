"""
Workflow Engine Service — SOP management and transition execution.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from core.base_service import BaseCRUDService
from core.database import get_database
from .validators import validate_sop_structure, validate_transition_form_data

logger = logging.getLogger(__name__)


# ────────────────── Collection name → module mapping ──────────────────

RECORD_TYPE_TO_COLLECTION = {
    "lead": "leads",
    "ticket": "tickets",
    "sales_order": "sales_orders",
    "purchase_order": "purchase_orders",
    "boq": "boqs",
    "factory_order": "factory_orders",
    "rma": "rma_records",
}

RECORD_TYPE_TO_MODULE = {
    "lead": "sales",
    "ticket": "support",
    "sales_order": "sales",
    "purchase_order": "sales",
    "boq": "sales",
    "factory_order": "inventory",
    "rma": "inventory",
}


class SOPService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="sop_workflows")

    async def create_sop(self, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create a new SOP workflow with validation."""
        states = data.get("states", [])
        transitions = data.get("transitions", [])

        # Assign IDs to states and transitions if missing
        for state in states:
            if not state.get("id"):
                state["id"] = str(uuid.uuid4())

        for transition in transitions:
            if not transition.get("id"):
                transition["id"] = str(uuid.uuid4())
            for field in transition.get("form_fields", []):
                if not field.get("id"):
                    field["id"] = str(uuid.uuid4())

        validate_sop_structure(states, transitions)

        data["states"] = states
        data["transitions"] = transitions
        data["version"] = 1
        data["is_active"] = True

        return await self.create(data, user_id=user_id)

    async def update_sop(self, sop_id: str, data: Dict[str, Any], user_id: str) -> Optional[Dict[str, Any]]:
        """Update an SOP, incrementing version if states/transitions change."""
        existing = await self.get_by_id(sop_id)
        if not existing:
            return None

        states = data.get("states")
        transitions = data.get("transitions")

        # If states or transitions are being updated, validate and bump version
        if states is not None or transitions is not None:
            final_states = states if states is not None else existing.get("states", [])
            final_transitions = transitions if transitions is not None else existing.get("transitions", [])

            # Assign IDs to new states/transitions
            for state in final_states:
                if not state.get("id"):
                    state["id"] = str(uuid.uuid4())
            for transition in final_transitions:
                if not transition.get("id"):
                    transition["id"] = str(uuid.uuid4())
                for field in transition.get("form_fields", []):
                    if not field.get("id"):
                        field["id"] = str(uuid.uuid4())

            validate_sop_structure(final_states, final_transitions)

            data["states"] = final_states
            data["transitions"] = final_transitions
            data["version"] = existing.get("version", 1) + 1

        return await self.update(sop_id, data, user_id=user_id)

    async def list_by_module(self, module: str, active_only: bool = True) -> List[Dict[str, Any]]:
        """List SOPs for a module."""
        query: Dict[str, Any] = {"module": module}
        if active_only:
            query["is_active"] = {"$ne": False}
        return await self.find_many(query=query, sort=[("name", 1)])

    async def get_stats(self, module: str, sop_id: str) -> Dict[str, Any]:
        """
        Get state-wise record counts for a given SOP.
        Returns {states: [{id, name, color, count}, ...], total: int}
        """
        sop = await self.get_by_id(sop_id)
        if not sop:
            return {"states": [], "total": 0}

        db = get_database()

        # Find all collections that belong to this module
        record_types = [rt for rt, mod in RECORD_TYPE_TO_MODULE.items() if mod == module]

        total = 0
        state_counts: Dict[str, int] = {}

        for rt in record_types:
            collection_name = RECORD_TYPE_TO_COLLECTION[rt]
            pipeline = [
                {"$match": {"sop_id": sop_id, "is_deleted": {"$ne": True}}},
                {"$group": {"_id": "$current_state_id", "count": {"$sum": 1}}},
            ]
            results = await db[collection_name].aggregate(pipeline).to_list(100)
            for r in results:
                state_id = r["_id"]
                count = r["count"]
                state_counts[state_id] = state_counts.get(state_id, 0) + count
                total += count

        states_with_counts = []
        for state in sop.get("states", []):
            states_with_counts.append({
                "id": state["id"],
                "name": state["name"],
                "color": state.get("color", "#3B82F6"),
                "count": state_counts.get(state["id"], 0),
            })

        return {"states": states_with_counts, "total": total}


class TransitionService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="transition_logs")

    async def execute_transition(
        self,
        record_type: str,
        record_id: str,
        transition_id: str,
        form_data: Dict[str, Any],
        user_id: str,
        user_name: str,
        notes: str = "",
    ) -> Dict[str, Any]:
        """
        Execute a state transition on a record.

        1. Validate record exists and has an SOP
        2. Validate transition exists and matches current state
        3. Validate form data
        4. Update record's current state
        5. Create transition log
        """
        if record_type not in RECORD_TYPE_TO_COLLECTION:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown record type: {record_type}",
            )

        db = get_database()
        collection_name = RECORD_TYPE_TO_COLLECTION[record_type]
        module = RECORD_TYPE_TO_MODULE[record_type]

        # 1. Get the record
        record = await db[collection_name].find_one(
            {"id": record_id, "is_deleted": {"$ne": True}},
            {"_id": 0},
        )
        if not record:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{record_type} not found.",
            )

        sop_id = record.get("sop_id")
        if not sop_id:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Record does not have an SOP assigned.",
            )

        # 2. Get the SOP
        sop = await db.sop_workflows.find_one(
            {"id": sop_id, "is_deleted": {"$ne": True}},
            {"_id": 0},
        )
        if not sop:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SOP workflow not found.",
            )

        # Find the transition
        transition = None
        for t in sop.get("transitions", []):
            if t["id"] == transition_id:
                transition = t
                break

        if not transition:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transition not found in SOP.",
            )

        # Validate current state matches transition's from_state
        current_state_id = record.get("current_state_id")
        if current_state_id != transition["from_state_id"]:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transition not allowed from current state.",
            )

        # 3. Validate form data
        validate_transition_form_data(
            transition.get("form_fields", []),
            form_data,
        )

        # Resolve state names
        states_map = {s["id"]: s["name"] for s in sop.get("states", [])}
        from_state_name = states_map.get(current_state_id, "")
        to_state_id = transition["to_state_id"]
        to_state_name = states_map.get(to_state_id, "")

        # 4. Update the record
        now = datetime.now(timezone.utc).isoformat()
        await db[collection_name].update_one(
            {"id": record_id},
            {"$set": {
                "current_state_id": to_state_id,
                "current_state_name": to_state_name,
                "updated_at": now,
                "updated_by": user_id,
            }},
        )

        # 5. Create transition log
        log_data = {
            "record_id": record_id,
            "record_type": record_type,
            "module": module,
            "sop_id": sop_id,
            "sop_version": sop.get("version", 1),
            "from_state_id": current_state_id,
            "from_state_name": from_state_name,
            "to_state_id": to_state_id,
            "to_state_name": to_state_name,
            "transition_id": transition_id,
            "transition_name": transition.get("name", ""),
            "form_data": form_data,
            "performed_by": user_id,
            "performed_by_name": user_name,
            "notes": notes,
        }

        log_doc = await self.create(log_data, user_id=user_id)
        return log_doc

    async def get_available_transitions(
        self, record_type: str, record_id: str
    ) -> List[Dict[str, Any]]:
        """Get transitions available from the record's current state."""
        if record_type not in RECORD_TYPE_TO_COLLECTION:
            return []

        db = get_database()
        collection_name = RECORD_TYPE_TO_COLLECTION[record_type]

        record = await db[collection_name].find_one(
            {"id": record_id, "is_deleted": {"$ne": True}},
            {"_id": 0, "sop_id": 1, "current_state_id": 1},
        )
        if not record or not record.get("sop_id"):
            return []

        sop = await db.sop_workflows.find_one(
            {"id": record["sop_id"], "is_deleted": {"$ne": True}},
            {"_id": 0},
        )
        if not sop:
            return []

        current_state_id = record.get("current_state_id")
        states_map = {s["id"]: s["name"] for s in sop.get("states", [])}

        available = []
        for t in sop.get("transitions", []):
            if t["from_state_id"] == current_state_id:
                available.append({
                    **t,
                    "from_state_name": states_map.get(t["from_state_id"], ""),
                    "to_state_name": states_map.get(t["to_state_id"], ""),
                })

        return available

    async def get_record_history(
        self, record_type: str, record_id: str
    ) -> List[Dict[str, Any]]:
        """Get transition history for a record, newest first."""
        return await self.find_many(
            query={"record_id": record_id, "record_type": record_type},
            sort=[("performed_at", -1)],
        )

    async def assign_sop_to_record(
        self,
        record_type: str,
        record_id: str,
        sop_id: str,
        user_id: str,
        user_name: str,
    ) -> Dict[str, Any]:
        """
        Assign an SOP to a record and set it to the start state.
        Creates an initial transition log entry.
        """
        if record_type not in RECORD_TYPE_TO_COLLECTION:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown record type: {record_type}",
            )

        db = get_database()
        collection_name = RECORD_TYPE_TO_COLLECTION[record_type]
        module = RECORD_TYPE_TO_MODULE[record_type]

        # Get the SOP
        sop = await db.sop_workflows.find_one(
            {"id": sop_id, "is_deleted": {"$ne": True}, "is_active": True},
            {"_id": 0},
        )
        if not sop:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SOP workflow not found or inactive.",
            )

        # Verify module matches
        if sop["module"] != module:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SOP module '{sop['module']}' does not match record module '{module}'.",
            )

        # Find start state
        start_state = None
        for s in sop.get("states", []):
            if s.get("is_start"):
                start_state = s
                break

        if not start_state:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SOP has no start state defined.",
            )

        # Update record
        now = datetime.now(timezone.utc).isoformat()
        result = await db[collection_name].find_one_and_update(
            {"id": record_id, "is_deleted": {"$ne": True}},
            {"$set": {
                "sop_id": sop_id,
                "sop_version": sop.get("version", 1),
                "current_state_id": start_state["id"],
                "current_state_name": start_state["name"],
                "updated_at": now,
                "updated_by": user_id,
            }},
            return_document=True,
        )

        if not result:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{record_type} not found.",
            )

        # Log the initial assignment
        log_data = {
            "record_id": record_id,
            "record_type": record_type,
            "module": module,
            "sop_id": sop_id,
            "sop_version": sop.get("version", 1),
            "from_state_id": None,
            "from_state_name": None,
            "to_state_id": start_state["id"],
            "to_state_name": start_state["name"],
            "transition_id": None,
            "transition_name": "SOP Assigned",
            "form_data": {},
            "performed_by": user_id,
            "performed_by_name": user_name,
            "notes": f"SOP '{sop['name']}' assigned",
        }
        await self.create(log_data, user_id=user_id)

        result.pop("_id", None)
        return result


# Module-level singletons
sop_service = SOPService()
transition_service = TransitionService()
