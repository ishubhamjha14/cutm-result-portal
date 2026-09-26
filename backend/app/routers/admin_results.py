import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import Admin, Result, Student, Subject, Semester, Branch, Program, GradeConfiguration
from ..schemas import (
    ResultListItem,
    ResultListResponse,
    ResultCreate,
    ResultUpdate,
    ImportPreviewResponse,
    ImportConfirmRequest,
    ImportConfirmResponse,
)
from ..auth import get_current_admin
from ..services.calculations import get_grade_point_mapping
from ..services.importer import process_file_to_preview, process_bulk_files_to_preview, commit_preview_import
from ..services.audit import log_audit

router = APIRouter(prefix="/admin/results", tags=["Admin Results Management"])


@router.get("", response_model=ResultListResponse)
def get_admin_results(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    search: Optional[str] = None,
    branch_id: Optional[int] = None,
    semester_id: Optional[int] = None,
    academic_session: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Search and filter results with pagination.
    """
    query = db.query(Result).join(Student).join(Subject).join(Semester).join(Branch, Student.branch_id == Branch.id).join(Program, Student.program_id == Program.id)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (Student.registration_number.ilike(search_term)) |
            (Student.name.ilike(search_term)) |
            (Subject.code.ilike(search_term)) |
            (Subject.name.ilike(search_term))
        )

    if branch_id:
        query = query.filter(Student.branch_id == branch_id)

    if semester_id:
        query = query.filter(Result.semester_id == semester_id)

    if academic_session:
        query = query.filter(Result.academic_session == academic_session)

    total = query.count()
    offset = (page - 1) * limit
    results = query.order_by(Result.id.desc()).offset(offset).limit(limit).all()

    items = []
    for r in results:
        items.append(ResultListItem(
            id=r.id,
            student_id=r.student.id,
            registration_number=r.student.registration_number,
            student_name=r.student.name,
            branch_code=r.student.branch.code,
            branch_name=r.student.branch.name,
            program_name=r.student.program.name,
            semester=r.semester.semester_number,
            subject_code=r.subject.code,
            subject_name=r.subject.name,
            credits=r.credits,
            grade=r.grade,
            grade_point=r.grade_point,
            credit_points=r.credit_points,
            academic_session=r.academic_session,
            examination_month_year=r.examination_month_year or "DECEMBER-2025",
            status=r.status or "PASS"
        ))

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return ResultListResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=items
    )


@router.post("", response_model=ResultListItem)
def create_single_result(
    data: ResultCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Manually create a single result entry for a student.
    """
    client_ip = request.client.host if request.client else "unknown"
    reg_no = data.registration_number.strip().upper()

    # 1. Resolve branch
    branch = db.query(Branch).filter(Branch.code == data.branch_code.strip().upper()).first()
    if not branch:
        branch = Branch(code=data.branch_code.strip().upper(), name=f"{data.branch_code} Department")
        db.add(branch)
        db.flush()

    # 2. Resolve program
    program = db.query(Program).filter(Program.code == data.program_code.strip().upper()).first()
    if not program:
        program = Program(code=data.program_code.strip().upper(), name="Bachelor of Technology")
        db.add(program)
        db.flush()

    # 3. Resolve semester
    semester = db.query(Semester).filter(Semester.semester_number == data.semester).first()
    if not semester:
        semester = Semester(semester_number=data.semester, name=f"Semester {data.semester}")
        db.add(semester)
        db.flush()

    # 4. Resolve student
    student = db.query(Student).filter(Student.registration_number == reg_no).first()
    if not student:
        student = Student(
            registration_number=reg_no,
            name=data.student_name.strip(),
            branch_id=branch.id,
            program_id=program.id,
            academic_session=data.academic_session
        )
        db.add(student)
        db.flush()

    # 5. Resolve subject
    sub_code = data.subject_code.strip().upper()
    subject = db.query(Subject).filter(Subject.code == sub_code).first()
    if not subject:
        subject = Subject(
            code=sub_code,
            name=data.subject_name.strip(),
            default_credits=data.credits,
            branch_id=branch.id,
            semester_id=semester.id
        )
        db.add(subject)
        db.flush()

    # 6. Check if result already exists for this semester & subject
    existing = db.query(Result).filter(
        Result.student_id == student.id,
        Result.subject_id == subject.id,
        Result.semester_id == semester.id
    ).first()

    VALID_CUTM_GRADES = {"O", "E", "A", "B", "C", "D", "F", "M", "S", "R"}
    grade_str = data.grade.strip().upper()
    if grade_str not in VALID_CUTM_GRADES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid grade '{grade_str}'. Valid grades are O, E, A, B, C, D, F, M, S, R."
        )

    grade_map = get_grade_point_mapping(db)
    gp = data.grade_point if data.grade_point is not None else grade_map.get(grade_str, 0.0)
    cp = round(data.credits * gp, 2)
    status_val = "FAIL" if grade_str in ["F", "M", "S", "R", "FAIL", "AB"] else "PASS"

    if existing:
        existing.credits = data.credits
        existing.grade = grade_str
        existing.grade_point = gp
        existing.credit_points = cp
        existing.academic_session = data.academic_session
        existing.examination_month_year = data.examination_month_year or "DECEMBER-2025"
        existing.status = status_val
        result_obj = existing
    else:
        result_obj = Result(
            student_id=student.id,
            subject_id=subject.id,
            semester_id=semester.id,
            academic_session=data.academic_session,
            credits=data.credits,
            grade=grade_str,
            grade_point=gp,
            credit_points=cp,
            examination_month_year=data.examination_month_year or "DECEMBER-2025",
            status=status_val
        )
        db.add(result_obj)

    db.commit()
    db.refresh(result_obj)

    log_audit(
        db=db,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        action="CREATE_RESULT",
        entity_type="Result",
        entity_id=str(result_obj.id),
        details=f"Created result for {reg_no}, Sem {data.semester}, Sub {sub_code}, Grade {grade_str}",
        ip_address=client_ip
    )

    return ResultListItem(
        id=result_obj.id,
        student_id=student.id,
        registration_number=student.registration_number,
        student_name=student.name,
        branch_code=branch.code,
        branch_name=branch.name,
        program_name=program.name,
        semester=semester.semester_number,
        subject_code=subject.code,
        subject_name=subject.name,
        credits=result_obj.credits,
        grade=result_obj.grade,
        grade_point=result_obj.grade_point,
        credit_points=result_obj.credit_points,
        academic_session=result_obj.academic_session,
        examination_month_year=result_obj.examination_month_year,
        status=result_obj.status
    )


