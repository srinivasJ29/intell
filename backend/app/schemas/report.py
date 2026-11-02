"""Research Report request and response schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ReportGenerateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    report_type: str = Field("COMPREHENSIVE", max_length=64)  # COMPREHENSIVE, COMPARATIVE, SUMMARY
    document_ids: Optional[List[str]] = None
    custom_instructions: Optional[str] = None


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    user_id: str
    title: str
    report_type: str
    content_markdown: str
    pdf_storage_key: Optional[str] = None
    source_document_ids: List[str] = []
    metrics_json: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

