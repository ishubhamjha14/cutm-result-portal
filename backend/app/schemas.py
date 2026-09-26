from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import List, Optional, Dict, Any
from datetime import datetime


# ==========================================
# AUTH SCHEMAS
# ==========================================

class LoginRequest(BaseModel):
    username_or_email: str = Field(..., description="Admin username or email")
    password: str = Field(..., min_length=4, description="Admin password")


class AdminResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminResponse


# ==========================================
# STUDENT & RESULT SCHEMAS
# ==========================================

class StudentInfo(BaseModel):
    id: int
    registration_number: str
    name: str
    branch_code: str
    branch_name: str
    program_code: str
    program_name: str
    academic_session: str
    campus: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class SubjectResultItem(BaseModel):
    subject_code: str
    subject_name: str
    credits: float
    grade: Optional[str] = None
    grade_point: Optional[float] = None
    credit_points: float
    status: str = "PASS"


class SemesterPerformanceSummary(BaseModel):
    semester: int
    semester_name: str
    total_credits: float
    earned_credits: float
    total_credit_points: float
    sgpa: float
    status: str = "PASS"


class SemesterResultResponse(BaseModel):
    student: StudentInfo
    semester: int
    semester_name: str
    academic_session: str
    examination_month_year: str
    published_date: str
    subjects: List[SubjectResultItem]
    total_credits: float
    earned_credits: float
    total_credit_points: float
    sgpa: float
    cgpa: float
    result_status: str  # PASS / FAIL / BACKLOG
    semester_progression: List[SemesterPerformanceSummary]


class StudentPerformanceResponse(BaseModel):
    student: StudentInfo
    current_cgpa: float
    total_credits_completed: float
    total_semesters_completed: int
    semesters: List[SemesterPerformanceSummary]


# ==========================================
# ADMIN RESULT MANAGEMENT SCHEMAS
# ==========================================

class ResultCreate(BaseModel):
    registration_number: str
    student_name: str
    branch_code: str
    program_code: str = "BTECH"
    academic_session: str = "2024-2028"
    semester: int
    subject_code: str
    subject_name: str
    credits: float
    grade: Optional[str] = None
    grade_point: Optional[float] = None
    examination_month_year: Optional[str] = "DECEMBER-2025"


class ResultUpdate(BaseModel):
    credits: Optional[float] = None
    grade: Optional[str] = None
    grade_point: Optional[float] = None
    status: Optional[str] = None
    examination_month_year: Optional[str] = None


class ResultListItem(BaseModel):
    id: int
    student_id: int
    registration_number: str
    student_name: str
    branch_code: str
    branch_name: str
    program_name: str
    semester: int
    subject_code: str
    subject_name: str
    credits: float
    grade: Optional[str] = None
    grade_point: Optional[float] = None
    credit_points: float
    academic_session: str
    examination_month_year: str
    status: Optional[str] = "PASS"

    class Config:
        from_attributes = True


class ResultListResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[ResultListItem]


# ==========================================
# STUDENT MANAGEMENT SCHEMAS
# ==========================================

class StudentCreate(BaseModel):
    registration_number: str
    name: str
    branch_id: int
    program_id: int
    academic_session: str
    campus: Optional[str] = "Bhubaneswar / Paralakhemundi Campus"
    email: Optional[str] = None
    phone: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    branch_id: Optional[int] = None
    program_id: Optional[int] = None
    academic_session: Optional[str] = None
    campus: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class StudentListItem(BaseModel):
    id: int
    registration_number: str
    name: str
    branch_code: str
    branch_name: str
    program_name: str
    academic_session: str
    campus: str
    email: Optional[str] = None
    phone: Optional[str] = None
    total_results_count: int
    current_cgpa: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StudentListResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[StudentListItem]


# ==========================================
# BULK IMPORT SCHEMAS
# ==========================================

class IgnoredFileInfo(BaseModel):
    filename: str
    reason: str


class FileSummaryInfo(BaseModel):
    filename: str
    format_name: str
    status: str = "PROCESSED"  # PROCESSED, ERROR, IGNORED
    sheets_detected: List[str] = []
    total_rows: int = 0
    valid_rows: int = 0
    invalid_rows: int = 0
    error_message: Optional[str] = None


