"""
Shared Pagination Utilities

Provides a standardized way to paginate MongoDB queries across all modules.

Usage:
    from core.pagination import paginate

    @router.get("/products")
    async def list_products(page: int = 1, page_size: int = 20):
        db = get_database()
        result = await paginate(
            collection=db.products,
            query={"is_deleted": False},
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)],
            projection={"_id": 0},
        )
        return result
        # → {"items": [...], "total": 125, "page": 1, "page_size": 20, "total_pages": 7}
"""

import math
from typing import Any, Dict, List, Optional, Tuple


async def paginate(
    collection,
    query: Dict[str, Any],
    page: int = 1,
    page_size: int = 20,
    sort: Optional[List[Tuple[str, int]]] = None,
    projection: Optional[Dict[str, Any]] = None,
    max_page_size: int = 100,
) -> Dict[str, Any]:
    """
    Paginate a MongoDB collection query.

    Args:
        collection: Motor collection object
        query: MongoDB filter dict
        page: 1-based page number
        page_size: Number of items per page
        sort: List of (field, direction) tuples, e.g. [("created_at", -1)]
        projection: MongoDB projection dict, e.g. {"_id": 0}
        max_page_size: Maximum allowed page_size to prevent abuse

    Returns:
        {
            "items": [...],
            "total": int,
            "page": int,
            "page_size": int,
            "total_pages": int,
        }
    """
    # Validate & clamp
    page = max(1, page)
    page_size = max(1, min(page_size, max_page_size))

    # Default projection: exclude _id
    if projection is None:
        projection = {"_id": 0}

    # Count total
    total = await collection.count_documents(query)

    # Calculate total pages
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    # Clamp page to valid range
    if page > total_pages and total_pages > 0:
        page = total_pages

    skip = (page - 1) * page_size

    # Build cursor
    cursor = collection.find(query, projection)

    if sort:
        cursor = cursor.sort(sort)

    cursor = cursor.skip(skip).limit(page_size)

    items = await cursor.to_list(length=page_size)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


async def paginate_aggregation(
    collection,
    pipeline: List[Dict[str, Any]],
    page: int = 1,
    page_size: int = 20,
    max_page_size: int = 100,
) -> Dict[str, Any]:
    """
    Paginate a MongoDB aggregation pipeline.

    The function appends $facet stage to get both data and count in one query.

    Args:
        collection: Motor collection object
        pipeline: Aggregation pipeline stages (before $skip/$limit)
        page: 1-based page number
        page_size: Number of items per page
        max_page_size: Maximum allowed page_size

    Returns:
        Same format as paginate()
    """
    page = max(1, page)
    page_size = max(1, min(page_size, max_page_size))

    skip = (page - 1) * page_size

    # Add facet for data + total count
    count_pipeline = pipeline + [{"$count": "total"}]
    data_pipeline = pipeline + [{"$skip": skip}, {"$limit": page_size}]

    # Run both in parallel-ish via $facet
    facet_pipeline = pipeline + [
        {
            "$facet": {
                "items": [{"$skip": skip}, {"$limit": page_size}],
                "total_count": [{"$count": "total"}],
            }
        }
    ]

    results = await collection.aggregate(facet_pipeline).to_list(length=1)

    if not results:
        return {
            "items": [],
            "total": 0,
            "page": page,
            "page_size": page_size,
            "total_pages": 0,
        }

    facet_result = results[0]
    items = facet_result.get("items", [])
    total_count = facet_result.get("total_count", [])
    total = total_count[0]["total"] if total_count else 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    # Remove _id from items if present
    for item in items:
        item.pop("_id", None)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
