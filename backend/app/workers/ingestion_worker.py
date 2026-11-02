"""Background document processing and vector indexing worker."""

import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from backend.app.core.database import async_session_factory
from backend.app.models.document import Document, DocumentProcessingJob
from backend.app.services.pdf_service import pdf_service
from backend.app.services.storage_service import storage_service
from backend.app.services.vector_service import vector_service

logger = logging.getLogger(__name__)


async def process_document_ingestion(document_id: str) -> bool:
    """Full background ingestion pipeline: Extraction -> Chunking -> Embedding -> Chroma Indexing."""
    logger.info(f"Starting ingestion pipeline for document: {document_id}")

    async with async_session_factory() as db:
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            logger.error(f"Document {document_id} not found for ingestion")
            return False

        doc.status = "PROCESSING"
        job = DocumentProcessingJob(
            document_id=doc.id,
            stage="EXTRACTION",
            status="RUNNING",
            progress_percent=10.0,
            started_at=datetime.now(timezone.utc),
        )
        db.add(job)
        await db.commit()

        try:
            # 1. Fetch PDF bytes from storage
            pdf_bytes = await storage_service.get_file_bytes(doc.storage_key)

            # 2. Extract Pages
            job.stage = "EXTRACTION"
            job.progress_percent = 25.0
            await db.commit()

            pages, pdf_meta = await asyncio.to_thread(pdf_service.extract_pages, pdf_bytes)
            doc.page_count = len(pages)
            doc.metadata_json = {**doc.metadata_json, **pdf_meta}

            # 3. Chunking
            job.stage = "CHUNKING"
            job.progress_percent = 50.0
            await db.commit()

            chunks = await asyncio.to_thread(
                pdf_service.chunk_document,
                document_id=doc.id,
                workspace_id=doc.workspace_id,
                user_id=doc.user_id,
                document_title=doc.title,
                pages=pages,
            )

            # 4. Dense Embeddings & Vector Indexing
            job.stage = "EMBEDDING_AND_INDEXING"
            job.progress_percent = 75.0
            await db.commit()

            indexed_count = await asyncio.to_thread(vector_service.index_chunks, chunks)

            # 5. Success
            doc.status = "READY"
            job.stage = "COMPLETED"
            job.status = "COMPLETED"
            job.progress_percent = 100.0
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()

            logger.info(f"Successfully processed document {doc.id} ({indexed_count} chunks indexed)")
            return True

        except Exception as e:
            logger.exception(f"Document processing failed for {doc.id}: {str(e)}")
            doc.status = "FAILED"
            job.status = "FAILED"
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()
            return False


def dispatch_ingestion_task(document_id: str) -> None:
    """Non-blocking background task dispatcher."""
    asyncio.create_task(process_document_ingestion(document_id))

