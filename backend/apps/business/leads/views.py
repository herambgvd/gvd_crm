"""
Lead Management Views — uses LeadService for all operations
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from core.permissions import require_permission
from core.auth import get_current_user
from apps.authentication.models import User
from .schemas import LeadCreate, LeadUpdate, LeadResponse
from .service import lead_service

router = APIRouter(tags=["leads"])


def _lead_response(doc: dict) -> LeadResponse:
    """Convert a service document to a LeadResponse."""
    return LeadResponse(**doc)


# ── CRUD ──

@router.post("", response_model=LeadResponse)
async def create_lead(
    lead_data: LeadCreate,
    current_user: User = Depends(require_permission("leads:create")),
):
    """Create a new lead."""
    data = lead_data.model_dump()
    doc = await lead_service.create(data, user_id=current_user.id)
    return _lead_response(doc)


async def _enrich_with_customer(items: list) -> list:
    """Attach customer_name to each lead that has a customer_id."""
    from core.database import get_database
    customer_ids = [d.get("customer_id") for d in items if d.get("customer_id")]
    if not customer_ids:
        return items
    db = get_database()
    customers = await db.customers.find(
        {"id": {"$in": customer_ids}},
        {"_id": 0, "id": 1, "company_name": 1},
    ).to_list(len(customer_ids))
    cmap = {c["id"]: c["company_name"] for c in customers}
    for doc in items:
        if doc.get("customer_id"):
            doc["customer_name"] = cmap.get(doc["customer_id"])
    return items


@router.get("")
async def get_leads(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: int = Query(-1, ge=-1, le=1, description="-1 desc, 1 asc"),
    sop_id: Optional[str] = None,
    current_state_id: Optional[str] = None,
):
    """List leads with server-side pagination and filtering."""
    result = await lead_service.list_leads(
        page=page,
        page_size=page_size,
        status=status,
        priority=priority,
        assigned_to=assigned_to,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        current_user_id=current_user.id,
        is_superuser=current_user.is_superuser,
        sop_id=sop_id,
        current_state_id=current_state_id,
    )
    result["items"] = await _enrich_with_customer(result["items"])
    result["items"] = [_lead_response(doc) for doc in result["items"]]
    return result


@router.get("/stats")
async def get_lead_stats(
    current_user: User = Depends(get_current_user),
):
    """Get lead statistics for dashboard."""
    return await lead_service.get_stats()


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get a specific lead by ID."""
    doc = await lead_service.get_by_id(lead_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    # Non-superusers can only view leads they created or are assigned to
    if not current_user.is_superuser:
        is_creator = doc.get("created_by") == current_user.id
        if not is_creator:
            from core.database import get_database as _gdb
            _db = _gdb()
            assignment = await _db.assignments.find_one(
                {"lead_id": lead_id, "user_id": current_user.id, "is_deleted": {"$ne": True}},
                {"_id": 0, "id": 1},
            )
            if not assignment:
                raise HTTPException(status_code=403, detail="Access denied")
    enriched = await _enrich_with_customer([doc])
    return _lead_response(enriched[0])


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    lead_data: LeadUpdate,
    current_user: User = Depends(require_permission("leads:edit")),
):
    """Update a lead."""
    update_data = lead_data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    doc = await lead_service.update(lead_id, update_data, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _lead_response(doc)


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    current_user: User = Depends(require_permission("leads:delete")),
):
    """Delete a lead and cascade-delete all related records (BOQs, POs, PIs, invoices, payments, etc.)."""
    from core.database import get_database
    from datetime import datetime, timezone

    lead = await lead_service.get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    db = get_database()
    now = datetime.now(timezone.utc).isoformat()
    soft_delete_set = {
        "is_deleted": True,
        "deleted_at": now,
        "deleted_by": current_user.id,
        "updated_at": now,
    }

    # Collect related BOQs and Sales Orders first (needed to cascade their children)
    boqs = await db.boqs.find(
        {"lead_id": lead_id, "is_deleted": {"$ne": True}},
        {"_id": 0, "id": 1},
    ).to_list(1000)
    boq_ids = [b["id"] for b in boqs]

    sales_orders = await db.sales_orders.find(
        {"lead_id": lead_id, "is_deleted": {"$ne": True}},
        {"_id": 0, "id": 1},
    ).to_list(1000)
    so_ids = [s["id"] for s in sales_orders]

    cascade_counts = {}

    async def soft_delete_where(collection_name: str, query: dict) -> int:
        result = await db[collection_name].update_many(
            {**query, "is_deleted": {"$ne": True}},
            {"$set": soft_delete_set},
        )
        return result.modified_count

    # 1. Purchase orders linked to sales orders
    if so_ids:
        cascade_counts["purchase_orders"] = await soft_delete_where(
            "purchase_orders", {"sales_order_id": {"$in": so_ids}}
        )
        cascade_counts["invoices"] = await soft_delete_where(
            "invoices", {"sales_order_id": {"$in": so_ids}}
        )
        cascade_counts["warranties"] = await soft_delete_where(
            "warranties", {"sales_order_id": {"$in": so_ids}}
        )

    # 2. Payments linked to invoices of those sales orders
    if so_ids:
        invoices_for_sos = await db.invoices.find(
            {"sales_order_id": {"$in": so_ids}},
            {"_id": 0, "id": 1},
        ).to_list(2000)
        invoice_ids = [i["id"] for i in invoices_for_sos]
        if invoice_ids:
            cascade_counts["payments"] = await soft_delete_where(
                "payments", {"invoice_id": {"$in": invoice_ids}}
            )

    # 3. Sales orders themselves
    cascade_counts["sales_orders"] = await soft_delete_where(
        "sales_orders", {"lead_id": lead_id}
    )

    # 4. BOQs
    cascade_counts["boqs"] = await soft_delete_where("boqs", {"lead_id": lead_id})

    # 5. Lead-scoped children
    cascade_counts["lead_involvements"] = await soft_delete_where(
        "lead_involvements", {"lead_id": lead_id}
    )
    cascade_counts["lead_documents"] = await soft_delete_where(
        "lead_documents", {"lead_id": lead_id}
    )
    cascade_counts["assignments"] = await soft_delete_where(
        "assignments", {"lead_id": lead_id}
    )
    cascade_counts["remarks"] = await soft_delete_where(
        "remarks", {"entity_type": "lead", "entity_id": lead_id}
    )
    cascade_counts["comments"] = await soft_delete_where(
        "comments", {"entity_type": "lead", "entity_id": lead_id}
    )
    cascade_counts["transition_logs"] = await soft_delete_where(
        "transition_logs", {"record_type": "lead", "record_id": lead_id}
    )

    # 6. Finally the lead itself
    await lead_service.soft_delete(lead_id, user_id=current_user.id)

    return {
        "message": "Lead and all related records deleted",
        "cascade": {k: v for k, v in cascade_counts.items() if v > 0},
    }


