from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    MONGO_URL: str
    MONGO_DB: str
    SECRET_KEY: str = ""

    GROQ_API_KEY: str
    ENVIRONMENT: str
    HF_TOKEN: str
    HF_API_KEY: str
    # QDRANT_URL:     str = ""
    # QDRANT_API_KEY: str = ""
    SUPABASE_DB_URL: str = ""
    
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    XLM_MODEL_PATH: str = ""
    CNN_MODEL_PATH: str = ""
    XLM_BASE_MODEL: str = "xlm-roberta-base"
    RESEND_API_KEY: str

    EMAIL_ADDRESS: str
    EMAIL_APP_PASSWORD: str
    
    class Config:
        env_file = ".env"

settings = Settings()