"""Chat and Citation request/response schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CitationItem(BaseModel):
    document_id: str
    document_title: str
    page_number: int
    chunk_id: Optional[str] = None
    snippet: str
    relevance_score: Optional[float] = None


class ChatQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    document_ids: Optional[List[str]] = None  # Filter to specific docs if specified
    stream: bool = True


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: str
    content: str
    citations_json: List[Dict[str, Any]] = []
    metadata_json: Dict[str, Any] = {}
    token_count: int
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    user_id: str
    title: str
    message_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime


class ConversationDetailResponse(ConversationResponse):
    messages: List[MessageResponse] = []