class ImportRowPreview(BaseModel):
    row_num: int
    registration_number: str
    student_name: str
    branch: str
    program: str
    academic_session: str
    semester: int
    subject_code: str
    subject_name: str
    credits: float
    grade: Optional[str] = None
    grade_point: Optional[float] = None
    status: Optional[str] = "PASS"
    is_valid: bool
    errors: List[str] = []
    is_duplicate: bool = False
    source_file: Optional[str] = None
    source_row_num: Optional[int] = None


class ImportPreviewResponse(BaseModel):
    filename: str = "Uploaded File"
    format_name: str = "Excel Workbook (.xlsx)"
    sheets_detected: List[str] = []
    files_detected: int = 1
    result_files_count: int = 1
    ignored_files_count: int = 0
    ignored_files: List[IgnoredFileInfo] = []
    file_summaries: List[FileSummaryInfo] = []
    total_rows: int
    students_count: int = 0
    subjects_count: int = 0
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    existing_in_db_count: int = 0
    special_status_counts: Dict[str, int] = Field(default_factory=dict)
    unsupported_grades_counts: Dict[str, int] = Field(default_factory=dict)
    sample_rows: List[ImportRowPreview]
    errors_summary: List[str]
    preview_session_token: str


class ImportConfirmRequest(BaseModel):
    preview_session_token: Optional[str] = None
    overwrite_existing: bool = True
    async_mode: bool = False
    job_id: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def extract_preview_session_token(cls, data: Any) -> Any:
        if isinstance(data, dict):
            token = (
                data.get("preview_session_token")
                or data.get("previewSessionToken")
                or data.get("session_token")
                or data.get("sessionToken")
                or data.get("preview_session_id")
                or data.get("previewSessionId")
                or data.get("batch_id")
                or data.get("batchId")
                or data.get("token")
            )
            if token:
                data["preview_session_token"] = token
            if "async_mode" not in data and "async" in data:
                data["async_mode"] = bool(data["async"])
        return data


class ImportConfirmResponse(BaseModel):
    success: bool
    message: str
    job_id: Optional[str] = None
    status: Optional[str] = "completed"
    filename: str = ""
    files_count: int = 1
    students_count: int = 0
    subjects_count: int = 0
    imported_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    failed_count: int = 0
    total_records: Optional[int] = 0
    processed_records: Optional[int] = 0
    progress_percent: Optional[float] = 100.0


class ImportJobStatusResponse(BaseModel):
    job_id: str
    status: str  # "pending", "processing", "completed", "failed"
    progress_percent: float = 0.0
    total_records: int = 0
    processed_records: int = 0
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    failed: int = 0
    current_file: Optional[str] = None
    error_message: Optional[str] = None
    result: Optional[ImportConfirmResponse] = None


# ==========================================
# GRADE CONFIGURATION SCHEMAS
# ==========================================

class GradeConfigItem(BaseModel):
    id: int
    grade_letter: str
    grade_point: float
    description: str
    min_marks: float
    max_marks: float
    is_active: bool

    class Config:
        from_attributes = True


class GradeConfigCreate(BaseModel):
    grade_letter: str
    grade_point: float
    description: str = ""
    min_marks: float = 0.0
    max_marks: float = 100.0
    is_active: bool = True


class GradeConfigUpdate(BaseModel):
    grade_point: Optional[float] = None
    description: Optional[str] = None
    min_marks: Optional[float] = None
    max_marks: Optional[float] = None
    is_active: Optional[bool] = None


# ==========================================
# AUDIT LOG SCHEMAS
# ==========================================

class AuditLogItem(BaseModel):
    id: int
    admin_id: Optional[int]
    admin_email: str
    action: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[AuditLogItem]


# ==========================================
# METADATA & STATS SCHEMAS
# ==========================================

class BranchItem(BaseModel):
    id: int
    code: str
    name: str
    department: str

    class Config:
        from_attributes = True


class ProgramItem(BaseModel):
    id: int
    code: str
    name: str
    duration_years: int

    class Config:
        from_attributes = True


class SemesterItem(BaseModel):
    id: int
    semester_number: int
    name: str

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_students: int
    total_results: int
    total_branches: int
    total_semesters: int
    total_subjects: int
    recent_uploads_count: int
    latest_upload_time: Optional[datetime] = None
    branch_distribution: List[Dict[str, Any]] = []
    semester_distribution: List[Dict[str, Any]] = []
