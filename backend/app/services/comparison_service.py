"""Multi-document comparison matrix extraction across academic research dimensions."""

from typing import Any, Dict, List, Optional
from backend.app.schemas.comparison import (
    ComparisonCell,
    ComparisonDimension,
    ComparisonResponse,
)
from backend.app.services.rag_service import rag_engine
from backend.app.services.vector_service import vector_service

STANDARD_DIMENSIONS = [
    ("Research Objectives", "What is the primary problem formulation, objective, or hypothesis?"),
    ("Methodologies & Architectures", "What model architecture, mathematical framework, or methodology was implemented?"),
    ("Datasets & Benchmarks", "What datasets, benchmarks, or training corpora were used?"),
    ("Models Evaluated", "What baseline models, architectures, or comparative systems were evaluated?"),
    ("Experimental Results & Metrics", "What were the primary quantitative metrics, accuracy, latency, or throughput numbers achieved?"),
    ("Key Findings", "What are the core discoveries, qualitative breakthroughs, or main empirical findings?"),
    ("Identified Limitations", "What limitations, weaknesses, or failure cases did the authors note?"),
    ("Conclusions", "What is the authors' final summary, takeaway, or proposed future research?"),
]


class PaperComparisonService:
    """Extract and synthesize multi-paper comparative matrices."""

    async def compare_documents(
        self,
        workspace_id: str,
        user_id: str,
        document_ids: List[str],
        document_titles: Dict[str, str],
        selected_dimensions: Optional[List[str]] = None,
    ) -> ComparisonResponse:
        dimensions_to_run = STANDARD_DIMENSIONS
        if selected_dimensions:
            dimensions_to_run = [d for d in STANDARD_DIMENSIONS if d[0] in selected_dimensions]

        comparison_dimensions: List[ComparisonDimension] = []

        for dim_name, dim_query in dimensions_to_run:
            doc_cells: Dict[str, ComparisonCell] = {}

            for doc_id in document_ids:
                doc_title = document_titles.get(doc_id, "Document")
                # Retrieve top chunks for this specific document and dimension query
                chunks = vector_service.search_semantic(
                    workspace_id=workspace_id,
                    user_id=user_id,
                    query=dim_query,
                    top_k=5,
                    document_ids=[doc_id],
                )

                if chunks:
                    top_chunk = chunks[0]
                    summary_text = (
                        f"{top_chunk['text'][:280]}..."
                        if len(top_chunk["text"]) > 280
                        else top_chunk["text"]
                    )
                    citations = [
                        {
                            "document_id": doc_id,
                            "document_title": doc_title,
                            "page_number": top_chunk["page_number"],
                            "snippet": top_chunk["text"][:150],
                        }
                    ]
                else:
                    summary_text = "No explicit evidence identified in document."
                    citations = []

                doc_cells[doc_id] = ComparisonCell(summary=summary_text, citations=citations)

            comparison_dimensions.append(
                ComparisonDimension(
                    dimension_name=dim_name,
                    documents=doc_cells,
                )
            )

        return ComparisonResponse(
            workspace_id=workspace_id,
            document_ids=document_ids,
            document_titles=document_titles,
            dimensions=comparison_dimensions,
        )


comparison_service = PaperComparisonService()

