"""
Builds a clean, structured context string
from retrieved RAG documents.

Injected into the LLM suggestion prompt.
"""


def build_rag_context(
    wellness_docs,
    user_memory,
    past_successes,
    negative_interventions,
    dominant_emotion,
    ems,
    burnout_score
) -> str:
    """
    Assemble retrieved context into a concise,
    emotionally useful prompt context.
    """

    parts = []

    # =====================================================
    # Emotional State Summary
    # =====================================================

    parts.append(
        f"""
Current emotional state:
- Dominant emotion: {dominant_emotion}
- Stress (EMS): {ems:.0f}/100
- Burnout Risk: {burnout_score:.0f}/100
""".strip()
    )

    # =====================================================
    # Wellness Knowledge
    # =====================================================

    if wellness_docs:

        wellness_text = []

        for d in wellness_docs[:2]:

            content = (
                d.get("content", "")
                [:180]
                .strip()
            )

            if content:
                wellness_text.append(
                    content
                )

        if wellness_text:

            parts.append(
                "Relevant wellness insights:\n"
                + "\n".join(
                    f"- {x}"
                    for x in wellness_text
                )
            )

    # =====================================================
    # User Emotional Memory
    # =====================================================

    if user_memory:

        memory_text = []

        for m in user_memory[:2]:

            emotion = m.get(
                "emotion", ""
            )

            stress = round(
                m.get("ems", 0)
            )

            date = m.get(
                "date",
                "a previous day"
            )

            memory_text.append(
                f"On {date}, "
                f"user felt "
                f"{emotion} "
                f"(stress {stress}/100)"
            )

        if memory_text:

            parts.append(
                "Relevant emotional history:\n"
                + "\n".join(
                    f"- {x}"
                    for x in memory_text
                )
            )

    # =====================================================
    # Helpful Interventions
    # =====================================================

    if past_successes:

        helpful = []

        for suggestion in past_successes[:2]:

            helpful.append(
                suggestion[:120]
            )

        if helpful:

            parts.append(
                "What helped before:\n"
                + "\n".join(
                    f"- {x}"
                    for x in helpful
                )
            )

    # =====================================================
    # Negative Feedback Memory
    # =====================================================

    if negative_interventions:

        avoided = []

        for suggestion in negative_interventions[:2]:

            avoided.append(
                suggestion[:120]
            )

        if avoided:

            parts.append(
                "Previously disliked interventions "
                "(avoid repeating):\n"
                + "\n".join(
                    f"- {x}"
                    for x in avoided
                )
            )

    # =====================================================
    # Final Context
    # =====================================================

    return "\n\n".join(parts)