@router.post("/admin/migrate-legacy-fields")
async def migrate_legacy_fields(
    current_user: User = Depends(require_permission("leads:delete")),
):
    """
    One-time migration: remove legacy fields and remap old status values.
    Run once after deploying the new workflow schema.
    """
    from core.database import get_database
    db = get_database()
    col = db.leads

    # 1. Unset legacy fields from all documents
    legacy_unset = {
        "contact_name": 1, "contact_phone": 1, "company": 1,
        "channel": 1, "entity_id": 1, "probability": 1, "contact_email": 1,
    }
    unset_result = await col.update_many({}, {"$unset": legacy_unset})

    # 2. Remap old status values → new workflow stages
    status_map = {
        "new": "new_lead",
        "contacted": "under_review",
        "qualified": "solution_design",
        "converted": "order_won",
    }
    remap_count = 0
    for old_val, new_val in status_map.items():
        result = await col.update_many(
            {"status": old_val},
            {"$set": {"status": new_val}},
        )
        remap_count += result.modified_count

    # 3. Set default status for any docs missing the status field
    missing_status_result = await col.update_many(
        {"status": {"$exists": False}},
        {"$set": {"status": "new_lead"}},
    )
    remap_count += missing_status_result.modified_count

    return {
        "legacy_fields_cleaned": unset_result.modified_count,
        "statuses_remapped": remap_count,
        "message": "Migration complete",
    }