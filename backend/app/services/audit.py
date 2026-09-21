from typing import Optional
from sqlalchemy.orm import Session
from ..models import AuditLog

def log_audit(
    db: Session,
    admin_email: str,
    action: str,
    admin_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    Records an administrative action in the immutable audit log table.
    """
    try:
        log_entry = AuditLog(
            admin_id=admin_id,
            admin_email=admin_email,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            details=details,
            ip_address=ip_address
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    except Exception as e:
        db.rollback()
        print(f"Warning: Failed to write audit log: {e}")
        return None
