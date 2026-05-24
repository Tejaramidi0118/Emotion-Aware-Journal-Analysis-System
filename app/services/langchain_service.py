# app/services/langchain_service.py — top section only
import os
import json
import re
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

TARGET_EMOTIONS = [
    "joy", "trust", "fear", "surprise", "sadness",
    "disgust", "anger", "anticipation", "love", "optimism", "pessimism"
]

# No load_dotenv() here — handled by main.py
llm = ChatGroq(
    model="llama-3.1-8b-instant",
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3,
    max_tokens=500
)

llm_suggestion = ChatGroq(
    model="llama-3.1-8b-instant",
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.7,
    max_tokens=150
)

def get_recent_context(user_id: str) -> str:
    from app.database import mongo_db
    history = list(mongo_db["journal_history"].find(
        {"user_id": user_id},
        {"dominant_emotion":1, "suggestion":1, "timestamp":1, "_id":0},
        sort=[("timestamp", -1)],
        limit=3
    ))
    if not history:
        return "No previous entries."
    lines = []
    for h in reversed(history):
        ts = h.get("timestamp","")
        if hasattr(ts, 'strftime'):
            ts = ts.strftime("%b %d")
        lines.append(f"- {ts}: felt {h.get('dominant_emotion','')} → suggested '{h.get('suggestion','')[:40]}...'")
    return "\n".join(lines)

# ══════════════════════════════════════════════════════════
# CHAIN 1 — Emotion Detection (fallback for XLM-RoBERTa)
# ══════════════════════════════════════════════════════════

emotion_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an emotion analyzer for personal journal entries.

Your task: Analyze ONLY the emotions the WRITER is personally feeling.

Rules:
- ONLY detect emotions the writer is experiencing
- IGNORE emotions of other people mentioned (father, friend, boss etc.)
- Narrative events imply emotions based on context (eating with family = joy, missing deadlines = stress)
- Score each emotion 0.0 to 1.0
- Multiple emotions can be active simultaneously
- Purely factual narrative with no emotional signal → all scores below 0.3

Return ONLY valid JSON with exactly these 11 keys, no explanation, no markdown:
{{"joy": 0.0, "trust": 0.0, "fear": 0.0, "surprise": 0.0, "sadness": 0.0, "disgust": 0.0, "anger": 0.0, "anticipation": 0.0, "love": 0.0, "optimism": 0.0, "pessimism": 0.0}}"""),
    ("human", "Journal entry:\n\"\"\"{text}\"\"\"")
])

emotion_chain = emotion_prompt | llm | StrOutputParser()


def classify_with_groq(text: str) -> dict | None:
    """
    Uses Groq Llama to classify emotion from journal text.
    Called when XLM-RoBERTa returns low confidence.
    Returns same format as XLM-RoBERTa output.
    """
    try:
        raw = emotion_chain.invoke({"text": text})

        # Clean markdown if present
        raw = re.sub(r"```json|```", "", raw).strip()

        scores = json.loads(raw)

        # Validate and clean all keys
        cleaned = {}
        for e in TARGET_EMOTIONS:
            val = float(scores.get(e, 0.0))
            cleaned[e] = round(max(0.0, min(1.0, val)), 4)

        dominant   = max(cleaned, key=cleaned.get)
        active     = [e for e, s in cleaned.items() if s >= 0.50]
        confidence = round(max(cleaned.values()), 4)
        low_conf   = confidence < 0.30

        return {
            "emotion_scores":         cleaned,
            "dominant_emotion":       dominant,
            "active_emotions":        active,
            "confidence":             confidence,
            "low_confidence_emotion": low_conf,
            "source":                 "groq"
        }

    except Exception as e:
        print(f"Groq emotion detection failed: {e}")
        return None


# ══════════════════════════════════════════════════════════
# CHAIN 2 — Suggestion Generation
# ══════════════════════════════════════════════════════════

suggestion_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a warm personal wellness companion writing a short suggestion.

STRICT RULES — violations are unacceptable:
- NEVER say: "Hey there", "reaching out", "I'm glad", "I sense that you're feeling weighed down"
- NEVER start with "I" as the first word
- NEVER give generic advice — always use their specific interests
- Speak like a trusted friend who knows them well
- 2 sentences maximum
- If current emotion is positive but stress trend is high — acknowledge both
- {language}
- {scenario_instruction}"""),
    ("human", """Current emotion: {dominant_emotion}
Stress trend (EMS): {ems}/100 — {ems_trend}
Interests — Music: {music} | Activities: {activities} | Hobbies: {hobbies}
Tone preference: {tone}
What helped before: {feedback_context}
Recent pattern: {recent_context}
Stressors: {trigger_context}

Write 2 sentences maximum:""")
])
# ══════════════════════════════════════════════════════════
# CHAIN 3 — Journal Prompt Generation
# ══════════════════════════════════════════════════════════

