from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, emotion_vectors_col, mongo_db
from app.models.journal import JournalMetadata
from app.services.speech_pipeline import run_speech_pipeline
from app.services.agent_service import run_agent_pipeline, to_python
from datetime import datetime
import uuid, shutil, os

router = APIRouter(prefix="/journal", tags=["journal"])

journal_history_col = mongo_db["journal_history"]


@router.post("/voice")
async def process_voice_journal(
    user_id: str      = Form(...),
    audio:   UploadFile = File(...),
    db:      Session  = Depends(get_db)
):
    # Save uploaded audio to temp file
    temp_path = f"/tmp/{uuid.uuid4()}.wav"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(audio.file, f)

    try:
        result = run_speech_pipeline(temp_path)
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Speech processing failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    if result.get("stt_failure"):
        raise HTTPException(
            status_code=422,
            detail="Audio too short or unclear. Please re-record."
        )

    entry_id  = str(uuid.uuid4())
    timestamp = datetime.utcnow()

    # Save metadata to PostgreSQL
    metadata = JournalMetadata(
        id=entry_id,
        user_id=user_id,
        modality="speech",
        detected_language=result.get("detected_language", "en"),
        submission_time=timestamp,
        low_confidence_emotion=result.get("low_confidence_emotion", False),
        stt_failure=False,
        acoustic_excluded=result.get("acoustic_excluded", False),
    )
    db.add(metadata)
    db.commit()

    # Save emotion vector to MongoDB
    emotion_vectors_col.insert_one(to_python({
        "entry_id":           entry_id,
        "user_id":            user_id,
        "modality":           "speech",
        "timestamp":          timestamp,
        "transcript":         result.get("transcript", ""),
        "detected_language":  result.get("detected_language", "en"),
        "emotion_scores":     result.get("emotion_scores", {}),
        "dominant_emotion":   result.get("dominant_emotion", "neutral"),
        "active_emotions":    result.get("active_emotions", []),
        "confidence":         result.get("confidence", 0.0),
        "acoustic_scores":    result.get("acoustic_scores", {}),
        "dominant_acoustic":  result.get("dominant_acoustic", ""),
        "acoustic_excluded":  result.get("acoustic_excluded", False),
        "low_confidence_emotion": result.get("low_confidence_emotion", False),
    }))

    # Run agent pipeline
    agent = run_agent_pipeline(
        user_id          = user_id,
        entry_id         = entry_id,
        dominant_emotion = result.get("dominant_emotion", "neutral"),
        active_emotions  = result.get("active_emotions", []),
        emotion_scores   = result.get("emotion_scores", {}),
        submission_time  = timestamp,
        language         = result.get("detected_language", "en")
    )

    # Save to journal history
    journal_history_col.insert_one(to_python({
        "entry_id":         entry_id,
        "user_id":          user_id,
        "modality":         "speech",
        "text":             result.get("transcript", ""),
        "timestamp":        timestamp,
        "dominant_emotion": result.get("dominant_emotion", "neutral"),
        "active_emotions":  result.get("active_emotions", []),
        "emotion_scores":   result.get("emotion_scores", {}),
        "confidence":       result.get("confidence", 0.0),
        "ems":              agent["ems"],
        "burnout_risk":     agent["burnout_risk_score"],
        "energy_label":     agent["energy_label"],
        "scenario":         agent["scenario"],
        "suggestion":       agent["suggestion"],
        "triggers":         agent["triggers"],
    }))

    return to_python({
        "user_id":           user_id,
        "entry_id":          entry_id,
        "modality":          "speech",
        "transcript":        result.get("transcript", ""),
        "detected_language": result.get("detected_language", "en"),
        "dominant_emotion":  result.get("dominant_emotion", "neutral"),
        "active_emotions":   result.get("active_emotions", []),
        "emotion_scores":    result.get("emotion_scores", {}),
        "confidence":        result.get("confidence", 0.0),
        "dominant_acoustic": result.get("dominant_acoustic", ""),
        "acoustic_excluded": result.get("acoustic_excluded", False),
        "timestamp":         timestamp.isoformat(),
        "ems":               agent["ems"],
        "ems_trend":         agent["ems_trend"],
        "burnout_risk":      agent["burnout_risk_score"],
        "burnout_alert":     agent["burnout_alert"],
        "energy_label":      agent["energy_label"],
        "apply_to":          agent["apply_to"],
        "time_slot":         agent.get("time_slot", ""),
        "scenario":          agent["scenario"],
        "suggestion":        agent["suggestion"],
        "triggers":          agent["triggers"],
        "entry_count":       agent.get("entry_count", 0),
        "music_recommendations": agent.get("music_recommendations", []),
    })