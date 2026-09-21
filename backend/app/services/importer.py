import uuid
import re
import io
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from sqlalchemy.orm import Session
from ..models import Student, Branch, Program, Semester, Subject, Result, GradeConfiguration
from ..services.calculations import get_grade_point_mapping

# In-memory storage for preview sessions
PREVIEW_SESSIONS: Dict[str, Dict[str, Any]] = {}

COLUMN_ALIASES = {
    "registration_number": [
        "registration_number", "reg_no", "regno", "regd_no", "regdno",
        "registration_no", "roll_no", "rollno", "student_id", "reg_number",
        "regd_number", "university_reg_no"
    ],
    "student_name": [
        "student_name", "name", "studentname", "full_name", "candidate_name",
        "name_of_the_student", "student"
    ],
    "branch": [
        "branch", "branch_code", "dept", "department", "discipline", "branch_name"
    ],
    "program": [
        "program", "program_code", "course", "degree", "program_name"
    ],
    "academic_session": [
        "academic_session", "session", "batch", "academic_year", "admission_batch",
        "batch_year", "admission_year"
    ],
    "semester": [
        "semester", "sem", "semester_number", "sem_no", "term"
    ],
    "subject_code": [
        "subject_code", "course_code", "sub_code", "paper_code", "subcode",
        "course_id", "subject_id", "paper_id"
    ],
    "subject_name": [
        "subject_name", "course_name", "sub_name", "subject_title", "paper_name",
        "subject", "course", "paper_title", "course_title"
    ],
    "credits": [
        "credits", "credit", "sub_credit", "course_credit", "total_credits",
        "sub_credits", "cr", "credit_point"
    ],
    "grade": [
        "grade", "letter_grade", "grade_secured", "secured_grade", "lg", "grade_point_letter",
        "old_grade", "original_grade", "previous_grade", "orig_grade"
    ],
    "new_grade": [
        "new_grade", "newgrade", "new_letter_grade", "revised_grade", "rechecking_grade",
        "rechecked_grade", "revised_letter_grade", "updated_grade", "recheck_grade",
        "final_grade", "latest_grade", "new_grade_secured"
    ],
    "grade_point": [
        "grade_point", "grade_points", "gp", "point", "points", "grade_pts",
        "old_grade_point", "old_gp", "orig_grade_point"
    ],
    "new_grade_point": [
        "new_grade_point", "new_gp", "new_grade_points", "revised_grade_point",
        "revised_gp", "rechecking_gp", "rechecked_gp", "updated_gp"
    ],
    "type": [
        "type", "course_type", "subject_type", "paper_type"
    ],
    "examination_month_year": [
        "examination_month_year", "exam_session", "exam_date", "month_year",
        "exam_month_year", "examination_session"
    ],
}

def normalize_column_name(col: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "", str(col).strip().lower().replace(" ", "_"))
    for standard_name, aliases in COLUMN_ALIASES.items():
        if cleaned in aliases or cleaned.rstrip("s") in aliases:
            return standard_name
    return cleaned

def parse_semester_from_string(val: Any) -> Optional[int]:
    if pd.isna(val) or val is None:
        return None
    val_str = str(val).strip().upper()
    # Check 1st, 2nd, 3rd, 4th, 5th, etc.
    ord_match = re.search(r"(\d+)(?:ST|ND|RD|TH)", val_str)
    if ord_match:
        return int(ord_match.group(1))
    
    # Check digits
    digits = re.findall(r"\d+", val_str)
    if digits:
        sem_num = int(digits[0])
        if 1 <= sem_num <= 12:
            return sem_num
            
    # Check Roman numerals
    roman_map = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8}
    for r, n in roman_map.items():
        if val_str == r or f"SEM {r}" in val_str or f"SEMESTER {r}" in val_str:
            return n
    return None

def detect_semester_from_filename(filename: str) -> int:
    """Extract semester number from filename like 'BTECH 2024 Batch 1st Sem Result.xls'"""
    fn = filename.upper()
    m = re.search(r"(\d+)(?:ST|ND|RD|TH)\s*SEM", fn)
    if m:
        return int(m.group(1))
    m2 = re.search(r"SEM(?:ESTER)?\s*(\d+)", fn)
    if m2:
        return int(m2.group(1))
    m3 = re.search(r"(\d+)\s*SEM", fn)
    if m3:
        return int(m3.group(1))
    return 1

