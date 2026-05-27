from fastapi import APIRouter, HTTPException
from app.database import mongo_db
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.rag.retriever import store_intervention_feedback
router = APIRouter(prefix="/journal", tags=["feedback"])

feedback_log_col       = mongo_db["feedback_log"]
preference_scores_col  = mongo_db["preference_scores"]
agent_state_col        = mongo_db["agent_state"]
journal_history_col    = mongo_db["journal_history"]


# ══════════════════════════════════════════════════════════
# FEEDBACK SUBMIT
# ══════════════════════════════════════════════════════════
class FeedbackRequest(BaseModel):
    user_id:          str
    entry_id:         str
    suggestion_item:  str
    feedback_score:   int
    dominant_emotion: str


@router.post("/feedback")
def submit_feedback(req: FeedbackRequest):
    if not -5 <= req.feedback_score <= 5:
        raise HTTPException(status_code=400, detail="Score must be between -5 and +5")

    timestamp = datetime.utcnow()

    feedback_log_col.insert_one({
        "user_id":          req.user_id,
        "entry_id":         req.entry_id,
        "dominant_emotion": req.dominant_emotion,
        "suggestion_item":  req.suggestion_item,
        "feedback_score":   req.feedback_score,
        "timestamp":        timestamp
    })

    existing = preference_scores_col.find_one({
        "user_id":          req.user_id,
        "dominant_emotion": req.dominant_emotion,
        "suggestion_item":  req.suggestion_item
    })

    if existing:
        new_score  = existing["cumulative_score"] + req.feedback_score
        new_count  = existing["feedback_count"] + 1
        suppressed = new_score <= -10
        preference_scores_col.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "cumulative_score": new_score,
                "feedback_count":   new_count,
                "suppressed":       suppressed,
                "last_updated":     timestamp
            }}
        )
    else:
        preference_scores_col.insert_one({
            "user_id":          req.user_id,
            "dominant_emotion": req.dominant_emotion,
            "suggestion_item":  req.suggestion_item,
            "cumulative_score": req.feedback_score,
            "feedback_count":   1,
            "suppressed":       req.feedback_score <= -10,
            "last_updated":     timestamp
        })
    if req.feedback_score >= 3:
        try:
            # Get the suggestion from agent_state
            last_state = agent_state_col.find_one({"entry_id": req.entry_id})
            suggestion = last_state.get("suggestion","") if last_state else req.suggestion_item
            store_intervention_feedback(
                user_id          = req.user_id,
                entry_id         = req.entry_id,
                suggestion       = suggestion,
                dominant_emotion = req.dominant_emotion,
                feedback_score   = req.feedback_score
            )
        except Exception as e:
            print(f"RAG store success failed (non-critical): {e}")
    if req.feedback_score >= 4:
        message = "Great! We'll suggest this more often when you feel this way."
    elif req.feedback_score >= 1:
        message = "Good to know. We'll keep this in mind."
    elif req.feedback_score == 0:
        message = "Noted. We'll try something different next time."
    elif req.feedback_score >= -3:
        message = "Sorry it didn't help. We'll try something different."
    else:
        message = "Understood. We'll avoid this for this mood."

    return {
        "message":          message,
        "feedback_score":   req.feedback_score,
        "suggestion_item":  req.suggestion_item,
        "dominant_emotion": req.dominant_emotion,
        "timestamp":        timestamp.isoformat()
    }


# ══════════════════════════════════════════════════════════
# PENDING FEEDBACK
# ══════════════════════════════════════════════════════════
@router.get("/feedback/pending/{user_id}")
def get_pending_feedback(user_id: str):
    last_state = agent_state_col.find_one(
        {"user_id": user_id},
        sort=[("timestamp", -1)]
    )

    if not last_state:
        return {"has_pending": False}

    entry_id = last_state.get("entry_id")
    existing = feedback_log_col.find_one({
        "user_id":  user_id,
        "entry_id": entry_id
    })

    if existing:
        return {"has_pending": False}

    suggestion = last_state.get("suggestion", "")
    ts         = last_state.get("timestamp", "")

    return {
        "has_pending":      True,
        "entry_id":         entry_id,
        "suggestion":       suggestion,
        "dominant_emotion": last_state.get("dominant_emotion", ""),
        "timestamp":        ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
        "prompt":           f"Last time we suggested: '{suggestion[:80]}...'. Did it help? (Rate -5 to +5)"
    }


# ══════════════════════════════════════════════════════════
# JOURNAL HISTORY
# ══════════════════════════════════════════════════════════
@router.get("/history/{user_id}")
def get_journal_history(user_id: str, limit: int = 10):
    entries = list(journal_history_col.find(
        {"user_id": user_id},
        {"_id": 0},
        sort=[("timestamp", -1)],
        limit=limit
    ))
    for e in entries:
        if isinstance(e.get("timestamp"), datetime):
            e["timestamp"] = e["timestamp"].isoformat()
        # Convert any numpy or non-serializable types
        for key in ["ems", "burnout_risk"]:
            if key in e:
                try:
                    e[key] = float(e[key])
                except Exception:
                    e[key] = 0.0

    return {"history": entries, "count": len(entries)}


