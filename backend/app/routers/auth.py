from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import Admin
from ..schemas import LoginRequest, Token, AdminResponse
from ..auth import (
    verify_password,
    create_access_token,
    get_current_admin,
    check_login_rate_limit,
)
from ..services.audit import log_audit

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def admin_login(
    login_data: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Secure admin authentication with rate limiting, password hashing verification, and JWT session.
    """
    client_ip = request.client.host if request.client else "unknown"
    
    # 1. Enforce rate limiting to prevent brute-force attacks
    check_login_rate_limit(client_ip)

    identifier = login_data.username_or_email.strip()
    
    # 2. Look up admin by email or username
    admin = db.query(Admin).filter(
        (Admin.email == identifier) | (Admin.username == identifier)
    ).first()

    if not admin or not verify_password(login_data.password, admin.hashed_password):
        log_audit(
            db=db,
            admin_email=identifier,
            action="LOGIN_FAILED",
            entity_type="Admin",
            details="Invalid username or password attempt",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username/email and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your admin account is inactive. Please contact system administrator."
        )

    # 3. Update last login timestamp
    admin.last_login = datetime.utcnow()
    db.commit()

    # 4. Issue JWT access token
    access_token = create_access_token(data={"sub": str(admin.id), "email": admin.email, "role": admin.role})

    # 5. Set secure cookie
    response.set_cookie(
        key="admin_token",
        value=access_token,
        httponly=True,
        max_age=60 * 60 * 24,  # 24 hours
        samesite="lax",
        secure=False  # Set to True in HTTPS production
    )

    # 6. Audit log successful login
    log_audit(
        db=db,
        admin_id=admin.id,
        admin_email=admin.email,
        action="LOGIN_SUCCESS",
        entity_type="Admin",
        entity_id=str(admin.id),
        details=f"Admin {admin.username} successfully logged in",
        ip_address=client_ip
    )

    admin_resp = AdminResponse(
        id=admin.id,
        username=admin.username,
        email=admin.email,
        full_name=admin.full_name,
        role=admin.role
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        admin=admin_resp
    )


@router.post("/logout")
def admin_logout(
    response: Response,
    request: Request,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Clears authentication cookie and logs admin logout event.
    """
    client_ip = request.client.host if request.client else "unknown"
    response.delete_cookie("admin_token")
    
    log_audit(
        db=db,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        action="LOGOUT",
        entity_type="Admin",
        entity_id=str(current_admin.id),
        details="Admin logged out",
        ip_address=client_ip
    )
    
    return {"message": "Successfully logged out."}


@router.get("/me", response_model=AdminResponse)
def get_current_admin_profile(current_admin: Admin = Depends(get_current_admin)):
    """
    Validates current active session and returns admin profile.
    """
    return AdminResponse(
        id=current_admin.id,
        username=current_admin.username,
        email=current_admin.email,
        full_name=current_admin.full_name,
        role=current_admin.role
    )
