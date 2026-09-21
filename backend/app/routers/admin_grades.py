from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Admin, GradeConfiguration
from ..schemas import GradeConfigItem, GradeConfigCreate, GradeConfigUpdate
from ..auth import get_current_admin
from ..services.audit import log_audit

router = APIRouter(prefix="/admin/grades", tags=["Grade Scale Configuration"])


@router.get("", response_model=List[GradeConfigItem])
def get_all_grade_configurations(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Returns all configurable grade-to-point mappings.
    """
    configs = db.query(GradeConfiguration).order_by(GradeConfiguration.grade_point.desc()).all()
    return configs


@router.post("", response_model=GradeConfigItem)
def create_grade_configuration(
    data: GradeConfigCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Add a new letter grade scale configuration.
    """
    client_ip = request.client.host if request.client else "unknown"
    VALID_CUTM_GRADES = {"O", "E", "A", "B", "C", "D", "F", "M", "S", "R"}
    letter = data.grade_letter.strip().upper()

    if letter not in VALID_CUTM_GRADES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid grade '{letter}'. Valid grades are O, E, A, B, C, D, F, M, S, R."
        )

    existing = db.query(GradeConfiguration).filter(GradeConfiguration.grade_letter == letter).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Grade letter '{letter}' already exists. Use PUT to update."
        )

    config = GradeConfiguration(
        grade_letter=letter,
        grade_point=data.grade_point,
        description=data.description,
        min_marks=data.min_marks,
        max_marks=data.max_marks,
        is_active=data.is_active
    )
    db.add(config)
    db.commit()
    db.refresh(config)

    log_audit(
        db=db,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        action="CREATE_GRADE_CONFIG",
        entity_type="GradeConfiguration",
        entity_id=str(config.id),
        details=f"Created grade {letter} = {data.grade_point} GP",
        ip_address=client_ip
    )

    return config


@router.put("/{config_id}", response_model=GradeConfigItem)
def update_grade_configuration(
    config_id: int,
    data: GradeConfigUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Update point mappings or thresholds for an existing grade scale.
    """
    client_ip = request.client.host if request.client else "unknown"
    config = db.query(GradeConfiguration).filter(GradeConfiguration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade configuration not found.")

    old_gp = config.grade_point
    if data.grade_point is not None:
        config.grade_point = data.grade_point
    if data.description is not None:
        config.description = data.description
    if data.min_marks is not None:
        config.min_marks = data.min_marks
    if data.max_marks is not None:
        config.max_marks = data.max_marks
    if data.is_active is not None:
        config.is_active = data.is_active

    db.commit()
    db.refresh(config)

    log_audit(
        db=db,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        action="UPDATE_GRADE_CONFIG",
        entity_type="GradeConfiguration",
        entity_id=str(config.id),
        details=f"Updated grade {config.grade_letter} from {old_gp} to {config.grade_point} GP",
        ip_address=client_ip
    )

    return config


@router.delete("/{config_id}")
def delete_grade_configuration(
    config_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Remove or deactivate a grade scale configuration.
    """
    client_ip = request.client.host if request.client else "unknown"
    config = db.query(GradeConfiguration).filter(GradeConfiguration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade configuration not found.")

    letter = config.grade_letter
    db.delete(config)
    db.commit()

    log_audit(
        db=db,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        action="DELETE_GRADE_CONFIG",
        entity_type="GradeConfiguration",
        entity_id=str(config_id),
        details=f"Deleted grade scale {letter}",
        ip_address=client_ip
    )

    return {"message": f"Grade configuration '{letter}' deleted successfully."}
