"""Document and Processing Job request/response schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class DocumentProcessingJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    stage: str
    status: str
    progress_percent: float
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    user_id: str
    title: str
    filename: str
    file_size_bytes: int
    page_count: int
    status: str
    metadata_json: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime


class DocumentDetailResponse(DocumentResponse):
    jobs: List[DocumentProcessingJobResponse] = []


class ChunkMetadata(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    page_number: int
    chunk_index: int
    snippet: str
    score: Optional[float] = None
