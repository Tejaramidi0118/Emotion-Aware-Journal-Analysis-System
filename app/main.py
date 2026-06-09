from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from app.database import Base, engine
from app.routers import auth, journal_text, feedback
# from app.routers import auth, journal_text, journal_voice, feedback

from fastapi.middleware.cors import CORSMiddleware


# Create database tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(
    title="Emotion-Aware Journal API",
    version="1.0.0"
)

# Include routers
app.include_router(auth.router)
app.include_router(journal_text.router)
# app.include_router(journal_voice.router)
app.include_router(feedback.router)


@app.on_event("startup")
async def startup_event():
    """Initialize RAG system at startup."""
    try:
        from app.rag.wellness_kb import build_wellness_kb

        # Build wellness knowledge base
        build_wellness_kb()

        print("RAG system initialized.")

    except Exception as e:
        print(f"RAG init failed (non-critical): {e}")


@app.get("/")
def root():
    return {
        "status": "running",
        "rag": "enabled"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.middleware("http")
async def verify_user_isolation(request: Request, call_next):
    """
    Middleware for route-level user isolation checks.
    Public routes are skipped.
    """

    # Public routes
    public_routes = [
        "/auth/signup",
        "/auth/login",
        "/",
        "/health"
    ]

    # Skip authentication for public routes
    if request.url.path in public_routes:
        return await call_next(request)

    # Future protected-route validation logic
    response = await call_next(request)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://echomind-ai-2026.web.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)