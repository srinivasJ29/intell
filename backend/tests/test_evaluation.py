"""AI and RAG Quantitative Evaluation: Recall@K, MRR, Groundedness, and Refusal rates."""

import pytest
from typing import List, Dict, Any
from backend.app.services.rag_service import HybridRAGEngine, GROUNDEDNESS_THRESHOLD


# Standard academic evaluation benchmark dataset
EVALUATION_DATASET = [
    {
        "query": "What is the computational complexity of standard self-attention?",
        "ground_truth_chunk_id": "attn_complexity_p3",
        "candidate_corpus": [
            {"chunk_id": "attn_complexity_p3", "text": "Self-attention has computational complexity of O(n^2 * d) per layer, scaling quadratically with sequence length n."},
            {"chunk_id": "linear_attn_p2", "text": "Linear attention maps feature maps using kernel tricks to reduce complexity to O(n * d^2)."},
            {"chunk_id": "resnet_p4", "text": "Residual connections allow deep networks with 152 layers to converge easily."},
            {"chunk_id": "flash_attn_p1", "text": "FlashAttention reduces HBM memory traffic by tiling attention computation in SRAM."},
        ]
    },
    {
        "query": "How does FlashAttention avoid materializing intermediate attention matrices?",
        "ground_truth_chunk_id": "flash_tiling_p4",
        "candidate_corpus": [
            {"chunk_id": "transformer_p1", "text": "The Transformer uses positional encodings to inject sequence order."},
            {"chunk_id": "flash_tiling_p4", "text": "FlashAttention avoids materializing the N x N attention matrix by computing softmax reduction in on-chip SRAM via tiling."},
            {"chunk_id": "gpt_p2", "text": "Autoregressive language models predict next tokens using causal masking."},
            {"chunk_id": "bert_p3", "text": "Masked language models predict corrupted tokens bidirectional."},
        ]
    },
    {
        "query": "What BLEU score did Transformer achieve on WMT 2014 English-to-French?",
        "ground_truth_chunk_id": "transformer_bleu_p8",
        "candidate_corpus": [
            {"chunk_id": "transformer_bleu_p8", "text": "On the WMT 2014 English-to-French translation task, our big model achieved a state-of-the-art BLEU score of 41.0."},
            {"chunk_id": "transformer_en_de_p8", "text": "On English-to-German, the model established 28.4 BLEU."},
            {"chunk_id": "seq2seq_p5", "text": "LSTM encoder-decoder architectures require attention mechanisms to retain long sentence fidelity."},
        ]
    }
]


def test_recall_at_k_and_mrr_metrics():
    """Evaluate Recall@K (K=1, K=2) and Mean Reciprocal Rank (MRR) across evaluation benchmark."""
    engine = HybridRAGEngine()

    reciprocal_ranks = []
    hits_at_1 = 0
    hits_at_2 = 0
    total_queries = len(EVALUATION_DATASET)

    for item in EVALUATION_DATASET:
        query = item["query"]
        target_id = item["ground_truth_chunk_id"]
        corpus = item["candidate_corpus"]

        # Run BM25 + dense ranking simulation
        bm25_ranked = engine.retrieve_bm25(query, corpus, top_k=len(corpus))
        reranked = engine.rerank(query, bm25_ranked, top_k=len(corpus))

        # Determine rank of ground truth chunk
        found_rank = None
        for rank_idx, cand in enumerate(reranked):
            if cand["chunk_id"] == target_id:
                found_rank = rank_idx + 1  # 1-indexed rank
                break

        if found_rank is not None:
            reciprocal_ranks.append(1.0 / found_rank)
            if found_rank <= 1:
                hits_at_1 += 1
            if found_rank <= 2:
                hits_at_2 += 1
        else:
            reciprocal_ranks.append(0.0)

    # Calculate aggregate metrics
    recall_at_1 = hits_at_1 / total_queries
    recall_at_2 = hits_at_2 / total_queries
    mrr = sum(reciprocal_ranks) / total_queries

    print(f"\n[AI Evaluation] Recall@1: {recall_at_1:.2f} | Recall@2: {recall_at_2:.2f} | MRR: {mrr:.2f}")

    # Production benchmark acceptance criteria: Recall@2 >= 0.90 and MRR >= 0.75
    assert recall_at_1 >= 0.66
    assert recall_at_2 == 1.0, f"Recall@2 was {recall_at_2}, expected 1.0"
    assert mrr >= 0.80, f"MRR was {mrr}, expected >= 0.80"


def test_insufficient_evidence_refusal_metric():
    """Verify that ungrounded queries trigger strict refusal protocol (zero hallucination)."""
    engine = HybridRAGEngine()

    irrelevant_corpus = [
        {"chunk_id": "c_food", "text": "The recipe calls for two cups of flour and one teaspoon of yeast."},
        {"chunk_id": "c_gardening", "text": "Tomatoes require direct sunlight and regular watering during summer."},
    ]

    query = "What is the quantum supremacy metric achieved by Sycamore?"
    results = engine.retrieve_bm25(query, irrelevant_corpus, top_k=2)
    reranked = engine.rerank(query, results, top_k=2)

    is_sufficient, score = engine.evaluate_context(reranked)

    # Must refuse
    assert is_sufficient is False
    assert score < GROUNDEDNESS_THRESHOLD

