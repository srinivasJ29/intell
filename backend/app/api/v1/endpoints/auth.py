"""Authentication API endpoints: Register, Login, Refresh, Logout, and Current User."""

from datetime import datetime, timedelta, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, Header, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.exceptions import (
    BadRequestException,
    ConflictException,
    UnauthorizedException,
)
from backend.app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from backend.app.api.deps import get_current_user
from backend.app.models.user import User
from backend.app.models.session import RefreshTokenSession
from backend.app.models.workspace import Workspace
from backend.app.schemas.auth import (
    RefreshTokenRequest,
    TokenResponse,
    UpdateUserRequest,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_agent: Annotated[str | None, Header()] = None,
):
    """Register a new user account with Argon2id password hashing."""
    # Check if email is already taken
    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise ConflictException("A user with this email address already exists.")

    new_user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Issue access and refresh tokens
    access_token = create_access_token(subject=new_user.id)
    raw_refresh = generate_refresh_token()
    token_hash = hash_token(raw_refresh)

    session = RefreshTokenSession(
        user_id=new_user.id,
        token_hash=token_hash,
        user_agent=user_agent,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: UserLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_agent: Annotated[str | None, Header()] = None,
):
    """Authenticate with email and password, establishing rotating token session."""
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise UnauthorizedException("Incorrect email or password")

    if not user.is_active:
        raise UnauthorizedException("User account is inactive")

    access_token = create_access_token(subject=user.id)
    raw_refresh = generate_refresh_token()
    token_hash = hash_token(raw_refresh)

    session = RefreshTokenSession(
        user_id=user.id,
        token_hash=token_hash,
        user_agent=user_agent,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    payload: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_agent: Annotated[str | None, Header()] = None,
):
    """Rotate refresh token: revoke current token and issue fresh token pair."""
    token_hash = hash_token(payload.refresh_token)
    result = await db.execute(
        select(RefreshTokenSession).where(
            RefreshTokenSession.token_hash == token_hash,
            RefreshTokenSession.is_revoked.is_(False),
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise UnauthorizedException("Invalid or revoked refresh token")

    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        session.is_revoked = True
        await db.commit()
        raise UnauthorizedException("Refresh token has expired")

    # Revoke old session
    session.is_revoked = True

    # Generate new token pair
    access_token = create_access_token(subject=session.user_id)
    new_raw_refresh = generate_refresh_token()
    new_token_hash = hash_token(new_raw_refresh)

    new_session = RefreshTokenSession(
        user_id=session.user_id,
        token_hash=new_token_hash,
        user_agent=user_agent,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_session)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_raw_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Revoke user's refresh token session."""
    token_hash = hash_token(payload.refresh_token)
    await db.execute(
        update(RefreshTokenSession)
        .where(
            RefreshTokenSession.token_hash == token_hash,
            RefreshTokenSession.user_id == current_user.id,
        )
        .values(is_revoked=True)
    )
    await db.commit()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Fetch authenticated user profile details."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    payload: UpdateUserRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Update profile information or password."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name

    if payload.new_password:
        if not payload.current_password or not verify_password(payload.current_password, current_user.hashed_password):
            raise BadRequestException("Current password verification failed")
        current_user.hashed_password = hash_password(payload.new_password)

    await db.commit()
    await db.refresh(current_user)
    return current_user
