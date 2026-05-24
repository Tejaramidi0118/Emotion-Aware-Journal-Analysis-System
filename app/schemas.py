from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime

# ── Auth ───────────────────────────────────────────────────
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    preferred_language: str = "en"
    interest_profile: Dict = {}

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ── Journal ────────────────────────────────────────────────
class TextJournalRequest(BaseModel):
    text: str
    user_id: str

class EmotionVectorResponse(BaseModel):
    entry_id: str
    modality: str
    dominant_emotion: str
    active_emotions: List[str]
    emotion_scores: Dict[str, float]
    confidence: float
    detected_language: str
    low_confidence_emotion: bool
    timestamp: datetime

class SpeechEmotionResponse(EmotionVectorResponse):
    acoustic_scores: Optional[Dict[str, float]] = None
    dominant_acoustic: Optional[str] = None
    acoustic_excluded: bool = False
    stt_failure: bool = False