def detect_academic_session_from_filename(filename: str) -> str:
    fn = filename.upper()
    m = re.search(r"(20\d\d)\s*BATCH", fn)
    if m:
        start_year = int(m.group(1))
        return f"{start_year}-{start_year + 4}"
    m2 = re.search(r"(20\d\d)-(20\d\d)", fn)
    if m2:
        return f"{m2.group(1)}-{m2.group(2)}"
    return "2024-2028"

def detect_program_from_filename(filename: str) -> str:
    fn = filename.upper()
    if "MTECH" in fn or "M.TECH" in fn:
        return "MTECH"
    if "MCA" in fn:
        return "MCA"
    if "BCA" in fn:
        return "BCA"
    if "DIPLOMA" in fn:
        return "DIPLOMA"
    return "BTECH"

def infer_branch_from_subject_code(sub_code: str) -> str:
    code = sub_code.upper()
    if code.startswith("CUCS") or code.startswith("CSE"):
        return "CSE"
    if code.startswith("CUAI") or "AIML" in code or "AI" in code:
        return "CSE-AIML"
    if code.startswith("CUEC") or code.startswith("ECE"):
        return "ECE"
    if code.startswith("CUEE") or code.startswith("EEE"):
        return "EEE"
    if code.startswith("CUMC") or code.startswith("CUME") or code.startswith("ME"):
        return "ME"
    if code.startswith("CUCE") or code.startswith("CE"):
        return "CE"
    if code.startswith("CUTM"):
        return "CSE"
    return "CSE"

def parse_credits_value(val: Any) -> float:
    """
    Parses credit strings such as '2.0+4.0' -> 6.0, '2.0+2.0+2.0' -> 6.0, '4' -> 4.0, 4.0 -> 4.0
    """
    if pd.isna(val) or val is None:
        return 4.0
    val_str = str(val).strip()
    if not val_str:
        return 4.0
    numbers = re.findall(r"\d+(?:\.\d+)?", val_str)
    if not numbers:
        return 4.0
    total_cr = sum(float(n) for n in numbers)
    return total_cr if total_cr > 0 else 4.0

def find_header_row_and_load(
    file_bytes: bytes,
    sheet_name: Any,
    engine: str
) -> pd.DataFrame:
    """
    Scans the first 15 rows of a spreadsheet sheet to locate the actual header row
    even if top rows have university titles, exam names, or blank cells.
    """
    # Read first 15 rows without header
    try:
        sample_df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name, engine=engine, header=None, nrows=15)
    except Exception as e:
        raise ValueError(f"Could not read sheet '{sheet_name}': {str(e)}")

    best_header_row = 0
    max_matches = 0

    key_terms = {"reg_no", "regno", "regd_no", "registration", "student", "name", "subject", "credits", "grade", "sub_code", "course"}

    for r_idx in range(len(sample_df)):
        row_values = [str(x).strip().lower().replace(" ", "_") for x in sample_df.iloc[r_idx] if not pd.isna(x)]
        matches = 0
        for val in row_values:
            for term in key_terms:
                if term in val:
                    matches += 1
                    break
        if matches > max_matches:
            max_matches = matches
            best_header_row = r_idx

    # Now read complete sheet using detected header row
    df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name, engine=engine, header=best_header_row)
    return df


