from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import Admin, AuditLog
from ..schemas import AuditLogResponse, AuditLogItem
from ..auth import get_current_admin

router = APIRouter(prefix="/admin/audit-logs", tags=["Admin Audit Logs"])


@router.get("", response_model=AuditLogResponse)
def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    action: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Returns filterable, paginated audit trail of all administrative actions.
    """
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (AuditLog.admin_email.ilike(term)) |
            (AuditLog.action.ilike(term)) |
            (AuditLog.details.ilike(term)) |
            (AuditLog.ip_address.ilike(term))
        )

    total = query.count()
    offset = (page - 1) * limit
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()

    items = [
        AuditLogItem(
            id=log.id,
            admin_id=log.admin_id,
            admin_email=log.admin_email,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            ip_address=log.ip_address,
            timestamp=log.timestamp
        )
        for log in logs
    ]

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return AuditLogResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=items
    )
