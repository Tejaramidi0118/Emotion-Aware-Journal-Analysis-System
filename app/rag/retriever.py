from app.rag.embedder import embed_text
from app.rag.vector_store import (
    search_wellness,
    search_user_memory,
    search_successes,
    insert_journal_memory,
    insert_intervention
)


# =====================================================
# Wellness KB Retrieval
# =====================================================

def retrieve_wellness_context(
    dominant_emotion: str,
    ems: float,
    burnout_score: float,
    top_k: int = 2
):
    """
    Retrieve relevant wellness content
    based on emotional state.
    """

    query = (
        f"{dominant_emotion} emotion "
        f"stress {round(ems)} "
        f"burnout {round(burnout_score)} "
        f"coping wellness"
    )

    vector = embed_text(query)

    results = search_wellness(
        query_embedding=vector,
        top_k=top_k
    )

    return [
        {
            "source": "wellness_kb",
            "topic": r.get("topic", ""),
            "content": r.get("content", ""),
            "similarity": r.get("similarity", 0)
        }
        for r in results
        if r.get("similarity", 0) > 0.30
    ]


# =====================================================
# User Memory Retrieval
# =====================================================

def retrieve_user_memory(
    user_id: str,
    dominant_emotion: str,
    top_k: int = 3
):
    """
    Retrieve emotionally similar
    past journal memories.
    """

    query = (
        f"journal entry feeling "
        f"{dominant_emotion}"
    )

    vector = embed_text(query)

    results = search_user_memory(
        query_embedding=vector,
        user_id=user_id,
        top_k=top_k
    )

    return [
        {
            "source": "user_memory",
            "emotion": r.get("dominant_emotion", ""),
            "ems": r.get("ems", 0),
            "text": (
                r.get("journal_text", "") or ""
            )[:150],
            "date": str(
                r.get("entry_date", "")
            ),
            "similarity": r.get(
                "similarity", 0
            )
        }
        for r in results
        if r.get("similarity", 0) > 0.30
    ]


# =====================================================
# Reward-Based Intervention Retrieval
# =====================================================

def retrieve_successful_interventions(
    user_id: str,
    dominant_emotion: str,
    top_k: int = 5
):
    """
    Reward-weighted retrieval.
    """

    query = (
        f"helpful suggestion "
        f"{dominant_emotion}"
    )

    vector = embed_text(query)

    results = search_successes(
        query_embedding=vector,
        user_id=user_id,
        top_k=top_k
    )

    scored_results = []

    for r in results:

        similarity = (
            r.get(
                "similarity", 0
            )
        )

        reward = (
            r.get(
                "reward_weight", 0
            )
        )

        suggestion = (
            r.get(
                "suggestion", ""
            )
        )

        if similarity < 0.30:
            continue

        # normalize reward
        reward_score = (
            reward / 5.0
        )

        final_score = (
            similarity * 0.7
            +
            reward_score * 0.3
        )

        scored_results.append({
            "suggestion":
                suggestion,
            "reward":
                reward,
            "score":
                final_score
        })

    scored_results.sort(
        key=lambda x:
        x["score"],
        reverse=True
    )

    preferred = []
    avoid = []

    for r in scored_results:

        if r["reward"] > 0:
            preferred.append(
                r["suggestion"]
            )

        elif r["reward"] < 0:
            avoid.append(
                r["suggestion"]
            )

    return {
        "positive": preferred[:2],
        "negative": avoid[:2]
    }

# =====================================================
# Store Journal Memory
# =====================================================

def store_journal_embedding(
    user_id: str,
    entry_id: str,
    text: str,
    dominant_emotion: str,
    ems: float,
    date: str
):
    """
    Store journal embedding
    into vector memory.
    """

    if not text or len(text.strip()) < 10:
        return

    vector = embed_text(
        text[:500]
    )

    insert_journal_memory(
        user_id=user_id,
        entry_id=entry_id,
        dominant_emotion=dominant_emotion,
        ems=float(ems),
        journal_text=text[:300],
        entry_date=date,
        embedding=vector
    )


# =====================================================
# Store Intervention Feedback
# =====================================================

def store_intervention_feedback(
    user_id: str,
    entry_id: str,
    suggestion: str,
    dominant_emotion: str,
    feedback_score: int
):
    """
    Store intervention feedback
    for reward-based personalization.

    >= 3 → success
    < 3 → negative memory
    """

    if not suggestion:
        return

    vector = embed_text(
        suggestion[:300]
    )

    insert_intervention(
        user_id=user_id,
        entry_id=entry_id,
        dominant_emotion=dominant_emotion,
        feedback_score=feedback_score,
        suggestion=suggestion[:300],
        embedding=vector
    )