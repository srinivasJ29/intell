"""Multi-document comparison schemas."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ComparisonRequest(BaseModel):
    document_ids: List[str]
    dimensions: Optional[List[str]] = None  # e.g. ["Objectives", "Methodology", "Datasets", "Results"]


class ComparisonCell(BaseModel):
    summary: str
    citations: List[Dict[str, Any]] = []


class ComparisonDimension(BaseModel):
    dimension_name: str
    documents: Dict[str, ComparisonCell]  # document_id -> cell


class ComparisonResponse(BaseModel):
    workspace_id: str
    document_ids: List[str]
    document_titles: Dict[str, str]
    dimensions: List[ComparisonDimension]

