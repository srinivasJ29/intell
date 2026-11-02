"""User entity model."""

from typing import List, TYPE_CHECKING
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import BaseModel

if TYPE_CHECKING:
    from backend.app.models.session import RefreshTokenSession
    from backend.app.models.workspace import Workspace
    from backend.app.models.document import Document
    from backend.app.models.conversation import Conversation
    from backend.app.models.report import ResearchReport


class User(BaseModel):
    """User account entity."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    sessions: Mapped[List["RefreshTokenSession"]] = relationship(
        "RefreshTokenSession", back_populates="user", cascade="all, delete-orphan"
    )
    workspaces: Mapped[List["Workspace"]] = relationship(
        "Workspace", back_populates="user", cascade="all, delete-orphan"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="user", cascade="all, delete-orphan"
    )
    conversations: Mapped[List["Conversation"]] = relationship(
        "Conversation", back_populates="user", cascade="all, delete-orphan"
    )
    reports: Mapped[List["ResearchReport"]] = relationship(
        "ResearchReport", back_populates="user", cascade="all, delete-orphan"
    )
