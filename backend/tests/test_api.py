import pytest
from fastapi.testclient import TestClient
from app.main import app, init_default_tables_and_admin

init_default_tables_and_admin()
client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "OPERATIONAL"

def test_public_meta_endpoint():
    response = client.get("/api/public/meta")
    assert response.status_code == 200
    data = response.json()
    assert "semesters" in data
    assert "branches" in data
    assert len(data["semesters"]) >= 8

def test_student_result_search_success():
    from app.database import SessionLocal
    from app.models import Student, Subject, Semester, Branch, Program, Result
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.registration_number == "24CSE12345").first()
        if not student:
            branch = db.query(Branch).filter(Branch.code == "CSE").first()
            program = db.query(Program).filter(Program.code == "BTECH").first()
            semester = db.query(Semester).filter(Semester.semester_number == 3).first()
            
            student = Student(
                registration_number="24CSE12345",
                name="Shubham Kumar Jha",
                branch_id=branch.id if branch else 1,
                program_id=program.id if program else 1,
                academic_session="2024-2028"
            )
            db.add(student)
            db.flush()

            subject = Subject(code="CUTM1001", name="Data Structures", default_credits=4.0, branch_id=student.branch_id, semester_id=semester.id if semester else 3)
            db.add(subject)
            db.flush()

            result = Result(student_id=student.id, subject_id=subject.id, semester_id=semester.id if semester else 3, academic_session="2024-2028", credits=4.0, grade="O", grade_point=10.0, credit_points=40.0, status="PASS")
            db.add(result)
            db.commit()
    finally:
        db.close()

    response = client.get("/api/results/24CSE12345/3")
    assert response.status_code == 200
    data = response.json()
    assert data["student"]["registration_number"] == "24CSE12345"
    assert data["student"]["name"] == "Shubham Kumar Jha"
    assert data["semester"] == 3
    assert len(data["subjects"]) > 0
    assert data["sgpa"] > 0
    assert data["cgpa"] > 0

def test_student_result_search_not_found():
    response = client.get("/api/results/INVALID_REG_99999/1")
    assert response.status_code == 404
    assert "Result not found" in response.json()["detail"]

def test_admin_login_success_and_protection():
    # 1. Login with valid credentials
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    token = token_data["access_token"]
    assert token is not None

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Access protected admin dashboard
    dash_resp = client.get("/api/admin/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert dash_data["total_students"] >= 4
    assert dash_data["total_results"] > 0

    # 3. Access without token should be 401
    client.cookies.clear()
    unauth_resp = client.get("/api/admin/dashboard")
    assert unauth_resp.status_code == 401

def test_admin_grades_management():
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    grades_resp = client.get("/api/admin/grades", headers=headers)
    assert grades_resp.status_code == 200
    grades = grades_resp.json()
    letters = [g["grade_letter"] for g in grades]
    assert "O" in letters
    assert "E" in letters
    assert "A" in letters
    assert "B" in letters
    assert "C" in letters
    assert "D" in letters
    assert "F" in letters
    assert "M" in letters
    assert "S" in letters
    assert "R" in letters
    # Ensure B+ and A+ do not exist
    assert "B+" not in letters
    assert "A+" not in letters

def test_create_result_rejects_bplus():
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    bad_resp = client.post("/api/admin/results", json={
        "registration_number": "24TEST9999",
        "student_name": "Invalid Grade Student",
        "branch_code": "CSE",
        "program_code": "BTECH",
        "academic_session": "2024-2028",
        "semester": 1,
        "subject_code": "TEST999",
        "subject_name": "Test Course",
        "credits": 4.0,
        "grade": "B+"
    }, headers=headers)
    assert bad_resp.status_code == 400
    assert "Invalid grade 'B+'" in bad_resp.json()["detail"]

def test_create_result_accepts_r_special_status():
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post("/api/admin/results", json={
        "registration_number": "24TEST8888",
        "student_name": "Repeat Student",
        "branch_code": "CSE",
        "program_code": "BTECH",
        "academic_session": "2024-2028",
        "semester": 1,
        "subject_code": "TEST888",
        "subject_name": "Repeat Course",
        "credits": 4.0,
        "grade": "R"
    }, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["grade"] == "R"
    assert data["grade_point"] == 0.0
    assert data["status"] == "FAIL"

def test_create_grade_config_rejects_bplus():
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    bad_resp = client.post("/api/admin/grades", json={
        "grade_letter": "B+",
        "grade_point": 7.0,
        "description": "Invalid Plus Grade"
    }, headers=headers)
    assert bad_resp.status_code == 400
    assert "Invalid grade 'B+'" in bad_resp.json()["detail"]