journal_prompt_template = ChatPromptTemplate.from_messages([
    ("system", """You are a journaling coach generating writing prompts.
Generate exactly 3 short journaling prompts tailored to the user's emotional state.

Rules:
- Each prompt must be 1 sentence, ending with a question mark
- Make them personal, warm, and non-clinical
- If mood is negative — prompts should help process and release emotions
- If mood is positive — prompts should help capture and amplify the good
- If EMS is high (>60) — include one prompt about identifying what's draining them
- Do NOT repeat topics from recent journal entries
- Respond in {language}
- Return ONLY a JSON array of 3 strings, no explanation:
["prompt 1", "prompt 2", "prompt 3"]"""),
    ("human", """User's current emotional state:
- Dominant emotion: {dominant_emotion}
- Stress level (EMS): {ems}/100
- Recent journal topics: {recent_topics}

Generate 3 journaling prompts:""")
])

journal_prompt_chain = journal_prompt_template | llm | StrOutputParser()

LANGUAGE_NAMES = {
    "te": "Telugu", "hi": "Hindi", "ml": "Malayalam", "en": "English"
}

# Fallback prompts if Groq fails
FALLBACK_PROMPTS = {
    "positive": [
        "What made today feel good, even in a small way?",
        "Who or what are you grateful for right now?",
        "What's one thing you want to remember about today?"
    ],
    "negative": [
        "What's been weighing on your mind the most lately?",
        "Describe one moment today that felt manageable.",
        "What would make tomorrow even 10% better?"
    ],
    "neutral": [
        "How are you really feeling right now, beneath the surface?",
        "What happened today that you want to remember?",
        "What do you need more of in your life right now?"
    ]
}

def generate_journal_prompts(
    dominant_emotion: str,
    ems:              float,
    history:          list,
    language:         str = "en"
) -> list:
    """
    Generates 3 contextual journaling prompts using Groq.
    Falls back to static prompts if API fails.
    """
    NEGATIVE_EMOTIONS = {"sadness", "fear", "anger", "disgust", "pessimism"}
    POSITIVE_EMOTIONS = {"joy", "trust", "love", "optimism", "anticipation"}

    # Build recent topics string
    recent_topics = "none"
    if history:
        texts = [h.get("text", "")[:60] for h in history if h.get("text")]
        recent_topics = " | ".join(texts) if texts else "none"

    lang_name = LANGUAGE_NAMES.get(language, "English")

    try:
        raw = journal_prompt_chain.invoke({
            "dominant_emotion": dominant_emotion,
            "ems":              round(ems, 1),
            "recent_topics":    recent_topics,
            "language":         lang_name
        })

        # Clean and parse JSON
        raw     = re.sub(r"```json|```", "", raw).strip()
        prompts = json.loads(raw)

        if isinstance(prompts, list) and len(prompts) == 3:
            return [str(p) for p in prompts]
        raise ValueError("Invalid format")

    except Exception as e:
        print(f"Prompt generation failed: {e} — using fallback")
        if dominant_emotion in POSITIVE_EMOTIONS:
            return FALLBACK_PROMPTS["positive"]
        elif dominant_emotion in NEGATIVE_EMOTIONS:
            return FALLBACK_PROMPTS["negative"]
        else:
            return FALLBACK_PROMPTS["neutral"]
        