@router.put("/{result_id}", response_model=ResultListItem)
def update_result(
    result_id: int,
    data: ResultUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Update an existing result record.
    """
    client_ip = request.client.host if request.client else "unknown"
    result_obj = db.query(Result).filter(Result.id == result_id).first()
    if not result_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found.")

    VALID_CUTM_GRADES = {"O", "E", "A", "B", "C", "D", "F", "M", "S", "R"}
    grade_map = get_grade_point_mapping(db)

    if data.credits is not None:
        result_obj.credits = data.credits

    if data.grade is not None:
        grade_str = data.grade.strip().upper()
        if grade_str not in VALID_CUTM_GRADES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid grade '{grade_str}'. Valid grades are O, E, A, B, C, D, F, M, S, R."
            )
        result_obj.grade = grade_str
        if data.grade_point is None:
            result_obj.grade_point = grade_map.get(result_obj.grade, 0.0)

    if data.grade_point is not None:
        result_obj.grade_point = data.grade_point

    # Recalculate credit points
    result_obj.credit_points = round(result_obj.credits * result_obj.grade_point, 2)

    if data.status is not None:
        result_obj.status = data.status
    else:
        result_obj.status = "FAIL" if result_obj.grade in ["F", "M", "S", "R", "FAIL", "AB"] else "PASS"

    if data.examination_month_year is not None:
        result_obj.examination_month_year = data.examination_month_year

    db.commit()
    db.refresh(result_obj)

    log_audit(
        db=db,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        action="UPDATE_RESULT",
        entity_type="Result",
        entity_id=str(result_obj.id),
        details=f"Updated result ID {result_id}: Grade={result_obj.grade}, Credits={result_obj.credits}",
        ip_address=client_ip
    )

    return ResultListItem(
        id=result_obj.id,
        student_id=result_obj.student.id,
        registration_number=result_obj.student.registration_number,
        student_name=result_obj.student.name,
        branch_code=result_obj.student.branch.code,
        branch_name=result_obj.student.branch.name,
        program_name=result_obj.student.program.name,
        semester=result_obj.semester.semester_number,
        subject_code=result_obj.subject.code,
        subject_name=result_obj.subject.name,
        credits=result_obj.credits,
        grade=result_obj.grade,
        grade_point=result_obj.grade_point,
        credit_points=result_obj.credit_points,
        academic_session=result_obj.academic_session,
        examination_month_year=result_obj.examination_month_year,
        status=result_obj.status
    )


@router.delete("/{result_id}")
def delete_result(
    result_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Delete a single result entry.
    """
    client_ip = request.client.host if request.client else "unknown"
    result_obj = db.query(Result).filter(Result.id == result_id).first()
    if not result_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found.")

    student_reg = result_obj.student.registration_number
    sub_code = result_obj.subject.code

    db.delete(result_obj)
    db.commit()

    log_audit(
        db=db,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        action="DELETE_RESULT",
        entity_type="Result",
        entity_id=str(result_id),
        details=f"Deleted result ID {result_id} for student {student_reg}, subject {sub_code}",
        ip_address=client_ip
    )

    return {"message": f"Result {result_id} deleted successfully."}


@router.post("/bulk-delete")
def bulk_delete_results(
    result_ids: List[int],
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Bulk delete results with transactional rollback safety.
    """
    if not result_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No result IDs provided.")

    client_ip = request.client.host if request.client else "unknown"
    deleted_count = db.query(Result).filter(Result.id.in_(result_ids)).delete(synchronize_session=False)
    db.commit()

    log_audit(
        db=db,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        action="BULK_DELETE_RESULTS",
        entity_type="Result",
        details=f"Bulk deleted {deleted_count} results (IDs: {result_ids[:10]}...)",
        ip_address=client_ip
    )

    return {"message": f"Successfully deleted {deleted_count} results.", "deleted_count": deleted_count}


async def _extract_uploaded_files_and_preview(
    request: Request,
    db: Session,
    explicit_file: Optional[UploadFile] = None,
    explicit_files: Optional[List[UploadFile]] = None
) -> ImportPreviewResponse:
    """
    Robust helper to extract all files from multipart/form-data regardless of field names
    ('file', 'files', 'files[]', 'upload', 'archive', etc.) and generate a unified preview.
    """
    files_data: List[tuple[str, bytes]] = []

    # 1. Check explicit arguments if provided by FastAPI dependency
    if explicit_file and explicit_file.filename:
        content = await explicit_file.read()
        if len(content) > 0:
            files_data.append((explicit_file.filename, content))

    if explicit_files:
        for f in explicit_files:
            if f and f.filename:
                content = await f.read()
                if len(content) > 0:
                    files_data.append((f.filename, content))

    # 2. Inspect request form data for any other uploaded files
    if not files_data:
        try:
            form = await request.form()
            for key, value in form.multi_items():
                if isinstance(value, UploadFile) and value.filename:
                    content = await value.read()
                    if len(content) > 0:
                        files_data.append((value.filename, content))
        except Exception:
            pass

    if not files_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files detected. Please select one or more .xlsx, .xls, .csv files or a .zip archive."
        )

    try:
        if len(files_data) == 1 and not files_data[0][0].lower().endswith(".zip"):
            filename, content = files_data[0]
            return process_file_to_preview(content, filename, db)
        else:
            return process_bulk_files_to_preview(files_data, db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/preview-upload", response_model=ImportPreviewResponse)
@router.post("/preview-upload/", response_model=ImportPreviewResponse)
@router.post("/upload", response_model=ImportPreviewResponse)
@router.post("/upload/", response_model=ImportPreviewResponse)
@router.post("/preview", response_model=ImportPreviewResponse)
@router.post("/preview/", response_model=ImportPreviewResponse)
async def preview_upload_results(
    request: Request,
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Upload CSV, XLS, XLSX, or ZIP file(s), run complete validation, and return preview stats.
    Does NOT modify database yet.
    """
    return await _extract_uploaded_files_and_preview(request, db, file, files)


@router.post("/preview-bulk", response_model=ImportPreviewResponse)
@router.post("/preview-bulk/", response_model=ImportPreviewResponse)
@router.post("/bulk-upload", response_model=ImportPreviewResponse)
@router.post("/bulk-upload/", response_model=ImportPreviewResponse)
@router.post("/bulk-preview", response_model=ImportPreviewResponse)
@router.post("/bulk-preview/", response_model=ImportPreviewResponse)
async def preview_bulk_upload_results(
    request: Request,
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Upload multiple Excel/CSV/ZIP files simultaneously, run complete multi-file validation,
    and return a single combined preview.
    Does NOT modify database yet.
    """
    return await _extract_uploaded_files_and_preview(request, db, file, files)


@router.get("/preview-upload")
@router.get("/preview-upload/")
@router.get("/preview-bulk")
@router.get("/preview-bulk/")
@router.get("/bulk-upload")
@router.get("/bulk-upload/")
@router.get("/bulk-preview")
@router.get("/bulk-preview/")
@router.get("/upload")
@router.get("/upload/")
@router.get("/preview")
@router.get("/preview/")
def get_upload_endpoint_info(current_admin: Admin = Depends(get_current_admin)):
    """
    Informational endpoint if a GET request is accidentally performed.
    """
    return {
        "status": "ready",
        "message": "Use HTTP POST with multipart/form-data containing .xlsx, .xls, .csv files or a .zip archive.",
        "supported_formats": [".xlsx", ".xls", ".csv", ".zip"],
        "endpoints": [
            "/api/admin/results/preview-bulk",
            "/api/admin/results/preview-upload",
            "/api/admin/results/bulk-upload"
        ]
    }


@router.post("/confirm-import", response_model=ImportConfirmResponse)
@router.post("/confirm-import/", response_model=ImportConfirmResponse)
@router.post("/confirm", response_model=ImportConfirmResponse)
@router.post("/confirm/", response_model=ImportConfirmResponse)
@router.post("/import", response_model=ImportConfirmResponse)
@router.post("/import/", response_model=ImportConfirmResponse)
@router.post("/bulk-import", response_model=ImportConfirmResponse)
@router.post("/bulk-import/", response_model=ImportConfirmResponse)
def confirm_import_results(
    data: ImportConfirmRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Atomically commit validated rows from preview token into the database.
    """
    client_ip = request.client.host if request.client else "unknown"
    try:
        result = commit_preview_import(data.preview_session_token, db, data.overwrite_existing)
        
        log_audit(
            db=db,
            admin_id=current_admin.id,
            admin_email=current_admin.email,
            action="BULK_IMPORT_RESULTS",
            entity_type="Result",
            details=f"Bulk imported {result['imported_count']} new results, updated {result['updated_count']}, skipped {result.get('skipped_count', 0)} across {result.get('files_count', 1)} files ({result.get('filename', '')}). Students affected: {result.get('students_count', 0)}, Subjects affected: {result.get('subjects_count', 0)}.",
            ip_address=client_ip
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/export")
def export_results_csv(
    branch_id: Optional[int] = None,
    semester_id: Optional[int] = None,
    academic_session: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Exports filtered result records as a standard CSV download.
    """
    query = db.query(Result).join(Student).join(Subject).join(Semester).join(Branch, Student.branch_id == Branch.id).join(Program, Student.program_id == Program.id)

    if branch_id:
        query = query.filter(Student.branch_id == branch_id)
    if semester_id:
        query = query.filter(Result.semester_id == semester_id)
    if academic_session:
        query = query.filter(Result.academic_session == academic_session)

    results = query.order_by(Student.registration_number.asc(), Semester.semester_number.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "registration_number",
        "student_name",
        "branch",
        "program",
        "academic_session",
        "semester",
        "subject_code",
        "subject_name",
        "credits",
        "grade",
        "grade_point",
        "credit_points",
        "examination_month_year",
        "status"
    ])

    for r in results:
        writer.writerow([
            r.student.registration_number,
            r.student.name,
            r.student.branch.code,
            r.student.program.code,
            r.academic_session,
            r.semester.semester_number,
            r.subject.code,
            r.subject.name,
            r.credits,
            r.grade,
            r.grade_point,
            r.credit_points,
            r.examination_month_year,
            r.status
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cutm_results_export.csv"}
    )
