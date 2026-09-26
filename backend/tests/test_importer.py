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


def test_bulk_multi_file_upload_preview_and_confirm():
    """Test uploading multiple separate CSV/Excel files simultaneously via /preview-bulk."""
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    csv1 = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade
24MULTI01,Multi Student 1,CSE,BTECH,2024-2028,1,CS101,Programming in C,4,O
24MULTI01,Multi Student 1,CSE,BTECH,2024-2028,1,CS102,Data Structures,4,E
"""
    csv2 = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade
24MULTI02,Multi Student 2,ECE,BTECH,2024-2028,1,EC101,Circuit Analysis,4,A
24MULTI03,Multi Student 3,ME,BTECH,2024-2028,1,ME101,Thermodynamics,4,B
"""

    files = [
        ("files", ("CSE_Results.csv", io.BytesIO(csv1.encode("utf-8")), "text/csv")),
        ("files", ("ECE_ME_Results.csv", io.BytesIO(csv2.encode("utf-8")), "text/csv")),
    ]

    preview_resp = client.post("/api/admin/results/preview-bulk", files=files, headers=headers)
    assert preview_resp.status_code == 200
    pdata = preview_resp.json()

    assert pdata["files_detected"] == 2
    assert pdata["result_files_count"] == 2
    assert pdata["total_rows"] == 4
    assert pdata["valid_rows"] == 4
    assert pdata["students_count"] == 3
    assert len(pdata["file_summaries"]) == 2

    # Confirm
    token_session = pdata["preview_session_token"]
    confirm_resp = client.post("/api/admin/results/confirm-import", json={
        "preview_session_token": token_session,
        "overwrite_existing": True
    }, headers=headers)
    assert confirm_resp.status_code == 200
    cdata = confirm_resp.json()
    assert cdata["success"] is True
    assert cdata["files_count"] == 2


def test_zip_upload_with_multiple_results_and_ignored_files():
    """
    Test ZIP containing multiple Excel/CSV files plus non-result files (.pdf, .docx, images).
    Verify non-result files are ignored and valid results are extracted and combined into preview.
    """
    import zipfile
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Build an in-memory ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. Valid MCA result CSV
        mca_csv = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade
24MCA901,MCA Student One,MCA,MCA,2024-2026,1,MCA101,Advanced Java,4,O
24MCA902,MCA Student Two,MCA,MCA,2024-2026,1,MCA101,Advanced Java,4,E
"""
        zf.writestr("EOD SEP 2026 RESULT SHEET - MCA.csv", mca_csv)

        # 2. Valid BCA result CSV
        bca_csv = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade
24BCA801,BCA Student One,BCA,BCA,2024-2027,1,BCA101,Web Tech,4,A
"""
        zf.writestr("EOD SEP 2026 RESULT SHEET - BCA.csv", bca_csv)

        # 3. Unrelated / ignored files
        zf.writestr("Examination_Schedule.pdf", b"%PDF-1.4 fake pdf content")
        zf.writestr("Controller_Notice.docx", b"PK fake docx content")
        zf.writestr("qr_code.png", b"fake png image")

    zip_bytes = zip_buffer.getvalue()
    files = {"file": ("EOD_SEP_2026_RESULTS.zip", io.BytesIO(zip_bytes), "application/zip")}

    preview_resp = client.post("/api/admin/results/preview-upload", files=files, headers=headers)
    assert preview_resp.status_code == 200
    pdata = preview_resp.json()

    assert pdata["result_files_count"] == 2
    assert pdata["ignored_files_count"] == 3
    assert pdata["total_rows"] == 3
    assert pdata["valid_rows"] == 3
    assert pdata["students_count"] == 3

    # Check ignored files details
    ignored_names = [item["filename"] for item in pdata["ignored_files"]]
    assert "Examination_Schedule.pdf" in ignored_names
    assert "Controller_Notice.docx" in ignored_names
    assert "qr_code.png" in ignored_names

    # Confirm import
    token_session = pdata["preview_session_token"]
    confirm_resp = client.post("/api/admin/results/confirm-import", json={
        "preview_session_token": token_session,
        "overwrite_existing": True
    }, headers=headers)
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["success"] is True

    # Search result
    mca_res = client.get("/api/results/24MCA901/1").json()
    assert mca_res["student"]["name"] == "MCA Student One"
    assert mca_res["subjects"][0]["grade"] == "O"
    assert mca_res["sgpa"] == 10.0


