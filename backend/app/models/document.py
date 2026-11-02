"""Document and DocumentProcessingJob models."""

from datetime import datetime
from typing import Any, Dict, List, Optional, TYPE_CHECKING
from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import BaseModel

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.workspace import Workspace


class Document(BaseModel):
    """Uploaded research PDF document and parsing status."""

    __tablename__ = "documents"

    workspace_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    file_hash_sha256: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", index=True, nullable=False)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="documents")
    user: Mapped["User"] = relationship("User", back_populates="documents")
    processing_jobs: Mapped[List["DocumentProcessingJob"]] = relationship(
        "DocumentProcessingJob",
        back_populates="document",
        cascade="all, delete-orphan",
    )


class DocumentProcessingJob(BaseModel):
    """Background ingestion processing stage and state tracking."""

    __tablename__ = "document_processing_jobs"

    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    stage: Mapped[str] = mapped_column(String(64), nullable=False)  # EXTRACTION, CHUNKING, EMBEDDING, INDEXING
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False)  # PENDING, RUNNING, COMPLETED, FAILED
    progress_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationship
    document: Mapped["Document"] = relationship("Document", back_populates="processing_jobs")
