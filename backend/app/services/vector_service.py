"""Vector embedding generation and ChromaDB persistent storage service."""

import os
import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import Any, Dict, List, Optional
from backend.app.core.config import settings
from backend.app.services.pdf_service import DocumentChunk


class EmbeddingService:
    """Embedding model wrapper using SentenceTransformers."""

    def __init__(self, model_name: str = settings.EMBEDDING_MODEL_NAME):
        self.model_name = model_name
        self._model = None

    @property
    def model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Batch compute dense embedding vectors."""
        if not texts:
            return []
        embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        """Compute dense vector embedding for a single query."""
        embedding = self.model.encode(query, convert_to_numpy=True, show_progress_bar=False)
        return embedding.tolist()


class ChromaVectorService:
    """ChromaDB vector collection manager with strict workspace and tenant isolation."""

    def __init__(
        self,
        persist_directory: str = settings.CHROMA_PERSIST_DIRECTORY,
        embedding_service: Optional[EmbeddingService] = None,
    ):
        self.persist_directory = os.path.abspath(persist_directory)
        os.makedirs(self.persist_directory, exist_ok=True)
        self.client = chromadb.PersistentClient(path=self.persist_directory)
        self.embedding_service = embedding_service or EmbeddingService()
        self.collection_name = "intelliresearch_documents"
        self._collection = None

    @property
    def collection(self):
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def index_chunks(self, chunks: List[DocumentChunk]) -> int:
        """Batch index document chunks with embeddings and metadata into ChromaDB."""
        if not chunks:
            return 0

        ids = [chunk.chunk_id for chunk in chunks]
        texts = [chunk.text for chunk in chunks]
        metadatas = [chunk.metadata for chunk in chunks]

        # Compute dense embeddings in batch
        embeddings = self.embedding_service.embed_texts(texts)

        # Batch upsert into ChromaDB
        batch_size = 200
        for i in range(0, len(chunks), batch_size):
            batch_ids = ids[i : i + batch_size]
            batch_texts = texts[i : i + batch_size]
            batch_embeds = embeddings[i : i + batch_size]
            batch_meta = metadatas[i : i + batch_size]

            self.collection.upsert(
                ids=batch_ids,
                documents=batch_texts,
                embeddings=batch_embeds,
                metadatas=batch_meta,
            )

        return len(chunks)

    def delete_document_chunks(self, workspace_id: str, user_id: str, document_id: str) -> None:
        """Purge all chunks associated with a document under strict tenant boundaries."""
        self.collection.delete(
            where={
                "$and": [
                    {"workspace_id": {"$eq": workspace_id}},
                    {"user_id": {"$eq": user_id}},
                    {"document_id": {"$eq": document_id}},
                ]
            }
        )

    def search_semantic(
        self,
        workspace_id: str,
        user_id: str,
        query: str,
        top_k: int = 15,
        document_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Dense semantic cosine retrieval with strict workspace and tenant filtering."""
        query_embedding = self.embedding_service.embed_query(query)

        filter_conditions: List[Dict[str, Any]] = [
            {"workspace_id": {"$eq": workspace_id}},
            {"user_id": {"$eq": user_id}},
        ]

        if document_ids:
            if len(document_ids) == 1:
                filter_conditions.append({"document_id": {"$eq": document_ids[0]}})
            else:
                filter_conditions.append({"document_id": {"$in": document_ids}})

        where_filter = {"$and": filter_conditions} if len(filter_conditions) > 1 else filter_conditions[0]

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        candidates = []
        if results and results.get("ids") and results["ids"][0]:
            count = len(results["ids"][0])
            for i in range(count):
                chunk_id = results["ids"][0][i]
                doc_text = results["documents"][0][i]
                meta = results["metadatas"][0][i]
                distance = results["distances"][0][i] if results.get("distances") else 0.5
                # Chroma cosine distance is in [0, 2], similarity is 1 - (dist / 2)
                cosine_sim = max(0.0, 1.0 - (distance / 2.0))

                candidates.append({
                    "chunk_id": chunk_id,
                    "document_id": meta.get("document_id"),
                    "document_title": meta.get("document_title"),
                    "page_number": int(meta.get("page_number", 1)),
                    "chunk_index": int(meta.get("chunk_index", 0)),
                    "text": doc_text,
                    "score": float(cosine_sim),
                    "retrieval_type": "dense",
                })

        return candidates


embedding_service = EmbeddingService()
vector_service = ChromaVectorService(embedding_service=embedding_service)
