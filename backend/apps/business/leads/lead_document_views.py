"""
Lead Document Views — uses LeadDocumentService
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from pathlib import Path
import uuid
import shutil

from core.permissions import require_permission
from apps.authentication.models import User
from .schemas import LeadDocumentResponse
from .service import lead_document_service, lead_service

router = APIRouter(tags=["lead-documents"])

UPLOAD_DIR = Path("uploads/lead_documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/lead/{lead_id}", response_model=List[LeadDocumentResponse])
async def get_lead_documents(
    lead_id: str,
    current_user: User = Depends(require_permission("leads:view")),
):
    """Get all documents for a lead."""
    items = await lead_document_service.get_lead_documents(lead_id)
    return [LeadDocumentResponse(**doc) for doc in items]


@router.post("", response_model=LeadDocumentResponse)
async def upload_lead_document(
    file: UploadFile = File(...),
    lead_id: str = Form(...),
    description: Optional[str] = Form(None),
    current_user: User = Depends(require_permission("leads:edit")),
):
    """Upload a document for a lead."""
    # Verify lead exists
    lead = await lead_service.get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Save file
    file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
    filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
    file_path = UPLOAD_DIR / filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
    finally:
        file.file.close()

    data = {
        "lead_id": lead_id,
        "document_id": str(uuid.uuid4()),
        "document_type": "general",
        "description": description,
        "file_name": file.filename,
        "file_path": str(file_path),
        "uploaded_by": current_user.id,
    }
    doc = await lead_document_service.create(data, user_id=current_user.id)
    return LeadDocumentResponse(**doc)


@router.delete("/{document_id}")
async def delete_lead_document(
    document_id: str,
    current_user: User = Depends(require_permission("leads:edit")),
):
    """Soft-delete a lead document (file stays on disk for audit)."""
    doc = await lead_document_service.get_by_id(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    success = await lead_document_service.soft_delete(
        document_id, user_id=current_user.id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}
