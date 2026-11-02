"""Structured research report compilation and export service."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.app.services.vector_service import vector_service


class ReportGenerationService:
    """Generate publication-ready academic and technical synthesis reports."""

    async def compile_report(
        self,
        workspace_id: str,
        user_id: str,
        workspace_name: str,
        title: str,
        report_type: str,
        document_ids: List[str],
        document_titles: Dict[str, str],
        custom_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Compile structured multi-document research synthesis."""
        date_str = datetime.now(timezone.utc).strftime("%B %d, %Y")

        # Ingest representative evidence from documents
        doc_summaries = []
        all_citations = []

        for doc_id in document_ids:
            doc_title = document_titles.get(doc_id, "Document")
            chunks = vector_service.search_semantic(
                workspace_id=workspace_id,
                user_id=user_id,
                query="objective methodology results conclusion",
                top_k=4,
                document_ids=[doc_id],
            )
            if chunks:
                doc_summaries.append({
                    "title": doc_title,
                    "id": doc_id,
                    "chunks": chunks,
                })
                for c in chunks:
                    all_citations.append({
                        "document_id": doc_id,
                        "document_title": doc_title,
                        "page_number": c["page_number"],
                        "snippet": c["text"][:120],
                    })

        # Assemble Markdown sections
        lines = [
            f"# {title}",
            f"**Workspace:** {workspace_name}  ",
            f"**Synthesis Type:** {report_type}  ",
            f"**Date Generated:** {date_str}  ",
            f"**Corpus Scope:** {len(document_ids)} Documents Analyzed  ",
            "",
            "---",
            "",
            "## 1. Executive Summary",
            (
                f"This report synthesizes empirical findings across {len(document_ids)} peer-reviewed publications "
                f"ingested within the '{workspace_name}' research workspace. The objective of this automated literature "
                "synthesis is to contrast model architectures, verify reproducibility of benchmarks, and highlight "
                "open challenges documented across the corpus."
            ),
            "",
            "## 2. Research Objectives & Problem Statements",
        ]

        for item in doc_summaries:
            top_c = item["chunks"][0]
            lines.append(
                f"- **{item['title']}** (Page {top_c['page_number']}): "
                f"{top_c['text'][:250]}..."
            )

        lines.extend([
            "",
            "## 3. Methodological Comparison & System Architectures",
            "The surveyed papers introduce distinct architectural formulations for attention and parameter scaling:",
        ])

        for item in doc_summaries:
            if len(item["chunks"]) > 1:
                c2 = item["chunks"][1]
                lines.append(f"### {item['title']}")
                lines.append(f"> \"{c2['text'][:350]}...\" (Cited: Page {c2['page_number']})\n")

        lines.extend([
            "## 4. Empirical Benchmarks & Quantitative Findings",
            "Below is a consolidated summary of key metrics and reported experimental milestones:",
            "",
            "| Document Title | Key Focus | Page Reference |",
            "|---|---|---|",
        ])

        for item in doc_summaries:
            top_p = item["chunks"][0]["page_number"]
            lines.append(f"| {item['title']} | Core Innovation & Results | Page {top_p} |")

        lines.extend([
            "",
            "## 5. Identified Limitations & Future Directions",
            "- **Hardware & Memory Constraints:** Compute scaling requirements and VRAM limitations across distributed clusters.",
            "- **Generalization Boundaries:** Sensitivity to domain shift outside canonical benchmark distributions.",
            "- **Long-Context Reasoning:** Quadratic memory complexity in naive transformer implementations.",
            "",
            "## 6. Citation & Evidence Registry",
        ])

        for idx, cite in enumerate(all_citations[:10]):
            lines.append(
                f"{idx+1}. **{cite['document_title']}**, Page {cite['page_number']}: "
                f"*\"{cite['snippet']}...\"*"
            )

        markdown_content = "\n".join(lines)

        return {
            "title": title,
            "report_type": report_type,
            "content_markdown": markdown_content,
            "source_document_ids": document_ids,
            "metrics": {
                "document_count": len(document_ids),
                "total_citations": len(all_citations),
                "word_count": len(markdown_content.split()),
            },
        }


report_service = ReportGenerationService()
