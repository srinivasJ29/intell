"""Analytics schema for real system metrics."""

from typing import Any, Dict, List
from pydantic import BaseModel


class WorkspaceMetric(BaseModel):
    workspace_id: str
    workspace_name: str
    document_count: int
    conversation_count: int
    report_count: int


class AnalyticsSummaryResponse(BaseModel):
    total_workspaces: int
    total_documents: int
    total_pages_indexed: int
    total_conversations: int
    total_messages: int
    total_reports_generated: int
    storage_used_bytes: int
    workspaces_breakdown: List[WorkspaceMetric]
    system_status: Dict[str, Any]

