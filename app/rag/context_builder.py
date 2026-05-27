"""
Builds a clean, structured context string from retrieved documents.
Injected into the LLM suggestion prompt.
"""


def build_rag_context(
    wellness_docs:   list,
    user_memory:     list,
    past_successes:  list,
    dominant_emotion: str,
    ems: float,
    burnout_score: float
) -> str:
    """
    Assembles retrieved context into a structured string for LLM injection.
    Keeps context concise to avoid token waste.
    """
    parts = []

    # Wellness knowledge
    if wellness_docs:
        tips = " | ".join([d["content"][:120] for d in wellness_docs[:2]])
        parts.append(f"Relevant wellness knowledge: {tips}")

    # User emotional memory
    if user_memory:
        memories = []
        for m in user_memory[:2]:
            memories.append(
                f"On {m.get('date','a past day')} felt {m.get('emotion','')}"
                f" (stress {m.get('ems',0):.0f}/100)"
            )
        parts.append("User's recent emotional pattern: " + " | ".join(memories))

    # Past successful interventions
    if past_successes:
        worked = [s["suggestion"][:80] for s in past_successes[:2]]
        parts.append("What helped this user before: " + " | ".join(worked))

    if not parts:
        return ""

    return "\n".join(parts)