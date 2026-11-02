"""Multi-document comparison matrix API endpoints."""

from typing import Annotated, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.exceptions import BadRequestException, NotFoundException
from backend.app.api.deps import get_current_user
from backend.app.models.user import User
from backend.app.models.workspace import Workspace
from backend.app.models.document import Document
from backend.app.schemas.comparison import ComparisonRequest, ComparisonResponse
from backend.app.services.comparison_service import comparison_service

router = APIRouter(tags=["Multi-Document Comparison"])


@router.post("/workspaces/{workspace_id}/compare", response_model=ComparisonResponse)
async def generate_paper_comparison(
    workspace_id: str,
    payload: ComparisonRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Generate side-by-side comparative matrix across selected papers."""
    if not payload.document_ids or len(payload.document_ids) < 1:
        raise BadRequestException("At least one document must be selected for comparison.")

    # Verify workspace ownership
    ws_result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id, Workspace.user_id == current_user.id)
    )
    workspace = ws_result.scalar_one_or_none()
    if not workspace:
        raise NotFoundException(f"Workspace {workspace_id} not found")

    # Fetch document titles
    docs_result = await db.execute(
        select(Document).where(
            Document.id.in_(payload.document_ids),
            Document.workspace_id == workspace_id,
            Document.user_id == current_user.id,
        )
    )
    docs = docs_result.scalars().all()
    if not docs:
        raise NotFoundException("None of the specified documents were found in this workspace.")

    document_titles: Dict[str, str] = {d.id: d.title for d in docs}
    valid_doc_ids = list(document_titles.keys())

    comparison = await comparison_service.compare_documents(
        workspace_id=workspace_id,
        user_id=current_user.id,
        document_ids=valid_doc_ids,
        document_titles=document_titles,
        selected_dimensions=payload.dimensions,
    )
    return comparison

