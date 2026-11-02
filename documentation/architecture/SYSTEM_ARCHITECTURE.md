# IntelliResearch — System Architecture & Technical Design Document

**Document Version:** 1.0.0  
**Status:** Approved Architectural Blueprint  
**System Type:** Modular Monolith with Asynchronous Background Ingestion & Hybrid RAG

---

## 1. System Overview & Architecture Paradigm

IntelliResearch is designed as a high-performance **Modular Monolith**. This paradigm provides:
1. Low operational overhead and single-process cohesion for developer ergonomics and deployment simplicity.
2. Clear internal domain boundaries (Authentication, Workspaces, Documents & Storage, Vector Engine, RAG & LLM Orchestration, Reports & Analytics).
3. Asynchronous decoupled background workers for CPU-intensive PDF parsing, tokenization, sentence-embedding computation, and report compilation.
4. Clean adapter interfaces for databases (SQLAlchemy 2.0 async supporting PostgreSQL in production and SQLite in testing), object storage (S3/MinIO and local filesystem storage), and vector stores (ChromaDB persistent collections).

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Frontend)"]
        UI["React 18 + TypeScript SPA\n(Monochrome Design System)"]
        Router["React Router v6"]
        QueryState["TanStack Query + Zustand"]
        PDFCanvas["High-Fidelity PDF Viewer Canvas"]
    end

    subgraph GatewayAPI ["Backend Modular Monolith (FastAPI)"]
        FastAPIApp["FastAPI Application Core (/api/v1)"]
        AuthMiddleware["JWT & Argon2 Security Context"]
        RateLimiter["Rate Limiting Middleware"]
        
        subgraph Domains ["Domain Modules"]
            AuthModule["auth/ (User, Sessions, Tokens)"]
            WorkspaceModule["workspaces/ (Workspaces, Members)"]
            DocModule["documents/ (Upload, Metadata, Parsing)"]
            RAGModule["rag/ (Hybrid Search, LangGraph, LLM)"]
            CompareModule["comparisons/ (Multi-Doc Matrix)"]
            ReportModule["reports/ (Synthesis, Markdown/PDF)"]
            AnalyticsModule["analytics/ (Metrics & Audits)"]
        end
    end

    subgraph DataStorage ["Storage & Data Engines"]
        PostgresDB[("PostgreSQL 16 Relational DB\n(Users, Workspaces, Docs, Chats)")]
        ChromaStore[("ChromaDB Vector Store\n(Persistent Chunks & Dense Embeddings)")]
        RedisQueue[("Redis 7 / Worker Broker\n(Ingestion Queue & Rate Limits)")]
        BlobStore[("Object Store (MinIO / S3 / Local)\n(Original PDFs, Exported Reports)")]
    end

    subgraph BackgroundWorker ["Asynchronous Processing Engine"]
        Worker["Durable Ingestion & Report Worker"]
        PyMuPDF["PyMuPDF (fitz) Extraction"]
        Embedder["SentenceTransformers / Embedding Pipeline"]
    end

    UI --> Router
    Router --> QueryState
    QueryState -->|REST & SSE Streams| FastAPIApp
    PDFCanvas -->|Stream PDF Stream| FastAPIApp

    FastAPIApp --> AuthMiddleware
    AuthMiddleware --> RateLimiter
    RateLimiter --> Domains

    Domains --> PostgresDB
    Domains --> ChromaStore
    Domains --> BlobStore
    DocModule -->|Dispatch Ingestion Job| RedisQueue
    ReportModule -->|Dispatch Heavy Report| RedisQueue

    RedisQueue --> Worker
    Worker --> PyMuPDF
    Worker --> Embedder
    Worker -->|Index Chunks| ChromaStore
    Worker -->|Update Status| PostgresDB
