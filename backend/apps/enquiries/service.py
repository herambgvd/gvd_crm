"""
Enquiry Service — business logic layer

Uses BaseCRUDService for standard CRUD and adds enquiry-specific logic
like auto-numbering, entity resolution, and lead conversion.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from core.base_service import BaseCRUDService
from core.database import get_database
from core.pagination import paginate


class EnquiryService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="enquiries")

    async def create_enquiry(
        self, data: Dict[str, Any], user_id: str
    ) -> Dict[str, Any]:
        """Create an enquiry with auto-generated enquiry number and entity resolution."""
        db = get_database()

        # Generate enquiry number: ENQ-YYYYMMDD-XXXX
        today = datetime.now(timezone.utc).strftime("%Y%m%d")
        count = await db.enquiries.count_documents(
            {"enquiry_number": {"$regex": f"^ENQ-{today}"}}
        )
        enquiry_number = f"ENQ-{today}-{count + 1:04d}"

        # Resolve entity connections (fetch names/types)
        entity_connections = []
        for conn in data.get("entity_connections", []):
            entity = await db.entities.find_one(
                {"id": conn["entity_id"]}, {"_id": 0, "company_name": 1, "entity_type": 1}
            )
            entity_connections.append({
                "entity_id": conn["entity_id"],
                "entity_name": entity.get("company_name", "") if entity else "",
                "entity_type": entity.get("entity_type", "") if entity else "",
                "role": conn.get("role", ""),
            })

        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": str(uuid.uuid4()),
            "enquiry_number": enquiry_number,
            "date": data.get("date") or now,
            "project_name": data["project_name"],
            "person_name": data["person_name"],
            "person_email": data.get("person_email"),
            "person_phone": data.get("person_phone"),
            "details": data.get("details"),
            "budget": float(data["budget"]) if data.get("budget") else None,
            "currency": data.get("currency", "INR"),
            "source": data.get("source", "walk_in"),
            "priority": data.get("priority", "medium"),
            "status": "new",
            "entity_connections": entity_connections,
            "assigned_to": data.get("assigned_to"),
            "tags": data.get("tags", []),
            "converted_lead_id": None,
            "is_deleted": False,
            "created_by": user_id,
            "updated_by": user_id,
            "created_at": now,
            "updated_at": now,
        }

        await self.collection.insert_one(doc)
        doc.pop("_id", None)
        return doc

    async def update_enquiry(
        self, enquiry_id: str, data: Dict[str, Any], user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Update an enquiry, re-resolving entity connections if changed."""
        db = get_database()

        update_data = {k: v for k, v in data.items() if v is not None}

        # Re-resolve entity connections if provided
        if "entity_connections" in update_data:
            resolved = []
            for conn in update_data["entity_connections"]:
                entity = await db.entities.find_one(
                    {"id": conn["entity_id"]}, {"_id": 0, "company_name": 1, "entity_type": 1}
                )
                resolved.append({
                    "entity_id": conn["entity_id"],
                    "entity_name": entity.get("company_name", "") if entity else "",
                    "entity_type": entity.get("entity_type", "") if entity else "",
                    "role": conn.get("role", ""),
                })
            update_data["entity_connections"] = resolved

        if "budget" in update_data and update_data["budget"] is not None:
            update_data["budget"] = float(update_data["budget"])

        return await self.update(enquiry_id, update_data, user_id)

    async def list_enquiries(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        source: Optional[str] = None,
        search: Optional[str] = None,
        assigned_to: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List enquiries with filtering and pagination."""
        query: Dict[str, Any] = {"is_deleted": {"$ne": True}}

        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if source:
            query["source"] = source
        if assigned_to:
            query["assigned_to"] = assigned_to
        if search:
            query["$or"] = [
                {"project_name": {"$regex": search, "$options": "i"}},
                {"person_name": {"$regex": search, "$options": "i"}},
                {"enquiry_number": {"$regex": search, "$options": "i"}},
                {"person_email": {"$regex": search, "$options": "i"}},
                {"details": {"$regex": search, "$options": "i"}},
            ]

        return await paginate(
            collection=self.collection,
            query=query,
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
            projection={"_id": 0},
        )

    async def convert_to_lead(
        self, enquiry_id: str, user_id: str, lead_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Convert an enquiry to a lead."""
        db = get_database()
        lead_data = lead_data or {}

        enquiry = await self.get_by_id(enquiry_id)
        if not enquiry:
            raise ValueError("Enquiry not found")

        if enquiry.get("status") == "converted":
            raise ValueError("Enquiry already converted")

        now = datetime.now(timezone.utc).isoformat()

        # Build lead document from enquiry data
        lead_doc = {
            "id": str(uuid.uuid4()),
            "title": lead_data.get("title") or enquiry["project_name"],
            "contact_person": enquiry["person_name"],
            "contact_email": enquiry.get("person_email"),
            "contact_phone": enquiry.get("person_phone"),
            "entity_id": enquiry["entity_connections"][0]["entity_id"] if enquiry.get("entity_connections") else None,
            "description": enquiry.get("details"),
            "budget": enquiry.get("budget"),
            "source": enquiry.get("source", "enquiry"),
            "status": "new",
            "priority": enquiry.get("priority", "medium"),
            "assigned_to": lead_data.get("assigned_to") or enquiry.get("assigned_to"),
            "enquiry_id": enquiry_id,
            "notes": lead_data.get("notes"),
            "tags": enquiry.get("tags", []),
            "is_deleted": False,
            "created_by": user_id,
            "created_at": now,
            "updated_at": now,
        }

        await db.leads.insert_one(lead_doc)
        lead_doc.pop("_id", None)

        # Update enquiry status
        await self.update(enquiry_id, {
            "status": "converted",
            "converted_lead_id": lead_doc["id"],
        }, user_id)

        return lead_doc


class EnquiryRemarkService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="enquiry_remarks")

    async def add_remark(
        self, enquiry_id: str, content: str, is_important: bool, user_id: str, user_name: str
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": str(uuid.uuid4()),
            "enquiry_id": enquiry_id,
            "content": content,
            "is_important": is_important,
            "created_by": user_id,
            "created_by_name": user_name,
            "created_at": now,
            "is_deleted": False,
        }
        await self.collection.insert_one(doc)
        doc.pop("_id", None)
        return doc

    async def list_remarks(self, enquiry_id: str) -> List[Dict[str, Any]]:
        return await self.find_many(
            query={"enquiry_id": enquiry_id},
            sort=[("created_at", -1)],
        )


class EnquiryCommentService(BaseCRUDService):
    def __init__(self):
        super().__init__(collection_name="enquiry_comments")

    async def add_comment(
        self, enquiry_id: str, content: str, user_id: str, user_name: str,
        parent_comment_id: Optional[str] = None
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": str(uuid.uuid4()),
            "enquiry_id": enquiry_id,
            "content": content,
            "parent_comment_id": parent_comment_id,
            "created_by": user_id,
            "created_by_name": user_name,
            "created_at": now,
            "updated_at": now,
            "is_deleted": False,
        }
        await self.collection.insert_one(doc)
        doc.pop("_id", None)
        return doc

    async def update_comment(
        self, comment_id: str, content: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        return await self.update(comment_id, {"content": content}, user_id)

    async def list_comments(self, enquiry_id: str) -> List[Dict[str, Any]]:
        return await self.find_many(
            query={"enquiry_id": enquiry_id},
            sort=[("created_at", -1)],
        )


# Singletons
enquiry_service = EnquiryService()
remark_service = EnquiryRemarkService()
comment_service = EnquiryCommentService()
