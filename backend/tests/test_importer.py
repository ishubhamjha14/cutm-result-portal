import io
import os
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app, init_default_tables_and_admin

init_default_tables_and_admin()
client = TestClient(app)

def test_csv_upload_preview_and_confirm():
    # Login first
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create in-memory CSV
    csv_content = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade,grade_point
24TEST1001,Test Student One,CSE,BTECH,2024-2028,1,TEST101,Introduction to AI,4,O,10.0
24TEST1001,Test Student One,CSE,BTECH,2024-2028,1,TEST102,Cloud Computing,3,E,9.0
24TEST1002,Test Student Two,ECE,BTECH,2024-2028,2,TEST201,Digital Communication,4,A,8.0
"""
    files = {"file": ("test_results.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    
    # 1. Preview upload
    preview_resp = client.post("/api/admin/results/preview-upload", files=files, headers=headers)
    assert preview_resp.status_code == 200
    preview_data = preview_resp.json()
    assert preview_data["total_rows"] == 3
    assert preview_data["valid_rows"] == 3
    assert preview_data["invalid_rows"] == 0
    token_session = preview_data["preview_session_token"]
    assert token_session is not None

    # 2. Confirm import
    confirm_resp = client.post("/api/admin/results/confirm-import", json={
        "preview_session_token": token_session,
        "overwrite_existing": True
    }, headers=headers)
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()
    assert confirm_data["success"] is True
    assert (confirm_data["imported_count"] + confirm_data["updated_count"]) >= 3

    # 3. Verify public search for newly imported student
    search_resp = client.get("/api/results/24TEST1001/1")
    assert search_resp.status_code == 200
    res_data = search_resp.json()
    assert res_data["student"]["name"] == "Test Student One"
    assert len(res_data["subjects"]) == 2
    # Weighted SGPA: (4*10 + 3*9) / 7 = 67 / 7 = 9.57
    assert res_data["sgpa"] == 9.57

def test_real_xls_upload_and_preview():
    # Login
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    xls_path = os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", "BTECH 2024 Batch 1st Sem Result.xls")
    if os.path.exists(xls_path):
        with open(xls_path, "rb") as f:
            files = {"file": ("BTECH 2024 Batch 1st Sem Result.xls", f.read(), "application/vnd.ms-excel")}
        
        preview_resp = client.post("/api/admin/results/preview-upload", files=files, headers=headers)
        assert preview_resp.status_code == 200
        data = preview_resp.json()
        assert data["format_name"] == "Excel 97-2003 (.xls)"
        assert "ODD" in data["sheets_detected"]
        assert data["valid_rows"] >= 1600
        assert data["students_count"] >= 350

def test_importer_flags_bplus_as_invalid():
    # Login
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # CSV with 1 valid row (B) and 1 invalid row (B+)
    csv_content = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade
24TEST3001,Valid Student,CSE,BTECH,2024-2028,1,SUB101,Subject One,4,B
24TEST3002,Invalid Student,CSE,BTECH,2024-2028,1,SUB102,Subject Two,4,B+
"""
    files = {"file": ("test_invalid_grade.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    
    preview_resp = client.post("/api/admin/results/preview-upload", files=files, headers=headers)
    assert preview_resp.status_code == 200
    preview_data = preview_resp.json()
    assert preview_data["total_rows"] == 2
    assert preview_data["valid_rows"] == 1
    assert preview_data["invalid_rows"] == 1
    
    # Check invalid row error
    invalid_sample = [r for r in preview_data["sample_rows"] if not r["is_valid"]][0]
    assert invalid_sample["grade"] == "B+"
    assert any("Invalid grade 'B+'" in err for err in invalid_sample["errors"])

def test_importer_handles_special_status_r_m_s():
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    csv_content = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade
24TEST4001,Special Student,CSE,BTECH,2024-2028,1,SUB101,Subject One,4,R
24TEST4001,Special Student,CSE,BTECH,2024-2028,1,SUB102,Subject Two,4,M
24TEST4001,Special Student,CSE,BTECH,2024-2028,1,SUB103,Subject Three,3,S
24TEST4001,Special Student,CSE,BTECH,2024-2028,1,SUB104,Subject Four,3,O
"""
    files = {"file": ("test_special_status.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    
    preview_resp = client.post("/api/admin/results/preview-upload", files=files, headers=headers)
    assert preview_resp.status_code == 200
    preview_data = preview_resp.json()
    assert preview_data["total_rows"] == 4
    assert preview_data["valid_rows"] == 4
    assert preview_data["invalid_rows"] == 0
    assert "special_status_counts" in preview_data
    assert preview_data["special_status_counts"].get("R") == 1
    assert preview_data["special_status_counts"].get("M") == 1
    assert preview_data["special_status_counts"].get("S") == 1

    # Confirm import
    token_session = preview_data["preview_session_token"]
    confirm_resp = client.post("/api/admin/results/confirm-import", json={
        "preview_session_token": token_session,
        "overwrite_existing": True
    }, headers=headers)
    assert confirm_resp.status_code == 200

    # Search result
    search_resp = client.get("/api/results/24TEST4001/1")
    assert search_resp.status_code == 200
    res_data = search_resp.json()
    grades = [s["grade"] for s in res_data["subjects"]]
    assert "R" in grades
    assert "M" in grades
    assert "S" in grades
    assert "O" in grades
    # Only 'O' earned 3 credits
    assert res_data["earned_credits"] == 3.0
    assert res_data["result_status"] == "FAIL"


def test_rechecking_revised_grade_priority_and_fallback():
    """
    Test exact scenario:
    Old Grade = F, New Grade = A -> Final Grade = A, GP = 8.0, CP = Credits * 8.0
    Also test: F -> B, F -> C, F -> F, C -> A, and blank New Grade fallback.
    """
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    csv_content = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,Grade,New Grade
24RECHECK01,Recheck Student 1,CSE,BTECH,2024-2028,1,SUB101,Subject One,4,F,A
24RECHECK02,Recheck Student 2,CSE,BTECH,2024-2028,1,SUB102,Subject Two,4,F,B
24RECHECK03,Recheck Student 3,CSE,BTECH,2024-2028,1,SUB103,Subject Three,4,F,C
24RECHECK04,Recheck Student 4,CSE,BTECH,2024-2028,1,SUB104,Subject Four,4,F,F
24RECHECK05,Recheck Student 5,CSE,BTECH,2024-2028,1,SUB105,Subject Five,4,C,A
24RECHECK06,Recheck Student 6,CSE,BTECH,2024-2028,1,SUB106,Subject Six,4,F,
24RECHECK07,Recheck Student 7,CSE,BTECH,2024-2028,1,SUB107,Subject Seven,3,B,
"""
    files = {"file": ("rechecking_result_sem1.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    # 1. Preview
    preview_resp = client.post("/api/admin/results/preview-upload", files=files, headers=headers)
    assert preview_resp.status_code == 200
    preview_data = preview_resp.json()
    assert preview_data["total_rows"] == 7
    assert preview_data["valid_rows"] == 7
    assert preview_data["invalid_rows"] == 0

    rows_by_reg = {r["registration_number"]: r for r in preview_data["sample_rows"]}
    
    # 24RECHECK01: F -> A
    assert rows_by_reg["24RECHECK01"]["grade"] == "A"
    assert rows_by_reg["24RECHECK01"]["grade_point"] == 8.0

    # 24RECHECK02: F -> B
    assert rows_by_reg["24RECHECK02"]["grade"] == "B"
    assert rows_by_reg["24RECHECK02"]["grade_point"] == 7.0

    # 24RECHECK03: F -> C
    assert rows_by_reg["24RECHECK03"]["grade"] == "C"
    assert rows_by_reg["24RECHECK03"]["grade_point"] == 6.0

    # 24RECHECK04: F -> F
    assert rows_by_reg["24RECHECK04"]["grade"] == "F"
    assert rows_by_reg["24RECHECK04"]["grade_point"] == 0.0

    # 24RECHECK05: C -> A
    assert rows_by_reg["24RECHECK05"]["grade"] == "A"
    assert rows_by_reg["24RECHECK05"]["grade_point"] == 8.0

    # 24RECHECK06: F -> blank (falls back to F)
    assert rows_by_reg["24RECHECK06"]["grade"] == "F"
    assert rows_by_reg["24RECHECK06"]["grade_point"] == 0.0

    # 24RECHECK07: B -> blank (falls back to B)
    assert rows_by_reg["24RECHECK07"]["grade"] == "B"
    assert rows_by_reg["24RECHECK07"]["grade_point"] == 7.0

    # 2. Confirm Import
    token_session = preview_data["preview_session_token"]
    confirm_resp = client.post("/api/admin/results/confirm-import", json={
        "preview_session_token": token_session,
        "overwrite_existing": True
    }, headers=headers)
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["success"] is True

    # 3. Verify public student result endpoint
    # Student 1: F -> A
    res1 = client.get("/api/results/24RECHECK01/1").json()
    assert res1["subjects"][0]["grade"] == "A"
    assert res1["subjects"][0]["grade_point"] == 8.0
    assert res1["subjects"][0]["credit_points"] == 32.0  # 4 * 8
    assert res1["sgpa"] == 8.0
    assert res1["result_status"] == "PASS"

    # Student 2: F -> B
    res2 = client.get("/api/results/24RECHECK02/1").json()
    assert res2["subjects"][0]["grade"] == "B"
    assert res2["subjects"][0]["grade_point"] == 7.0
    assert res2["subjects"][0]["credit_points"] == 28.0  # 4 * 7
    assert res2["sgpa"] == 7.0
    assert res2["result_status"] == "PASS"

    # Student 3: F -> C
    res3 = client.get("/api/results/24RECHECK03/1").json()
    assert res3["subjects"][0]["grade"] == "C"
    assert res3["subjects"][0]["grade_point"] == 6.0
    assert res3["subjects"][0]["credit_points"] == 24.0  # 4 * 6
    assert res3["sgpa"] == 6.0
    assert res3["result_status"] == "PASS"

    # Student 4: F -> F
    res4 = client.get("/api/results/24RECHECK04/1").json()
    assert res4["subjects"][0]["grade"] == "F"
    assert res4["subjects"][0]["grade_point"] == 0.0
    assert res4["subjects"][0]["credit_points"] == 0.0
    assert res4["sgpa"] == 0.0
    assert res4["result_status"] == "FAIL"

    # Student 5: C -> A
    res5 = client.get("/api/results/24RECHECK05/1").json()
    assert res5["subjects"][0]["grade"] == "A"
    assert res5["subjects"][0]["grade_point"] == 8.0
    assert res5["subjects"][0]["credit_points"] == 32.0
    assert res5["sgpa"] == 8.0
    assert res5["result_status"] == "PASS"

    # Student 6: Blank fallback to F
    res6 = client.get("/api/results/24RECHECK06/1").json()
    assert res6["subjects"][0]["grade"] == "F"
    assert res6["subjects"][0]["grade_point"] == 0.0
    assert res6["result_status"] == "FAIL"

    # Student 7: Blank fallback to B
    res7 = client.get("/api/results/24RECHECK07/1").json()
    assert res7["subjects"][0]["grade"] == "B"
    assert res7["subjects"][0]["grade_point"] == 7.0
    assert res7["subjects"][0]["credit_points"] == 21.0  # 3 * 7
    assert res7["sgpa"] == 7.0
    assert res7["result_status"] == "PASS"


def test_rechecking_overwrites_existing_fail_with_revised_pass():
    """
    Test that uploading an initial fail result and then uploading a rechecking file
    updates the student's result in the database to the revised grade (not the old grade).
    """
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Initial upload with Grade = F
    initial_csv = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade
24OVERWRITE01,Overwrite Student,CSE,BTECH,2024-2028,1,SUB201,Data Structures,4,F
"""
    files1 = {"file": ("initial_result.csv", io.BytesIO(initial_csv.encode("utf-8")), "text/csv")}
    prev1 = client.post("/api/admin/results/preview-upload", files=files1, headers=headers).json()
    client.post("/api/admin/results/confirm-import", json={
        "preview_session_token": prev1["preview_session_token"],
        "overwrite_existing": True
    }, headers=headers)

    # Verify student has F
    res_before = client.get("/api/results/24OVERWRITE01/1").json()
    assert res_before["subjects"][0]["grade"] == "F"
    assert res_before["result_status"] == "FAIL"

    # Step 2: Upload rechecking file with Old Grade = F, Revised Grade = A
    recheck_csv = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,Old Grade,Revised Grade
24OVERWRITE01,Overwrite Student,CSE,BTECH,2024-2028,1,SUB201,Data Structures,4,F,A
"""
    files2 = {"file": ("revised_result.csv", io.BytesIO(recheck_csv.encode("utf-8")), "text/csv")}
    prev2 = client.post("/api/admin/results/preview-upload", files=files2, headers=headers).json()
    client.post("/api/admin/results/confirm-import", json={
        "preview_session_token": prev2["preview_session_token"],
        "overwrite_existing": True
    }, headers=headers)

    # Step 3: Verify student result is updated to A
    res_after = client.get("/api/results/24OVERWRITE01/1").json()
    assert res_after["subjects"][0]["grade"] == "A"
    assert res_after["subjects"][0]["grade_point"] == 8.0
    assert res_after["subjects"][0]["credit_points"] == 32.0
    assert res_after["sgpa"] == 8.0
    assert res_after["result_status"] == "PASS"


