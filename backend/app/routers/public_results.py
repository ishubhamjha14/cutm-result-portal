from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import Student, Semester, Result, Subject, Branch, Program
from ..schemas import SemesterResultResponse, StudentInfo, SubjectResultItem, SemesterPerformanceSummary, StudentPerformanceResponse
from ..services.calculations import calculate_sgpa, calculate_cgpa_for_student, get_grade_point_mapping

router = APIRouter(prefix="", tags=["Public Results"])


@router.get("/results/{registration_number}/{semester_number}", response_model=SemesterResultResponse)
def get_student_semester_result(
    registration_number: str,
    semester_number: int,
    db: Session = Depends(get_db)
):
    """
    Public student result lookup by registration number and semester number.
    Returns student details, subject marks, automatic SGPA, cumulative CGPA, and semester progression.
    """
    reg_no = registration_number.strip().upper()
    
    # 1. Lookup student
    student = db.query(Student).filter(Student.registration_number == reg_no).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result not found. Please check your registration number and semester."
        )

    # 2. Lookup semester
    semester = db.query(Semester).filter(Semester.semester_number == semester_number).first()
    if not semester:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result not found. Please check your registration number and semester."
        )

    # 3. Lookup results for this semester
    results = db.query(Result).join(Subject).filter(
        Result.student_id == student.id,
        Result.semester_id == semester.id
    ).order_by(Subject.code.asc()).all()

    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result not found for the selected semester. Please check your registration number and semester."
        )

    # 4. Compute dynamic SGPA and CGPA
    grade_mapping = get_grade_point_mapping(db)
    sgpa, total_credits, earned_credits, total_cp, result_status = calculate_sgpa(results, grade_mapping)
    cgpa, total_all_earned, progression = calculate_cgpa_for_student(student.id, db)

    # 5. Extract metadata from first result
    first_result = results[0]
    exam_session = first_result.examination_month_year or "DECEMBER-2025"
    pub_date = first_result.published_date or "20-Jan-2026"

    # Build subjects response list
    subjects_list = []
    for r in results:
        grade_str = str(r.grade).strip().upper() if r.grade else ""
        if r.grade_point is not None:
            gp = float(r.grade_point)
        elif grade_str and grade_str in grade_mapping:
            gp = grade_mapping[grade_str]
        else:
            gp = 0.0

        cp = round(r.credits * gp, 2)
        if r.status:
            status_val = r.status
        elif grade_str in ["F", "M", "S", "R", "FAIL", "AB"]:
            status_val = "FAIL"
        else:
            status_val = "PASS"

        subjects_list.append(SubjectResultItem(
            subject_code=r.subject.code,
            subject_name=r.subject.name,
            credits=r.credits,
            grade=r.grade,
            grade_point=gp,
            credit_points=cp,
            status=status_val
        ))

    student_info = StudentInfo(
        id=student.id,
        registration_number=student.registration_number,
        name=student.name,
        branch_code=student.branch.code if student.branch else "N/A",
        branch_name=student.branch.name if student.branch else "Engineering",
        program_code=student.program.code if student.program else "BTECH",
        program_name=student.program.name if student.program else "Bachelor of Technology",
        academic_session=student.academic_session,
        campus=student.campus,
        email=student.email,
        phone=student.phone
    )

    progression_summary = [
        SemesterPerformanceSummary(
            semester=p["semester"],
            semester_name=p["semester_name"],
            total_credits=p["total_credits"],
            earned_credits=p["earned_credits"],
            total_credit_points=p["total_credit_points"],
            sgpa=p["sgpa"],
            status=p["status"]
        )
        for p in progression
    ]

    return SemesterResultResponse(
        student=student_info,
        semester=semester.semester_number,
        semester_name=semester.name,
        academic_session=student.academic_session,
        examination_month_year=exam_session,
        published_date=pub_date,
        subjects=subjects_list,
        total_credits=total_credits,
        earned_credits=earned_credits,
        total_credit_points=total_cp,
        sgpa=sgpa,
        cgpa=cgpa,
        result_status=result_status,
        semester_progression=progression_summary
    )


@router.get("/student/{registration_number}/performance", response_model=StudentPerformanceResponse)
def get_student_overall_performance(
    registration_number: str,
    db: Session = Depends(get_db)
):
    """
    Returns complete multi-semester performance breakdown and CGPA for a student.
    """
    reg_no = registration_number.strip().upper()
    student = db.query(Student).filter(Student.registration_number == reg_no).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found."
        )

    cgpa, total_earned, progression = calculate_cgpa_for_student(student.id, db)
    
    student_info = StudentInfo(
        id=student.id,
        registration_number=student.registration_number,
        name=student.name,
        branch_code=student.branch.code if student.branch else "N/A",
        branch_name=student.branch.name if student.branch else "Engineering",
        program_code=student.program.code if student.program else "BTECH",
        program_name=student.program.name if student.program else "Bachelor of Technology",
        academic_session=student.academic_session,
        campus=student.campus,
        email=student.email,
        phone=student.phone
    )

    progression_summary = [
        SemesterPerformanceSummary(
            semester=p["semester"],
            semester_name=p["semester_name"],
            total_credits=p["total_credits"],
            earned_credits=p["earned_credits"],
            total_credit_points=p["total_credit_points"],
            sgpa=p["sgpa"],
            status=p["status"]
        )
        for p in progression
    ]

    return StudentPerformanceResponse(
        student=student_info,
        current_cgpa=cgpa,
        total_credits_completed=total_earned,
        total_semesters_completed=len(progression),
        semesters=progression_summary
    )


@router.get("/public/meta")
def get_public_metadata(db: Session = Depends(get_db)):
    """
    Provides active semesters, branches, and programs for UI dropdowns.
    """
    semesters = db.query(Semester).filter(Semester.is_active == True).order_by(Semester.semester_number.asc()).all()
    branches = db.query(Branch).order_by(Branch.code.asc()).all()
    
    return {
        "semesters": [{"semester_number": s.semester_number, "name": s.name} for s in semesters],
        "branches": [{"code": b.code, "name": b.name} for b in branches],
        "university_name": "Centurion University of Technology and Management",
        "system_status": "ONLINE"
    }
