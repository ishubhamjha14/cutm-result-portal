from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from ..models import GradeConfiguration, Result, Student, Semester

VALID_CUTM_GRADES = {"O", "E", "A", "B", "C", "D", "F", "M", "S", "R"}
SPECIAL_STATUS_GRADES = {"M", "S", "R"}

DEFAULT_GRADE_MAPPING: Dict[str, float] = {
    "O": 10.0,
    "E": 9.0,
    "A": 8.0,
    "B": 7.0,
    "C": 6.0,
    "D": 5.0,
    "F": 0.0,
    "M": 0.0,  # Mal Practice (special status)
    "S": 0.0,  # Absent (special status)
    "R": 0.0,  # Repeat/Reappear (special status)
}

def get_grade_point_mapping(db: Session) -> Dict[str, float]:
    """
    Fetch the active grade letter to grade point mapping from the database.
    Only allows official CUTM grades: O, E, A, B, C, D, F, M, S, R.
    """
    configs = db.query(GradeConfiguration).filter(GradeConfiguration.is_active == True).all()
    if configs:
        mapping = {}
        for c in configs:
            letter = c.grade_letter.strip().upper()
            if letter in VALID_CUTM_GRADES:
                mapping[letter] = float(c.grade_point)
        if mapping:
            return mapping

    return dict(DEFAULT_GRADE_MAPPING)

def calculate_sgpa(
    results: List[Result],
    grade_mapping: Optional[Dict[str, float]] = None
) -> Tuple[float, float, float, float, str]:
    """
    Calculate SGPA for a given list of Result objects for a semester.
    
    Formula: SGPA = Σ(Credit × Grade Point) / Σ(Credit)
    
    Returns:
        (sgpa, total_credits, earned_credits, total_credit_points, overall_status)
    """
    if not results:
        return 0.0, 0.0, 0.0, 0.0, "N/A"

    total_credits = 0.0
    earned_credits = 0.0
    total_credit_points = 0.0
    has_failed = False

    for r in results:
        credit = float(r.credits)
        grade_letter = str(r.grade).strip().upper()
        
        # Look up grade point
        if grade_mapping and grade_letter in grade_mapping:
            gp = grade_mapping[grade_letter]
        else:
            gp = float(r.grade_point) if r.grade_point is not None else 0.0

        cp = credit * gp
        total_credits += credit
        total_credit_points += cp

        if grade_letter in ["F", "M", "S", "R", "FAIL", "AB"]:
            has_failed = True
        else:
            earned_credits += credit

    if total_credits > 0:
        raw_sgpa = total_credit_points / total_credits
        sgpa = round(raw_sgpa, 2)
    else:
        sgpa = 0.0

    status = "FAIL" if has_failed else "PASS"
    return sgpa, round(total_credits, 2), round(earned_credits, 2), round(total_credit_points, 2), status


def calculate_cgpa_for_student(
    student_id: int,
    db: Session,
    up_to_semester: Optional[int] = None
) -> Tuple[float, float, List[dict]]:
    """
    Calculate cumulative CGPA across all completed semesters for a student.
    
    Formula: CGPA = Σ(All Semester Credits × Grade Point) / Σ(All Semester Credits)
    
    Returns:
        (cgpa, total_earned_credits, semester_breakdown_list)
    """
    grade_mapping = get_grade_point_mapping(db)
    
    # Query all results for student
    query = db.query(Result).join(Semester).filter(Result.student_id == student_id)
    if up_to_semester is not None:
        query = query.filter(Semester.semester_number <= up_to_semester)
    
    all_results = query.order_by(Semester.semester_number.asc()).all()
    
    if not all_results:
        return 0.0, 0.0, []

    # Group by semester
    semester_groups: Dict[int, List[Result]] = {}
    semester_names: Dict[int, str] = {}
    for r in all_results:
        sem_num = r.semester.semester_number
        semester_names[sem_num] = r.semester.name
        if sem_num not in semester_groups:
            semester_groups[sem_num] = []
        semester_groups[sem_num].append(r)

    total_all_credits = 0.0
    total_all_credit_points = 0.0
    total_all_earned_credits = 0.0
    semester_breakdown = []

    for sem_num in sorted(semester_groups.keys()):
        sem_results = semester_groups[sem_num]
        sem_sgpa, sem_tot_cred, sem_earned_cred, sem_tot_cp, sem_status = calculate_sgpa(
            sem_results, grade_mapping
        )
        
        total_all_credits += sem_tot_cred
        total_all_credit_points += sem_tot_cp
        total_all_earned_credits += sem_earned_cred

        semester_breakdown.append({
            "semester": sem_num,
            "semester_name": semester_names.get(sem_num, f"Semester {sem_num}"),
            "total_credits": sem_tot_cred,
            "earned_credits": sem_earned_cred,
            "total_credit_points": sem_tot_cp,
            "sgpa": sem_sgpa,
            "status": sem_status
        })

    if total_all_credits > 0:
        raw_cgpa = total_all_credit_points / total_all_credits
        cgpa = round(raw_cgpa, 2)
    else:
        cgpa = 0.0

    return cgpa, round(total_all_earned_credits, 2), semester_breakdown
