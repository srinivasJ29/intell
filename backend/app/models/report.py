"""ResearchReport entity model."""

from typing import Any, Dict, List, Optional, TYPE_CHECKING
from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import BaseModel

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.workspace import Workspace


class ResearchReport(BaseModel):
    """Generated research report synthesizing evidence across documents."""

    __tablename__ = "research_reports"

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
    report_type: Mapped[str] = mapped_column(String(64), default="COMPREHENSIVE", nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    pdf_storage_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    source_document_ids: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    metrics_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="reports")
    user: Mapped["User"] = relationship("User", back_populates="reports")

