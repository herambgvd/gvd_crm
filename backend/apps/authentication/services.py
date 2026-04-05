from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import HTTPException, status
import uuid
import logging

from .models import User, Role, Permission, UserSession
from .schemas import UserCreate, UserUpdate, LoginRequest, PasswordChangeRequest
from core.database import get_database
from core.auth import auth_service as core_auth_service
from apps.common.email_service import send_welcome_email

logger = logging.getLogger(__name__)


class UserService:
    """Service class for user management operations"""
    
    def __init__(self, db=None):
        self.db = db
    
    async def create_user(self, user_data: UserCreate, created_by: str) -> User:
        """Create a new user"""
        try:
            # Convert frontend format to internal format
            internal_data = user_data.to_internal_format()
            
            # Store the plain password for welcome email before hashing
            plain_password = internal_data.get('password', '')

            # Validate password strength
            from .schemas import validate_password_strength
            try:
                validate_password_strength(plain_password)
            except ValueError as ve:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(ve)
                )
            
            # Validate required fields
            if not internal_data.get('email'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is required"
                )
            
            if not plain_password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password is required"
                )
            
            # Check if username/email exists
            existing_user = await self.db.users.find_one({
                "$or": [
                    {"username": internal_data["username"]},
                    {"email": internal_data["email"]}
                ]
            })
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username or email already registered"
                )
            
            # Create user with internal format
            hashed_password = core_auth_service.get_password_hash(plain_password)
            user_dict = {k: v for k, v in internal_data.items() if k != "password"}
            user_dict["hashed_password"] = hashed_password
            
            # Ensure required fields have defaults
            user_dict.setdefault('is_active', True)
            user_dict.setdefault('is_superuser', False)
            user_dict.setdefault('role_id', 'user_role')
            
            user = User(**user_dict)
            
            # Prepare document for MongoDB
            doc = user.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            
            await self.db.users.insert_one(doc)
            
            # Send welcome email with credentials
            user_name = f"{user.first_name} {user.last_name}".strip() or user.username
            try:
                await send_welcome_email(
                    user_email=user.email,
                    user_name=user_name,
                    password=plain_password
                )
                logger.info(f"Welcome email sent to {user.email}")
            except Exception as email_error:
                # Log but don't fail user creation if email fails
                logger.warning(f"Failed to send welcome email to {user.email}: {str(email_error)}")
            
            return user
            
        except ValueError as ve:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(ve)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user: {str(e)}"
            )
    
    async def update_user(self, user_id: str, user_data: UserUpdate) -> User:
        """Update user information"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"Starting user update for user_id: {user_id}")
            logger.info(f"Raw user_data: {user_data.model_dump()}")
            
            # Convert frontend format to internal format
            internal_data = user_data.to_internal_format()
            logger.info(f"Converted internal_data: {internal_data}")
            
            # Only update fields that have values
            if not internal_data:
                logger.warning("No fields to update - internal_data is empty")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update"
                )
            
            internal_data['updated_at'] = datetime.now(timezone.utc)
            
            # Check if email is being changed and already exists
            if 'email' in internal_data:
                existing_user = await self.db.users.find_one({
                    "email": internal_data['email'],
                    "id": {"$ne": user_id}  # Exclude current user
                })
                if existing_user:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already registered"
                    )
            
            # Prepare update document
            doc_update = {}
            for key, value in internal_data.items():
                if isinstance(value, datetime):
                    doc_update[key] = value.isoformat()
                else:
                    doc_update[key] = value
            
            result = await self.db.users.update_one(
                {"id": user_id},
                {"$set": doc_update}
            )
            
            if result.matched_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            return await core_auth_service.get_user_by_id(user_id)
            
        except ValueError as ve:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(ve)
            )
        except HTTPException:
            # Re-raise HTTP exceptions as they are
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update user: {str(e)}"
            )
    
    async def change_password(self, user_id: str, password_data: PasswordChangeRequest) -> bool:
        """Change user password"""
        user = await core_auth_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        if not core_auth_service.verify_password(password_data.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        hashed_password = core_auth_service.get_password_hash(password_data.new_password)
        await self.db.users.update_one(
            {"id": user_id},
            {"$set": {"hashed_password": hashed_password, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return True

    async def get_all_users(self) -> List[User]:
        """Get all users"""
        users = await self.db.users.find({}, {"_id": 0}).to_list(1000)
        result = []
        for user_doc in users:
            if isinstance(user_doc.get('created_at'), str):
                user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
            if isinstance(user_doc.get('updated_at'), str):
                user_doc['updated_at'] = datetime.fromisoformat(user_doc['updated_at'])
            if user_doc.get('last_login') and isinstance(user_doc['last_login'], str):
                user_doc['last_login'] = datetime.fromisoformat(user_doc['last_login'])
                
            result.append(User(**user_doc))
        return result


class RoleService:
    """Service class for role management operations"""
    
    def __init__(self, db=None):
        self.db = db
    
    async def create_role(self, role_data: dict) -> Role:
        """Create a new role"""
        role = Role(**role_data)
        
        doc = role.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await self.db.roles.insert_one(doc)
        return role
    
    async def get_role_by_id(self, role_id: str) -> Optional[Role]:
        """Get role by ID"""
        role_doc = await self.db.roles.find_one({"id": role_id}, {"_id": 0})
        if role_doc:
            # Handle datetime conversion
            if isinstance(role_doc.get('created_at'), str):
                role_doc['created_at'] = datetime.fromisoformat(role_doc['created_at'])
            if isinstance(role_doc.get('updated_at'), str):
                role_doc['updated_at'] = datetime.fromisoformat(role_doc['updated_at'])
            return Role(**role_doc)
        return None
    
    async def get_all_roles(self) -> List[Role]:
        """Get all roles"""
        roles = await self.db.roles.find({}, {"_id": 0}).to_list(1000)
        result = []
        for role in roles:
            if isinstance(role.get('created_at'), str):
                role['created_at'] = datetime.fromisoformat(role['created_at'])
            if isinstance(role.get('updated_at'), str):
                role['updated_at'] = datetime.fromisoformat(role['updated_at'])
            result.append(Role(**role))
        return result


class PermissionService:
    """Service class for permission management operations"""
    
    def __init__(self, db=None):
        self.db = db
    
    async def create_permission(self, permission_data: dict) -> Permission:
        """Create a new permission"""
        permission = Permission(**permission_data)
        
        doc = permission.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await self.db.permissions.insert_one(doc)
        return permission
    
    async def get_all_permissions(self) -> List[Permission]:
        """Get all permissions"""
        permissions = await self.db.permissions.find({}, {"_id": 0}).to_list(1000)
        result = []
        for permission in permissions:
            if isinstance(permission.get('created_at'), str):
                permission['created_at'] = datetime.fromisoformat(permission['created_at'])
            result.append(Permission(**permission))
        return result