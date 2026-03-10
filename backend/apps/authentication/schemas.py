from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# Authentication Schemas
class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# User Schemas
class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Full name")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=6, max_length=100, description="Password")
    phone: Optional[str] = Field(None, description="Phone number")
    department: Optional[str] = Field(None, description="Department")
    designation: Optional[str] = Field(None, description="Job designation")
    role_ids: Optional[List[str]] = Field(default_factory=list, description="Role IDs")
    is_active: Optional[bool] = Field(True, description="User is active")
    is_email_verified: Optional[bool] = Field(False, description="Email is verified")
    
    def to_internal_format(self):
        """Convert frontend format to internal User model format"""
        try:
            name_parts = self.name.strip().split(' ', 1)
            first_name = name_parts[0] if name_parts else 'Unknown'
            last_name = name_parts[1] if len(name_parts) > 1 else 'User'
            
            # Use first role_id if provided, otherwise default role
            role_id = self.role_ids[0] if self.role_ids and len(self.role_ids) > 0 else 'user_role'
            
            # Generate username from email
            username = self.email.split('@')[0].lower().replace('.', '_')
            
            return {
                'username': username,
                'email': self.email,
                'first_name': first_name,
                'last_name': last_name,
                'password': self.password,
                'role_id': role_id,
                'department': self.department,
                'designation': self.designation,
                'phone': self.phone,
                'is_active': self.is_active if self.is_active is not None else True,
                'is_superuser': bool(role_id == 'admin_role' or (self.role_ids and 'admin_role' in self.role_ids))
            }
        except Exception as e:
            raise ValueError(f"Failed to convert user data: {str(e)}")

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    role_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_email_verified: Optional[bool] = None
    
    def to_internal_format(self):
        """Convert frontend format to internal User model format"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            data = {}
            
            if self.name:
                name_parts = self.name.strip().split(' ', 1)
                data['first_name'] = name_parts[0] if name_parts else 'Unknown'
                data['last_name'] = name_parts[1] if len(name_parts) > 1 else 'User'
                logger.debug(f"Converted name '{self.name}' to first_name: '{data['first_name']}', last_name: '{data['last_name']}'")
            
            if self.email:
                data['email'] = self.email
                data['username'] = self.email.split('@')[0].lower().replace('.', '_')
                logger.debug(f"Converted email '{self.email}' to username: '{data['username']}'")
            
            if self.role_ids and len(self.role_ids) > 0:
                data['role_id'] = self.role_ids[0]
                data['is_superuser'] = bool('admin_role' in self.role_ids)
                logger.debug(f"Converted role_ids {self.role_ids} to role_id: '{data['role_id']}', is_superuser: {data['is_superuser']}")
            
            if self.department:
                data['department'] = self.department
            if self.phone:
                data['phone'] = self.phone
            if self.is_active is not None:
                data['is_active'] = self.is_active
            if self.designation:
                data['designation'] = self.designation
            if self.is_email_verified is not None:
                data['is_email_verified'] = self.is_email_verified
                
            logger.info(f"UserUpdate.to_internal_format() result: {data}")
            return data
        except Exception as e:
            logger.error(f"Failed to convert user update data: {str(e)}")
            raise ValueError(f"Failed to convert user update data: {str(e)}")

class UserResponse(BaseModel):
    id: str
    name: str  # Computed from first_name + last_name
    username: str
    email: str
    is_active: bool
    is_superuser: bool
    role_ids: List[str]  # Convert role_id to array
    department: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    profile_picture: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: datetime
    is_email_verified: Optional[bool] = False
    
    @classmethod
    def from_user(cls, user: "User"):
        """Create UserResponse from User model"""
        return cls(
            id=user.id,
            name=f"{user.first_name} {user.last_name}".strip(),
            username=user.username,
            email=user.email,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            role_ids=[user.role_id] if user.role_id else [],
            department=user.department,
            designation=user.designation,
            phone=user.phone,
            profile_picture=user.profile_picture,
            last_login=user.last_login,
            created_at=user.created_at,
            is_email_verified=False  # Default for now
        )

class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6, max_length=100)

class PasswordResetRequest(BaseModel):
    email: EmailStr

# Role Schemas
class RoleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)

class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None

class RoleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    permissions: List[str]
    is_active: bool
    created_at: datetime

# Permission Schemas
class PermissionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    codename: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    resource: str
    action: str

class PermissionResponse(BaseModel):
    id: str
    name: str
    codename: str
    description: Optional[str] = None
    resource: str
    action: str
    created_at: datetime