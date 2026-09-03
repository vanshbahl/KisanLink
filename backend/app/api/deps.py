from typing import AsyncGenerator, Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import decode_access_token
from app.database import get_db
from app.models import User, UserRoleEnum, FarmerProfile, BuyerProfile, LogisticsProfile

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate Bearer JWT token and retrieve current authenticated user."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        user_id = UUID(payload["sub"])
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identification in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.farmer_profile),
            selectinload(User.buyer_profile),
            selectinload(User.logistics_profile),
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account does not exist or is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def require_role(*allowed_roles: UserRoleEnum):
    """Dependency factory requiring user to possess one of the allowed roles."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{current_user.role.value}' is not authorized for this resource",
            )
        return current_user
    return role_checker


require_farmer = require_role(UserRoleEnum.FARMER, UserRoleEnum.OPERATOR_PROXY)
require_buyer = require_role(UserRoleEnum.BUYER)
require_logistics_provider = require_role(UserRoleEnum.LOGISTICS_PROVIDER)
require_operator = require_role(UserRoleEnum.OPERATOR_PROXY)
