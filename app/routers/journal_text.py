from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, emotion_vectors_col
from app.models.journal import JournalMetadata
from app.services.text_pipeline import run_text_pipeline
from app.services.agent_service import run_agent_pipeline, to_python
from app.schemas import TextJournalRequest
from datetime import datetime
import uuid
from app.database import journal_history_col
from app.services.agent_service import sanitize_for_mongo

router = APIRouter(prefix="/journal", tags=["journal"])

@router.post("/text")
def process_text_journal(req: TextJournalRequest, db: Session = Depends(get_db)):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    # Run text pipeline
    result    = run_text_pipeline(req.text)
    entry_id  = str(uuid.uuid4())
    timestamp = datetime.utcnow()

    # Save metadata to PostgreSQL
    metadata = JournalMetadata(
        id=entry_id,
        user_id=req.user_id,
        modality="text",
        detected_language=result["detected_language"],
        submission_time=timestamp,
        low_confidence_lang=result["low_confidence_lang"],
        low_confidence_emotion=result["low_confidence_emotion"],
    )
    db.add(metadata)
    db.commit()

    # Save emotion vector to MongoDB
    clean_result = sanitize_for_mongo(result)

    emotion_vectors_col.insert_one({
        "entry_id": entry_id,
        "user_id": req.user_id,
        "modality": "text",
        "timestamp": timestamp,
        "emotion_scores": clean_result["emotion_scores"],
        "dominant_emotion": clean_result["dominant_emotion"],
        "active_emotions": clean_result["active_emotions"],
        "confidence": clean_result["confidence"],
        "detected_language": clean_result["detected_language"],
        "low_confidence_emotion": clean_result["low_confidence_emotion"],
        "transcript": req.text,
    })

    # Run agent pipeline
    agent = run_agent_pipeline(
        user_id          = req.user_id,
        entry_id         = entry_id,
        journal_text     = req.text,
        dominant_emotion = result["dominant_emotion"],
        active_emotions  = result["active_emotions"],
        emotion_scores   = result["emotion_scores"],
        submission_time  = timestamp,
        language         = result["detected_language"]
    )

    journal_history_col.insert_one(to_python({
        "entry_id":         entry_id,
        "user_id":          req.user_id,
        "modality":         "text",
        "text":             req.text,
        "timestamp":        timestamp,
        "dominant_emotion": result["dominant_emotion"],
        "active_emotions":  result["active_emotions"],
        "emotion_scores":   result["emotion_scores"],
        "confidence":       result["confidence"],
        "ems":              agent["ems"],
        "burnout_risk":     agent["burnout_risk_score"],
        "energy_label":     agent["energy_label"],
        "scenario":         agent["scenario"],
        "suggestion":       agent["suggestion"],
        "triggers":         agent["triggers"],
        "source":           result.get("source", "xlm-roberta"),
    }))
    # After emotion_vectors_col.insert_one(...)
    try:
        from app.rag.retriever import store_journal_embedding
        store_journal_embedding(
            user_id          = req.user_id,
            entry_id         = entry_id,
            text             = req.text,
            dominant_emotion = result["dominant_emotion"],
            ems              = agent["ems"],
            date             = timestamp.strftime("%Y-%m-%d")
        )
    except Exception as e:
        print(f"RAG journal store failed (non-critical): {e}")
    return {
        # Emotion detection
        "user_id": req.user_id, 
        "entry_count":  agent.get("entry_count", 0),
        "entry_id":         entry_id,
        "modality":         "text",
        "dominant_emotion": result["dominant_emotion"],
        "active_emotions":  result["active_emotions"],
        "emotion_scores":   result["emotion_scores"],
        "confidence":       result["confidence"],
        "detected_language": result["detected_language"],
        "source":           result.get("source", "xlm-roberta"),
        "timestamp":        timestamp.isoformat(),

        # Agent results
        "ems":              agent["ems"],
        "ems_trend":        agent["ems_trend"],
        "burnout_risk":     agent["burnout_risk_score"],
        "burnout_alert":    agent["burnout_alert"],
        "energy_label":     agent["energy_label"],
        "apply_to":         agent["apply_to"],
        "scenario":         agent["scenario"],
        "suggestion":       agent["suggestion"],
        "triggers":         agent["triggers"],

        # Music recommendations
        "music_tracks":     agent.get("music_tracks", []),
    }