suggestion_chain = suggestion_prompt | llm_suggestion | StrOutputParser()


SCENARIO_INSTRUCTIONS = {
    1: "User is in a GOOD mood before 8PM. Suggest something productive they can do TODAY. Be encouraging.",
    2: "User is feeling LOW before 8PM. Suggest a recovery activity RIGHT NOW (music, hobby, physical). Be gentle.",
    3: "User is in a GOOD mood after 8PM. Acknowledge positive state briefly and suggest planning something for TOMORROW.",
    4: "User is feeling LOW after 8PM. Suggest something calming RIGHT NOW and mention tomorrow should be a rest day. Be warm."
}

LANGUAGE_INSTRUCTIONS = {
    "te": "Respond in Telugu language.",
    "hi": "Respond in Hindi language.",
    "ml": "Respond in Malayalam language.",
    "en": "Respond in English."
}


def generate_suggestion(
    dominant_emotion: str,
    active_emotions: list,
    emotion_scores: dict,
    interest_profile: dict,
    scenario: int,
    feedback_history: list = [],
    language: str = "en",
    triggers: list = [],
    user_id: str = "",
    ems:               float = 0.0,
    ems_trend:         str  = "stable"
) -> str:
    """
    Generates personalized wellness suggestion using Groq.
    Called by Recommendation Agent after emotion + scenario determined.
    """

    # Recent Context
    recent_context = get_recent_context(user_id) if user_id else "No history."


    # Build feedback context string
    helpful     = [f["item"] for f in feedback_history if f.get("score", 0) >= 2]
    not_helpful = [f["item"] for f in feedback_history if f.get("score", 0) <= -2]
    feedback_context = ""
    if helpful:
        feedback_context += f"Helpful before: {', '.join(helpful[:3])}. "
    if not_helpful:
        feedback_context += f"Not helpful: {', '.join(not_helpful[:3])}."
    if not feedback_context:
        feedback_context = "No feedback history yet."

    # Build trigger context
    trigger_context = ", ".join(triggers) if triggers else "None identified."

    try:
        result = suggestion_chain.invoke({
            "language":            LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["en"]),
            "scenario_instruction": SCENARIO_INSTRUCTIONS.get(scenario, SCENARIO_INSTRUCTIONS[2]),
            "dominant_emotion":    dominant_emotion,
            "active_emotions":     ", ".join(active_emotions) if active_emotions else "none",
            "music":               ", ".join(interest_profile.get("music", [])) or "not specified",
            "activities":          ", ".join(interest_profile.get("activities", [])) or "not specified",
            "hobbies":             ", ".join(interest_profile.get("hobbies", [])) or "not specified",
            "feedback_context":    feedback_context,
            "trigger_context":     trigger_context,
            "recent_context":       recent_context,
            "ems":       round(ems, 1),
            "ems_trend": ems_trend,
            "tone":      interest_profile.get("tone", "friendly"),
        })
        return result.strip()

    except Exception as e:
        print(f"Groq suggestion generation failed: {e}")
        # Static fallback if Groq fails
        fallbacks = {
            1: "You seem to be in a good place today. Use this energy to tackle something meaningful.",
            2: "Take a short break. Even 10 minutes of something you enjoy can reset your mood.",
            3: "Good to hear you had a positive day. Rest well and plan something meaningful for tomorrow.",
            4: "It's been a tough day. Rest is the best thing right now. Tomorrow will be better."
        }
        return fallbacks.get(scenario, fallbacks[2])