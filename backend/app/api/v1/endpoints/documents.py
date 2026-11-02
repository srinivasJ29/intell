"""Document upload, library management, and PDF streaming API endpoints."""

from typing import Annotated, List
from fastapi import APIRouter, Depends, File, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.api.deps import (
    get_current_user,
    get_workspace_for_user,
    get_document_for_user,
)
from backend.app.models.user import User
from backend.app.models.workspace import Workspace
from backend.app.models.document import Document, DocumentProcessingJob
from backend.app.schemas.document import (
    DocumentDetailResponse,
    DocumentProcessingJobResponse,
    DocumentResponse,
)
from backend.app.services.storage_service import storage_service
from backend.app.services.vector_service import vector_service
from backend.app.workers.ingestion_worker import dispatch_ingestion_task

router = APIRouter(tags=["Documents"])


@router.post("/workspaces/{workspace_id}/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    workspace_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload research PDF, store in object storage, and dispatch background ingestion."""
    # Verify workspace ownership
    ws_result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id, Workspace.user_id == current_user.id)
    )
    workspace = ws_result.scalar_one_or_none()
    if not workspace:
        from backend.app.core.exceptions import NotFoundException
        raise NotFoundException(f"Workspace {workspace_id} not found")

    file_bytes = await file.read()
    raw_filename = file.filename or "paper.pdf"

    # Persist file via Storage Service
    storage_key, file_hash, file_size = await storage_service.save_file(
        workspace_id=workspace_id,
        filename=raw_filename,
        content=file_bytes,
    )

    # Derive human-friendly title from filename (strip .pdf and clean underscores)
    derived_title = raw_filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

    document = Document(
        workspace_id=workspace_id,
        user_id=current_user.id,
        title=derived_title,
        filename=raw_filename,
        storage_key=storage_key,
        file_hash_sha256=file_hash,
        file_size_bytes=file_size,
        status="PENDING",
        metadata_json={},
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Dispatch ingestion to background pipeline
    dispatch_ingestion_task(document.id)

    return document


@router.get("/workspaces/{workspace_id}/documents", response_model=List[DocumentResponse])
async def list_workspace_documents(
    workspace_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List all documents within a workspace."""
    result = await db.execute(
        select(Document)
        .where(
            Document.workspace_id == workspace_id,
            Document.user_id == current_user.id,
        )
        .order_by(Document.created_at.desc())
    )
    return result.scalars().all()


@router.get("/documents/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document: Annotated[Document, Depends(get_document_for_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Retrieve document status and background job lifecycle stages."""
    jobs_result = await db.execute(
        select(DocumentProcessingJob)
        .where(DocumentProcessingJob.document_id == document.id)
        .order_by(DocumentProcessingJob.created_at.desc())
    )
    jobs = jobs_result.scalars().all()

    return DocumentDetailResponse(
        id=document.id,
        workspace_id=document.workspace_id,
        user_id=document.user_id,
        title=document.title,
        filename=document.filename,
        file_size_bytes=document.file_size_bytes,
        page_count=document.page_count,
        status=document.status,
        metadata_json=document.metadata_json,
        created_at=document.created_at,
        updated_at=document.updated_at,
        jobs=[DocumentProcessingJobResponse.model_validate(j) for j in jobs],
    )


@router.get("/documents/{document_id}/file")
async def get_document_pdf_stream(
    document: Annotated[Document, Depends(get_document_for_user)],
):
    """Stream PDF binary for rendering in the center canvas viewer."""
    file_bytes = await storage_service.get_file_bytes(document.storage_key)
    return Response(
        content=file_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{document.filename}"',
            "Cache-Control": "private, max-age=3600",
        },
    )


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document: Annotated[Document, Depends(get_document_for_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Delete document, delete binary file, and purge vectors from ChromaDB."""
    # 1. Clean ChromaDB vectors
    vector_service.delete_document_chunks(
        workspace_id=document.workspace_id,
        user_id=current_user.id,
        document_id=document.id,
    )

    # 2. Delete file binary
    await storage_service.delete_file(document.storage_key)

    # 3. Delete from DB (cascades jobs)
    await db.delete(document)
    await db.commit()
