from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from pymongo import MongoClient
from app.config import settings

# ── PostgreSQL ─────────────────────────────────────────────
engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── MongoDB ────────────────────────────────────────────────
mongo_client = MongoClient(settings.MONGO_URL)
mongo_db     = mongo_client[settings.MONGO_DB]


# ── Collections ────────────────────────────────────────────
emotion_vectors_col        = mongo_db["emotion_vectors"]
agent_state_col            = mongo_db["agent_state"]
journal_history_col        = mongo_db["journal_history"]
feedback_log_col           = mongo_db["feedback_log"]
preference_scores_col      = mongo_db["preference_scores"]
interest_profiles_cache_col = mongo_db["interest_profiles_cache"]


# ── Indexes (STRICTLY AS REQUIRED + FIXES) ─────────────────
# emotion_vectors
emotion_vectors_col.create_index([("user_id", 1), ("timestamp", -1)])

# agent_state (one per user)
agent_state_col.create_index([("user_id", 1)], unique=True)

# journal_history
journal_history_col.create_index([("user_id", 1), ("timestamp", -1)])

# feedback_log
feedback_log_col.create_index([("user_id", 1), ("timestamp", -1)])

# preference_scores (IMPORTANT: must be UNIQUE to avoid duplicates)
preference_scores_col.create_index(
    [("user_id", 1), ("dominant_emotion", 1), ("suggestion_item", 1)],
    unique=True
)

# interest_profiles_cache (one per user)
interest_profiles_cache_col.create_index([("user_id", 1)], unique=True)