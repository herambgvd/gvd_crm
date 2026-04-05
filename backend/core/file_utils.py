"""
File upload security utilities.
"""

import os
import uuid
from fastapi import HTTPException, UploadFile, status

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv",
    ".jpg", ".jpeg", ".png", ".gif", ".txt", ".zip",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


async def validate_upload(file: UploadFile) -> None:
    """Validate file extension and size before processing."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit",
        )
    await file.seek(0)


def safe_filename(filename: str) -> str:
    """Return a safe, non-guessable filename preserving the original extension."""
    ext = os.path.splitext(filename or "file")[1].lower()
    return f"{uuid.uuid4().hex}{ext}"
