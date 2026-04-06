"""
Workflow Engine Validators — SOP structure and transition validation.
"""

from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status


def validate_sop_structure(states: List[dict], transitions: List[dict]) -> None:
    """
    Validate SOP structure rules:
    - At least one state
    - Exactly one start state
    - At least one end state
    - No duplicate state names
    - All transition references point to valid state IDs
    - No duplicate transitions (same from + to)
    - End states cannot have outgoing transitions
    """
    if not states:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SOP must have at least one state.",
        )

    state_ids = {s["id"] for s in states if s.get("id")}
    state_names = [s["name"] for s in states]

    # Unique names
    if len(state_names) != len(set(state_names)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="State names must be unique within an SOP.",
        )

    # Exactly one start
    start_states = [s for s in states if s.get("is_start")]
    if len(start_states) != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SOP must have exactly one start state.",
        )

    # At least one end
    end_states = [s for s in states if s.get("is_end")]
    if not end_states:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SOP must have at least one end state.",
        )

    end_state_ids = {s["id"] for s in end_states if s.get("id")}

    # Validate transitions
    seen_transitions = set()
    for t in transitions:
        from_id = t.get("from_state_id")
        to_id = t.get("to_state_id")

        if from_id not in state_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transition references unknown from_state_id: {from_id}",
            )

        if to_id not in state_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transition references unknown to_state_id: {to_id}",
            )

        if from_id == to_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transition cannot go from a state to itself.",
            )

        if from_id in end_state_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"End state cannot have outgoing transitions.",
            )

        pair = (from_id, to_id)
        if pair in seen_transitions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate transition from same source to same target.",
            )
        seen_transitions.add(pair)


def validate_transition_form_data(
    form_fields: List[dict],
    form_data: Dict[str, Any],
) -> None:
    """
    Validate submitted form data against transition's field definitions.
    """
    for field in form_fields:
        label = field.get("label", "")
        field_type = field.get("type", "text")
        required = field.get("required", False)
        options = field.get("options", [])

        value = form_data.get(label)

        if required and (value is None or value == ""):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Field '{label}' is required.",
            )

        if value is None or value == "":
            continue

        # Type validation
        if field_type == "number":
            try:
                float(value)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{label}' must be a number.",
                )

        if field_type == "select" and options:
            if str(value) not in options:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{label}' must be one of: {', '.join(options)}",
                )

        if field_type == "multiselect" and options:
            values = value if isinstance(value, list) else [value]
            invalid = [v for v in values if str(v) not in options]
            if invalid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{label}' contains invalid options: {', '.join(invalid)}. Must be from: {', '.join(options)}",
                )

        if field_type == "boolean":
            if value not in (True, False, "true", "false"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{label}' must be a boolean (true/false).",
                )

        if field_type == "email":
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, str(value)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{label}' must be a valid email address.",
                )
