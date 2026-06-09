from sentence_transformers import (
    SentenceTransformer
)
import hashlib


# =====================================================
# Global Singleton Model
# =====================================================

_embedder = None


def get_embedder():
    """
    Load model once per process.
    Reuse afterward.
    """

    global _embedder

    if _embedder is None:

        print(
            "Loading sentence-transformers for RAG..."
        )

        _embedder = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

        print(
            "RAG embedder loaded."
        )

    return _embedder


# =====================================================
# Single Text Embedding
# =====================================================

def embed_text(text: str) -> list:
    """
    Embed one text.
    Returns 384-dim vector.
    """

    model = get_embedder()

    vector = model.encode(
        str(text),
        normalize_embeddings=True
    )

    return vector.tolist()


# =====================================================
# Batch Embedding
# =====================================================

def embed_batch(texts: list) -> list:
    """
    Efficient batch embedding.
    """

    model = get_embedder()

    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        batch_size=32
    )

    return [
        v.tolist()
        for v in vectors
    ]


# =====================================================
# Text Hashing
# =====================================================

def text_hash(text: str) -> str:
    """
    Stable hash for deduplication.
    """

    return hashlib.md5(
        str(text).encode()
    ).hexdigest()