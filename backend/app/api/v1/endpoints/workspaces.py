"""Workspace management API endpoints."""

from typing import Annotated, List
from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user, get_workspace_for_user
from backend.app.models.user import User
from backend.app.models.workspace import Workspace
from backend.app.models.document import Document
from backend.app.models.conversation import Conversation
from backend.app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceUpdate,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a new research workspace for the authenticated user."""
    workspace = Workspace(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        color_tag=payload.color_tag,
    )
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)

    return WorkspaceResponse(
        id=workspace.id,
        user_id=workspace.user_id,
        name=workspace.name,
        description=workspace.description,
        color_tag=workspace.color_tag,
        document_count=0,
        conversation_count=0,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
    )


@router.get("/", response_model=List[WorkspaceResponse])
async def list_workspaces(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List all workspaces owned by the user with document and chat counts."""
    # Subqueries for counts
    doc_count_sub = (
        select(func.count(Document.id))
        .where(Document.workspace_id == Workspace.id)
        .scalar_subquery()
    )
    conv_count_sub = (
        select(func.count(Conversation.id))
        .where(Conversation.workspace_id == Workspace.id)
        .scalar_subquery()
    )

    stmt = (
        select(Workspace, doc_count_sub.label("doc_count"), conv_count_sub.label("conv_count"))
        .where(Workspace.user_id == current_user.id)
        .order_by(Workspace.updated_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    workspaces = []
    for ws, doc_cnt, conv_cnt in rows:
        workspaces.append(
            WorkspaceResponse(
                id=ws.id,
                user_id=ws.user_id,
                name=ws.name,
                description=ws.description,
                color_tag=ws.color_tag,
                document_count=doc_cnt or 0,
                conversation_count=conv_cnt or 0,
                created_at=ws.created_at,
                updated_at=ws.updated_at,
            )
        )
    return workspaces


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace: Annotated[Workspace, Depends(get_workspace_for_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Retrieve detailed workspace metadata."""
    doc_count = await db.scalar(
        select(func.count(Document.id)).where(Document.workspace_id == workspace.id)
    )
    conv_count = await db.scalar(
        select(func.count(Conversation.id)).where(Conversation.workspace_id == workspace.id)
    )

    return WorkspaceResponse(
        id=workspace.id,
        user_id=workspace.user_id,
        name=workspace.name,
        description=workspace.description,
        color_tag=workspace.color_tag,
        document_count=doc_count or 0,
        conversation_count=conv_count or 0,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
    )


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    payload: WorkspaceUpdate,
    workspace: Annotated[Workspace, Depends(get_workspace_for_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update workspace name, description, or color theme."""
    if payload.name is not None:
        workspace.name = payload.name
    if payload.description is not None:
        workspace.description = payload.description
    if payload.color_tag is not None:
        workspace.color_tag = payload.color_tag

    await db.commit()
    await db.refresh(workspace)
    return await get_workspace(workspace, db)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace: Annotated[Workspace, Depends(get_workspace_for_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Cascade delete workspace and all associated documents, chats, and reports."""
    await db.delete(workspace)
    await db.commit()

