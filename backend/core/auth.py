from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging

from .config import settings
from .database import get_database
from apps.authentication.models import User

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme
security = HTTPBearer()

class AuthenticationError(Exception):
    """Custom authentication error"""
    pass

class AuthService:
    """Authentication service class"""
    
    def __init__(self):
        self.secret_key = settings.JWT_SECRET
        self.algorithm = settings.JWT_ALGORITHM
        self.access_token_expire_hours = settings.JWT_EXPIRATION_HOURS
        self.refresh_token_expire_days = settings.JWT_REFRESH_EXPIRATION_DAYS
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against its hash"""
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def get_password_hash(self, password: str) -> str:
        """Generate password hash"""
        try:
            return pwd_context.hash(password)
        except Exception as e:
            logger.error(f"Password hashing error: {e}")
            raise AuthenticationError("Failed to hash password")
    
    def create_access_token(
        self, 
        data: dict, 
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token"""
        try:
            to_encode = data.copy()
            if expires_delta:
                expire = datetime.now(timezone.utc) + expires_delta
            else:
                expire = datetime.now(timezone.utc) + timedelta(hours=self.access_token_expire_hours)
            
            to_encode.update({
                "exp": expire,
                "iat": datetime.now(timezone.utc),
                "type": "access"
            })
            
            encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
            return encoded_jwt
            
        except Exception as e:
            logger.error(f"Token creation error: {e}")
            raise AuthenticationError("Failed to create access token")
    
    def create_refresh_token(self, data: dict) -> str:
        """Create JWT refresh token"""
        try:
            to_encode = data.copy()
            expire = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)
            
            to_encode.update({
                "exp": expire,
                "iat": datetime.now(timezone.utc),
                "type": "refresh"
            })
            
            encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
            return encoded_jwt
            
        except Exception as e:
            logger.error(f"Refresh token creation error: {e}")
            raise AuthenticationError("Failed to create refresh token")
    
    def verify_token(self, token: str, token_type: str = "access") -> dict:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check token type
            if payload.get("type") != token_type:
                raise JWTError(f"Invalid token type. Expected {token_type}")
            
            return payload
            
        except JWTError as e:
            logger.warning(f"Token verification failed: {e}")
            raise AuthenticationError("Invalid or expired token")
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise AuthenticationError("Token verification failed")
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID from database"""
        try:
            db = get_database()
            user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
            
            if not user_doc:
                return None
            
            # Handle datetime conversion
            if isinstance(user_doc.get('created_at'), str):
                user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
            if isinstance(user_doc.get('updated_at'), str):
                user_doc['updated_at'] = datetime.fromisoformat(user_doc['updated_at'])
            if user_doc.get('last_login') and isinstance(user_doc['last_login'], str):
                user_doc['last_login'] = datetime.fromisoformat(user_doc['last_login'])
            
            return User(**user_doc)
            
        except Exception as e:
            logger.error(f"User retrieval error: {e}")
            return None
    
    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate user with username/email and password"""
        try:
            db = get_database()
            user_doc = await db.users.find_one({
                "$or": [
                    {"username": username},
                    {"email": username}
                ],
                "is_active": True
            }, {"_id": 0})
            
            if not user_doc:
                return None
            
            # Handle datetime conversion
            if isinstance(user_doc.get('created_at'), str):
                user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
            if isinstance(user_doc.get('updated_at'), str):
                user_doc['updated_at'] = datetime.fromisoformat(user_doc['updated_at'])
            if user_doc.get('last_login') and isinstance(user_doc['last_login'], str):
                user_doc['last_login'] = datetime.fromisoformat(user_doc['last_login'])
            
            user = User(**user_doc)
            
            if not self.verify_password(password, user.hashed_password):
                return None
            
            return user
            
        except Exception as e:
            logger.error(f"User authentication error: {e}")
            return None

# Global auth service instance
auth_service = AuthService()

# Authentication dependencies
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = auth_service.verify_token(credentials.credentials, "access")
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
    except AuthenticationError:
        raise credentials_exception
    
    user = await auth_service.get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled"
        )
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )
    return current_user

async def get_current_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current superuser"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def require_permission(permission: str):
    """Decorator for requiring specific permission"""
    async def permission_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        # TODO: Implement proper permission checking with roles
        # For now, just check if user is active
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    
    return permission_checker

# Optional authentication dependency
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[User]:
    """Get current user if authenticated, otherwise None"""
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None