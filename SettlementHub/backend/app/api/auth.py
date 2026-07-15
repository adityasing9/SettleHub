from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.models.models import User, UserPreference, Session as UserSession
from app.schemas.schemas import UserCreate, UserLogin, Token, UserResponse
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    exists = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    if exists:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    
    hashed_pwd = get_password_hash(user_in.password)
    db_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_pwd,
        role="Member"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    prefs = UserPreference(
        user_id=db_user.id,
        theme="dark",
        default_currency="INR",
        language="en"
    )
    db.add(prefs)
    db.commit()
    
    access_token = create_access_token(subject=db_user.id)
    
    expires_at = datetime.utcnow() + timedelta(days=7)
    db_session = UserSession(
        user_id=db_user.id,
        token=access_token,
        expires_at=expires_at,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent")
    )
    db.add(db_session)
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer", "user": db_user}

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, request: Request, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(
        (User.username == login_in.username_or_email) | (User.email == login_in.username_or_email),
        User.is_deleted == False
    ).first()
    
    if not db_user or not verify_password(login_in.password, db_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Incorrect username/email or password"
        )
    
    access_token = create_access_token(subject=db_user.id)
    
    expires_at = datetime.utcnow() + timedelta(days=7)
    db_session = UserSession(
        user_id=db_user.id,
        token=access_token,
        expires_at=expires_at,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent")
    )
    db.add(db_session)
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer", "user": db_user}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        db_session = db.query(UserSession).filter(UserSession.token == token).first()
        if db_session:
            db_session.is_active = False
            db.add(db_session)
            db.commit()
    return {"detail": "Successfully logged out"}
