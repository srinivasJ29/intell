# IntelliResearch

**IntelliResearch** is a production-grade, desktop-class research productivity platform designed for students, researchers, engineers, intelligence analysts, and technical professionals. It provides multi-document semantic and keyword search via hybrid RAG (Dense Embeddings + BM25), reciprocal rank fusion, an interactive three-panel research workspace with bi-directional citation navigation, multi-document comparison matrices, and automated structured report synthesis.

---

## Key Features

- **Strict Monochromatic Aesthetic:** Custom monochrome design system (`#080808` to `#FFFFFF`) prioritizing visual ergonomics, readability, and long-session focus.
- **Three-Panel Research Workspace:**
  - *Left:* Workspace Document Drawer, upload status, and metadata.
  - *Center:* High-performance PDF Viewer with page navigation, zoom, and direct jump-to-cited-page.
  - *Right:* Evidence-grounded AI Assistant with streaming tokens and verifiable inline citation pills.
- **Advanced Hybrid RAG:**
  - Dual retrieval: Dense vector search (ChromaDB + SentenceTransformers) + Sparse keyword search (BM25).
  - Reciprocal Rank Fusion (RRF) and Cross-Encoder reranking.
  - Strict grounding: Guaranteed refusal protocol ("Insufficient Evidence") when retrieved context does not cross the groundedness relevance threshold.
- **Multi-Document Comparison Matrix:** Cross-examine 2 to 5 research papers side-by-side across objectives, methodologies, datasets, models, findings, results, limitations, and conclusions.
- **Automated Research Reports:** Compile structured research reports with executive summaries, synthesized findings, and empirical comparison tables, exportable to Markdown and PDF.
- **Enterprise-Grade Security:** Argon2id password hashing, rotating JWT refresh token sessions, strict multi-tenant data isolation, and untrusted document sandboxing.

---

## Repository Structure

```
intelliresearch/
  backend/            # FastAPI Modular Monolith, LangGraph, RAG, Ingestion, DB
  frontend/           # React 18, TypeScript, Tailwind CSS, Monochromatic UI
  infrastructure/     # Docker Compose, Dockerfiles, Nginx configurations
  documentation/      # PRD, System Architecture, API Specs
  scripts/            # Utility, test, and evaluation scripts
  PROJECT_STATUS.md   # Systematic phase tracking & audit log
  README.md           # Engineering overview
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- (Optional) Docker for containerized services

### 2. Backend Setup
```powershell
# Navigate to repository root
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend\requirements.txt

# Start backend server
uvicorn backend.app.main:app --reload --port 8000
```

### 3. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to access the IntelliResearch application.

