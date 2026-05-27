"""
Wellness Knowledge Base.

Pre-written wellness content chunked and embedded once.
Stores vectors in Supabase pgvector.
"""

from app.rag.embedder import embed_text, text_hash
from app.rag.vector_store import insert_wellness


# =====================================================
# Wellness Documents
# =====================================================

WELLNESS_DOCS = [

    (
        "burnout_recovery",
        ["sadness", "exhaustion", "pessimism", "anger"],
        "When experiencing burnout, the most effective recovery involves three key principles: "
        "First, create clear boundaries between work and rest — burnout worsens when rest time "
        "is mentally occupied by work worries. Second, restore energy through activities that "
        "genuinely energise you rather than passive activities. Third, reconnect with your "
        "sense of purpose by focusing on small meaningful tasks rather than overwhelming goals."
    ),

    (
        "stress_management",
        ["fear", "anxiety", "anticipation", "pessimism"],
        "Acute stress can be reduced through the 4-7-8 breathing technique: inhale for 4 seconds, "
        "hold for 7 seconds, exhale for 8 seconds. This activates the parasympathetic nervous system. "
        "Progressive muscle relaxation — tensing and releasing muscle groups — also reduces cortisol. "
        "For cognitive stress, the 5-4-3-2-1 grounding technique interrupts anxiety spirals effectively."
    ),

    (
        "exam_work_pressure",
        ["fear", "anticipation", "pessimism", "sadness"],
        "Under exam or deadline pressure, the Pomodoro technique "
        "(25 minutes focus, 5 minute break) maintains cognitive "
        "performance better than marathon sessions. Breaking large "
        "tasks into 2-minute micro-tasks reduces procrastination caused "
        "by overwhelm. Study sessions before 10pm with adequate sleep "
        "improve memory consolidation significantly more than late-night cramming."
    ),

    (
        "emotional_recovery",
        ["sadness", "disgust", "anger", "fear"],
        "Emotional recovery after negative experiences follows a predictable pattern. "
        "Acknowledge the emotion without judgment — suppression extends duration. "
        "Physical movement, even a 10-minute walk, triggers endorphin release that interrupts "
        "negative emotional loops. Journaling itself — writing about emotions specifically — "
        "reduces amygdala activation and improves emotional processing within 20 minutes."
    ),

    (
        "sleep_improvement",
        ["sadness", "exhaustion", "fear", "pessimism"],
        "Sleep quality directly impacts emotional regulation. "
        "A consistent sleep schedule, even on weekends, maintains circadian rhythm "
        "more effectively than extended weekend sleep. "
        "Removing phones before bed improves sleep onset time."
    ),

    (
        "productivity_focus",
        ["anticipation", "joy", "trust", "optimism"],
        "Peak cognitive performance occurs in two windows for most people: "
        "2-4 hours after waking and late afternoon. Deep work — uninterrupted "
        "focused sessions — should be scheduled during these windows."
    ),

    (
        "mindfulness_practice",
        ["sadness", "fear", "anger", "pessimism"],
        "Mindfulness reduces emotional reactivity over time. "
        "Even 5 minutes of focused breathing observation daily "
        "changes stress response patterns within 8 weeks."
    ),

    (
        "CBT_negative_thoughts",
        ["pessimism", "sadness", "fear", "disgust"],
        "Cognitive Behavioural Therapy techniques for negative thought patterns: "
        "Thought challenging — asking 'What is the evidence for and against this thought?' "
        "reduces cognitive distortions. Behavioural activation breaks the inactivity-low mood cycle."
    ),

    (
        "social_connection",
        ["sadness", "pessimism", "love", "trust"],
        "Social connection is one of the strongest predictors of emotional resilience. "
        "Even brief positive interactions reduce stress hormones."
    ),

    (
        "physical_activity_mood",
        ["sadness", "anger", "fear", "pessimism"],
        "Physical activity is among the most evidence-based mood interventions. "
        "Even 10 minutes of walking outdoors improves mood measurably."
    ),

    (
        "gratitude_practice",
        ["joy", "trust", "optimism", "love"],
        "Writing 3 specific things you are grateful for daily "
        "increases positive emotional state over time."
    ),

    (
        "music_therapy",
        ["sadness", "fear", "anger", "joy"],
        "Music significantly influences emotional state. "
        "Slow tempo music reduces anxiety. Familiar music triggers dopamine release."
    ),
]


# =====================================================
# Text Chunking
# =====================================================

def chunk_text(
    text: str,
    max_chars: int = 400
) -> list:
    """
    Split long wellness text into chunks.
    Helps retrieval quality.
    """

    sentences = text.replace(". ", ".|").split("|")

    chunks = []
    current = ""

    for sent in sentences:

        if len(current) + len(sent) <= max_chars:
            current += sent + " "

        else:
            if current.strip():
                chunks.append(current.strip())

            current = sent + " "

    if current.strip():
        chunks.append(current.strip())

    return chunks if chunks else [text]


# =====================================================
# Build Wellness KB
# =====================================================

def build_wellness_kb():
    """
    Build wellness knowledge base
    and store embeddings in Supabase.
    Safe to call multiple times.
    """

    print("Building wellness knowledge base...")

    stored = 0

    for topic, emotion_tags, content in WELLNESS_DOCS:

        chunks = chunk_text(content)

        for i, chunk in enumerate(chunks):

            vector = embed_text(chunk)

            insert_wellness(
                topic=topic,
                emotion_tags=emotion_tags,
                content=chunk,
                embedding=vector,
                chunk_index=i,
                doc_hash=text_hash(chunk)
            )

            stored += 1

    print(f"Wellness KB ready: {stored} chunks stored.")