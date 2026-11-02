"""FastAPI dependency injection utilities for authentication and database sessions."""

from typing import Annotated, AsyncGenerator
from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.security import decode_access_token
from backend.app.core.exceptions import (
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
)
from backend.app.models.user import User
from backend.app.models.workspace import Workspace
from backend.app.models.document import Document


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    """Validate Bearer access token and return active User instance."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException("Missing or malformed Authorization header")

    token = authorization.split("Bearer ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload:
        raise UnauthorizedException("Invalid or expired access token")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Token payload missing subject identifier")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedException("User associated with token not found")
    if not user.is_active:
        raise ForbiddenException("User account is inactive")

    return user


async def get_current_active_superuser(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Validate that the authenticated user has superuser privileges."""
    if not current_user.is_superuser:
        raise ForbiddenException("Superuser privileges required")
    return current_user


async def get_workspace_for_user(
    workspace_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Workspace:
    """Retrieve workspace ensuring strict ownership isolation."""
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.user_id == current_user.id,
        )
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise NotFoundException(f"Workspace with ID '{workspace_id}' not found")
    return workspace


async def get_document_for_user(
    document_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Document:
    """Retrieve document ensuring strict ownership isolation."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise NotFoundException(f"Document with ID '{document_id}' not found")
    return document
