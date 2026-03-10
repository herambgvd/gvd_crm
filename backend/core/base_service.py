"""
Base CRUD Service for MongoDB Collections

Provides a reusable base class that handles common CRUD operations
(Create, Read, Update, Delete) with proper UUID generation, datetime handling,
Decimal→float conversion, and soft-delete support.

Usage:
    class ProductService(BaseCRUDService):
        def __init__(self):
            super().__init__(collection_name="products")

    product_service = ProductService()

    # Create
    product = await product_service.create(data_dict, user_id="...")

    # Get by ID
    product = await product_service.get_by_id("some-uuid")

    # List with pagination
    result = await product_service.list(query={}, page=1, page_size=20)

    # Update
    updated = await product_service.update("some-uuid", update_dict, user_id="...")

    # Soft delete
    await product_service.delete("some-uuid", user_id="...")
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from .database import get_database
from .pagination import paginate


def serialize_value(value: Any) -> Any:
    """Recursively convert non-JSON-safe types for MongoDB storage."""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: serialize_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [serialize_value(item) for item in value]
    return value


def serialize_document(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize a full document dict for MongoDB."""
    return {k: serialize_value(v) for k, v in doc.items()}


class BaseCRUDService:
    """
    Base service providing standard CRUD operations for a MongoDB collection.

    Conventions:
    - All documents use a UUID `id` field (not MongoDB `_id`)
    - `_id` is excluded from all query results
    - Timestamps: `created_at` and `updated_at` (ISO 8601 strings)
    - Soft delete: `is_deleted = True` + `deleted_at` timestamp
    - Creator tracking: `created_by` and `updated_by` (user UUID)
    """

    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self):
        """Get the Motor collection object."""
        db = get_database()
        return db[self.collection_name]

    # ────────────────── Create ──────────────────

    async def create(
        self,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Insert a new document.

        Args:
            data: Document fields (excluding id, timestamps)
            user_id: UUID of the user performing the action

        Returns:
            The created document dict (without _id)
        """
        now = datetime.now(timezone.utc).isoformat()

        document = {
            "id": data.get("id") or str(uuid.uuid4()),
            **serialize_document(data),
            "created_at": now,
            "updated_at": now,
            "is_deleted": False,
        }

        if user_id:
            document["created_by"] = user_id
            document["updated_by"] = user_id

        await self.collection.insert_one(document)

        # Return without _id
        document.pop("_id", None)
        return document

    # ────────────────── Read ──────────────────

    async def get_by_id(
        self,
        doc_id: str,
        include_deleted: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Get a single document by its `id` field.

        Args:
            doc_id: The UUID string
            include_deleted: If True, also returns soft-deleted docs

        Returns:
            Document dict or None
        """
        query: Dict[str, Any] = {"id": doc_id}
        if not include_deleted:
            query["is_deleted"] = {"$ne": True}

        doc = await self.collection.find_one(query, {"_id": 0})
        return doc

    async def get_by_field(
        self,
        field: str,
        value: Any,
        include_deleted: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """Get first document matching a field value."""
        query: Dict[str, Any] = {field: value}
        if not include_deleted:
            query["is_deleted"] = {"$ne": True}

        return await self.collection.find_one(query, {"_id": 0})

    async def list(
        self,
        query: Optional[Dict[str, Any]] = None,
        page: int = 1,
        page_size: int = 20,
        sort: Optional[List[Tuple[str, int]]] = None,
        projection: Optional[Dict[str, Any]] = None,
        include_deleted: bool = False,
    ) -> Dict[str, Any]:
        """
        List documents with pagination.

        Args:
            query: MongoDB filter (will be merged with is_deleted filter)
            page: 1-based page number
            page_size: Items per page
            sort: Sort spec, e.g. [("created_at", -1)]
            projection: MongoDB projection
            include_deleted: Include soft-deleted documents

        Returns:
            {items, total, page, page_size, total_pages}
        """
        base_query = dict(query or {})
        if not include_deleted:
            base_query["is_deleted"] = {"$ne": True}

        if sort is None:
            sort = [("created_at", -1)]

        if projection is None:
            projection = {"_id": 0}

        return await paginate(
            collection=self.collection,
            query=base_query,
            page=page,
            page_size=page_size,
            sort=sort,
            projection=projection,
        )

    async def find_many(
        self,
        query: Optional[Dict[str, Any]] = None,
        sort: Optional[List[Tuple[str, int]]] = None,
        limit: int = 0,
        include_deleted: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Find multiple documents without pagination (for internal use / exports).

        Args:
            query: MongoDB filter
            sort: Sort spec
            limit: Max results (0 = no limit)
            include_deleted: Include soft-deleted docs

        Returns:
            List of document dicts
        """
        base_query = dict(query or {})
        if not include_deleted:
            base_query["is_deleted"] = {"$ne": True}

        cursor = self.collection.find(base_query, {"_id": 0})

        if sort:
            cursor = cursor.sort(sort)
        if limit > 0:
            cursor = cursor.limit(limit)

        return await cursor.to_list(length=limit or None)

    async def count(
        self,
        query: Optional[Dict[str, Any]] = None,
        include_deleted: bool = False,
    ) -> int:
        """Count documents matching a query."""
        base_query = dict(query or {})
        if not include_deleted:
            base_query["is_deleted"] = {"$ne": True}
        return await self.collection.count_documents(base_query)

    # ────────────────── Update ──────────────────

    async def update(
        self,
        doc_id: str,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Update a document by ID.

        Args:
            doc_id: The UUID string
            data: Fields to update (partial update)
            user_id: UUID of the user performing the action

        Returns:
            Updated document dict, or None if not found
        """
        update_data = serialize_document(data)
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        if user_id:
            update_data["updated_by"] = user_id

        # Remove protected fields from update
        for field in ("id", "_id", "created_at", "created_by"):
            update_data.pop(field, None)

        result = await self.collection.find_one_and_update(
            {"id": doc_id, "is_deleted": {"$ne": True}},
            {"$set": update_data},
            return_document=True,
        )

        if result:
            result.pop("_id", None)

        return result

    # ────────────────── Delete ──────────────────

    async def soft_delete(
        self,
        doc_id: str,
        user_id: Optional[str] = None,
    ) -> bool:
        """
        Soft delete a document (set is_deleted=True).

        Returns:
            True if document was found and deleted, False otherwise
        """
        now = datetime.now(timezone.utc).isoformat()
        update_data: Dict[str, Any] = {
            "is_deleted": True,
            "deleted_at": now,
            "updated_at": now,
        }
        if user_id:
            update_data["deleted_by"] = user_id

        result = await self.collection.update_one(
            {"id": doc_id, "is_deleted": {"$ne": True}},
            {"$set": update_data},
        )

        return result.modified_count > 0

    async def hard_delete(self, doc_id: str) -> bool:
        """
        Permanently delete a document. Use with caution.

        Returns:
            True if document was deleted, False if not found
        """
        result = await self.collection.delete_one({"id": doc_id})
        return result.deleted_count > 0

    # Alias for backwards compatibility
    delete = soft_delete

    # ────────────────── Restore ──────────────────

    async def restore(
        self,
        doc_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Restore a soft-deleted document.

        Returns:
            Restored document, or None if not found
        """
        now = datetime.now(timezone.utc).isoformat()
        update_data: Dict[str, Any] = {
            "is_deleted": False,
            "updated_at": now,
        }
        if user_id:
            update_data["restored_by"] = user_id

        result = await self.collection.find_one_and_update(
            {"id": doc_id, "is_deleted": True},
            {"$set": update_data, "$unset": {"deleted_at": "", "deleted_by": ""}},
            return_document=True,
        )

        if result:
            result.pop("_id", None)

        return result

    # ────────────────── Bulk Operations ──────────────────

    async def bulk_create(
        self,
        items: List[Dict[str, Any]],
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Insert multiple documents at once.

        Returns:
            List of created documents
        """
        if not items:
            return []

        now = datetime.now(timezone.utc).isoformat()
        documents = []

        for data in items:
            document = {
                "id": data.get("id") or str(uuid.uuid4()),
                **serialize_document(data),
                "created_at": now,
                "updated_at": now,
                "is_deleted": False,
            }
            if user_id:
                document["created_by"] = user_id
                document["updated_by"] = user_id
            documents.append(document)

        await self.collection.insert_many(documents)

        for doc in documents:
            doc.pop("_id", None)

        return documents

    async def bulk_soft_delete(
        self,
        doc_ids: List[str],
        user_id: Optional[str] = None,
    ) -> int:
        """
        Soft delete multiple documents.

        Returns:
            Number of documents deleted
        """
        now = datetime.now(timezone.utc).isoformat()
        update_data: Dict[str, Any] = {
            "is_deleted": True,
            "deleted_at": now,
            "updated_at": now,
        }
        if user_id:
            update_data["deleted_by"] = user_id

        result = await self.collection.update_many(
            {"id": {"$in": doc_ids}, "is_deleted": {"$ne": True}},
            {"$set": update_data},
        )

        return result.modified_count
