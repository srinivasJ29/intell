"""Structured Research Report compilation and retrieval endpoints."""

from typing import Annotated, Dict, List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.exceptions import NotFoundException
from backend.app.api.deps import get_current_user
from backend.app.models.user import User
from backend.app.models.workspace import Workspace
from backend.app.models.document import Document
from backend.app.models.report import ResearchReport
from backend.app.schemas.report import ReportGenerateRequest, ReportResponse
from backend.app.services.report_service import report_service

router = APIRouter(tags=["Research Reports"])


@router.post("/workspaces/{workspace_id}/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_research_report(
    workspace_id: str,
    payload: ReportGenerateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Compile and persist an academic research synthesis report."""
    ws_result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id, Workspace.user_id == current_user.id)
    )
    workspace = ws_result.scalar_one_or_none()
    if not workspace:
        raise NotFoundException(f"Workspace {workspace_id} not found")

    # Determine document scope
    doc_query = select(Document).where(
        Document.workspace_id == workspace_id,
        Document.user_id == current_user.id,
    )
    if payload.document_ids:
        doc_query = doc_query.where(Document.id.in_(payload.document_ids))

    docs_result = await db.execute(doc_query)
    docs = docs_result.scalars().all()
    if not docs:
        raise NotFoundException("No documents available in workspace to generate report from.")

    doc_titles: Dict[str, str] = {d.id: d.title for d in docs}
    doc_ids = list(doc_titles.keys())

    report_data = await report_service.compile_report(
        workspace_id=workspace_id,
        user_id=current_user.id,
        workspace_name=workspace.name,
        title=payload.title,
        report_type=payload.report_type,
        document_ids=doc_ids,
        document_titles=doc_titles,
        custom_instructions=payload.custom_instructions,
    )

    report = ResearchReport(
        workspace_id=workspace_id,
        user_id=current_user.id,
        title=report_data["title"],
        report_type=report_data["report_type"],
        content_markdown=report_data["content_markdown"],
        source_document_ids=report_data["source_document_ids"],
        metrics_json=report_data["metrics"],
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return report


@router.get("/workspaces/{workspace_id}/reports", response_model=List[ReportResponse])
async def list_workspace_reports(
    workspace_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List all research reports generated in a workspace."""
    result = await db.execute(
        select(ResearchReport)
        .where(
            ResearchReport.workspace_id == workspace_id,
            ResearchReport.user_id == current_user.id,
        )
        .order_by(ResearchReport.created_at.desc())
    )
    return result.scalars().all()


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve report content and metrics."""
    result = await db.execute(
        select(ResearchReport).where(
            ResearchReport.id == report_id,
            ResearchReport.user_id == current_user.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise NotFoundException(f"Report {report_id} not found")
    return report


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Delete a research report."""
    result = await db.execute(
        select(ResearchReport).where(
            ResearchReport.id == report_id,
            ResearchReport.user_id == current_user.id,
        )
    )
    report = result.scalar_one_or_none()
    if report:
        await db.delete(report)
        await db.commit()

