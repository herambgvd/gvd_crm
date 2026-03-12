from fastapi import APIRouter, HTTPException, Depends, status, Form
from typing import List
from datetime import datetime, timezone, timedelta

from core.auth import get_current_user, get_current_superuser, auth_service
from core.permissions import require_permission
from core.config import settings
from .schemas import (
    LoginRequest, LoginResponse, TokenResponse, UserCreate, UserUpdate, 
    UserResponse, PasswordChangeRequest, PasswordResetRequest,
    RoleCreate, RoleUpdate, RoleResponse, PermissionCreate, PermissionResponse
)
from .services import UserService, RoleService, PermissionService
from .models import User
from core.database import get_database

# Router setup
router = APIRouter(prefix="/auth", tags=["authentication"])

# Authentication endpoints
@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """User login"""
    user = await auth_service.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled"
        )
    
    # Create tokens
    access_token = auth_service.create_access_token(data={"sub": user.id})
    refresh_token = auth_service.create_refresh_token(data={"sub": user.id})

    # Update last login
    from core.database import get_database
    db = get_database()
    await db.users.update_one(
        {"id": user.id},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRATION_HOURS * 3600,
        user=UserResponse.from_user(user)
    )

@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate, 
    current_user: User = Depends(require_permission("users:create")),
    db = Depends(get_database)
):
    """Register a new user (admin only)"""
    user_service = UserService(db)
    user = await user_service.create_user(user_data, current_user.id)
    return UserResponse.from_user(user)

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse.from_user(current_user)

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate, 
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update current user information"""
    user_service = UserService(db)
    user = await user_service.update_user(current_user.id, user_data)
    return UserResponse.from_user(user)

@router.post("/change-password")
async def change_password(
    password_data: PasswordChangeRequest, 
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Change password for current user"""
    user_service = UserService(db)
    await user_service.change_password(current_user.id, password_data)
    return {"message": "Password changed successfully"}

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout current user"""
    return {"message": "Successfully logged out"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_data: "RefreshTokenRequest"):
    """Issue a new access token using a valid refresh token."""
    from .schemas import RefreshTokenRequest
    from core.auth import AuthenticationError

    try:
        payload = auth_service.verify_token(refresh_data.refresh_token, "refresh")
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    except AuthenticationError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = await auth_service.get_user_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    new_access_token = auth_service.create_access_token(data={"sub": user.id})
    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRATION_HOURS * 3600,
    )


# User management endpoints (admin only)
@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_permission("users:create")),
    db = Depends(get_database)
):
    """Create a new user (admin only)"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:        
        # Log the incoming data for debugging
        logger.info(f"Creating user with data: {user_data.model_dump()}")
        
        user_service = UserService(db)
        user = await user_service.create_user(user_data, current_user.id)
        
        response = UserResponse.from_user(user)
        logger.info(f"User created successfully: {response.email}")
        return response
        
    except Exception as e:
        logger.error(f"User creation failed: {str(e)}")
        raise

