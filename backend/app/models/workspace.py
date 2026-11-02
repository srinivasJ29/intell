"""Workspace model for grouping documents, research conversations, and reports."""

from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import BaseModel

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.document import Document
    from backend.app.models.conversation import Conversation
    from backend.app.models.report import ResearchReport


class Workspace(BaseModel):
    """Research Workspace containing scoped documents, chats, and reports."""

    __tablename__ = "workspaces"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color_tag: Mapped[str] = mapped_column(String(32), default="#111111", nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="workspaces")
    documents: Mapped[List["Document"]] = relationship(
        "Document",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )
    conversations: Mapped[List["Conversation"]] = relationship(
        "Conversation",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )
    reports: Mapped[List["ResearchReport"]] = relationship(
        "ResearchReport",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )
