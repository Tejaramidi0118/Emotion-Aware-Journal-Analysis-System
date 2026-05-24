from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.database import Base, engine
from app.routers import auth, journal_text, journal_voice
from app.routers import feedback   # add this

from fastapi.middleware.cors import CORSMiddleware

from fastapi import Request, HTTPException
from jose import jwt, JWTError


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Emotion-Aware Journal API", version="1.0.0")

app.include_router(auth.router)
app.include_router(journal_text.router)
app.include_router(journal_voice.router)
app.include_router(feedback.router)   # add this

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for now (dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.middleware("http")
async def verify_user_isolation(request: Request, call_next):
    # Skip public routes
    if request.url.path in ["/auth/signup", "/auth/login", "/", "/health"]:
        return await call_next(request)
    return await call_next(request)