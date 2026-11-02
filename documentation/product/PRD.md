# IntelliResearch — Product Requirements Document (PRD)

**Version:** 1.0.0  
**Status:** Approved  
**Author:** Senior Product & Engineering Architecture Team  
**System Identity:** IntelliResearch — Production Multi-Document AI Research Productivity System

---

## 1. Executive Summary & Product Vision

IntelliResearch is a production-grade, desktop-class research productivity platform designed specifically for students, researchers, engineers, intelligence analysts, and technical professionals. Unlike lightweight chat-with-PDF prototypes, IntelliResearch delivers an evidence-grounded research environment that:
1. Ingests high-volume academic and technical PDF literature.
2. Extracts hierarchical document structure, pages, tables, and metadata without hallucinated facts.
3. Coordinates multi-document semantic and keyword search via hybrid RAG (Dense Embeddings + BM25) and reciprocal rank fusion.
4. Provides an interactive **Three-Panel Research Workspace** (Document Navigator, High-Fidelity PDF Viewer with targeted page navigation and evidence bounding, and Citations-First AI Research Assistant).
5. Constructs automated **Comparative Matrices** across multiple papers (comparing research objectives, methodologies, datasets, model architectures, quantitative results, limitations, and conclusions).
6. Compiles publication-ready **Structured Research Reports** exported to standard PDF and Markdown formats.
7. Strictly follows a **Monochromatic Design System** (#080808 to #FFFFFF) with zero decorative landing page fluff, engineered for intense focus, deep reading, and maximum cognitive throughput.

---

## 2. User Personas

### Persona A: Academic Researcher / Graduate Student
- **Profile:** Dr. Elena Vance, Postdoctoral Fellow in Machine Learning.
- **Goal:** Ingest 25 papers on diffusion models, trace conflicting benchmark claims, cross-verify equations, and extract empirical result tables without reading 500 pages manually.
- **Pain Points:** Prototype tools hallucinate page numbers, invent citations, or lose context across multiple long-form papers.
- **Needs:** Precise page-level citations, direct PDF jump-to-page navigation, side-by-side comparative extraction.

### Persona B: Research Analyst & Patent/Industry Engineer
- **Profile:** Marcus Chen, Principal Systems Architect evaluating emerging vector database benchmarks and distributed storage whitepapers.
- **Goal:** Compare throughput, latency numbers, and operational failure modes between 4 competitive technical whitepapers.
- **Pain Points:** Existing tools provide chat answers without verifiable mathematical or experimental backing.
- **Needs:** Multi-document synthesis, verified citations, exportable structured markdown/PDF reports for engineering executive briefings.

### Persona C: Technical Professional / Medical & Legal Analyst
- **Profile:** Sarah Jenkins, Clinical Regulatory Specialist.
- **Goal:** Review multi-center clinical trials, verify sample sizes, dosage metrics, and adverse events across medical publications.
- **Pain Points:** Any hallucination is a compliance violation; generic LLMs summarize without attributing facts to exact source text.
- **Needs:** Strict refusal when evidence is absent ("Insufficient Evidence" protocol), exact verbatim source span highlighting.

---

## 3. User Journeys

```
[Register / Login]
       │
       ▼
[Enter Dashboard] ─── (Recent Workspaces / Recent Documents / Storage & Processing Stats)
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
[Create / Open Workspace]       [Global Document Library]
       │                                 │
       ▼                                 │
[Upload Academic PDFs] ◄─────────────────┘
       │
       ▼ (PyMuPDF Extraction ➔ Page Tagging ➔ Semantic Chunking ➔ ChromaDB Vector Index)
[Three-Panel Workspace]
   ├── Left: Document Index & Metadata Summary
   ├── Center: Synchronized PDF Viewer (Page Jumps, Zoom, Search)
   └── Right: Grounded AI Assistant (Streaming, Hybrid RAG, Strict Citations)
       │
       ├─────────────────────────────────┬─────────────────────────────────┐
       ▼                                 ▼                                 ▼
[Ask Multi-Doc Query]          [Cross-Paper Comparison]          [Generate Research Report]
       │                                 │                                 │
  Inline Citations             Objective/Method/Result            Executive Summary,
  Click to jump to PDF           Matrix Across Papers             Findings & PDF/MD Export
```

### Detailed Journey 1: Workspace Ingestion & Evidence-Based Verification
1. User creates a new workspace: "Transformer Efficiency & Attention Variants".
2. User uploads 3 research papers (`attention_is_all_you_need.pdf`, `flash_attention.pdf`, `linear_attention.pdf`).
3. The background ingestion pipeline extracts text per page, validates page bounds, chunks with overlap, computes sentence-transformer embeddings, and populates ChromaDB and PostgreSQL.
4. User asks: *"How does FlashAttention optimize GPU memory compared to standard Multi-Head Attention?"*
5. RAG Engine runs query rewriting, hybrid semantic vector search + BM25 keyword matching, reranks candidates, and validates that context is sufficient.
6. The AI assistant answers with precise citations: `[Doc: flash_attention.pdf, Page 4]`.
7. User clicks citation: The center PDF viewer immediately loads `flash_attention.pdf`, scrolls directly to page 4, and highlights the relevant passage.

### Detailed Journey 2: Multi-Document Comparison Matrix
1. User navigates to the **Comparisons** tab within the workspace.
2. Selects all 3 uploaded papers.
3. System runs structured comparison extraction across 8 core dimensions:
   - Research Objectives
   - Methodologies & Architectures
   - Benchmark Datasets Used
   - Models Evaluated
   - Experimental Results & Metrics
   - Key Findings
   - Identified Limitations
   - Authors' Conclusions
4. Results are presented in an interactive matrix with citation tags for every single claim.

### Detailed Journey 3: Structured Report Generation & Export
1. User clicks **Generate Research Report**.
2. Selects target documents or complete workspace scope.
3. The LLM synthesis pipeline compiles:
   - Executive Summary
   - Consolidated Objectives & Problem Statements
   - Synthesis of Methodologies
   - Empirical Findings & Comparison Summary
   - Verifiable Evidence Index
   - Limitations and Open Challenges
   - Final Conclusions
4. User reviews the rendered markdown report preview in real-time.
5. User clicks **Export as PDF** or **Export as Markdown** for immediate offline publication.

---

## 4. Functional Requirements

### 4.1 Authentication & Security (FR-AUTH)
- **FR-AUTH-1:** Email and password registration with Argon2id password hashing.
- **FR-AUTH-2:** Secure JWT authentication with short-lived access tokens (15-30m) and rotating refresh tokens (7-30 days) stored in database sessions.
- **FR-AUTH-3:** Immediate token revocation upon logout or session termination.
- **FR-AUTH-4:** Complete workspace and document isolation: A user cannot view, search, or query another user's workspaces, documents, chunks, or reports.

### 4.2 Workspace Management (FR-WS)
- **FR-WS-1:** Users can create, list, rename, and delete workspaces.
- **FR-WS-2:** Deleting a workspace cascades deletion cleanly across associated conversations, messages, document links, vector collections, and reports.
- **FR-WS-3:** Workspaces hold dedicated conversation threads and document registries.

### 4.3 Document Storage & Ingestion (FR-DOC)
- **FR-DOC-1:** File upload support for PDF documents up to 50MB.
- **FR-DOC-2:** Content validation (magic bytes verification, PDF syntax check, sanitization of filenames).
- **FR-DOC-3:** Storage engine abstraction supporting local persistent storage and S3/MinIO compatible object stores.
- **FR-DOC-4:** PyMuPDF (fitz) text and page extraction preserving exact page numbers (1-indexed), bounding dimensions, and text normalization.
- **FR-DOC-5:** Scanned PDF detection with fallback notification and modular OCR extension hook.
- **FR-DOC-6:** Chunking strategy: Recursive character chunking respecting paragraph breaks, sentence boundaries, configurable chunk size (default: 800 tokens, 150 token overlap), embedding page metadata inside each chunk.

### 4.4 Vector Indexing & Hybrid Retrieval (FR-RET)
- **FR-RET-1:** Sentence-transformer dense embedding generation with ChromaDB persistent vector storage.
- **FR-RET-2:** ChromaDB collections scoped strictly with workspace and user metadata filtering.
- **FR-RET-3:** Hybrid retrieval combining Dense Semantic Vector search and Sparse BM25 / keyword search with Reciprocal Rank Fusion (RRF).
- **FR-RET-4:** Cross-encoder reranking of top-K candidate chunks to maximize MRR and Recall@K.
- **FR-RET-5:** Groundedness & Refusal: If candidate relevance score falls below threshold, system explicitly flags insufficient evidence rather than hallucinating answers.

### 4.5 AI Research Assistant & LangGraph Workflow (FR-AI)
- **FR-AI-1:** Multi-turn conversation management per workspace.
- **FR-AI-2:** LangGraph typed workflow with state nodes:
  - `query_analysis`: Detects intent, entities, and multi-doc requirements.
  - `query_rewrite`: Generates expanded search queries.
  - `retrieve_candidates`: Hybrid dense + keyword retrieval.
  - `rerank`: Score candidates via cross-attention/reranker.
  - `evaluate_context`: Checks sufficiency; branches to insufficient evidence if irrelevant.
  - `generate_answer`: Streams answer with structured citation markers `[cite:doc_id:page]`.
  - `verify_citations`: Confirms every citation exists in the retrieved context.
- **FR-AI-3:** Streaming responses via Server-Sent Events (SSE).
- **FR-AI-4:** Configurable LLM provider interface (OpenAI-compatible APIs including local Ollama/vLLM, Groq, OpenAI, Gemini).

### 4.6 Three-Panel Research Workspace UI (FR-UI-3P)
- **FR-UI-1:** Left Panel: Document drawer with document search, status indicators, and quick metadata inspector.
- **FR-UI-2:** Center Panel: High-performance canvas/SVG PDF viewer with page navigation, zoom in/out, fit-width, search within PDF, and direct jumping to cited page.
- **FR-UI-3:** Right Panel: Chat interface with streaming tokens, stop generation button, copy response, suggested follow-up questions, and interactive citation badges.

### 4.7 Multi-Document Comparison Matrix (FR-COMP)
- **FR-COMP-1:** User selects 2 to 5 documents within a workspace.
- **FR-COMP-2:** System extracts or synthesizes side-by-side comparative criteria across: Objectives, Methodologies, Datasets, Models, Results, Findings, Limitations, Conclusions.
- **FR-COMP-3:** Citations linked directly to source paper pages for each comparative cell.
- **FR-COMP-4:** Export comparison matrix to CSV, Markdown, or PDF.

### 4.8 Reports & Analytics (FR-REP)
- **FR-REP-1:** Automated generation of comprehensive research reports.
- **FR-REP-2:** Markdown live preview and single-click PDF export.
- **FR-REP-3:** Analytics dashboard: Genuine counts of indexed papers, pages parsed, total chunks, queries asked, average retrieval latency, and workspace distribution.

---

## 5. Non-Functional Requirements

### 5.1 Performance & Latency (NFR-PERF)
- **NFR-PERF-1:** Document ingestion throughput: A 20-page research paper must be extracted, chunked, and embedded within < 10 seconds.
- **NFR-PERF-2:** Retrieval latency: Hybrid retrieval + reranking over 10,000 chunks completed in < 400ms.
- **NFR-PERF-3:** Time-to-first-token (TTFT) for AI responses < 1.2s on streaming endpoints.

### 5.2 Reliability & Data Integrity (NFR-REL)
- **NFR-REL-1:** Database migrations managed via Alembic; zero manual schema hacking.
- **NFR-REL-2:** Background tasks handle graceful retries with exponential backoff on network failures.
- **NFR-REL-3:** File deletions guarantee vector cleanup: When a PDF is deleted, its file is removed from storage and all corresponding chunks are pruned from ChromaDB.

### 5.3 Security & Privacy (NFR-SEC)
- **NFR-SEC-1:** Passwords salted with unique salt and hashed using Argon2id.
- **NFR-SEC-2:** Strict multi-tenant isolation: All queries enforce `WHERE user_id = :current_user_id`.
- **NFR-SEC-3:** File upload sanitization: Executable headers, polyglot PDF exploits, and path traversal strings (`../`) strictly rejected.
- **NFR-SEC-4:** Prompt injection defense: User documents treated as untrusted data; separation of system instructions and user evidence.

### 5.4 Visual & UX Standards (NFR-UX)
- **NFR-UX-1:** Strict monochromatic design palette:
  - White: `#FFFFFF`
  - Off-white: `#FAFAFA`
  - Light grey: `#F1F1F1`
  - Border grey: `#E5E5E5`
  - Medium grey: `#A3A3A3`
  - Dark grey: `#404040`
  - Black: `#111111`
  - Deep black: `#080808`
- **NFR-UX-2:** Typography hierarchy:
  - Headings: `Space Grotesk`
  - Interface text: `Inter`
  - Code/technical metadata: `JetBrains Mono`
- **NFR-UX-3:** No marketing landing pages. On visit, users land on the app shell (login if unauthenticated, dashboard if authenticated).

---

## 6. Acceptance Criteria (Given-When-Then Matrix)

### AC-01: Document Ingestion and Chunking
- **Given** an authenticated user with an active workspace,
- **When** the user uploads a valid 15-page academic PDF,
- **Then** the file is validated, stored, parsed into 15 distinct pages, split into overlapping text chunks with accurate `page_number` metadata, vector-indexed in ChromaDB, and marked as `STATUS_READY`.

### AC-02: Grounded Hybrid Search and Citation
- **Given** an indexed workspace with multiple research papers,
- **When** the user asks *"What benchmark score did Model X achieve on ImageNet?"*,
- **Then** the RAG engine retrieves candidate chunks from both semantic and keyword indices, reranks them, constructs a prompt with strict citation syntax, and generates an answer referencing `[Paper A, Page 12]` where the score is verified.
- **And** if no relevant benchmark score is mentioned in any document, the system explicitly responds that the documents do not provide this information.

### AC-03: Three-Panel Citation Navigation
- **Given** a generated AI response containing citation badge `[AttentionIsAllYouNeed.pdf, Page 3]`,
- **When** the user clicks the citation badge in the right-hand panel,
- **Then** the center PDF viewer displays `AttentionIsAllYouNeed.pdf` and navigates smoothly to Page 3.

### AC-04: Multi-Document Comparison Matrix
- **Given** at least two selected papers in a workspace,
- **When** the user triggers "Compare Papers",
- **Then** an 8-column or 8-category comparison table is constructed, populating objectives, methods, datasets, results, and limitations, with citations attached to each cell.

---

## 7. Sign-Off & Phase 01 Verification
- **Product Architecture Review:** Complete and approved.
- **Acceptance Criteria Definition:** Completed.
- **Design System Constraint Alignment:** Verified monochromatic compliance.
