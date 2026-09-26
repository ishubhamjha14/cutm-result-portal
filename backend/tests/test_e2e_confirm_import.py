import os
import io
import json
import pytest
from fastapi.testclient import TestClient

from app.main import app, init_default_tables_and_admin
from app.database import SessionLocal
from app.models import Admin, Student, Subject, Semester, Branch, Program, Result, ImportPreviewSession
from app.services.importer import PREVIEW_SESSIONS
from app.config import settings

client = TestClient(app)

def test_e2e_bulk_confirm_import_flow():
    init_default_tables_and_admin()
    db = SessionLocal()
    try:
        # 1. Admin Login
        login_res = client.post("/api/auth/login", json={
            "username_or_email": settings.ADMIN_DEFAULT_EMAIL,
            "password": settings.ADMIN_DEFAULT_PASSWORD
        })
        assert login_res.status_code == 200, login_res.text
        token = login_res.json()["access_token"]
        auth_headers = {
            "Authorization": f"Bearer {token}",
            "Origin": "https://cutm-result-portal-three.vercel.app"
        }

        # 2. Upload sample data file MSC(AG) 2024 Batch 1st Sem.xls
        sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sample_data"))
        msc_path = os.path.join(sample_dir, "MSC(AG) 2024 Batch 1st Sem.xls")
        
        assert os.path.exists(msc_path), f"File not found: {msc_path}"
        
        with open(msc_path, "rb") as f:
            file_bytes = f.read()

        upload_res = client.post(
            "/api/admin/results/preview-bulk",
            headers=auth_headers,
            files=[("files", ("MSC(AG) 2024 Batch 1st Sem.xls", file_bytes, "application/vnd.ms-excel"))]
        )
        assert upload_res.status_code == 200, upload_res.text
        preview_data = upload_res.json()
        
        assert preview_data["total_rows"] > 0
        assert preview_data["valid_rows"] > 0
        preview_session_token = preview_data["preview_session_token"]
        assert preview_session_token is not None

        # Verify session is persisted in DB table
        db_session = db.query(ImportPreviewSession).filter(ImportPreviewSession.token == preview_session_token).first()
        assert db_session is not None
        assert db_session.result_files_count == 1

        # 3. Simulate multi-worker / worker restart by CLEARING in-memory PREVIEW_SESSIONS
        PREVIEW_SESSIONS.clear()
        assert preview_session_token not in PREVIEW_SESSIONS

        # 4. Test OPTIONS preflight request
        options_res = client.options(
            "/api/admin/results/confirm-import",
            headers={
                "Origin": "https://cutm-result-portal-three.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Authorization, Content-Type"
            }
        )
        assert options_res.status_code == 200
        assert options_res.headers.get("access-control-allow-origin") == "https://cutm-result-portal-three.vercel.app"
        assert "POST" in options_res.headers.get("access-control-allow-methods", "")

        # 5. Confirm Import
        confirm_res = client.post(
            "/api/admin/results/confirm-import",
            headers=auth_headers,
            json={
                "preview_session_token": preview_session_token,
                "overwrite_existing": True
            }
        )
        assert confirm_res.status_code == 200, confirm_res.text
        assert confirm_res.headers.get("access-control-allow-origin") == "https://cutm-result-portal-three.vercel.app"
        confirm_data = confirm_res.json()
        assert confirm_data["success"] is True
        assert confirm_data["imported_count"] + confirm_data.get("updated_count", 0) > 0

        # 6. Verify Database Records
        db_results = db.query(Result).all()
        assert len(db_results) > 0
        
        # Check that GP values (like 8.3, 8.7, 9.7) and special statuses (S) are preserved
        sample_gp_results = [r for r in db_results if r.grade_point is not None and r.grade_point > 0]
        assert len(sample_gp_results) > 0
        for r in sample_gp_results[:5]:
            assert r.grade_point > 0.0
            assert r.credit_points == round(r.credits * r.grade_point, 2)

        sample_absent_results = [r for r in db_results if r.grade == "S" or r.status == "ABSENT"]
        for r in sample_absent_results:
            assert r.status == "ABSENT"
            assert r.credit_points == 0.0

        # 7. Check public search for one of the imported students
        first_student = db.query(Student).first()
        assert first_student is not None
        first_result = db.query(Result).filter(Result.student_id == first_student.id).first()
        assert first_result is not None
        
        public_res = client.get(f"/api/results/{first_student.registration_number}/{first_result.semester.semester_number}")
        assert public_res.status_code == 200, public_res.text
        public_data = public_res.json()
        assert public_data["student"]["registration_number"] == first_student.registration_number
        assert public_data["sgpa"] >= 0.0
        assert len(public_data["subjects"]) > 0

    finally:
        db.close()