@router.get("/users", response_model=List[UserResponse])
async def get_users(
    current_user: User = Depends(require_permission("users:view")),
    db = Depends(get_database)
):
    """Get all users (admin only)"""
    user_service = UserService(db)
    users = await user_service.get_all_users()
    return [UserResponse.from_user(user) for user in users]

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: User = Depends(require_permission("users:view"))):
    """Get user by ID (admin only)"""
    import logging
    logger = logging.getLogger(__name__)
    
    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"Retrieved user {user_id}: designation = {getattr(user, 'designation', 'NO_DESIGNATION_FIELD')}")
    
    response = UserResponse.from_user(user)
    logger.info(f"UserResponse designation: {response.designation}")
    
    return response

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str, 
    user_data: UserUpdate, 
    current_user: User = Depends(require_permission("users:edit")),
    db = Depends(get_database)
):
    """Update user (admin only)"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Log the incoming data for debugging
        logger.info(f"Updating user {user_id} with data: {user_data.model_dump()}")
        
        user_service = UserService(db)
        user = await user_service.update_user(user_id, user_data)
        
        response = UserResponse.from_user(user)
        logger.info(f"User {user_id} updated successfully")
        return response
        
    except Exception as e:
        logger.error(f"User update failed: {str(e)}")
        raise

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_permission("users:delete")),
    db = Depends(get_database)
):
    """Delete user (admin only)"""
    # Check if user exists
    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Delete user
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "User deleted successfully"}

@router.put("/users/{user_id}/password")
async def update_user_password(
    user_id: str,
    password_data: dict,
    current_user: User = Depends(require_permission("users:edit")),
    db = Depends(get_database)
):
    """Update user password (admin only)"""
    # Check if user exists
    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate password data
    new_password = password_data.get("new_password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )
    
    # Update password
    hashed_password = auth_service.get_password_hash(new_password)
    result = await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "hashed_password": hashed_password,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "Password updated successfully"}

# Role management endpoints
@router.post("/roles", response_model=RoleResponse)
async def create_role(
    role_data: RoleCreate, 
    current_user: User = Depends(require_permission("roles:create")),
    db = Depends(get_database)
):
    """Create a new role (admin only)"""
    role_service = RoleService(db)
    role = await role_service.create_role(role_data.model_dump())
    return RoleResponse(**role.model_dump())

@router.get("/roles", response_model=List[RoleResponse])
async def get_roles(
    current_user: User = Depends(require_permission("roles:view")),
    db = Depends(get_database)
):
    """Get all roles"""
    role_service = RoleService(db)
    roles = await role_service.get_all_roles()
    return [RoleResponse(**role.model_dump()) for role in roles]

@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str, 
    current_user: User = Depends(require_permission("roles:view")),
    db = Depends(get_database)
):
    """Get role by ID"""
    role_service = RoleService(db)
    role = await role_service.get_role_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    return RoleResponse(**role.model_dump())

@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    role_data: RoleUpdate,
    current_user: User = Depends(require_permission("roles:edit")),
    db = Depends(get_database),
):
    """Update a role (admin only)"""
    role_service = RoleService(db)
    role = await role_service.get_role_by_id(role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    update_data = role_data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.roles.update_one({"id": role_id}, {"$set": update_data})

    # Clear permission cache so changes take effect immediately
    from core.permissions import clear_permission_cache
    clear_permission_cache()

    updated = await role_service.get_role_by_id(role_id)
    return RoleResponse(**updated.model_dump())


@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: str,
    current_user: User = Depends(require_permission("roles:delete")),
    db = Depends(get_database),
):
    """Delete a role (admin only). Cannot delete if users are assigned."""
    role_service = RoleService(db)
    role = await role_service.get_role_by_id(role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    # Check if any users use this role
    user_count = await db.users.count_documents({"role_id": role_id})
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete role — {user_count} user(s) are assigned to it",
        )

    await db.roles.delete_one({"id": role_id})

    from core.permissions import clear_permission_cache
    clear_permission_cache()

    return {"message": "Role deleted successfully"}


# Permission management endpoints
@router.post("/permissions", response_model=PermissionResponse)
async def create_permission(
    permission_data: PermissionCreate, 
    current_user: User = Depends(require_permission("roles:create")),
    db = Depends(get_database)
):
    """Create a new permission (admin only)"""
    permission_service = PermissionService(db)
    permission = await permission_service.create_permission(permission_data.model_dump())
    return PermissionResponse(**permission.model_dump())

@router.get("/permissions", response_model=List[PermissionResponse])
async def get_permissions(
    current_user: User = Depends(require_permission("roles:view")),
    db = Depends(get_database)
):
    """Get all permissions"""
    permission_service = PermissionService(db)
    permissions = await permission_service.get_all_permissions()
    return [PermissionResponse(**permission.model_dump()) for permission in permissions]