from typing import Optional, Any, Dict
from datetime import datetime, timezone
from fastapi import HTTPException
import re
import uuid

# Validation utilities
def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone(phone: str) -> bool:
    """Validate phone number format"""
    pattern = r'^\+?[\d\s\-\(\)]+$'
    return re.match(pattern, phone) is not None and len(phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')) >= 10

def validate_uuid(uuid_string: str) -> bool:
    """Validate UUID format"""
    try:
        uuid.UUID(uuid_string)
        return True
    except ValueError:
        return False

# String utilities
def generate_unique_code(prefix: str = "", length: int = 8) -> str:
    """Generate a unique code with optional prefix"""
    import secrets
    import string
    
    # Generate random string
    alphabet = string.ascii_uppercase + string.digits
    code = ''.join(secrets.choice(alphabet) for _ in range(length))
    
    return f"{prefix}{code}" if prefix else code

def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    import re
    
    # Convert to lowercase and replace spaces with hyphens
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'\s+', '-', text)
    text = re.sub(r'-+', '-', text)
    
    return text.strip('-')

# Date utilities
def format_date_for_display(date: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Format datetime for display"""
    return date.strftime(format_str)

def parse_date_string(date_string: str) -> Optional[datetime]:
    """Parse date string to datetime object"""
    try:
        # Try multiple formats
        formats = [
            "%Y-%m-%d",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%d/%m/%Y",
            "%d-%m-%Y",
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_string, fmt)
            except ValueError:
                continue
        
        return None
    except Exception:
        return None

# Number utilities
def format_currency(amount: float, currency: str = "USD", locale: str = "en_US") -> str:
    """Format currency for display"""
    try:
        if currency == "USD":
            return f"${amount:,.2f}"
        elif currency == "EUR":
            return f"€{amount:,.2f}"
        elif currency == "INR":
            return f"₹{amount:,.2f}"
        else:
            return f"{amount:,.2f} {currency}"
    except Exception:
        return f"{amount} {currency}"

def round_to_precision(value: float, precision: int = 2) -> float:
    """Round value to specified precision"""
    return round(value, precision)

# File utilities
def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    return filename.split('.')[-1].lower() if '.' in filename else ''

def validate_file_type(filename: str, allowed_types: list) -> bool:
    """Validate if file type is allowed"""
    extension = get_file_extension(filename)
    return extension in allowed_types

def get_file_size_mb(size_bytes: int) -> float:
    """Convert file size from bytes to MB"""
    return size_bytes / (1024 * 1024)

# Error handling utilities
def create_error_response(status_code: int, message: str, details: Optional[Dict[str, Any]] = None):
    """Create standardized error response"""
    error_detail = {"message": message}
    if details:
        error_detail.update(details)
    
    raise HTTPException(status_code=status_code, detail=error_detail)

def handle_database_error(error: Exception, operation: str = "database operation"):
    """Handle database errors uniformly"""
    error_message = f"Failed to execute {operation}: {str(error)}"
    create_error_response(500, error_message)

# Pagination utilities
class PaginationParams:
    def __init__(self, page: int = 1, size: int = 50, max_size: int = 100):
        self.page = max(1, page)
        self.size = min(max_size, max(1, size))
        self.skip = (self.page - 1) * self.size

    def get_pagination_info(self, total_count: int) -> Dict[str, Any]:
        total_pages = (total_count + self.size - 1) // self.size
        return {
            "page": self.page,
            "size": self.size,
            "total_count": total_count,
            "total_pages": total_pages,
            "has_next": self.page < total_pages,
            "has_previous": self.page > 1
        }

# Search utilities
def build_search_filter(search_term: Optional[str], fields: list) -> Dict[str, Any]:
    """Build MongoDB search filter for multiple fields"""
    if not search_term:
        return {}
    
    # Create case-insensitive regex search across multiple fields
    escaped = re.escape(search_term)
    search_conditions = []
    for field in fields:
        search_conditions.append({
            field: {"$regex": escaped, "$options": "i"}
        })
    
    return {"$or": search_conditions} if search_conditions else {}

# Status utilities
def get_status_color(status: str) -> str:
    """Get color code for status display"""
    status_colors = {
        "active": "#28a745",      # green
        "inactive": "#6c757d",    # gray
        "pending": "#ffc107",     # yellow
        "approved": "#28a745",    # green
        "rejected": "#dc3545",    # red
        "completed": "#28a745",   # green
        "cancelled": "#dc3545",   # red
        "in_progress": "#007bff", # blue
        "draft": "#6c757d",       # gray
        "sent": "#17a2b8",        # cyan
        "paid": "#28a745",        # green
        "overdue": "#dc3545",     # red
    }
    return status_colors.get(status.lower(), "#6c757d")

# Audit utilities
def create_audit_log(
    action: str,
    entity_type: str,
    entity_id: str,
    user_id: str,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create audit log entry"""
    return {
        "id": str(uuid.uuid4()),
        "action": action,  # create, update, delete, view
        "entity_type": entity_type,
        "entity_id": entity_id,
        "user_id": user_id,
        "old_values": old_values,
        "new_values": new_values,
        "timestamp": datetime.now(timezone.utc),
        "ip_address": None,  # Should be populated from request
        "user_agent": None   # Should be populated from request
    }