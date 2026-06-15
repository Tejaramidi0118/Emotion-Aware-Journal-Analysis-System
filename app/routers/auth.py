from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User
from app.schemas import SignupRequest, LoginRequest, TokenResponse
from app.config import settings
import uuid

import random
from app.database import mongo_db

from app.schemas import SignupRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {**data, "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )


@router.post("/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):

    # Check if email already exists
    if db.query(User).filter(
        User.email == req.email
    ).first():

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    if len(req.password) < 8:

        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters."
        )

    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        preferred_language=req.preferred_language,
        interest_profile=req.interest_profile
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Cache interest profile in MongoDB
    try:
        if req.interest_profile:
            mongo_db["interest_profiles_cache"].update_one(
                {"user_id": str(user.id)},
                {"$set": {"interests": req.interest_profile}},
                upsert=True
            )
    except Exception as e:
        print(f"Failed to cache interest profile on signup: {e}")

    return {
        "message": "User created",
        "user_id": str(user.id)
    }
@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub":   str(user.id),
        "email": user.email,
        "name":  user.full_name   # ADD THIS
    })
    return {"access_token": token}


import uuid as uuid_lib

@router.get("/profile/{user_id}")
def get_profile(user_id: str, db: Session = Depends(get_db)):
    try:
        uid = uuid_lib.UUID(user_id)  # convert string to UUID object
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "full_name":          user.full_name,
        "email":              user.email,
        "preferred_language": user.preferred_language,
        "interest_profile":   user.interest_profile or {}
    }


@router.put("/profile/{user_id}")
def update_profile(user_id: str, body: dict, db: Session = Depends(get_db)):
    try:
        uid = uuid_lib.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.interest_profile = body.get("interest_profile", user.interest_profile)
    db.commit()

    mongo_db["interest_profiles_cache"].update_one(
        {"user_id": str(user_id)},
        {"$set": {"interests": user.interest_profile}},
        upsert=True
    )
    return {"message": "Profile updated successfully"}


