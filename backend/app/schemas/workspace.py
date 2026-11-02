"""Workspace request and response schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color_tag: str = Field("#111111", max_length=32)


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    color_tag: Optional[str] = Field(None, max_length=32)


class WorkspaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    color_tag: str
    document_count: Optional[int] = 0
    conversation_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

