from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import Admin, Student, Branch, Program, Result
from ..schemas import StudentListItem, StudentListResponse, StudentCreate, StudentUpdate, StudentInfo
from ..auth import get_current_admin
from ..services.calculations import calculate_cgpa_for_student
from ..services.audit import log_audit

router = APIRouter(prefix="/admin/students", tags=["Admin Student Management"])


@router.get("", response_model=StudentListResponse)
def get_admin_students(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    branch_id: Optional[int] = None,
    academic_session: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Search and filter student roster with total result count and dynamic CGPA computation.
    """
    query = db.query(Student).join(Branch).join(Program)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (Student.registration_number.ilike(term)) |
            (Student.name.ilike(term)) |
            (Student.email.ilike(term))
        )

    if branch_id:
        query = query.filter(Student.branch_id == branch_id)

    if academic_session:
        query = query.filter(Student.academic_session == academic_session)

    total = query.count()
    offset = (page - 1) * limit
    students = query.order_by(Student.registration_number.asc()).offset(offset).limit(limit).all()

    items = []
    for s in students:
        res_count = len(s.results)
        cgpa, _, _ = calculate_cgpa_for_student(s.id, db) if res_count > 0 else (None, 0, [])
        items.append(StudentListItem(
            id=s.id,
            registration_number=s.registration_number,
            name=s.name,
            branch_code=s.branch.code,
            branch_name=s.branch.name,
            program_name=s.program.name,
            academic_session=s.academic_session,
            campus=s.campus or "Bhubaneswar / Paralakhemundi Campus",
            email=s.email,
            phone=s.phone,
            total_results_count=res_count,
            current_cgpa=cgpa,
            created_at=s.created_at
        ))

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return StudentListResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=items
    )


@router.post("", response_model=StudentInfo)
def create_student(
    data: StudentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Manually add a student to the university registry.
    """
    client_ip = request.client.host if request.client else "unknown"
    reg_no = data.registration_number.strip().upper()

    existing = db.query(Student).filter(Student.registration_number == reg_no).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student with registration number {reg_no} already exists."
        )

    student = Student(
        registration_number=reg_no,
        name=data.name.strip(),
        branch_id=data.branch_id,
        program_id=data.program_id,
        academic_session=data.academic_session,
        campus=data.campus or "Bhubaneswar / Paralakhemundi Campus",
        email=data.email,
        phone=data.phone
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    log_audit(
        db=db,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        action="CREATE_STUDENT",
        entity_type="Student",
        entity_id=str(student.id),
        details=f"Created student {reg_no} ({data.name})",
        ip_address=client_ip
    )

    return StudentInfo(
        id=student.id,
        registration_number=student.registration_number,
        name=student.name,
        branch_code=student.branch.code,
        branch_name=student.branch.name,
        program_code=student.program.code,
        program_name=student.program.name,
        academic_session=student.academic_session,
        campus=student.campus,
        email=student.email,
        phone=student.phone
    )


@router.put("/{student_id}", response_model=StudentInfo)
def update_student(
    student_id: int,
    data: StudentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Update student metadata.
    """
    client_ip = request.client.host if request.client else "unknown"
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    if data.name is not None:
        student.name = data.name.strip()
    if data.branch_id is not None:
        student.branch_id = data.branch_id
    if data.program_id is not None:
        student.program_id = data.program_id
    if data.academic_session is not None:
        student.academic_session = data.academic_session
    if data.campus is not None:
        student.campus = data.campus
    if data.email is not None:
        student.email = data.email
    if data.phone is not None:
        student.phone = data.phone

    db.commit()
    db.refresh(student)

    log_audit(
        db=db,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        action="UPDATE_STUDENT",
        entity_type="Student",
        entity_id=str(student.id),
        details=f"Updated student {student.registration_number}",
        ip_address=client_ip
    )

    return StudentInfo(
        id=student.id,
        registration_number=student.registration_number,
        name=student.name,
        branch_code=student.branch.code,
        branch_name=student.branch.name,
        program_code=student.program.code,
        program_name=student.program.name,
        academic_session=student.academic_session,
        campus=student.campus,
        email=student.email,
        phone=student.phone
    )


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Delete student and their associated semester results.
    """
    client_ip = request.client.host if request.client else "unknown"
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    reg_no = student.registration_number
    db.delete(student)
    db.commit()

    log_audit(
        db=db,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        action="DELETE_STUDENT",
        entity_type="Student",
        entity_id=str(student_id),
        details=f"Deleted student {reg_no} and all associated results",
        ip_address=client_ip
    )

    return {"message": f"Student {reg_no} and associated records successfully deleted."}
