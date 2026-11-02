"""High-performance PyMuPDF extraction, scanned PDF detection, and page-aware chunking."""

import re
import fitz  # PyMuPDF
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
from backend.app.core.exceptions import BadRequestException


@dataclass
class ExtractedPage:
    page_number: int  # 1-indexed
    text: str
    char_count: int
    is_scanned: bool


@dataclass
class DocumentChunk:
    chunk_id: str
    document_id: str
    workspace_id: str
    user_id: str
    page_number: int
    chunk_index: int
    text: str
    metadata: Dict[str, Any]


class PDFProcessingService:
    """PDF document parsing, text extraction, scanned page detection, and chunking."""

    def __init__(
        self,
        chunk_size: int = 800,
        chunk_overlap: int = 150,
        min_scanned_char_threshold: int = 30,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_scanned_char_threshold = min_scanned_char_threshold

    def extract_pages(self, pdf_bytes: bytes) -> Tuple[List[ExtractedPage], Dict[str, Any]]:
        """Extract text per page using PyMuPDF and detect scanned status."""
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            raise BadRequestException(f"Failed to parse PDF binary: {str(e)}")

        if len(doc) == 0:
            raise BadRequestException("PDF document is empty (0 pages).")

        pages: List[ExtractedPage] = []
        total_text_length = 0

        pdf_meta = {
            "title": doc.metadata.get("title") or "",
            "author": doc.metadata.get("author") or "",
            "subject": doc.metadata.get("subject") or "",
            "keywords": doc.metadata.get("keywords") or "",
            "creator": doc.metadata.get("creator") or "",
            "page_count": len(doc),
        }

        for i, page in enumerate(doc):
            page_num = i + 1  # 1-indexed
            raw_text = page.get_text("text") or ""
            # Text normalization
            cleaned_text = self._normalize_text(raw_text)
            char_count = len(cleaned_text)
            total_text_length += char_count

            is_scanned = char_count < self.min_scanned_char_threshold
            pages.append(
                ExtractedPage(
                    page_number=page_num,
                    text=cleaned_text,
                    char_count=char_count,
                    is_scanned=is_scanned,
                )
            )

        doc.close()
        pdf_meta["is_mostly_scanned"] = (
            total_text_length < (len(pages) * self.min_scanned_char_threshold)
        )
        return pages, pdf_meta

    def _normalize_text(self, text: str) -> str:
        """Clean hyphenated line breaks, superfluous spaces, and control characters."""
        if not text:
            return ""
        # Remove hyphenated linebreaks: e.g. "re- \nsearch" -> "research"
        text = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)
        # Normalize excessive whitespace
        text = re.sub(r"[ \t]+", " ", text)
        # Remove multiple newlines beyond double newline
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def ocr_extension_hook(self, page_image_bytes: bytes) -> str:
        """Modular extension hook point for OCR (e.g. Tesseract or EasyOCR)."""
        # Production extension hook for scanned PDFs
        return ""

    def chunk_document(
        self,
        document_id: str,
        workspace_id: str,
        user_id: str,
        document_title: str,
        pages: List[ExtractedPage],
    ) -> List[DocumentChunk]:
        """Split document into overlapping chunks preserving page boundaries and metadata."""
        chunks: List[DocumentChunk] = []
        global_chunk_idx = 0

        for page in pages:
            if not page.text.strip():
                continue

            page_chunks = self._chunk_text(page.text)
            for chunk_text in page_chunks:
                chunk_id = f"{document_id}_p{page.page_number}_c{global_chunk_idx}"
                metadata = {
                    "document_id": document_id,
                    "document_title": document_title,
                    "workspace_id": workspace_id,
                    "user_id": user_id,
                    "page_number": page.page_number,
                    "chunk_index": global_chunk_idx,
                }
                chunks.append(
                    DocumentChunk(
                        chunk_id=chunk_id,
                        document_id=document_id,
                        workspace_id=workspace_id,
                        user_id=user_id,
                        page_number=page.page_number,
                        chunk_index=global_chunk_idx,
                        text=chunk_text,
                        metadata=metadata,
                    )
                )
                global_chunk_idx += 1

        return chunks

    def _chunk_text(self, text: str) -> List[str]:
        """Recursive character chunking strategy."""
        if len(text) <= self.chunk_size:
            return [text]

        # Split priority: double-newline, single newline, sentences, words
        paragraphs = text.split("\n\n")
        chunks: List[str] = []
        current_chunk = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current_chunk) + len(para) + 2 <= self.chunk_size:
                current_chunk = f"{current_chunk}\n\n{para}".strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                if len(para) > self.chunk_size:
                    # Break long paragraphs by sentences
                    sub_chunks = self._split_by_sentences(para)
                    chunks.extend(sub_chunks)
                    current_chunk = ""
                else:
                    current_chunk = para

        if current_chunk:
            chunks.append(current_chunk)

        # Apply overlap where possible
        return self._apply_overlap(chunks)

    def _split_by_sentences(self, text: str) -> List[str]:
        """Split oversized text into sentence-sized blocks."""
        sentences = re.split(r"(?<=[.!?])\s+", text)
        results = []
        buf = ""
        for s in sentences:
            if len(buf) + len(s) + 1 <= self.chunk_size:
                buf = f"{buf} {s}".strip()
            else:
                if buf:
                    results.append(buf)
                buf = s
        if buf:
            results.append(buf)
        return results

    def _apply_overlap(self, chunks: List[str]) -> List[str]:
        """Ensure chunk context continuity with overlap."""
        if len(chunks) <= 1 or self.chunk_overlap <= 0:
            return chunks

        overlapped = [chunks[0]]
        for i in range(1, len(chunks)):
            prev = chunks[i - 1]
            curr = chunks[i]
            overlap_prefix = prev[-self.chunk_overlap :] if len(prev) > self.chunk_overlap else prev
            overlapped.append(f"...{overlap_prefix} {curr}")
        return overlapped


pdf_service = PDFProcessingService()
