import pytest
from app.models import Result, Semester, Subject, GradeConfiguration, Student, Branch, Program
from app.services.calculations import calculate_sgpa, calculate_cgpa_for_student, get_grade_point_mapping, VALID_CUTM_GRADES, DEFAULT_GRADE_MAPPING
from app.database import Base, SessionLocal, engine

from app.main import init_default_tables_and_admin

@pytest.fixture
def db_session():
    init_default_tables_and_admin()
    db = SessionLocal()
    yield db
    db.close()

def test_grade_point_mapping(db_session):
    mapping = get_grade_point_mapping(db_session)
    assert mapping["O"] == 10.0
    assert mapping["E"] == 9.0
    assert mapping["A"] == 8.0
    assert mapping["B"] == 7.0
    assert mapping["C"] == 6.0
    assert mapping["D"] == 5.0
    assert mapping["F"] == 0.0
    assert mapping["M"] == 0.0
    assert mapping["S"] == 0.0
    assert mapping["R"] == 0.0
    
    assert mapping["B+"] == 7.5
    assert "A+" not in mapping
    assert "A-" not in mapping
    assert "B-" not in mapping
    assert "C+" not in mapping

def test_sgpa_calculation():
    # Subject 1 (4 credits, GP 8.0 for 'A'), Subject 2 (3 credits, GP 7.0 for 'B'), Subject 3 (3 credits, GP 6.0 for 'C')
    # Total weighted: 4*8 + 3*7 + 3*6 = 32 + 21 + 18 = 71. Total credits = 10. SGPA = 7.10
    r1 = Result(credits=4.0, grade="A", grade_point=8.0)
    r2 = Result(credits=3.0, grade="B", grade_point=7.0)
    r3 = Result(credits=3.0, grade="C", grade_point=6.0)
    
    sgpa, tot_c, earned_c, tot_cp, status = calculate_sgpa([r1, r2, r3])
    assert sgpa == 7.10
    assert tot_c == 10.0
    assert earned_c == 10.0
    assert tot_cp == 71.0
    assert status == "PASS"

def test_sgpa_with_fail_grade():
    r1 = Result(credits=4.0, grade="O", grade_point=10.0)
    r2 = Result(credits=4.0, grade="F", grade_point=0.0)
    
    sgpa, tot_c, earned_c, tot_cp, status = calculate_sgpa([r1, r2])
    assert sgpa == 5.00
    assert tot_c == 8.0
    assert earned_c == 4.0  # F credit not earned
    assert status == "FAIL"

def test_status_grades_m_s_and_r():
    # M (Mal Practice), S (Absent), R (Repeat/Reappear)
    r1 = Result(credits=4.0, grade="M", grade_point=0.0)
    r2 = Result(credits=4.0, grade="S", grade_point=0.0)
    r3 = Result(credits=4.0, grade="R", grade_point=0.0)
    
    sgpa, tot_c, earned_c, tot_cp, status = calculate_sgpa([r1, r2, r3])
    assert sgpa == 0.00
    assert tot_c == 12.0
    assert earned_c == 0.0  # Status grades earn 0 credits
    assert status == "FAIL"

def test_student_cgpa_calculation(db_session):
    student = db_session.query(Student).filter(Student.registration_number == "24CSE12345").first()
    if not student:
        branch = db_session.query(Branch).filter(Branch.code == "CSE").first()
        program = db_session.query(Program).filter(Program.code == "BTECH").first()
        student = Student(
            registration_number="24CSE12345",
            name="Shubham Kumar Jha",
            branch_id=branch.id if branch else 1,
            program_id=program.id if program else 1,
            academic_session="2024-2028"
        )
        db_session.add(student)
        db_session.flush()

        for s_num in [1, 2, 3]:
            sem = db_session.query(Semester).filter(Semester.semester_number == s_num).first()
            if not sem:
                sem = Semester(semester_number=s_num, name=f"Semester {s_num}")
                db_session.add(sem)
                db_session.flush()

            sub = Subject(code=f"CUTM{s_num}001", name=f"Subject {s_num}", default_credits=20.0, branch_id=student.branch_id, semester_id=sem.id)
            db_session.add(sub)
            db_session.flush()

            res = Result(
                student_id=student.id,
                subject_id=sub.id,
                semester_id=sem.id,
                academic_session="2024-2028",
                credits=20.0,
                grade="A",
                grade_point=8.0,
                credit_points=160.0,
                status="PASS"
            )
            db_session.add(res)
        db_session.commit()

    cgpa, total_earned, progression = calculate_cgpa_for_student(student.id, db_session)
    assert cgpa > 0
    assert len(progression) >= 1
    assert total_earned > 0

