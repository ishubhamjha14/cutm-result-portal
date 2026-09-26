import os
import pytest
from fastapi.testclient import TestClient

from app.main import app, init_default_tables_and_admin
from app.database import SessionLocal
from app.models import Admin, Student, Subject, Semester, Result, ImportPreviewSession
from app.services.importer import PREVIEW_SESSIONS
from app.config import settings

client = TestClient(app)

def test_e2e_all_16_files_preview_and_confirm_import():
    init_default_tables_and_admin()
    db = SessionLocal()
    try:
        # Login
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

        # Gather sample files (exclude duplicate downloads and CSVs)
        sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sample_data"))
        files = [
            os.path.join(sample_dir, f) for f in os.listdir(sample_dir)
            if (f.endswith(".xls") or f.endswith(".xlsx")) and "(1)" not in f and not f.startswith("cutm_")
        ]

        multipart_files = []
        for fpath in sorted(files):
            fname = os.path.basename(fpath)
            with open(fpath, "rb") as f:
                content = f.read()
            multipart_files.append(("files", (fname, content, "application/octet-stream")))

        # Preview bulk
        preview_res = client.post(
            "/api/admin/results/preview-bulk",
            headers=auth_headers,
            files=multipart_files
        )
        assert preview_res.status_code == 200, preview_res.text
        preview_data = preview_res.json()
        
        assert preview_data["result_files_count"] == len(files)
        assert preview_data["total_rows"] > 0
        assert preview_data["valid_rows"] > 0
        token_val = preview_data["preview_session_token"]
        assert token_val is not None

        # Clear memory cache to prove database session persistence
        PREVIEW_SESSIONS.clear()

        # Confirm Import
        confirm_res = client.post(
            "/api/admin/results/confirm-import",
            headers=auth_headers,
            json={
                "preview_session_token": token_val,
                "overwrite_existing": True
            }
        )
        assert confirm_res.status_code == 200, confirm_res.text
        confirm_data = confirm_res.json()
        assert confirm_data["success"] is True
        assert confirm_data["imported_count"] + confirm_data.get("updated_count", 0) > 0

        # Verify Database
        total_db_results = db.query(Result).count()
        assert total_db_results > 0
        total_db_students = db.query(Student).count()
        assert total_db_students > 0

    finally:
        db.close()
