"""
Import Engine — API endpoints for CSV/Excel/Google Sheets import.
"""

import re
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Dict

import httpx

from core.auth import get_current_user
from .service import (
    ENTITY_FIELDS,
    parse_csv_content,
    parse_excel_content,
    execute_import,
)

router = APIRouter()

ENTITY_LABELS = {
    "lead": "Leads",
    "customer": "Customers",
    "entity": "Entities",
    "product": "Products",
    "ticket": "Support Tickets",
}


# ─────────────────── Schemas ───────────────────

class GoogleSheetsPreviewRequest(BaseModel):
    url: str


class GoogleSheetsExecuteRequest(BaseModel):
    url: str
    entity_type: str
    column_mapping: Dict[str, str]


# ─────────────────── Helpers ───────────────────

_SHEET_ID_RE = re.compile(r"/spreadsheets/d/([a-zA-Z0-9_-]+)")


def _extract_sheet_id(url: str) -> str:
    m = _SHEET_ID_RE.search(url)
    if not m:
        raise HTTPException(status_code=400, detail="Invalid Google Sheets URL")
    return m.group(1)


async def _fetch_google_sheet_csv(url: str) -> bytes:
    sheet_id = _extract_sheet_id(url)
    export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        resp = await client.get(export_url)
    if resp.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="Failed to fetch Google Sheet. Make sure the sheet is publicly shared.",
        )
    return resp.content


def _parse_upload(filename: str, content: bytes):
    lower = filename.lower()
    if lower.endswith(".csv"):
        return parse_csv_content(content)
    elif lower.endswith((".xlsx", ".xls")):
        return parse_excel_content(content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use CSV or Excel (.xlsx).")


def _get_system_fields(entity_type: str):
    """Return system fields as list of {key, label, type, required} for frontend."""
    fields = ENTITY_FIELDS.get(entity_type, {})
    result = []
    for field_name, fd in fields.items():
        label = field_name.replace("_", " ").title()
        result.append({
            "key": field_name,
            "label": label,
            "type": fd.get("type", "string"),
            "required": fd.get("required", False),
        })
    return result


# ─────────────────── Endpoints ───────────────────

@router.get("/entities")
async def list_importable_entities(current_user=Depends(get_current_user)):
    """List importable entity types with their field definitions."""
    entities = []
    for key in ENTITY_FIELDS:
        entities.append({
            "key": key,
            "label": ENTITY_LABELS.get(key, key.title()),
            "fields": _get_system_fields(key),
        })
    return {"entities": entities}


@router.post("/preview")
async def preview_file_endpoint(
    file: UploadFile = File(...),
    entity_type: str = Form(""),
    current_user=Depends(get_current_user),
):
    """Upload CSV/Excel and return headers + first 5 rows + system fields."""
    content = await file.read()
    headers, rows = _parse_upload(file.filename, content)
    return {
        "headers": headers,
        "preview_rows": rows[:5],
        "total_rows": len(rows),
        "system_fields": _get_system_fields(entity_type) if entity_type else [],
    }


@router.post("/execute")
async def execute_file_import(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    column_mapping_json: str = Form(...),
    current_user=Depends(get_current_user),
):
    """Execute import from uploaded CSV/Excel file."""
    if entity_type not in ENTITY_FIELDS:
        raise HTTPException(status_code=400, detail=f"Unknown entity type: {entity_type}")

    try:
        mapping = json.loads(column_mapping_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="column_mapping_json must be valid JSON")

    content = await file.read()
    headers, rows = _parse_upload(file.filename, content)

    result = await execute_import(
        entity_type=entity_type,
        headers=headers,
        rows=rows,
        column_mapping=mapping,
        user_id=current_user.id,
    )
    return result


@router.post("/google-sheets/preview")
async def preview_google_sheet(
    body: GoogleSheetsPreviewRequest,
    entity_type: str = "",
    current_user=Depends(get_current_user),
):
    """Fetch a public Google Sheet and return headers + first 5 rows."""
    content = await _fetch_google_sheet_csv(body.url)
    headers, rows = parse_csv_content(content)
    return {
        "headers": headers,
        "preview_rows": rows[:5],
        "total_rows": len(rows),
        "system_fields": _get_system_fields(entity_type) if entity_type else [],
    }


@router.post("/google-sheets/execute")
async def execute_google_sheet_import(
    body: GoogleSheetsExecuteRequest,
    current_user=Depends(get_current_user),
):
    """Execute import from a public Google Sheet."""
    if body.entity_type not in ENTITY_FIELDS:
        raise HTTPException(status_code=400, detail=f"Unknown entity type: {body.entity_type}")

    content = await _fetch_google_sheet_csv(body.url)
    headers, rows = parse_csv_content(content)

    result = await execute_import(
        entity_type=body.entity_type,
        headers=headers,
        rows=rows,
        column_mapping=body.column_mapping,
        user_id=current_user.id,
    )
    return result
