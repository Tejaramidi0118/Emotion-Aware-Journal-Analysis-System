from sqlalchemy import create_engine, text
from app.config import settings


# =====================================================
# Database Engine
# =====================================================

engine = create_engine(
    settings.SUPABASE_DB_URL,

    pool_pre_ping=True,
    pool_recycle=300,

    connect_args={
        "sslmode": "require",
        "connect_timeout": 10
    }
)


# =====================================================
# Wellness KB
# =====================================================

def insert_wellness(
    topic: str,
    emotion_tags: list,
    content: str,
    embedding: list,
    chunk_index: int = 0,
    doc_hash: str = ""
):
    """
    Insert wellness knowledge embedding.
    """

    with engine.begin() as conn:

        conn.execute(
            text("""
            INSERT INTO wellness_kb_vectors
            (
                topic,
                emotion_tags,
                content,
                embedding,
                chunk_index,
                doc_hash
            )
            VALUES
            (
                :topic,
                :emotion_tags,
                :content,
                CAST(:embedding AS vector),
                :chunk_index,
                :doc_hash
            )
            """),
            {
                "topic": topic,
                "emotion_tags": emotion_tags,
                "content": content,
                "embedding": str(embedding),
                "chunk_index": chunk_index,
                "doc_hash": doc_hash
            }
        )


def search_wellness(
    query_embedding,
    top_k=3
):
    """
    Retrieve wellness context.
    """

    with engine.begin() as conn:

        result = conn.execute(
            text("""
            SELECT *
            FROM search_wellness(
                CAST(:embedding AS vector),
                :top_k
            )
            """),
            {
                "embedding": str(query_embedding),
                "top_k": top_k
            }
        )

        return [dict(row._mapping) for row in result]


# =====================================================
# Journal Memory
# =====================================================

def insert_journal_memory(
    user_id,
    entry_id,
    dominant_emotion,
    ems,
    journal_text,
    entry_date,
    embedding
):
    """
    Store user journal memory.
    """

    with engine.begin() as conn:

        conn.execute(
            text("""
            INSERT INTO journal_memory_vectors
            (
                user_id,
                entry_id,
                dominant_emotion,
                ems,
                journal_text,
                entry_date,
                embedding
            )
            VALUES
            (
                :user_id,
                :entry_id,
                :dominant_emotion,
                :ems,
                :journal_text,
                :entry_date,
                CAST(:embedding AS vector)
            )
            """),
            {
                "user_id": user_id,
                "entry_id": entry_id,
                "dominant_emotion": dominant_emotion,
                "ems": ems,
                "journal_text": journal_text,
                "entry_date": entry_date,
                "embedding": str(embedding)
            }
        )


def search_user_memory(
    query_embedding,
    user_id,
    top_k=3
):
    """
    Retrieve emotionally similar journals.
    """

    with engine.begin() as conn:

        result = conn.execute(
            text("""
            SELECT *
            FROM search_journal_memory(
                CAST(:embedding AS vector),
                :user_id,
                :top_k
            )
            """),
            {
                "embedding": str(query_embedding),
                "user_id": user_id,
                "top_k": top_k
            }
        )

        return [dict(row._mapping) for row in result]


# =====================================================
# Reward-Based Intervention Memory
# =====================================================
def insert_intervention(
    user_id,
    entry_id,
    dominant_emotion,
    feedback_score,
    suggestion,
    embedding
):
    """
    Store weighted reward memory.
    """

    reward_weight = float(
        feedback_score
    )

    with engine.begin() as conn:

        conn.execute(
            text("""
            INSERT INTO successful_interventions_vectors
            (
                user_id,
                entry_id,
                dominant_emotion,
                feedback_score,
                suggestion,
                embedding,
                reward_weight
            )
            VALUES
            (
                :user_id,
                :entry_id,
                :dominant_emotion,
                :feedback_score,
                :suggestion,
                CAST(:embedding AS vector),
                :reward_weight
            )
            """),
            {
                "user_id": user_id,
                "entry_id": entry_id,
                "dominant_emotion": dominant_emotion,
                "feedback_score": feedback_score,
                "suggestion": suggestion,
                "embedding": str(embedding),
                "reward_weight": reward_weight
            }
        )
def search_successes(
    query_embedding,
    user_id,
    top_k=5
):
    """
    Retrieve intervention memory.
    """

    with engine.begin() as conn:

        result = conn.execute(
            text("""
            SELECT *
            FROM successful_interventions_vectors
            WHERE user_id = :user_id
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
            """),
            {
                "embedding": str(query_embedding),
                "user_id": user_id,
                "top_k": top_k
            }
        )

        return [dict(row._mapping) for row in result]