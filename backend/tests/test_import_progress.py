import os
import io
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app, init_default_tables_and_admin
from app.config import settings
from app.services.importer import IMPORT_JOBS

client = TestClient(app)

def test_real_time_import_progress_polling():
    init_default_tables_and_admin()
    
    # 1. Admin Login
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": settings.ADMIN_DEFAULT_EMAIL,
        "password": settings.ADMIN_DEFAULT_PASSWORD
    })
    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload CSV with 10 rows
    test_run_id = f"T{int(time.time())}"
    csv_rows = ["registration_number,student_name,branch,program,academic_session,semester,subject_code,subject_name,credits,grade,grade_point"]
    for i in range(1, 11):
        csv_rows.append(f"24{test_run_id}{i:03d},Student {i},CSE,BTECH,2024-2028,1,SUB{test_run_id}{i:02d},Subject {i},4,A,8.0")
    csv_content = "\n".join(csv_rows)
    
    files = {"file": ("test_progress.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    preview_resp = client.post("/api/admin/results/preview-upload", files=files, headers=headers)
    assert preview_resp.status_code == 200, preview_resp.text
    preview_data = preview_resp.json()
    assert preview_data["total_rows"] == 10
    session_token = preview_data["preview_session_token"]

    # 3. Start Async Import
    start_resp = client.post("/api/admin/results/start-import", json={
        "preview_session_token": session_token,
        "overwrite_existing": True
    }, headers=headers)
    assert start_resp.status_code == 200, start_resp.text
    job_info = start_resp.json()
    assert job_info["success"] is True
    job_id = job_info["job_id"]
    assert job_id is not None
    assert job_id.startswith("job_")

    # 4. Poll GET /api/admin/results/import-status/{job_id}
    max_retries = 30
    final_status = None
    for _ in range(max_retries):
        status_resp = client.get(f"/api/admin/results/import-status/{job_id}", headers=headers)
        assert status_resp.status_code == 200, status_resp.text
        status_data = status_resp.json()
        assert status_data["job_id"] == job_id
        assert status_data["total_records"] == 10
        assert 0.0 <= status_data["progress_percent"] <= 100.0
        if status_data["status"] in ("completed", "failed"):
            final_status = status_data
            break
        time.sleep(0.1)

    assert final_status is not None
    assert final_status["status"] == "completed"
    assert final_status["progress_percent"] == 100.0
    assert final_status["processed_records"] == 10
    assert final_status["inserted"] + final_status.get("updated", 0) == 10
    assert final_status["failed"] == 0
    assert final_status["result"] is not None
    assert final_status["result"]["imported_count"] + final_status["result"].get("updated_count", 0) == 10


def test_import_status_not_found():
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": settings.ADMIN_DEFAULT_EMAIL,
        "password": settings.ADMIN_DEFAULT_PASSWORD
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    bad_resp = client.get("/api/admin/results/import-status/non_existent_job_123", headers=headers)
    assert bad_resp.status_code == 404
    assert "not found" in bad_resp.json()["detail"].lower()