```

---

## 2. Database Relationship Diagram (ERD)

The relational schema is normalized, indexed for multi-tenant query performance, and maintains relational integrity via foreign key cascades.

```mermaid
erDiagram
    User ||--o{ RefreshTokenSession : "has sessions"
    User ||--o{ Workspace : "owns"
    User ||--o{ Document : "uploads"
    User ||--o{ Conversation : "creates"
    User ||--o{ ResearchReport : "generates"

    Workspace ||--o{ Document : "contains"
    Workspace ||--o{ Conversation : "contains"
    Workspace ||--o{ ResearchReport : "contains"

    Document ||--o{ DocumentProcessingJob : "has jobs"
    
    Conversation ||--o{ Message : "contains"

    User {
        uuid id PK
        string email UK
        string hashed_password
        string full_name
        boolean is_active
        boolean is_superuser
        timestamp created_at
        timestamp updated_at
    }

    RefreshTokenSession {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        string user_agent
        string client_ip
        boolean is_revoked
        timestamp expires_at
        timestamp created_at
    }

    Workspace {
        uuid id PK
        uuid user_id FK
        string name
        string description
        string color_tag
        timestamp created_at
        timestamp updated_at
    }

    Document {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        string title
        string filename
        string storage_key
        string file_hash_sha256
        int file_size_bytes
        int page_count
        string status
        jsonb metadata_json
        timestamp created_at
        timestamp updated_at
    }

    DocumentProcessingJob {
        uuid id PK
        uuid document_id FK
        string stage
        string status
        float progress_percent
        string error_message
        timestamp started_at
        timestamp completed_at
    }

    Conversation {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        string title
        timestamp created_at
        timestamp updated_at
    }

    Message {
        uuid id PK
        uuid conversation_id FK
        string role
        text content
        jsonb citations_json
        jsonb metadata_json
        int token_count
        timestamp created_at
    }

    ResearchReport {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        string title
        string report_type
        text content_markdown
        string pdf_storage_key
        jsonb source_document_ids
        jsonb metrics_json
        timestamp created_at
        timestamp updated_at
    }
```

---

## 3. Document Ingestion Pipeline Architecture

```mermaid
flowchart TD
    A["PDF File Upload\n(Client UI)"] --> B["Content Validation & Magic Bytes Check\n(Verify PDF/A & Max 50MB)"]
    B -->|Valid| C["Store Original PDF\n(Blob Storage / MinIO with SHA256 Key)"]
    B -->|Invalid| B_Err["Reject Upload (400 Bad Request)"]
    C --> D["Create Document Record\n(Status: PENDING)"]
    D --> E["Dispatch Asynchronous Ingestion Job\n(Background Task)"]
    
    E --> F["PyMuPDF (fitz) Document Extraction"]
    F --> G{"Is Document Scanned\n(Zero Native Text)?"}
    G -->|Yes| G_OCR["Flag OCR Notification / Fallback Engine"]
    G -->|No| H["Normalize Text & Extract Per-Page Spans\n(Record 1-Indexed Page, Paragraph Offsets)"]
    G_OCR --> H
    
    H --> I["Hierarchical Semantic Chunking\n(Recursive Character Splitter: 800 tokens, 150 overlap)"]
    I --> J["Attach Precise Metadata to Chunks\n(document_id, workspace_id, user_id, page_number, chunk_index)"]
    
    J --> K["Compute Dense Vector Embeddings\n(SentenceTransformers all-MiniLM-L6-v2 / BAAI BGE)"]
    K --> L["Upsert to ChromaDB Persistent Collection\n(Workspace Collection with Metadata Filters)"]
    L --> M["Update PostgreSQL Document\n(page_count, status: COMPLETED, updated_at)"]
    M --> N["Notify Client via Polling / WebSocket / SSE"]
```

---

## 4. Advanced Hybrid RAG Engine Workflow

```mermaid
flowchart TD
    Q["User Research Query\n(e.g., 'Compare attention mechanisms')"] --> QA["LangGraph: Query Analysis & Routing"]
    QA --> QR["Query Rewriting & Keyword Expansion\n(Generates semantic vector query & BM25 sparse keywords)"]
    
    subgraph HybridSearch ["Dual-Index Hybrid Retrieval"]
        QR -->|Dense Vector Query| VS["ChromaDB Vector Retrieval\n(Cosine Similarity on Dense Embeddings)"]
        QR -->|BM25 Keywords| KS["Sparse Keyword Retrieval\n(BM25 Inverted Index / Token Match)"]
    end
    
    VS -->|Top 25 Dense Candidates| RRF["Reciprocal Rank Fusion (RRF)\nCombine Ranks: 1 / (60 + rank)"]
    KS -->|Top 25 Sparse Candidates| RRF
    
    RRF -->|Top 20 Unified Chunks| Rerank["Cross-Encoder / Contextual Reranker\nRe-score chunks against original query"]
    Rerank -->|Top 5 High-Scoring Chunks| CE["Context Evaluation & Groundedness Guard"]
    
    CE -->|Relevance Score < Threshold| Insuff["Insufficient Evidence Handler\nReturn exact notification of missing data"]
    CE -->|Relevance Score >= Threshold| PromptCons["Context Construction & Citation Mapping\nFormat context with [doc_id, page, chunk_id]"]
    
    PromptCons --> LLM["LLM Generation\n(Stream response with inline citation tags)"]
    LLM --> CitVerify["Citation Verification Validator\nEnsure every citation corresponds to retrieved chunks"]
    CitVerify --> FinalResp["SSE Token Stream to Client UI\n(Center viewer linked to cited pages)"]
```

---

## 5. LangGraph Orchestration State Machine

```mermaid
stateDiagram-v2
    [*] --> AnalyzeQuery
    
    AnalyzeQuery --> RewriteQuery: Multi-doc or complex inquiry
    AnalyzeQuery --> RetrieveCandidates: Direct inquiry
    
    RewriteQuery --> RetrieveCandidates
    
    RetrieveCandidates --> RerankPassages
    
    RerankPassages --> EvaluateContext
    
    EvaluateContext --> GenerateAnswer: Context sufficient
    EvaluateContext --> InsufficientEvidence: Relevant evidence missing
    
    GenerateAnswer --> VerifyCitations
    
    VerifyCitations --> FinalResponse: All citations verified
    VerifyCitations --> RegenerateWithGrounding: Hallucinated citation detected (Max 1 retry)
    
    RegenerateWithGrounding --> VerifyCitations
    
    InsufficientEvidence --> FinalResponse
    FinalResponse --> [*]
```

---

## 6. Security Architecture & Multi-Tenant Isolation

1. **Authentication:**
   - Password hashes stored using **Argon2id** (memory cost 65536 KB, time cost 3 iterations, parallelism 4).
   - JWT Access tokens: HS256 / RS256 with 15-minute expiration containing `sub: user_id`, `exp`, `jti`.
   - Refresh tokens: Stored cryptographically hashed in `RefreshTokenSession` table with 14-day expiration. Automatic rotation: using a refresh token issues a new pair and revokes the old token.

2. **Tenant Isolation:**
   - Database layer: Every query joins or filters by `user_id = current_user.id`. No user can access or manipulate workspaces, documents, or reports belonging to another user.
   - Vector database layer: ChromaDB queries strictly inject `where={"workspace_id": workspace_id, "user_id": user_id}`.

3. **Untrusted Document Defense:**
   - PDF uploads are subjected to binary magic-number validation (`%PDF-1.x`).
   - Text extracted from PDFs is treated as untrusted data and strictly isolated from system prompts via delimited context boundaries:
     ```
     <SOURCE_EVIDENCE doc_id="..." page="...">
     ... extracted document content ...
     </SOURCE_EVIDENCE>
     ```
   - System prompts forbid executing instructions found within document evidence.

4. **API Security:**
   - CORS restricted to configured frontend origins.
   - Per-IP and per-user rate limiting on compute-heavy LLM and ingestion endpoints.

---

## 7. Technical Decision Records (TDR)

| Decision | Selected Choice | Rationale | Alternatives Considered |
|---|---|---|---|
| **Architecture** | Modular Monolith (FastAPI) | High development speed, unified typing, single deployment target, zero microservice network latency. | Microservices (rejected: unnecessary complexity for current scale). |
| **Relational DB** | PostgreSQL 16 + SQLAlchemy 2.0 (Async) | Industry standard, robust ACID transactions, JSONB support for metadata, Alembic migrations. Works with SQLite for lightweight local unit tests. | MySQL, MongoDB. |
| **Vector DB** | ChromaDB (Persistent Client) | Python-native, zero-external-dependency local mode, metadata filtering, native cosine similarity. | Pinecone (cloud-locked), Milvus (heavyweight). |
| **PDF Extraction** | PyMuPDF (fitz) | 10x-50x faster than pypdf/pdfminer, highly accurate bounding boxes, robust handling of complex academic layouts. | pdfplumber, pypdf. |
| **Retrieval Strategy** | Hybrid (Dense Vector + BM25) + RRF | Pure dense search misses exact scientific abbreviations and dataset names; pure BM25 misses semantic paraphrasing. RRF unites both. | Dense only, Sparse only. |
| **Frontend Stack** | Vite + React + TypeScript + Tailwind | Extreme speed, strict type safety, predictable state, custom monochrome design token system. | Next.js (unnecessary SSR overhead for desktop research app). |
| **Design Language** | Monochromatic (`#080808` to `#FFFFFF`) | High contrast, minimal visual fatigue during long research sessions, elegant and distraction-free. | Generic colorful SaaS templates. |

---

## 8. Sign-Off & Verification
- All architectural subsystems, entity diagrams, pipelines, and security controls are defined and documented.
- Ready for Phase 03: Project Initialization.

