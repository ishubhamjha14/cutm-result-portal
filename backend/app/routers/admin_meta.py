from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from ..database import get_db
from ..models import Admin, Student, Result, Branch, Semester, Program, Subject, AuditLog
from ..schemas import DashboardStats, BranchItem, ProgramItem, SemesterItem
from ..auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Metadata & Dashboard"])


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Computes high-level analytics and statistical distribution across university branches and semesters.
    """
    total_students = db.query(func.count(Student.id)).scalar() or 0
    total_results = db.query(func.count(Result.id)).scalar() or 0
    total_branches = db.query(func.count(Branch.id)).scalar() or 0
    total_semesters = db.query(func.count(Semester.id)).scalar() or 0
    total_subjects = db.query(func.count(Subject.id)).scalar() or 0

    recent_uploads_count = db.query(func.count(AuditLog.id)).filter(
        AuditLog.action.in_(["IMPORT_RESULTS", "CREATE_RESULT"])
    ).scalar() or 0

    latest_upload_log = db.query(AuditLog).filter(
        AuditLog.action.in_(["IMPORT_RESULTS", "CREATE_RESULT"])
    ).order_by(AuditLog.timestamp.desc()).first()

    latest_time = latest_upload_log.timestamp if latest_upload_log else None

    # Branch student distribution
    branch_counts = db.query(
        Branch.code,
        Branch.name,
        func.count(Student.id).label("student_count")
    ).outerjoin(Student, Branch.id == Student.branch_id).group_by(Branch.id, Branch.code, Branch.name).all()

    branch_dist = [
        {"branch_code": b.code, "branch_name": b.name, "count": b.student_count}
        for b in branch_counts
    ]

    # Semester result distribution
    sem_counts = db.query(
        Semester.semester_number,
        Semester.name,
        func.count(Result.id).label("result_count")
    ).outerjoin(Result, Semester.id == Result.semester_id).group_by(Semester.id, Semester.semester_number, Semester.name).order_by(Semester.semester_number.asc()).all()

    sem_dist = [
        {"semester_number": s.semester_number, "semester_name": s.name, "count": s.result_count}
        for s in sem_counts
    ]

    return DashboardStats(
        total_students=total_students,
        total_results=total_results,
        total_branches=total_branches,
        total_semesters=total_semesters,
        total_subjects=total_subjects,
        recent_uploads_count=recent_uploads_count,
        latest_upload_time=latest_time,
        branch_distribution=branch_dist,
        semester_distribution=sem_dist
    )


@router.get("/branches", response_model=List[BranchItem])
def get_admin_branches(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return db.query(Branch).order_by(Branch.code.asc()).all()


@router.get("/programs", response_model=List[ProgramItem])
def get_admin_programs(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return db.query(Program).order_by(Program.code.asc()).all()


@router.get("/semesters", response_model=List[SemesterItem])
def get_admin_semesters(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return db.query(Semester).order_by(Semester.semester_number.asc()).all()