# ══════════════════════════════════════════════════════════
# FEEDBACK STATS (for analytics)
# ══════════════════════════════════════════════════════════
@router.get("/feedback/stats/{user_id}")
def get_feedback_stats(user_id: str):
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id":       "$suggestion_item",
            "avg_score": {"$avg": "$feedback_score"},
            "count":     {"$sum": 1}
        }},
        {"$sort": {"avg_score": -1}},
        {"$limit": 8}
    ]
    results = list(mongo_db["feedback_log"].aggregate(pipeline))
    stats   = [
        {
            "item":      r["_id"][:25] if r["_id"] else "unknown",
            "avg_score": round(r["avg_score"], 1),
            "count":     r["count"]
        }
        for r in results
    ]
    return {"stats": stats}


# ══════════════════════════════════════════════════════════
# JOURNAL PROMPTS
# ══════════════════════════════════════════════════════════
@router.get("/prompts/{user_id}")
def get_journal_prompts(user_id: str):
    from app.services.langchain_service import generate_journal_prompts

    last_state = agent_state_col.find_one(
        {"user_id": user_id},
        sort=[("timestamp", -1)]
    )
    history = list(journal_history_col.find(
        {"user_id": user_id},
        {"dominant_emotion": 1, "text": 1, "ems": 1, "_id": 0},
        sort=[("timestamp", -1)],
        limit=3
    ))

    dominant_emotion = last_state.get("dominant_emotion", "neutral") if last_state else "neutral"
    ems              = float(last_state.get("ems", 0.0)) if last_state else 0.0
    language         = last_state.get("language", "en") if last_state else "en"

    prompts = generate_journal_prompts(
        dominant_emotion = dominant_emotion,
        ems              = ems,
        history          = history,
        language         = language
    )

    return {
        "prompts":          prompts,
        "dominant_emotion": dominant_emotion,
        "ems":              round(ems, 1)
    }


# ══════════════════════════════════════════════════════════
# DEBUG ENDPOINT (temporary — remove after fixing streak)
# ══════════════════════════════════════════════════════════
@router.get("/streak/debug/{user_id}")
def debug_streak(user_id: str):
    sample  = journal_history_col.find_one({"user_id": str(user_id)})
    sample2 = journal_history_col.find_one({})
    total   = journal_history_col.count_documents({})
    return {
        "searched_for":          user_id,
        "found_with_exact":      sample is not None,
        "total_docs":            total,
        "first_doc_user_id":     str(sample2.get("user_id", "none")) if sample2 else "empty",
        "first_doc_type":        type(sample2.get("user_id", "")).__name__ if sample2 else "none",
        "user_doc_count":        journal_history_col.count_documents({"user_id": str(user_id)})
    }


# ══════════════════════════════════════════════════════════
# STREAK
# ══════════════════════════════════════════════════════════
@router.get("/streak/{user_id}")
def get_streak(user_id: str):
    # Both stored as plain strings — confirmed from MongoDB check
    entries = list(journal_history_col.find(
        {"user_id": str(user_id)},
        {"timestamp": 1, "_id": 0}
    ))

    total_entries = len(entries)

    if not entries:
        return {
            "streak":          0,
            "longest_streak":  0,
            "total_entries":   0,
            "journaled_today": False,
            "last_entry_date": None
        }

    def parse_date(ts):
        if hasattr(ts, 'date'):
            return ts.date()
        try:
            return datetime.fromisoformat(str(ts)).date()
        except Exception:
            return None

    dates = sorted(
        set(d for d in (parse_date(e["timestamp"]) for e in entries) if d),
        reverse=True
    )

    if not dates:
        return {
            "streak":          0,
            "longest_streak":  0,
            "total_entries":   total_entries,
            "journaled_today": False,
            "last_entry_date": None
        }

    today     = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)

    # Current streak
    streak = 0
    if dates[0] in [today, yesterday]:
        streak = 1
        for i in range(1, len(dates)):
            if (dates[i-1] - dates[i]).days == 1:
                streak += 1
            else:
                break

    # Longest streak
    longest = 1
    current = 1
    for i in range(1, len(dates)):
        if (dates[i-1] - dates[i]).days == 1:
            current += 1
            longest = max(longest, current)
        else:
            current = 1

    return {
        "streak":          streak,
        "longest_streak":  longest,
        "total_entries":   total_entries,
        "journaled_today": dates[0] == today,
        "last_entry_date": str(dates[0])
    }