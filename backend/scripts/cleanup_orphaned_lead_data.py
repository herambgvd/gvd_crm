"""
Cleanup script: Soft-delete BOQs, sales orders, purchase orders, invoices,
payments, warranties, and related records whose parent lead has been deleted.

Usage:
    cd backend
    source .venv/bin/activate
    python scripts/cleanup_orphaned_lead_data.py

Optional flags:
    --dry-run       Show what would be deleted without actually deleting
    --hard-delete   Permanently remove instead of soft-delete
"""

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings


async def main():
    dry_run = "--dry-run" in sys.argv
    hard = "--hard-delete" in sys.argv

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    print("=" * 60)
    print(f"Orphaned Lead Data Cleanup {'(DRY RUN)' if dry_run else ''}")
    print(f"Mode: {'HARD DELETE' if hard else 'SOFT DELETE'}")
    print("=" * 60)

    # Step 1: get all lead IDs that still exist (not soft-deleted)
    active_leads = await db.leads.find(
        {"is_deleted": {"$ne": True}},
        {"_id": 0, "id": 1},
    ).to_list(100000)
    active_lead_ids = {l["id"] for l in active_leads}
    print(f"\nActive leads: {len(active_lead_ids)}")

    # Step 2: find orphaned records (lead_id not in active set OR lead is deleted)
    async def find_orphaned(collection_name: str, lead_field: str = "lead_id"):
        cursor = db[collection_name].find(
            {"is_deleted": {"$ne": True}, lead_field: {"$exists": True, "$ne": None}},
            {"_id": 0, "id": 1, lead_field: 1},
        )
        orphans = []
        async for doc in cursor:
            if doc.get(lead_field) not in active_lead_ids:
                orphans.append(doc["id"])
        return orphans

    now = datetime.now(timezone.utc).isoformat()
    soft_set = {
        "is_deleted": True,
        "deleted_at": now,
        "deleted_by": "cleanup_script",
        "updated_at": now,
    }

    async def remove(collection_name: str, ids: list):
        if not ids:
            return 0
        if dry_run:
            return len(ids)
        if hard:
            result = await db[collection_name].delete_many({"id": {"$in": ids}})
            return result.deleted_count
        result = await db[collection_name].update_many(
            {"id": {"$in": ids}}, {"$set": soft_set}
        )
        return result.modified_count

    total_removed = 0

    # Orphaned BOQs
    boq_orphans = await find_orphaned("boqs")
    removed = await remove("boqs", boq_orphans)
    print(f"  BOQs:              {removed}")
    total_removed += removed

    # Orphaned sales orders
    so_orphans = await find_orphaned("sales_orders")
    removed = await remove("sales_orders", so_orphans)
    print(f"  Sales Orders:      {removed}")
    total_removed += removed

    # Orphaned purchase orders (linked via sales_order_id)
    # Get all valid sales order ids (not deleted)
    valid_sos = await db.sales_orders.find(
        {"is_deleted": {"$ne": True}},
        {"_id": 0, "id": 1},
    ).to_list(100000)
    valid_so_ids = {s["id"] for s in valid_sos}

    po_cursor = db.purchase_orders.find(
        {"is_deleted": {"$ne": True}, "sales_order_id": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "sales_order_id": 1},
    )
    po_orphans = []
    async for doc in po_cursor:
        if doc.get("sales_order_id") not in valid_so_ids:
            po_orphans.append(doc["id"])
    removed = await remove("purchase_orders", po_orphans)
    print(f"  Purchase Orders:   {removed}")
    total_removed += removed

    # Orphaned invoices
    inv_cursor = db.invoices.find(
        {"is_deleted": {"$ne": True}, "sales_order_id": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "sales_order_id": 1},
    )
    inv_orphans = []
    async for doc in inv_cursor:
        if doc.get("sales_order_id") not in valid_so_ids:
            inv_orphans.append(doc["id"])
    removed = await remove("invoices", inv_orphans)
    print(f"  Invoices:          {removed}")
    total_removed += removed

    # Orphaned payments
    valid_invoices = await db.invoices.find(
        {"is_deleted": {"$ne": True}}, {"_id": 0, "id": 1}
    ).to_list(100000)
    valid_invoice_ids = {i["id"] for i in valid_invoices}

    pay_cursor = db.payments.find(
        {"is_deleted": {"$ne": True}, "invoice_id": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "invoice_id": 1},
    )
    pay_orphans = []
    async for doc in pay_cursor:
        if doc.get("invoice_id") not in valid_invoice_ids:
            pay_orphans.append(doc["id"])
    removed = await remove("payments", pay_orphans)
    print(f"  Payments:          {removed}")
    total_removed += removed

    # Orphaned warranties
    war_cursor = db.warranties.find(
        {"is_deleted": {"$ne": True}, "sales_order_id": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "sales_order_id": 1},
    )
    war_orphans = []
    async for doc in war_cursor:
        if doc.get("sales_order_id") not in valid_so_ids:
            war_orphans.append(doc["id"])
    removed = await remove("warranties", war_orphans)
    print(f"  Warranties:        {removed}")
    total_removed += removed

    # Orphaned lead_involvements, lead_documents, assignments
    for coll, field in [
        ("lead_involvements", "lead_id"),
        ("lead_documents", "lead_id"),
        ("assignments", "lead_id"),
    ]:
        orphans = await find_orphaned(coll, field)
        removed = await remove(coll, orphans)
        print(f"  {coll:18} {removed}")
        total_removed += removed

    # Orphaned transition_logs (workflow engine)
    tl_cursor = db.transition_logs.find(
        {"is_deleted": {"$ne": True}, "record_type": "lead"},
        {"_id": 0, "id": 1, "record_id": 1},
    )
    tl_orphans = []
    async for doc in tl_cursor:
        if doc.get("record_id") not in active_lead_ids:
            tl_orphans.append(doc["id"])
    removed = await remove("transition_logs", tl_orphans)
    print(f"  Transition Logs:   {removed}")
    total_removed += removed

    print()
    print(f"Total records {'to be removed' if dry_run else 'removed'}: {total_removed}")
    print()
    if dry_run:
        print("This was a DRY RUN. Run without --dry-run to actually delete.")
    else:
        print("Cleanup complete!")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
