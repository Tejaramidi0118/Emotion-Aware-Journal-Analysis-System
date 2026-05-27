from sentence_transformers import SentenceTransformer
from functools import lru_cache
import hashlib

# Load once at startup
_model = None

def get_embedder():
    global _model
    if _model is None:
        print("Loading sentence-transformers for RAG...")
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        print("RAG embedder loaded.")
    return _model

def embed_text(text: str) -> list:
    """Embed a single text string. Returns 384-dim vector."""
    model  = get_embedder()
    vector = model.encode(str(text), normalize_embeddings=True)
    return vector.tolist()

def embed_batch(texts: list) -> list:
    """Embed multiple texts at once. More efficient than one-by-one."""
    model   = get_embedder()
    vectors = model.encode(texts, normalize_embeddings=True, batch_size=32)
    return [v.tolist() for v in vectors]

def text_hash(text: str) -> str:
    """MD5 hash of text — used to avoid re-embedding identical content."""
    return hashlib.md5(str(text).encode()).hexdigest()