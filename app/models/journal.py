from sqlalchemy import Column, String, DateTime, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime

class JournalMetadata(Base):
    __tablename__ = "journal_metadata"

    id                     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id                = Column(UUID(as_uuid=True), nullable=False, index=True)
    modality               = Column(String, nullable=False)  # "text" or "speech"
    detected_language      = Column(String)
    submission_time        = Column(DateTime, default=datetime.utcnow)
    low_confidence_lang    = Column(Boolean, default=False)
    low_confidence_emotion = Column(Boolean, default=False)
    stt_failure            = Column(Boolean, default=False)   # speech only
    acoustic_excluded      = Column(Boolean, default=False)   # speech only