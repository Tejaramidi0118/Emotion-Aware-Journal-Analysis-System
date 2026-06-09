import numpy as np
from datetime import datetime, timedelta
from app.database import emotion_vectors_col, agent_state_col, mongo_db
from app.services.langchain_service import generate_suggestion
from app.services.youtube_music_service import get_music_recommendations
from app.rag.retriever import (
    retrieve_wellness_context,
    retrieve_user_memory,
    retrieve_successful_interventions,
    store_journal_embedding
)
from app.rag.context_builder import build_rag_context

def sanitize_for_mongo(obj):
    import numpy as np

    if isinstance(obj, dict):
        return {k: sanitize_for_mongo(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_mongo(i) for i in obj]
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    else:
        return obj
    
# ══════════════════════════════════════════════════════════
# HELPER — Fetch recent emotion vectors for a user
# ══════════════════════════════════════════════════════════

def to_python(obj):
    """Convert numpy types to native Python for JSON serialization."""
    import numpy as np
    if isinstance(obj, np.bool_):    return bool(obj)
    if isinstance(obj, np.integer):  return int(obj)
    if isinstance(obj, np.floating): return float(obj)
    if isinstance(obj, np.ndarray):  return obj.tolist()
    if isinstance(obj, dict):        return {k: to_python(v) for k, v in obj.items()}
    if isinstance(obj, list):        return [to_python(i) for i in obj]
    return obj

def get_recent_vectors(user_id: str, days: int = 30) -> list:
    """
    Fetches emotion vectors from last N days for a user.
    Both text and speech modalities included.
    """
    since = datetime.utcnow() - timedelta(days=days)
    vectors = list(emotion_vectors_col.find(
        {
            "user_id": user_id,
            "timestamp": {"$gte": since},
            "low_confidence_emotion": {"$ne": True}  # exclude low confidence
        },
        sort=[("timestamp", 1)]  # oldest first for trend
    ))
    return vectors


def get_dominant_scores(vectors: list) -> list:
    """
    Extracts dominant emotion probability score from each vector.
    Used for EMS computation.
    """
    NEGATIVE_EMOTIONS = {"sadness", "fear", "anger", "disgust", "pessimism"}
    scores = []
    for v in vectors:
        emotion_scores = v.get("emotion_scores", {})
        dominant = v.get("dominant_emotion", "neutral")
        dominant_score = emotion_scores.get(dominant, 0.0)
        is_negative = dominant in NEGATIVE_EMOTIONS
        scores.append({
            "score":       dominant_score,
            "is_negative": is_negative,
            "timestamp":   v["timestamp"],
            "dominant":    dominant
        })
    return scores


# ══════════════════════════════════════════════════════════
# AGENT 1 — EMS (Emotional Momentum Score)
# ══════════════════════════════════════════════════════════

def compute_ems(user_id: str) -> dict:
    vectors = get_recent_vectors(user_id, days=14)

    if not vectors:
        return {
            "ems": 0.0, "ems_7day": 0.0, "ems_14day": 0.0,
            "trend": "new_user", "entry_count": 0
        }

    scores = get_dominant_scores(vectors)
    NEGATIVE = {"sadness", "fear", "anger", "disgust", "pessimism"}

    def calc_ems_weighted(score_list):
        if not score_list:
            return 0.0

        total = len(score_list)

        # Recency weights — most recent entry has highest weight
        # Entry at index 0 = oldest, last index = most recent
        weights = np.linspace(0.3, 1.0, total)  # oldest=0.3, newest=1.0

        weighted_neg_score = 0.0
        total_weight       = 0.0

        for i, s in enumerate(score_list):
            w = weights[i]
            if s["is_negative"]:
                weighted_neg_score += s["score"] * w
            total_weight += w

        if total_weight == 0:
            return 0.0

        # Weighted negative ratio × average intensity
        ems = (weighted_neg_score / total_weight) * 100
        return round(min(ems, 100.0), 2)

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_scores  = [s for s in scores if s["timestamp"] >= seven_days_ago]

    ems_7day  = calc_ems_weighted(recent_scores) if recent_scores else calc_ems_weighted(scores)
    ems_14day = calc_ems_weighted(scores)

    # Trend
    if len(scores) >= 3 and ems_7day > ems_14day + 8:
        trend = "escalating"
    elif len(scores) >= 3 and ems_7day < ems_14day - 8:
        trend = "improving"
    elif len(scores) < 3:
        trend = "building"
    else:
        trend = "stable"

    return {
        "ems":         ems_7day,
        "ems_7day":    ems_7day,
        "ems_14day":   ems_14day,
        "trend":       trend,
        "entry_count": len(vectors)
    }

# ══════════════════════════════════════════════════════════
# AGENT 2 — Burnout Risk
# ══════════════════════════════════════════════════════════

def compute_burnout_risk(user_id: str, ems: float, ems_14day: float) -> dict:
    vectors = get_recent_vectors(user_id, days=14)

    # Need minimum entries
    if len(vectors) < 3:
        return {
            "burnout_risk_score": 0.0,
            "burnout_alert":      False,
            "insufficient_data":  True,
            "components": {}
        }

    # Component 1 — sustained stress
    ems_component = ems_14day * 0.5

    # Component 2 — current spike
    spike_component = min(max(0, ems - ems_14day) * 2, 100) * 0.3

    # Component 3 — positive emotion flatness
    POSITIVE = {"joy", "trust", "love", "optimism", "anticipation"}
    pos_scores = []
    for v in vectors:
        es = v.get("emotion_scores", {})
        pos_avg = np.mean([es.get(e, 0.0) for e in POSITIVE])
        pos_scores.append(pos_avg)

    if len(pos_scores) >= 3:
        pos_variance   = float(np.var(pos_scores))
        flatness_score = max(0, (0.05 - pos_variance) / 0.05) * 100
        flat_component = flatness_score * 0.2
    else:
        flat_component = 0.0

    score = round(min(ems_component + spike_component + flat_component, 100.0), 2)

    return {
        "burnout_risk_score": score,
        "burnout_alert":      score >= 70,
        "insufficient_data":  False,
        "components": {
            "ems_sustained":  round(ems_component, 2),
            "ems_spike":      round(spike_component, 2),
            "emotional_flat": round(flat_component, 2)
        }
    }
# ══════════════════════════════════════════════════════════
# AGENT 3 — Workload Management (Time-Aware)
# ══════════════════════════════════════════════════════════

def compute_workload_label(
    ems:              float,
    burnout_score:    float,
    submission_time:  datetime,
    dominant_emotion: str = "neutral"
) -> dict:

    NEGATIVE_EMOTIONS = {"sadness","fear","anger","disgust","pessimism"}
    POSITIVE_EMOTIONS = {"joy","trust","love","optimism","anticipation"}

    hour = submission_time.hour

    # Primary mood signal — current emotion first, then EMS trend
    if dominant_emotion in NEGATIVE_EMOTIONS:
        mood = "negative"
    elif dominant_emotion in POSITIVE_EMOTIONS and ems < 50:
        mood = "positive"
    elif ems >= 65 or burnout_score >= 70:
        mood = "negative"
    elif ems <= 30:
        mood = "positive"
    else:
        mood = "neutral"

    # 6 time-based scenarios
    # Morning   = 6AM - 12PM
    # Afternoon = 12PM - 5PM
    # Evening   = 5PM - 8PM
    # Night     = 8PM - 6AM

    if 6 <= hour < 12:
        # Morning
        if mood == "positive":
            return {
                "scenario":     1,
                "energy_label": "deep_work",
                "apply_to":     "today",
                "time_slot":    "morning",
                "mood":         mood,  
                "message":      "Great energy this morning. Perfect time for focused deep work."
            }
        elif mood == "negative":
            return {
                "scenario":     2,
                "energy_label": "light_start",
                "apply_to":     "today",
                "time_slot":    "morning",
                "mood":         mood,  
                "message":      "Start gently. Light tasks only — give yourself time to settle in."
            }
        else:
            return {
                "scenario":     3,
                "energy_label": "moderate_work",
                "apply_to":     "today",
                "time_slot":    "morning",
                "mood":         mood,  
                "message":      "Steady morning ahead. Mix focused work with short breaks."
            }

    elif 12 <= hour < 17:
        # Afternoon
        if mood == "positive":
            return {
                "scenario":     1,
                "energy_label": "deep_work",
                "apply_to":     "today",
                "time_slot":    "afternoon",
                "mood":         mood,  
                "message":      "You're in a good flow. Use this afternoon for your most important task."
            }
        elif mood == "negative":
            return {
                "scenario":     2,
                "energy_label": "short_break",
                "apply_to":     "today",
                "time_slot":    "afternoon",
                "mood":         mood,  
                "message":      "Afternoon slump is real. Take a 15-min break before continuing."
            }
        else:
            return {
                "scenario":     3,
                "energy_label": "moderate_work",
                "apply_to":     "today",
                "time_slot":    "afternoon",
                "mood":         mood,  
                "message":      "Manageable afternoon. Wrap up pending work and take regular breaks."
            }

    elif 17 <= hour < 20:
        # Evening
        if mood == "positive":
            return {
                "scenario":     4,
                "energy_label": "wind_down_plan",
                "apply_to":     "tomorrow",
                "time_slot":    "evening",
                "mood":         mood,  
                "message":      "Good day today. Wrap up now and plan tomorrow before you rest."
            }
        elif mood == "negative":
            return {
                "scenario":     5,
                "energy_label": "recovery_evening",
                "apply_to":     "today",
                "time_slot":    "evening",
                "mood":         mood,  
                "message":      "Evening is for recovery. Stop work, do something you enjoy."
            }
        else:
            return {
                "scenario":     4,
                "energy_label": "wind_down_plan",
                "apply_to":     "tomorrow",
                "time_slot":    "evening",
                "mood":         mood,  
                "message":      "Wind down now. Light activity and early sleep will help tomorrow."
            }

    else:
        # Night (8PM+)
        if mood == "positive":
            return {
                "scenario":     4,
                "energy_label": "rest_tonight",
                "apply_to":     "tomorrow",
                "time_slot":    "night",
                "mood":         mood,  
                "message":      "Good day. Rest well tonight and plan something meaningful for tomorrow."
            }
        else:
            return {
                "scenario":     6,
                "energy_label": "rest_now",
                "apply_to":     "tomorrow",
                "time_slot":    "night",
                "mood":         mood,  
                "message":      "It's late and you're drained. Rest is the only right move now."
            }
        
# ══════════════════════════════════════════════════════════
# AGENT 4 — Trigger Detection
# ══════════════════════════════════════════════════════════

def detect_triggers(user_id: str) -> list:
    """
    Identifies recurring topics co-occurring with high stress
    from the past 7 and 30 days of journal entries.
    Returns list of trigger strings.
    """
    import re

    # Common stress trigger keywords
    TRIGGER_KEYWORDS = [
        "deadline", "deadlines", "exam", "exams", "test", "assignment",
        "work", "meeting", "meetings", "boss", "manager", "sleep",
        "insomnia", "argument", "fight", "money", "bills", "health",
        "sick", "tired", "exhausted", "stress", "pressure", "project",
        "presentation", "college", "class", "professor", "family",
        # Telugu
        "పరీక్ష", "పని", "నిద్ర", "ఒత్తిడి",
        # Hindi
        "परीक्षा", "काम", "नींद", "तनाव",
    ]

    # Get high-stress entries from last 30 days
    vectors = get_recent_vectors(user_id, days=30)
    NEGATIVE_EMOTIONS = {"sadness", "fear", "anger", "disgust", "pessimism"}

    high_stress = [
        v for v in vectors
        if v.get("dominant_emotion") in NEGATIVE_EMOTIONS
        and v.get("confidence", 0) >= 0.70
    ]

    if not high_stress:
        return []

    # Extract topics from transcripts/text stored in vectors
    trigger_counts = {}
    for v in high_stress:
        text = v.get("transcript", "") or ""
        text_lower = text.lower()
        for keyword in TRIGGER_KEYWORDS:
            if keyword in text_lower:
                trigger_counts[keyword] = trigger_counts.get(keyword, 0) + 1

    # Return triggers appearing 2+ times
    triggers = [k for k, count in trigger_counts.items() if count >= 2]
    return triggers[:5]  # top 5 only


# ══════════════════════════════════════════════════════════
# AGENT 4 — Recommendation
# ══════════════════════════════════════════════════════════

def get_feedback_history(user_id: str, dominant_emotion: str) -> list:
    feedback_col = mongo_db["feedback_log"]
    # Get positive feedback across ALL emotions for context
    all_feedback = list(feedback_col.find(
        {"user_id": user_id},
        sort=[("timestamp", -1)],
        limit=20
    ))
    return [
        {"item": r.get("suggestion_item",""), "score": r.get("feedback_score",0),
         "emotion": r.get("dominant_emotion","")}
        for r in all_feedback
    ]

def get_interest_profile(user_id: str) -> dict:
    """
    Fetches user interest profile from PostgreSQL via MongoDB cache.
    """
    from app.database import mongo_db
    profile = mongo_db["interest_profiles_cache"].find_one({"user_id": user_id})
    if profile:
        return profile.get("interests", {})
    return {}


# ══════════════════════════════════════════════════════════
# MAIN — Run Full Agent Pipeline
# ══════════════════════════════════════════════════════════

def run_agent_pipeline(
    user_id: str,
    entry_id: str,
    journal_text: str,
    dominant_emotion: str,
    active_emotions: list,
    emotion_scores: dict,
    submission_time: datetime,
    language: str = "en"
) -> dict:
    """
    Runs all 4 agents sequentially after a journal entry is saved.
    Returns complete agent state including suggestion.
    """

    print(f"Running agent pipeline for user {user_id}")

    # Agent 1 — EMS
    ems_result = compute_ems(user_id)
    ems        = ems_result["ems"]
    ems_14day  = ems_result["ems_14day"]
    print(f"  EMS: {ems} | Trend: {ems_result['trend']}")

    # Agent 2 — Burnout Risk
    burnout_result = compute_burnout_risk(user_id, ems, ems_14day)
    burnout_score  = burnout_result["burnout_risk_score"]
    print(f"  Burnout Risk: {burnout_score} | Alert: {burnout_result['burnout_alert']}")

    # Agent 3 — Workload
    workload_result = compute_workload_label(
        ems              = ems,
        burnout_score    = burnout_score,
        submission_time  = submission_time,
        dominant_emotion = dominant_emotion   # pass this
    )
    scenario        = workload_result["scenario"]
    print(f"  Scenario: {scenario} | Energy: {workload_result['energy_label']}")

    # Agent 4 — Triggers + Interest Profile + Feedback
    triggers         = detect_triggers(user_id)
    interest_profile = get_interest_profile(user_id)
    feedback_history = get_feedback_history(user_id, dominant_emotion)
    print(f"  Triggers: {triggers}")

    # ── Music Recommendations ─────────────────────
    favorite_artists = interest_profile.get("artists", [])
    music_genres     = interest_profile.get("music", [])

    music_result = get_music_recommendations(
        dominant_emotion=dominant_emotion,
        interest_profile=interest_profile,
        count=3
    )

    print(f"  Music Tracks Found: {len(music_result)}")
    try:
        wellness_docs = retrieve_wellness_context(
            dominant_emotion,
            ems,
            burnout_score
        )

        user_memory = retrieve_user_memory(
            user_id,
            dominant_emotion
        )

        successful_interventions = (
            retrieve_successful_interventions(
                user_id,
                dominant_emotion
            )
        )

        positive_interventions = (
            successful_interventions.get(
                "positive", []
            )
        )

        negative_interventions = (
            successful_interventions.get(
                "negative", []
            )
        )

        rag_context = build_rag_context(
            wellness_docs=wellness_docs,
            user_memory=user_memory,
            past_successes=positive_interventions,
            negative_interventions=negative_interventions,
            dominant_emotion=dominant_emotion,
            ems=ems,
            burnout_score=burnout_score
        )

        print(
            f"  RAG: "
            f"{len(wellness_docs)} wellness + "
            f"{len(user_memory)} memories + "
            f"{len(positive_interventions)} helpful + "
            f"{len(negative_interventions)} avoid"
        )

    except Exception as e:
        print(
            f"  RAG retrieval failed "
            f"(non-critical): {e}"
        )
        rag_context = ""
    # Store this journal in user memory for future retrieval
    try:
        store_journal_embedding(
            user_id          = user_id,
            entry_id         = entry_id,
            text             = journal_text,
            dominant_emotion = dominant_emotion,
            ems              = ems,
            date             = submission_time.strftime("%Y-%m-%d")
        )
    except Exception as e:
        print(f"  RAG store journal failed (non-critical): {e}")

    # Agent 4 — Generate Suggestion via Groq
    suggestion = generate_suggestion(
        journal_text      = journal_text,
        dominant_emotion  = dominant_emotion,
        active_emotions   = active_emotions,
        emotion_scores    = emotion_scores,
        interest_profile  = interest_profile,
        scenario          = scenario,
        feedback_history  = feedback_history,
        language          = language,
        triggers          = triggers,
        user_id           = user_id,
        ems               = ems,
        ems_trend         = ems_result["trend"],
        burnout_score=burnout_score,
        rag_context       = rag_context    # NEW
    )


    print(f"  Suggestion: {suggestion[:60]}...")

    # Build complete agent state
    agent_state = {
        "user_id":          user_id,
        "entry_id":         entry_id,
        "timestamp":        datetime.utcnow(),
        "entry_count": ems_result.get("entry_count", 0),
        
        # EMS
        "ems":              ems,
        "ems_7day":         ems_result["ems_7day"],
        "ems_14day":        ems_14day,
        "ems_trend":        ems_result["trend"],

        # Burnout
        "burnout_risk_score": burnout_score,
        "burnout_alert":      burnout_result["burnout_alert"],

        # Workload
        "scenario":         scenario,
        "energy_label":     workload_result["energy_label"],
        "apply_to":         workload_result["apply_to"],
        "mood":             workload_result["mood"],

        # Recommendation
        "suggestion":       suggestion,
        "triggers":         triggers,
        "music_tracks": music_result,

        # Meta
        "dominant_emotion": dominant_emotion,
        "language":         language,

        # "music_recommendations": music_recommendations,

        "scenario":     workload_result["scenario"],
        "energy_label": workload_result["energy_label"],
        "apply_to":     workload_result["apply_to"],
        "time_slot":    workload_result.get("time_slot", ""),
        "mood":         workload_result.get("mood", "neutral"),   # use .get() with default
        "message":      workload_result.get("message", ""),
    }

    # Save to MongoDB
    clean_state = sanitize_for_mongo(agent_state)

    # At the end of run_agent_pipeline() — before return
    agent_state_col.update_one(
        {"user_id": user_id},
        {"$set": to_python(agent_state)},
        upsert=True
    )
    return to_python(agent_state)