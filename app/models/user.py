from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime


def default_interest_profile():
    return {
        "music": [],
        "activities": [],
        "hobbies": []
    }


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    email = Column(String, unique=True, nullable=False, index=True)

    hashed_password = Column(String, nullable=False)

    full_name = Column(String, nullable=False)

    # Keep language SINGLE SOURCE OF TRUTH here
    preferred_language = Column(String, default="en")  # te, hi, ml, en

    # JSON field (safe default)
    interest_profile = Column(JSON, default=default_interest_profile)

    created_at = Column(DateTime, default=datetime.utcnow)