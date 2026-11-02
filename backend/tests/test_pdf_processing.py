"""PDF extraction, normalization, and page-aware chunking tests."""

import fitz
import pytest
from backend.app.services.pdf_service import PDFProcessingService


def generate_synthetic_research_pdf(page_texts: list[str]) -> bytes:
    """Generate in-memory valid PDF binary with PyMuPDF."""
    doc = fitz.open()
    for text in page_texts:
        page = doc.new_page()
        page.insert_text((50, 72), text, fontsize=11)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_pdf_extraction_and_scanned_detection():
    service = PDFProcessingService(min_scanned_char_threshold=20)

    # Page 1: normal text. Page 2: empty (scanned simulation).
    p1_text = (
        "We propose FlashAttention, an IO-aware exact attention algorithm that uses tiling to reduce "
        "the number of memory reads/writes between GPU high bandwidth memory (HBM) and GPU on-chip SRAM."
    )
    p2_text = "short"  # below threshold

    pdf_bytes = generate_synthetic_research_pdf([p1_text, p2_text])

    pages, meta = service.extract_pages(pdf_bytes)
    assert len(pages) == 2
    assert pages[0].page_number == 1
    assert "FlashAttention" in pages[0].text
    assert pages[0].is_scanned is False

    assert pages[1].page_number == 2
    assert pages[1].is_scanned is True
    assert meta["page_count"] == 2


def test_page_aware_chunking_with_metadata():
    service = PDFProcessingService(chunk_size=100, chunk_overlap=20)
    p1 = "Paragraph 1 describing the mathematical foundation of attention. " * 3
    p2 = "Paragraph 2 detailing empirical speedups on A100 GPUs. " * 3

    pdf_bytes = generate_synthetic_research_pdf([p1, p2])
    pages, _ = service.extract_pages(pdf_bytes)

    chunks = service.chunk_document(
        document_id="doc_123",
        workspace_id="ws_456",
        user_id="user_789",
        document_title="FlashAttention: Fast and Memory-Efficient Exact Attention",
        pages=pages,
    )

    assert len(chunks) > 2
    # Verify metadata attachment and 1-indexed page preserving
    for chunk in chunks:
        assert chunk.document_id == "doc_123"
        assert chunk.workspace_id == "ws_456"
        assert chunk.user_id == "user_789"
        assert chunk.page_number in (1, 2)
        assert chunk.metadata["page_number"] in (1, 2)