def clean_and_normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardize DataFrame column names using alias matching and remove blank rows.
    """
    if df.empty:
        return df
    
    cleaned_df = df.copy()
    cleaned_df.columns = [normalize_column_name(c) for c in cleaned_df.columns]
    cleaned_df = cleaned_df.dropna(how="all")
    return cleaned_df


def process_file_to_preview(
    file_bytes: bytes,
    filename: str,
    db: Session
) -> Dict[str, Any]:
    """
    Parse CSV, XLS (Excel 97-2003), or XLSX with multi-sheet support,
    custom credit sum parsing, semester detection, and duplicate checking.
    """
    fn_lower = filename.lower()
    is_xls = fn_lower.endswith(".xls")
    is_xlsx = fn_lower.endswith(".xlsx")
    is_csv = fn_lower.endswith(".csv")

    format_name = "Unknown Format"
    sheets_detected = []
    dfs_to_process = []

    # 1. Read files based on extension and engine
    if is_xls:
        format_name = "Excel 97-2003 (.xls)"
        try:
            excel_file = pd.ExcelFile(io.BytesIO(file_bytes), engine="xlrd")
            sheets_detected = excel_file.sheet_names
            for sheet in sheets_detected:
                df = find_header_row_and_load(file_bytes, sheet, engine="xlrd")
                if not df.empty:
                    dfs_to_process.append((sheet, df))
        except Exception as e:
            err_msg = str(e)
            if "xlrd" in err_msg.lower() or "no module" in err_msg.lower():
                raise ValueError("Excel 97-2003 (.xls) support is not installed on the server. Please install xlrd >= 2.0.1.")
            # Try openpyxl fallback if misnamed .xlsx
            try:
                excel_file = pd.ExcelFile(io.BytesIO(file_bytes), engine="openpyxl")
                sheets_detected = excel_file.sheet_names
                format_name = "Excel Workbook (.xlsx)"
                for sheet in sheets_detected:
                    df = find_header_row_and_load(file_bytes, sheet, engine="openpyxl")
                    if not df.empty:
                        dfs_to_process.append((sheet, df))
            except Exception:
                raise ValueError(f"Unable to read this Excel file. Please verify that the file is a valid .xls/.xlsx workbook: {err_msg}")

    elif is_xlsx:
        format_name = "Excel Workbook (.xlsx)"
        try:
            excel_file = pd.ExcelFile(io.BytesIO(file_bytes), engine="openpyxl")
            sheets_detected = excel_file.sheet_names
            for sheet in sheets_detected:
                df = find_header_row_and_load(file_bytes, sheet, engine="openpyxl")
                if not df.empty:
                    dfs_to_process.append((sheet, df))
        except Exception as e:
            # Fallback to xlrd if misnamed .xls
            try:
                excel_file = pd.ExcelFile(io.BytesIO(file_bytes), engine="xlrd")
                sheets_detected = excel_file.sheet_names
                format_name = "Excel 97-2003 (.xls)"
                for sheet in sheets_detected:
                    df = find_header_row_and_load(file_bytes, sheet, engine="xlrd")
                    if not df.empty:
                        dfs_to_process.append((sheet, df))
            except Exception:
                raise ValueError(f"Unable to read this Excel file: {str(e)}")

    elif is_csv:
        format_name = "Comma Separated Values (.csv)"
        sheets_detected = ["CSV Data"]
        try:
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding="latin-1")
            if not df.empty:
                dfs_to_process.append(("CSV Data", df))
        except Exception as e:
            raise ValueError(f"Failed to read CSV file: {str(e)}")
    else:
        raise ValueError("Unsupported format. Supported formats: .xls, .xlsx, .csv")

    if not dfs_to_process:
        raise ValueError("No data found in the uploaded file. All sheets appear to be empty.")

    # 2. Extract context from filename
    filename_sem = detect_semester_from_filename(filename)
    filename_session = detect_academic_session_from_filename(filename)
    filename_program = detect_program_from_filename(filename)

    grade_map = get_grade_point_mapping(db)

    # 3. Process all rows across all sheets
    parsed_rows = []
    seen_batch_keys = set()
    unique_students = set()
    unique_subjects = set()
    valid_count = 0
    invalid_count = 0
    duplicate_count = 0
    error_messages_summary = set()
    special_status_counts = {"R": 0, "M": 0, "S": 0}

    for sheet_name, df in dfs_to_process:
        normalized_df = clean_and_normalize_dataframe(df)
        if normalized_df.empty:
            continue

        for idx, row in normalized_df.iterrows():
            row_num = len(parsed_rows) + 1
            errors = []
            is_dup = False

            # Registration Number
            raw_reg = row.get("registration_number")
            if pd.isna(raw_reg) or str(raw_reg).strip() == "" or str(raw_reg).strip().upper() == "NAN":
                errors.append("Missing student registration number")
                reg_no = f"TEMP_{row_num}"
            else:
                reg_no = str(raw_reg).strip().upper()

            # Student Name
            raw_name = row.get("student_name")
            if not pd.isna(raw_name) and str(raw_name).strip() and str(raw_name).strip().upper() != "NAN":
                student_name = str(raw_name).strip().title()
            else:
                student_name = f"Student {reg_no}"

            # Subject Code
            raw_sub_code = row.get("subject_code")
            if pd.isna(raw_sub_code) or str(raw_sub_code).strip() == "" or str(raw_sub_code).strip().upper() == "NAN":
                errors.append("Missing subject/course code")
                sub_code = f"SUB_{row_num}"
            else:
                sub_code = str(raw_sub_code).strip().upper()

            # Subject Name
            raw_sub_name = row.get("subject_name")
            if not pd.isna(raw_sub_name) and str(raw_sub_name).strip() and str(raw_sub_name).strip().upper() != "NAN":
                sub_name = str(raw_sub_name).strip()
            else:
                sub_name = sub_code

            # Semester
            raw_sem = row.get("semester")
            parsed_sem = parse_semester_from_string(raw_sem)
            sem_num = parsed_sem if parsed_sem is not None else filename_sem

            # Branch
            raw_branch = row.get("branch")
            if not pd.isna(raw_branch) and str(raw_branch).strip():
                branch = str(raw_branch).strip().upper()
            else:
                branch = infer_branch_from_subject_code(sub_code)

            # Program & Session
            raw_prog = row.get("program")
            program = str(raw_prog).strip().upper() if not pd.isna(raw_prog) else filename_program

            raw_session = row.get("academic_session")
            academic_session = str(raw_session).strip() if not pd.isna(raw_session) else filename_session

            # Credits
            raw_credits = row.get("credits")
            credits_val = parse_credits_value(raw_credits)

            # Grade & Grade Point (handles both regular results and revised/rechecking results)
            VALID_CUTM_GRADES = {"O", "E", "A", "B", "C", "D", "F", "M", "S", "R"}
            SPECIAL_STATUS_GRADES = {"M", "S", "R"}
            
            raw_new_grade = row.get("new_grade")
            raw_orig_grade = row.get("grade")

            # Detect whether a valid, non-blank New Grade is present
            has_valid_new_grade = (
                not pd.isna(raw_new_grade)
                and str(raw_new_grade).strip() != ""
                and str(raw_new_grade).strip().upper() not in ("NAN", "NONE", "NULL", "NA", "-", "N/A")
            )

            # Prioritize revised/new grade if present; fall back to original grade
            if has_valid_new_grade:
                effective_raw_grade = raw_new_grade
            else:
                effective_raw_grade = raw_orig_grade

            if (
                pd.isna(effective_raw_grade)
                or str(effective_raw_grade).strip() == ""
                or str(effective_raw_grade).strip().upper() in ("NAN", "NONE", "NULL", "NA", "N/A")
            ):
                errors.append("Missing subject grade")
                grade_str = "F"
            else:
                grade_str = str(effective_raw_grade).strip().upper()
                if grade_str not in VALID_CUTM_GRADES:
                    errors.append(f"Invalid grade '{grade_str}'. Valid grades are O, E, A, B, C, D, F, M, S, R.")
                elif grade_str in SPECIAL_STATUS_GRADES:
                    special_status_counts[grade_str] = special_status_counts.get(grade_str, 0) + 1
            
            # Map grade points
            mapped_gp = grade_map.get(grade_str)
            
            raw_new_gp = row.get("new_grade_point")
            raw_orig_gp = row.get("grade_point")

            has_valid_new_gp = (
                not pd.isna(raw_new_gp)
                and str(raw_new_gp).strip() != ""
                and str(raw_new_gp).strip().upper() not in ("NAN", "NONE", "NULL", "NA", "-", "N/A")
            )

            if has_valid_new_grade:
                if has_valid_new_gp:
                    try:
                        gp_val = float(raw_new_gp)
                    except (ValueError, TypeError):
                        gp_val = mapped_gp if mapped_gp is not None else 0.0
                else:
                    gp_val = mapped_gp if mapped_gp is not None else 0.0
            else:
                if (
                    not pd.isna(raw_orig_gp)
                    and str(raw_orig_gp).strip() != ""
                    and str(raw_orig_gp).strip().upper() not in ("NAN", "NONE", "NULL", "NA", "N/A")
                ):
                    try:
                        gp_val = float(raw_orig_gp)
                    except (ValueError, TypeError):
                        gp_val = mapped_gp if mapped_gp is not None else 0.0
                else:
                    gp_val = mapped_gp if mapped_gp is not None else 0.0

            # Examination Month/Year
            raw_exam = row.get("examination_month_year")
            exam_session = str(raw_exam).strip() if not pd.isna(raw_exam) else "DECEMBER-2025"

            # Duplicate checking in current batch
            composite_key = (reg_no, sem_num, sub_code)
            if composite_key in seen_batch_keys:
                is_dup = True
                errors.append(f"Duplicate record in file for {reg_no}, Sem {sem_num}, {sub_code}")
                duplicate_count += 1
            else:
                seen_batch_keys.add(composite_key)

            is_valid = len(errors) == 0
            if is_valid:
                valid_count += 1
                unique_students.add(reg_no)
                unique_subjects.add(sub_code)
            else:
                invalid_count += 1
                for err in errors:
                    error_messages_summary.add(f"Row {row_num}: {err}")

            parsed_rows.append({
                "row_num": row_num,
                "registration_number": reg_no,
                "student_name": student_name,
                "branch": branch,
                "program": program,
                "academic_session": academic_session,
                "semester": sem_num,
                "subject_code": sub_code,
                "subject_name": sub_name,
                "credits": credits_val,
                "grade": grade_str,
                "grade_point": gp_val,
                "examination_month_year": exam_session,
                "is_valid": is_valid,
                "errors": errors,
                "is_duplicate": is_dup,
            })

    # Check how many of these records already exist in the database
    existing_in_db_count = 0
    if parsed_rows:
        sample_regs = list({r["registration_number"] for r in parsed_rows if r["is_valid"]})[:1000]
        existing_results = db.query(Result).join(Student).join(Subject).join(Semester).filter(
            Student.registration_number.in_(sample_regs)
        ).all()
        db_keys = {(r.student.registration_number, r.semester.semester_number, r.subject.code) for r in existing_results}
        for r in parsed_rows:
            if (r["registration_number"], r["semester"], r["subject_code"]) in db_keys:
                existing_in_db_count += 1

    session_token = str(uuid.uuid4())
    PREVIEW_SESSIONS[session_token] = {
        "filename": filename,
        "format_name": format_name,
        "sheets_detected": sheets_detected,
        "total_rows": len(parsed_rows),
        "students_count": len(unique_students),
        "subjects_count": len(unique_subjects),
        "valid_rows": valid_count,
        "invalid_rows": invalid_count,
        "duplicate_rows": duplicate_count,
        "existing_in_db_count": existing_in_db_count,
        "special_status_counts": special_status_counts,
        "rows": parsed_rows
    }

    return {
        "filename": filename,
        "format_name": format_name,
        "sheets_detected": sheets_detected,
        "total_rows": len(parsed_rows),
        "students_count": len(unique_students),
        "subjects_count": len(unique_subjects),
        "valid_rows": valid_count,
        "invalid_rows": invalid_count,
        "duplicate_rows": duplicate_count,
        "existing_in_db_count": existing_in_db_count,
        "special_status_counts": special_status_counts,
        "sample_rows": parsed_rows[:50],
        "errors_summary": list(error_messages_summary)[:20],
        "preview_session_token": session_token
    }


def commit_preview_import(
    session_token: str,
    db: Session,
    overwrite_existing: bool = True
) -> Dict[str, Any]:
    """
    Performs atomic transactional database import for all valid parsed rows.
    """
    session_data = PREVIEW_SESSIONS.get(session_token)
    if not session_data:
        raise ValueError("Invalid or expired preview session. Please re-upload the file.")

    rows = session_data["rows"]
    valid_rows = [r for r in rows if r["is_valid"]]

    if not valid_rows:
        raise ValueError("No valid records found to import.")

    # Caches for rapid ingestion
    branches_cache = {b.code.upper(): b for b in db.query(Branch).all()}
    programs_cache = {p.code.upper(): p for p in db.query(Program).all()}
    semesters_cache = {s.semester_number: s for s in db.query(Semester).all()}
    
    default_program = programs_cache.get("BTECH")
    if not default_program:
        default_program = Program(code="BTECH", name="Bachelor of Technology", duration_years=4)
        db.add(default_program)
        db.flush()
        programs_cache["BTECH"] = default_program

    imported_count = 0
    updated_count = 0
    skipped_count = 0
    failed_count = 0

    students_created_or_updated = set()
    subjects_created_or_updated = set()

    try:
        for r in valid_rows:
            branch_code = r["branch"].upper()
            branch = branches_cache.get(branch_code)
            if not branch:
                branch = Branch(code=branch_code, name=f"{branch_code} Department")
                db.add(branch)
                db.flush()
                branches_cache[branch_code] = branch

            program_code = r["program"].upper()
            program = programs_cache.get(program_code, default_program)

            sem_num = r["semester"]
            semester = semesters_cache.get(sem_num)
            if not semester:
                semester = Semester(semester_number=sem_num, name=f"Semester {sem_num}")
                db.add(semester)
                db.flush()
                semesters_cache[sem_num] = semester

            # Find or create Student
            student = db.query(Student).filter(Student.registration_number == r["registration_number"]).first()
            if not student:
                student = Student(
                    registration_number=r["registration_number"],
                    name=r["student_name"],
                    branch_id=branch.id,
                    program_id=program.id,
                    academic_session=r["academic_session"]
                )
                db.add(student)
                db.flush()
            else:
                if r["student_name"] and r["student_name"] != f"Student {r['registration_number']}":
                    student.name = r["student_name"]
                student.branch_id = branch.id
                student.program_id = program.id
                student.academic_session = r["academic_session"]

            students_created_or_updated.add(student.id)

            # Find or create Subject
            subject = db.query(Subject).filter(
                Subject.code == r["subject_code"],
                Subject.name == r["subject_name"]
            ).first()
            if not subject:
                subject = db.query(Subject).filter(Subject.code == r["subject_code"]).first()
                if not subject:
                    subject = Subject(
                        code=r["subject_code"],
                        name=r["subject_name"],
                        default_credits=r["credits"],
                        branch_id=branch.id,
                        semester_id=semester.id
                    )
                    db.add(subject)
                    db.flush()

            subjects_created_or_updated.add(subject.id)

            # Check existing result
            existing_result = db.query(Result).filter(
                Result.student_id == student.id,
                Result.subject_id == subject.id,
                Result.semester_id == semester.id
            ).first()

            cp = round(r["credits"] * r["grade_point"], 2)
            status_val = "FAIL" if str(r["grade"]).upper() in ["F", "M", "S", "R", "FAIL", "AB"] else "PASS"

            if existing_result:
                if overwrite_existing:
                    existing_result.credits = r["credits"]
                    existing_result.grade = r["grade"]
                    existing_result.grade_point = r["grade_point"]
                    existing_result.credit_points = cp
                    existing_result.academic_session = r["academic_session"]
                    existing_result.examination_month_year = r["examination_month_year"]
                    existing_result.status = status_val
                    updated_count += 1
                else:
                    skipped_count += 1
            else:
                new_result = Result(
                    student_id=student.id,
                    subject_id=subject.id,
                    semester_id=semester.id,
                    academic_session=r["academic_session"],
                    credits=r["credits"],
                    grade=r["grade"],
                    grade_point=r["grade_point"],
                    credit_points=cp,
                    examination_month_year=r["examination_month_year"],
                    status=status_val
                )
                db.add(new_result)
                imported_count += 1

        db.commit()

        # Clean up session
        del PREVIEW_SESSIONS[session_token]

        return {
            "success": True,
            "message": f"Successfully imported {imported_count} new results, updated {updated_count} records, skipped {skipped_count} duplicates.",
            "filename": session_data.get("filename", ""),
            "students_count": len(students_created_or_updated),
            "subjects_count": len(subjects_created_or_updated),
            "imported_count": imported_count,
            "updated_count": updated_count,
            "skipped_count": skipped_count,
            "failed_count": failed_count
        }

    except Exception as e:
        db.rollback()
        raise ValueError(f"Database error during result import: {str(e)}")
