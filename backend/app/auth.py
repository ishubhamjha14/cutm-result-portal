from datetime import datetime, timedelta
from typing import Optional, Dict
import time
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import Admin

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

# Simple in-memory rate limiter for login
LOGIN_ATTEMPTS: Dict[str, list] = {}
RATE_LIMIT_WINDOW_SECONDS = 60
MAX_LOGIN_ATTEMPTS = 30

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def check_login_rate_limit(client_ip: str):
    current_time = time.time()
    attempts = LOGIN_ATTEMPTS.get(client_ip, [])
    # Filter attempts within the rate limit window
    attempts = [t for t in attempts if current_time - t < RATE_LIMIT_WINDOW_SECONDS]
    if len(attempts) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please wait 1 minute before trying again."
        )
    attempts.append(current_time)
    LOGIN_ATTEMPTS[client_ip] = attempts

def get_current_admin(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Admin:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Check Authorization header first, then fallback to cookie
    auth_token = token
    if not auth_token:
        auth_token = request.cookies.get("admin_token")

    if not auth_token:
        raise credentials_exception

    payload = decode_access_token(auth_token)
    if payload is None:
        raise credentials_exception

    admin_id = payload.get("sub")
    if admin_id is None:
        raise credentials_exception

    try:
        admin_id_int = int(admin_id)
    except ValueError:
        raise credentials_exception

    admin = db.query(Admin).filter(Admin.id == admin_id_int, Admin.is_active == True).first()
    if admin is None:
        raise credentials_exception

    return admin