def test_special_status_r_m_s_in_bulk_zip():
    """
    Test that Special Status R is preserved exactly as 'R', not converted to F,
    no arbitrary grade point assigned (gp=0.0), and counted in special_status_counts.
    """
    import zipfile
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        csv_data = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade
24SPEC001,Special Student R,CSE,BTECH,2024-2028,1,SUB101,Subject R,4,R
24SPEC002,Special Student M,CSE,BTECH,2024-2028,1,SUB101,Subject M,4,M
24SPEC003,Special Student S,CSE,BTECH,2024-2028,1,SUB101,Subject S,4,S
24SPEC004,Special Student O,CSE,BTECH,2024-2028,1,SUB101,Subject O,4,O
"""
        zf.writestr("special_status_results.csv", csv_data)

    files = {"file": ("special_status.zip", io.BytesIO(zip_buffer.getvalue()), "application/zip")}
    preview_resp = client.post("/api/admin/results/preview-upload", files=files, headers=headers)
    assert preview_resp.status_code == 200
    pdata = preview_resp.json()

    assert pdata["total_rows"] == 4
    assert pdata["valid_rows"] == 4
    assert pdata["special_status_counts"]["R"] == 1
    assert pdata["special_status_counts"]["M"] == 1
    assert pdata["special_status_counts"]["S"] == 1

    # Check that row 1 grade is preserved as R
    row_r = [r for r in pdata["sample_rows"] if r["registration_number"] == "24SPEC001"][0]
    assert row_r["grade"] == "R"
    assert row_r["grade_point"] == 0.0

    # Confirm
    token_session = pdata["preview_session_token"]
    confirm_resp = client.post("/api/admin/results/confirm-import", json={
        "preview_session_token": token_session,
        "overwrite_existing": True
    }, headers=headers)
    assert confirm_resp.status_code == 200

    # Verify student R via public result endpoint
    res_r = client.get("/api/results/24SPEC001/1").json()
    assert res_r["subjects"][0]["grade"] == "R"
    assert res_r["subjects"][0]["grade_point"] == 0.0
    assert res_r["result_status"] == "FAIL"


def test_cross_file_duplicate_detection_in_bulk():
    """Test that duplicates across multiple files in the same batch are detected and flagged."""
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # File 1 contains record for 24DUP999, Sem 1, CS101
    csv1 = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade
24DUP999,Duplicate Student,CSE,BTECH,2024-2028,1,CS101,C Programming,4,A
"""
    # File 2 contains the SAME record for 24DUP999, Sem 1, CS101
    csv2 = """registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade
24DUP999,Duplicate Student,CSE,BTECH,2024-2028,1,CS101,C Programming,4,B
"""

    files = [
        ("files", ("File_A.csv", io.BytesIO(csv1.encode("utf-8")), "text/csv")),
        ("files", ("File_B.csv", io.BytesIO(csv2.encode("utf-8")), "text/csv")),
    ]

    preview_resp = client.post("/api/admin/results/preview-bulk", files=files, headers=headers)
    assert preview_resp.status_code == 200
    pdata = preview_resp.json()

    assert pdata["total_rows"] == 2
    assert pdata["valid_rows"] == 1
    assert pdata["invalid_rows"] == 1
    assert pdata["duplicate_rows"] == 1

    dup_row = [r for r in pdata["sample_rows"] if r["is_duplicate"]][0]
    assert dup_row["source_file"] == "File_B.csv"
    assert any("Duplicate record in batch" in err for err in dup_row["errors"])


def test_zip_security_path_traversal():
    """Test that ZIP containing path traversal entries (e.g. ../secret.xlsx) is handled safely."""
    import zipfile
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Valid file
        zf.writestr("valid_result.csv", "registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade\n24SEC01,Sec Student,CSE,BTECH,2024-2028,1,SUB1,Sub 1,4,O\n")
        # Path traversal attack attempt
        zf.writestr("../../../etc/passwd.xlsx", b"malicious content")

    files = {"file": ("traversal_test.zip", io.BytesIO(zip_buffer.getvalue()), "application/zip")}
    preview_resp = client.post("/api/admin/results/preview-upload", files=files, headers=headers)
    assert preview_resp.status_code == 200
    pdata = preview_resp.json()
    assert pdata["valid_rows"] == 1
    # Check that traversal entry was safely ignored
    assert any("path traversal" in item["reason"].lower() for item in pdata["ignored_files"])


def test_real_sample_data_zip_upload_and_preview():
    """Test creating a ZIP with real sample xlsx files and verifying multi-file processing."""
    import zipfile
    import glob
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "jhakumarshubham014@gmail.com",
        "password": "CUTM@SHUBHAM14"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sample_dir = os.path.join(os.path.dirname(__file__), "..", "..", "sample_data")
    target_files = [
        "EOD SEP 2026 RESULT - BBA.xlsx",
        "EOD SEP 2026 RESULT SHEET -MCA.xlsx",
        "EOD SEP 2026 RESULT SHEET - BCA.xlsx",
        "EOD SEP 2026 RESULT SHEET - DIPLOMA.xlsx"
    ]

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for fn in target_files:
            fp = os.path.join(sample_dir, fn)
            if os.path.exists(fp):
                with open(fp, "rb") as f:
                    zf.writestr(fn, f.read())
        # Also add an unrelated file to test automatic ignoring
        zf.writestr("Notice_Circular.pdf", b"%PDF-1.4 sample notice")

    files = {"file": ("REAL_EOD_SEP_2026_RESULTS.zip", io.BytesIO(zip_buffer.getvalue()), "application/zip")}
    preview_resp = client.post("/api/admin/results/preview-upload", files=files, headers=headers)
    assert preview_resp.status_code == 200
    pdata = preview_resp.json()

    assert pdata["result_files_count"] >= 4
    assert pdata["ignored_files_count"] == 1
    assert pdata["valid_rows"] > 0
    assert pdata["students_count"] > 0
    assert len(pdata["file_summaries"]) >= 4

    # Confirm
    token_session = pdata["preview_session_token"]
    confirm_resp = client.post("/api/admin/results/confirm-import", json={
        "preview_session_token": token_session,
        "overwrite_existing": True
    }, headers=headers)
    assert confirm_resp.status_code == 200
    cdata = confirm_resp.json()
    assert cdata["success"] is True
    assert cdata["imported_count"] + cdata["updated_count"] > 0




