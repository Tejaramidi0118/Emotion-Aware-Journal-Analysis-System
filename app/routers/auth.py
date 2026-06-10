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

from app.schemas import (
    SendOTPRequest,
    VerifyOTPRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest
)

from app.services.email_service import (
    send_signup_otp,
    send_password_reset_otp
)

from app.utils.otp import generate_otp



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

    # NEW: Check email verification
    verified = mongo_db["verified_emails"].find_one(
        {
            "email": req.email,
            "verified": True
        }
    )

    if not verified:

        raise HTTPException(
            status_code=400,
            detail="Please verify your email first"
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
    mongo_db["verified_emails"].delete_one(
        {
            "email": req.email
        }
    )

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

@router.post("/send-signup-otp")
def send_signup_verification_otp(
    req: SendOTPRequest
):  
    existing = mongo_db["email_otps"].find_one(
        {
            "email": req.email,
            "purpose": "signup"
        }
    )

    if existing:

        elapsed = (
            datetime.utcnow()
            - existing["created_at"]
        ).total_seconds()

        if elapsed < 60:

            raise HTTPException(
                status_code=429,
                detail="Please wait 60 seconds before requesting another OTP."
            )

    otp = generate_otp()

    mongo_db["email_otps"].update_one(
        {
            "email": req.email,
            "purpose": "signup"
        },
        {
            "$set": {
                "email": req.email,
                "otp": otp,
                "purpose": "signup",
                "attempts": 0,
                "created_at": datetime.utcnow(),
                "expires_at":
                    datetime.utcnow()
                    + timedelta(minutes=10)
            }
        },
        upsert=True
    )

    send_signup_otp(
        req.email,
        otp
    )

    return {
        "message":
            "OTP sent successfully"
    }

@router.post("/verify-signup-otp")
def verify_signup_otp(
    req: VerifyOTPRequest
):

    record = mongo_db["email_otps"].find_one(
        {
            "email": req.email,
            "purpose": "signup"
        }
    )

    if not record:

        raise HTTPException(
            status_code=400,
            detail="OTP not found"
        )

    if record["expires_at"] < datetime.utcnow():

        raise HTTPException(
            status_code=400,
            detail="OTP expired"
        )
    if record["attempts"] >= 5:

        raise HTTPException(
            status_code=400,
            detail="Too many failed attempts. Please request a new OTP."
        )
    if record["otp"] != req.otp:

        mongo_db["email_otps"].update_one(
            {
                "_id": record["_id"]
            },
            {
                "$inc": {
                    "attempts": 1
                }
            }
        )

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    mongo_db["verified_emails"].update_one(
        {
            "email": req.email
        },
        {
            "$set": {
                "email": req.email,
                "verified": True,
                "verified_at": datetime.utcnow(),
                "expires_at":
                    datetime.utcnow()
                    + timedelta(hours=1)
            }
        },
        upsert=True
    )

    mongo_db["email_otps"].delete_one(
        {
            "_id": record["_id"]
        }
    )

    return {
        "verified": True
    }

@router.post("/forgot-password")
def forgot_password(
    req: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.email == req.email
    ).first()

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    existing = mongo_db["email_otps"].find_one(
        {
            "email": req.email,
            "purpose": "reset_password"
        }
    )

    if existing:

        elapsed = (
            datetime.utcnow()
            - existing["created_at"]
        ).total_seconds()

        if elapsed < 60:

            raise HTTPException(
                status_code=429,
                detail="Please wait 60 seconds before requesting another OTP."
            )
    otp = generate_otp()

    mongo_db["email_otps"].update_one(
        {
            "email": req.email,
            "purpose": "reset_password"
        },
        {
            "$set": {
                "email": req.email,
                "otp": otp,
                "purpose": "reset_password",
                "attempts": 0,
                "created_at": datetime.utcnow(),
                "expires_at":
                    datetime.utcnow()
                    + timedelta(minutes=10)
            }
        },
        upsert=True
    )

    send_password_reset_otp(
        req.email,
        otp
    )

    return {
        "message": "Password reset OTP sent"
    }

@router.post("/reset-password")
def reset_password(
    req: ResetPasswordRequest,
    db: Session = Depends(get_db)
):

    record = mongo_db["email_otps"].find_one(
        {
            "email": req.email,
            "purpose": "reset_password"
        }
    )

    if not record:

        raise HTTPException(
            status_code=400,
            detail="OTP not found"
        )

    if record["expires_at"] < datetime.utcnow():

        raise HTTPException(
            status_code=400,
            detail="OTP expired"
        )
    if record["attempts"] >= 5:

        raise HTTPException(
            status_code=400,
            detail="Too many failed attempts. Please request a new OTP."
        )
    
    if record["otp"] != req.otp:

        mongo_db["email_otps"].update_one(
            {
                "_id": record["_id"]
            },
            {
                "$inc": {
                    "attempts": 1
                }
            }
        )

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    user = db.query(User).filter(
        User.email == req.email
    ).first()

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    if len(req.new_password) < 8:

        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters."
        )
    user.hashed_password = hash_password(
        req.new_password
    )

    db.commit()

    mongo_db["email_otps"].delete_one(
        {
            "_id": record["_id"]
        }
    )

    return {
        "message": "Password reset successful"
    }

