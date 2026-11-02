"""Hybrid RAG, BM25, RRF, Reranker, and Citation Verification tests."""

import pytest
from backend.app.services.rag_service import HybridRAGEngine, GROUNDEDNESS_THRESHOLD


def test_bm25_retrieval_and_exact_match():
    engine = HybridRAGEngine()

    candidate_pool = [
        {
            "chunk_id": "c1",
            "document_id": "d1",
            "document_title": "Attention Paper",
            "page_number": 3,
            "text": "The Transformer uses multi-head self-attention to compute representations without recurrence.",
        },
        {
            "chunk_id": "c2",
            "document_id": "d2",
            "document_title": "ResNet Paper",
            "page_number": 5,
            "text": "Deep residual networks make it easy to train very deep neural networks via skip connections.",
        },
        {
            "chunk_id": "c3",
            "document_id": "d1",
            "document_title": "Attention Paper",
            "page_number": 7,
            "text": "On English-to-German translation, the Transformer achieved a BLEU score of 28.4.",
        },
    ]

    bm25_results = engine.retrieve_bm25("BLEU score translation", candidate_pool, top_k=2)
    assert len(bm25_results) == 2
    # The chunk with 'BLEU' and 'translation' must rank first
    assert bm25_results[0]["chunk_id"] == "c3"
    assert bm25_results[0]["score"] > bm25_results[1]["score"]


def test_reciprocal_rank_fusion():
    engine = HybridRAGEngine()

    dense = [
        {"chunk_id": "c1", "text": "Dense rank 1"},
        {"chunk_id": "c2", "text": "Dense rank 2"},
    ]
    sparse = [
        {"chunk_id": "c2", "text": "Sparse rank 1"},
        {"chunk_id": "c3", "text": "Sparse rank 2"},
    ]

    fused = engine.reciprocal_rank_fusion(dense, sparse, top_k=3)
    assert len(fused) == 3
    # c2 was present in both rankings (rank 2 dense, rank 1 sparse), so it receives highest combined RRF score
    assert fused[0]["chunk_id"] == "c2"
    assert fused[0]["rrf_score"] > fused[1]["rrf_score"]


def test_context_evaluation_groundedness_refusal():
    engine = HybridRAGEngine()

    # Highly relevant chunk
    high_relevance_chunks = [{"chunk_id": "c1", "rerank_score": 0.85, "text": "Exact match"}]
    sufficient, score = engine.evaluate_context(high_relevance_chunks)
    assert sufficient is True
    assert score == 0.85

    # Irrelevant chunks below threshold
    low_relevance_chunks = [{"chunk_id": "c2", "rerank_score": 0.12, "text": "Unrelated noise"}]
    sufficient, score = engine.evaluate_context(low_relevance_chunks)
    assert sufficient is False
    assert score < GROUNDEDNESS_THRESHOLD


def test_citation_verification_against_evidence():
    engine = HybridRAGEngine()

    raw_citations = [
        {
            "document_id": "doc_1",
            "document_title": "Attention Is All You Need",
            "page_number": 4,
            "snippet": "Multi-Head Attention allows joint representation...",
        },
        {
            "document_id": "doc_2",
            "document_title": "FlashAttention",
            "page_number": 2,
            "snippet": "IO-awareness accelerates computation on GPU...",
        },
    ]

    answer_with_source1 = (
        "The model uses multi-head attention to attend across representation subspaces [1]. "
        "As noted in Attention Is All You Need, this removes sequential recurrence."
    )

    verified = engine.validate_citations(answer_with_source1, raw_citations)
    assert len(verified) >= 1
    assert verified[0]["document_id"] == "doc_1"
    assert verified[0]["page_number"] == 4
