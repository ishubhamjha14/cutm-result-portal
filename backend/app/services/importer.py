import uuid
import re
import io
import os
import json
import datetime
import zipfile
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional, Set
from sqlalchemy.orm import Session
from ..models import Student, Branch, Program, Semester, Subject, Result, GradeConfiguration, ImportPreviewSession
from ..services.calculations import get_grade_point_mapping

# In-memory storage for preview sessions
PREVIEW_SESSIONS: Dict[str, Dict[str, Any]] = {}

# Standard CUTM CBCS Grades and Special Statuses
VALID_CUTM_GRADES = {"O", "E", "A", "B", "C", "D", "F", "M", "S", "R"}
SPECIAL_STATUS_GRADES = {"M", "S", "R"}
OFFICIAL_INTEGER_GP_TO_GRADE = {
    10.0: "O",
    9.0: "E",
    8.0: "A",
    7.0: "B",
    6.0: "C",
    5.0: "D",
    0.0: "F",
}

COLUMN_ALIASES = {
    "registration_number": [
        "registration_number", "reg_no", "regno", "regd_no", "regdno",
        "registration_no", "roll_no", "rollno", "student_id", "reg_number",
        "regd_number", "university_reg_no", "registration"
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
    "subject_type": [
        "subject_type", "course_type", "paper_type", "type"
    ],
    "credits": [
        "credits", "credit", "sub_credit", "course_credit", "total_credits",
        "sub_credits", "cr"
    ],
    "grade": [
        "grade", "letter_grade", "grade_secured", "secured_grade", "lg",
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
    "examination_month_year": [
        "examination_month_year", "exam_session", "exam_date", "month_year",
        "exam_month_year", "examination_session"
    ],
}

# Maximum limits for archive protection
MAX_ZIP_BYTES = 50 * 1024 * 1024       # 50 MB
MAX_EXTRACTED_BYTES = 200 * 1024 * 1024 # 200 MB
MAX_FILES_IN_ARCHIVE = 150


def normalize_column_name(col: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "", str(col).strip().lower().replace(" ", "_"))
    for standard_name, aliases in COLUMN_ALIASES.items():
        if cleaned in aliases or cleaned.rstrip("s") in aliases:
            return standard_name
    return cleaned


def format_clean_float(val: float) -> str:
    """
    Rounds a float to 2 decimal places to remove floating-point artifacts like 7.1000000000000005,
    and returns an integer string if whole (e.g. '7') or clean decimal string (e.g. '7.1', '6.35').
    """
    rounded = round(val, 2)
    if rounded == int(rounded):
        return str(int(rounded))
    return f"{rounded:g}"


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
    m3 = re.search(r"\b(20\d\d)\b", fn)
    if m3:
        yr = int(m3.group(1))
        return f"{yr}-{yr + 4}"
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
    if "BBA" in fn:
        return "BBA"
    if "BFSC" in fn:
        return "BFSC"
    if "MSC(AG)" in fn or "MSC (AG)" in fn:
        return "MSC-AG"
    if "BSC(AG)" in fn or "BSC (AG)" in fn:
        return "BSC-AG"
    if "BSC(NURSING)" in fn or "NURSING" in fn:
        return "BSC-NURSING"
    if "BSC" in fn:
        return "BSC"
    if "BTECH" in fn:
        return "BTECH"
    return "BTECH"


def detect_exam_session_from_filename(filename: str) -> str:
    fn = filename.upper()
    # E.g. "EOD SEP 2026 RESULT - BBA.xlsx" -> "SEPTEMBER-2026"
    month_map = {
        "JAN": "JANUARY", "FEB": "FEBRUARY", "MAR": "MARCH", "APR": "APRIL",
        "MAY": "MAY", "JUN": "JUNE", "JUL": "JULY", "AUG": "AUGUST",
        "SEP": "SEPTEMBER", "OCT": "OCTOBER", "NOV": "NOVEMBER", "DEC": "DECEMBER"
    }
    for short_m, full_m in month_map.items():
        m = re.search(rf"\b{short_m}(?:TEMBER|T|UARY|RUARY|CH|IL|E|Y|UST|OBER|EMBER)?\s*(20\d\d)\b", fn)
        if m:
            return f"{full_m}-{m.group(1)}"
    return "DECEMBER-2025"


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
    if code.startswith("BBA") or code.startswith("MG"):
        return "BBA"
    if code.startswith("FSC") or code.startswith("BFSC"):
        return "BFSC"
    if code.startswith("AG") or code.startswith("BSAG") or code.startswith("MSAG"):
        return "AGRICULTURE"
    if code.startswith("NUR") or code.startswith("BSCN"):
        return "NURSING"
    if code.startswith("DIP"):
        return "DIPLOMA"
    return "CSE"


def parse_credits_value(val: Any) -> float:
    """
    Parses credit strings such as '2.0+4.0' -> 6.0, '2.0+2.0+2.0' -> 6.0, '4' -> 4.0, 4.0 -> 4.0
    """
    if pd.isna(val) or val is None:
        return 4.0
    val_str = str(val).strip()
    if not val_str or val_str.upper() in ("NAN", "NONE", "NULL", "-"):
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
    Scans the first 20 rows of a spreadsheet sheet to locate the actual header row
    even if top rows have university titles, exam names, or blank cells.
    """
    try:
        sample_df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name, engine=engine, header=None, nrows=20)
    except Exception as e:
        raise ValueError(f"Could not read sheet '{sheet_name}': {str(e)}")

    best_header_row = 0
    max_matches = 0

    key_terms = {
        "reg_no", "regno", "regd_no", "registration", "registration_no",
        "student", "name", "subject", "credits", "grade", "grade_point", "sub_code", "course", "sl_no", "sem"
    }

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


def extract_and_validate_zip_archive(
    zip_bytes: bytes,
    zip_filename: str
) -> Tuple[List[Tuple[str, bytes]], List[Dict[str, str]]]:
    """
    Safely inspects and extracts supported result files (.xlsx, .xls, .csv) from a ZIP archive.
    
    Security Protections:
    - Path traversal / Zip Slip prevention.
    - Archive size and file count limits (decompression bomb protection).
    - Automatically ignores non-result files (.pdf, .docx, images, QR files, OS metadata).
    
    Returns:
        (result_files, ignored_files)
        result_files: [(clean_filename, content_bytes), ...]
        ignored_files: [{"filename": str, "reason": str}, ...]
    """
    if len(zip_bytes) > MAX_ZIP_BYTES:
        raise ValueError(f"ZIP archive exceeds maximum allowed size of {MAX_ZIP_BYTES // (1024*1024)} MB.")

    result_files: List[Tuple[str, bytes]] = []
    ignored_files: List[Dict[str, str]] = []
    total_uncompressed_bytes = 0

    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
            infolist = zf.infolist()

            if len(infolist) > MAX_FILES_IN_ARCHIVE:
                raise ValueError(f"ZIP archive contains too many files ({len(infolist)}). Max allowed is {MAX_FILES_IN_ARCHIVE}.")

            for info in infolist:
                # 1. Skip directories
                if info.is_dir():
                    continue

                raw_name = info.filename
                # Normalize path and check for path traversal (Zip Slip)
                norm_name = os.path.normpath(raw_name).replace("\\", "/")
                if (
                    norm_name.startswith("../")
                    or norm_name.startswith("/..")
                    or "/../" in norm_name
                    or os.path.isabs(norm_name)
                    or ":" in norm_name
                ):
                    ignored_files.append({
                        "filename": raw_name,
                        "reason": "Ignored - Unsafe path or path traversal detected"
                    })
                    continue

                # 2. Skip OS hidden / metadata files
                base_name = os.path.basename(norm_name)
                if (
                    base_name.startswith(".")
                    or base_name.startswith("~")
                    or "__MACOSX" in norm_name
                    or base_name.lower() in ("thumbs.db", "desktop.ini", ".ds_store")
                ):
                    continue

                # 3. Check uncompressed size
                total_uncompressed_bytes += info.file_size
                if total_uncompressed_bytes > MAX_EXTRACTED_BYTES:
                    raise ValueError(f"ZIP extracted content exceeds maximum allowed size of {MAX_EXTRACTED_BYTES // (1024*1024)} MB (potential decompression bomb).")

                # 4. Filter supported vs unsupported files
                fn_lower = base_name.lower()
                is_supported = fn_lower.endswith(".xlsx") or fn_lower.endswith(".xls") or fn_lower.endswith(".csv")

                if is_supported:
                    file_content = zf.read(info)
                    result_files.append((base_name, file_content))
                else:
                    ext = os.path.splitext(base_name)[1].lower() or "unknown"
                    ignored_files.append({
                        "filename": base_name,
                        "reason": f"Ignored - Non-result file type ({ext})"
                    })

    except zipfile.BadZipFile:
        raise ValueError("Invalid or corrupted ZIP archive file.")

    return result_files, ignored_files


def parse_result_workbook(
    file_bytes: bytes,
    filename: str,
    db: Session
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Parses a single spreadsheet/csv file and extracts standardized rows.
    
    Returns:
        (file_summary, parsed_rows)
    """
    fn_lower = filename.lower()
    is_xls = fn_lower.endswith(".xls")
    is_xlsx = fn_lower.endswith(".xlsx")
    is_csv = fn_lower.endswith(".csv")

    format_name = "Unknown Format"
    sheets_detected = []
    dfs_to_process = []

    try:
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
                # Fallback to openpyxl if misnamed .xlsx
                try:
                    excel_file = pd.ExcelFile(io.BytesIO(file_bytes), engine="openpyxl")
                    sheets_detected = excel_file.sheet_names
                    format_name = "Excel Workbook (.xlsx)"
                    for sheet in sheets_detected:
                        df = find_header_row_and_load(file_bytes, sheet, engine="openpyxl")
                        if not df.empty:
                            dfs_to_process.append((sheet, df))
                except Exception:
                    raise ValueError(f"Unable to read this Excel file ({filename}): {err_msg}")

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
                    raise ValueError(f"Unable to read this Excel file ({filename}): {str(e)}")

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
                raise ValueError(f"Failed to read CSV file ({filename}): {str(e)}")
        else:
            raise ValueError(f"Unsupported format for {filename}. Supported formats: .xls, .xlsx, .csv")

    except Exception as e:
        return {
            "filename": filename,
            "format_name": format_name,
            "status": "ERROR",
            "sheets_detected": sheets_detected,
            "total_rows": 0,
            "valid_rows": 0,
            "invalid_rows": 0,
            "error_message": str(e)
        }, []

    if not dfs_to_process:
        return {
            "filename": filename,
            "format_name": format_name,
            "status": "ERROR",
            "sheets_detected": sheets_detected,
            "total_rows": 0,
            "valid_rows": 0,
            "invalid_rows": 0,
            "error_message": "All sheets in this file appear to be empty or contain no recognizable tabular result data."
        }, []

    # Extract metadata context from filename
    filename_sem = detect_semester_from_filename(filename)
    filename_session = detect_academic_session_from_filename(filename)
    filename_program = detect_program_from_filename(filename)
    filename_exam_session = detect_exam_session_from_filename(filename)

    grade_map = get_grade_point_mapping(db)

    parsed_rows: List[Dict[str, Any]] = []
    file_valid_count = 0
    file_invalid_count = 0

    for sheet_name, df in dfs_to_process:
        normalized_df = clean_and_normalize_dataframe(df)
        if normalized_df.empty:
            continue

        for idx, row in normalized_df.iterrows():
            source_row_num = int(idx) + 2 # Approx 1-indexed spreadsheet row
            errors = []

            # 1. Registration Number
            raw_reg = row.get("registration_number")
            if pd.isna(raw_reg) or str(raw_reg).strip() == "" or str(raw_reg).strip().upper() in ("NAN", "NONE", "NULL", "-", "N/A"):
                errors.append("Missing student registration number")
                reg_no = f"TEMP_{len(parsed_rows) + 1}"
            else:
                reg_no = str(raw_reg).strip().upper()
                # Clean any float .0 representations like 210101121259.0
                if reg_no.endswith(".0") and reg_no[:-2].isdigit():
                    reg_no = reg_no[:-2]

            # 2. Student Name
            raw_name = row.get("student_name")
            if not pd.isna(raw_name) and str(raw_name).strip() and str(raw_name).strip().upper() not in ("NAN", "NONE", "NULL", "-", "N/A"):
                student_name = str(raw_name).strip()
            else:
                student_name = f"Student {reg_no}"

            # 3. Subject Code
            raw_sub_code = row.get("subject_code")
            if pd.isna(raw_sub_code) or str(raw_sub_code).strip() == "" or str(raw_sub_code).strip().upper() in ("NAN", "NONE", "NULL", "-", "N/A"):
                errors.append("Missing subject/course code")
                sub_code = f"SUB_{len(parsed_rows) + 1}"
            else:
                sub_code = str(raw_sub_code).strip().upper()

            # 4. Subject Name
            raw_sub_name = row.get("subject_name")
            if not pd.isna(raw_sub_name) and str(raw_sub_name).strip() and str(raw_sub_name).strip().upper() not in ("NAN", "NONE", "NULL", "-", "N/A"):
                sub_name = str(raw_sub_name).strip()
            else:
                sub_name = sub_code

            # 5. Semester
            raw_sem = row.get("semester")
            parsed_sem = parse_semester_from_string(raw_sem)
            sem_num = parsed_sem if parsed_sem is not None else filename_sem

            # 6. Branch
            raw_branch = row.get("branch")
            if not pd.isna(raw_branch) and str(raw_branch).strip() and str(raw_branch).strip().upper() not in ("NAN", "NONE", "NULL", "-", "N/A"):
                branch = str(raw_branch).strip().upper()
            else:
                branch = infer_branch_from_subject_code(sub_code)

            # 7. Program & Academic Session
            raw_prog = row.get("program")
            if not pd.isna(raw_prog) and str(raw_prog).strip() and str(raw_prog).strip().upper() not in ("NAN", "NONE", "NULL", "-", "N/A"):
                program = str(raw_prog).strip().upper()
            else:
                program = filename_program

            raw_session = row.get("academic_session")
            if not pd.isna(raw_session) and str(raw_session).strip() and str(raw_session).strip().upper() not in ("NAN", "NONE", "NULL", "-", "N/A"):
                academic_session = str(raw_session).strip()
            else:
                academic_session = filename_session

            # 8. Credits
            raw_credits = row.get("credits")
            credits_val = parse_credits_value(raw_credits)

            # 9. Examination Month / Year
            raw_exam = row.get("examination_month_year")
            if not pd.isna(raw_exam) and str(raw_exam).strip() and str(raw_exam).strip().upper() not in ("NAN", "NONE", "NULL", "-", "N/A"):
                exam_session = str(raw_exam).strip()
            else:
                exam_session = filename_exam_session

            # 10. Grade & Grade Point Handling
            raw_new_grade = row.get("new_grade")
            raw_orig_grade = row.get("grade")
            raw_new_gp = row.get("new_grade_point")
            raw_orig_gp = row.get("grade_point")

            # Handle possible Series if duplicate columns were present
            if isinstance(raw_new_grade, pd.Series):
                raw_new_grade = raw_new_grade.dropna().iloc[0] if not raw_new_grade.dropna().empty else None
            if isinstance(raw_orig_grade, pd.Series):
                raw_orig_grade = raw_orig_grade.dropna().iloc[0] if not raw_orig_grade.dropna().empty else None
            if isinstance(raw_new_gp, pd.Series):
                raw_new_gp = raw_new_gp.dropna().iloc[0] if not raw_new_gp.dropna().empty else None
            if isinstance(raw_orig_gp, pd.Series):
                raw_orig_gp = raw_orig_gp.dropna().iloc[0] if not raw_orig_gp.dropna().empty else None

            # Check if a valid, non-blank New Grade (Rechecking) is present
            has_valid_new_grade = (
                not pd.isna(raw_new_grade)
                and str(raw_new_grade).strip() != ""
                and str(raw_new_grade).strip().upper() not in ("NAN", "NONE", "NULL", "NA", "-", "N/A")
            )

            # Determine which grade/GP sources to use
            if has_valid_new_grade:
                effective_grade_raw = raw_new_grade
                effective_gp_raw = raw_new_gp
            else:
                effective_grade_raw = raw_orig_grade
                effective_gp_raw = raw_orig_gp

            has_grade_col = not (
                pd.isna(effective_grade_raw)
                or str(effective_grade_raw).strip() == ""
                or str(effective_grade_raw).strip().upper() in ("NAN", "NONE", "NULL", "NA", "-", "N/A")
            )
            has_gp_col = not (
                pd.isna(effective_gp_raw)
                or str(effective_gp_raw).strip() == ""
                or str(effective_gp_raw).strip().upper() in ("NAN", "NONE", "NULL", "NA", "-", "N/A")
            )

            grade_str = None
            gp_val = None
            status_str = "PASS"

            # DUAL-FORMAT RESULT PARSING:
            # FORMAT A: Official Letter Grade (and optional GP)
            # FORMAT B: Numeric GP Only (Grade is nullable/None, GP is accepted directly)

            if has_grade_col and not has_gp_col:
                raw_grade_str = str(effective_grade_raw).strip()
                # Check if this "Grade" column contains a numeric GP (e.g. in some university sheets where single col is named Grade but holds 8.3)
                try:
                    num_val = float(raw_grade_str)
                    if 0.0 <= num_val <= 10.0:
                        clean_num = round(num_val, 2)
                        grade_str = None  # Nullable for numeric GP records
                        gp_val = clean_num
                        status_str = "PASS" if clean_num >= 4.0 else "FAIL"
                    else:
                        grade_str = None
                        gp_val = round(num_val, 2)
                        errors.append(f"Grade point {num_val} is out of valid range 0.0 - 10.0.")
                except ValueError:
                    upper_grade_str = raw_grade_str.upper()
                    if upper_grade_str in VALID_CUTM_GRADES:
                        grade_str = upper_grade_str
                        if upper_grade_str in SPECIAL_STATUS_GRADES:
                            gp_val = 0.0
                            if upper_grade_str == "S":
                                status_str = "ABSENT"
                            elif upper_grade_str == "M":
                                status_str = "MALPRACTICE"
                            elif upper_grade_str == "R":
                                status_str = "REAPPEAR"
                        elif upper_grade_str == "F":
                            gp_val = 0.0
                            status_str = "FAIL"
                        else:
                            gp_val = grade_map.get(upper_grade_str, 0.0)
                            status_str = "PASS"
                    else:
                        grade_str = upper_grade_str
                        gp_val = 0.0
                        if upper_grade_str in ("B+", "A+", "A-", "B-", "C+", "D+", "D-", "O+", "E+"):
                            errors.append(f"Unsupported letter grade '{upper_grade_str}'. Valid official CUTM grades are O, E, A, B, C, D, F and special statuses M, S, R.")
                        else:
                            errors.append(f"Malformed or unknown grade '{upper_grade_str}'. Valid official CUTM grades are O, E, A, B, C, D, F and special statuses M, S, R.")

            elif has_gp_col and not has_grade_col:
                # FORMAT B: Numeric GP Only (e.g. MSC(AG), BSC(AG), BFSC)
                raw_gp_str = str(effective_gp_raw).strip()
                try:
                    num_val = float(raw_gp_str)
                    if 0.0 <= num_val <= 10.0:
                        clean_num = round(num_val, 2)
                        grade_str = None  # Nullable for numeric GP records
                        gp_val = clean_num
                        status_str = "PASS" if clean_num >= 4.0 else "FAIL"
                    else:
                        grade_str = None
                        gp_val = round(num_val, 2)
                        errors.append(f"Grade point {num_val} is out of valid range 0.0 - 10.0.")
                except ValueError:
                    upper_gp_str = raw_gp_str.upper()
                    if upper_gp_str in SPECIAL_STATUS_GRADES:
                        grade_str = upper_gp_str
                        gp_val = 0.0
                        if upper_gp_str == "S":
                            status_str = "ABSENT"
                        elif upper_gp_str == "M":
                            status_str = "MALPRACTICE"
                        elif upper_gp_str == "R":
                            status_str = "REAPPEAR"
                    elif upper_gp_str == "F":
                        grade_str = "F"
                        gp_val = 0.0
                        status_str = "FAIL"
                    elif upper_gp_str in VALID_CUTM_GRADES:
                        grade_str = upper_gp_str
                        gp_val = grade_map.get(upper_gp_str, 0.0)
                        status_str = "PASS"
                    else:
                        grade_str = upper_gp_str
                        gp_val = 0.0
                        errors.append(f"Malformed or unknown grade point value '{upper_gp_str}'. Expected numeric 0-10 or special status S/M/R/F.")

            elif has_grade_col and has_gp_col:
                # FORMAT A: Both Grade and Grade Point columns present
                raw_grade_str = str(effective_grade_raw).strip().upper()
                raw_gp_str = str(effective_gp_raw).strip()

                if raw_grade_str in VALID_CUTM_GRADES:
                    grade_str = raw_grade_str
                    if raw_grade_str in SPECIAL_STATUS_GRADES:
                        gp_val = 0.0
                        if raw_grade_str == "S":
                            status_str = "ABSENT"
                        elif raw_grade_str == "M":
                            status_str = "MALPRACTICE"
                        elif raw_grade_str == "R":
                            status_str = "REAPPEAR"
                    elif raw_grade_str == "F":
                        gp_val = 0.0
                        status_str = "FAIL"
                    else:
                        status_str = "PASS"
                        try:
                            gp_val = round(float(raw_gp_str), 2)
                        except ValueError:
                            gp_val = grade_map.get(raw_grade_str, 0.0)
                else:
                    grade_str = raw_grade_str
                    gp_val = 0.0
                    if raw_grade_str in ("B+", "A+", "A-", "B-", "C+", "D+", "D-", "O+", "E+"):
                        errors.append(f"Unsupported letter grade '{raw_grade_str}'. Valid official CUTM grades are O, E, A, B, C, D, F and special statuses M, S, R.")
                    else:
                        errors.append(f"Malformed or unknown grade '{raw_grade_str}'. Valid official CUTM grades are O, E, A, B, C, D, F and special statuses M, S, R.")

            else:
                grade_str = None
                gp_val = 0.0
                errors.append("Missing subject grade and grade point")


            is_valid = len(errors) == 0
            if is_valid:
                file_valid_count += 1
            else:
                file_invalid_count += 1

            parsed_rows.append({
                "source_file": filename,
                "source_row_num": source_row_num,
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
                "status": status_str,
                "examination_month_year": exam_session,
                "is_valid": is_valid,
                "errors": errors,
                "is_duplicate": False,
            })

    file_summary = {
        "filename": filename,
        "format_name": format_name,
        "status": "PROCESSED",
        "sheets_detected": sheets_detected,
        "total_rows": len(parsed_rows),
        "valid_rows": file_valid_count,
        "invalid_rows": file_invalid_count,
        "error_message": None
    }

    return file_summary, parsed_rows


def process_bulk_files_to_preview(
    files_input: List[Tuple[str, bytes]],
    db: Session,
    admin_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Unified multi-file and ZIP ingestion engine.
    
    Accepts:
        files_input: List of (filename, bytes)
    
    Processes:
        - Decompresses any ZIP archives, ignoring non-result files (.pdf, .docx, images, etc.).
        - Parses all .xlsx, .xls, .csv files across all sheets.
        - Preserves R, M, S special statuses accurately.
        - Flags unsupported grades (e.g. B+, A+) as invalid/needs review.
        - Detects batch duplicates and cross-checks database for existing results.
        - Builds comprehensive preview with breakdown metrics and session token.
    """
    if not files_input:
        raise ValueError("No files provided for processing.")

    files_to_process: List[Tuple[str, bytes]] = []
    ignored_files: List[Dict[str, str]] = []

    # 1. Expand ZIPs and collect all result files
    for fn, file_bytes in files_input:
        fn_lower = fn.lower()
        if fn_lower.endswith(".zip"):
            extracted_results, extracted_ignored = extract_and_validate_zip_archive(file_bytes, fn)
            files_to_process.extend(extracted_results)
            ignored_files.extend(extracted_ignored)
        elif fn_lower.endswith(".xlsx") or fn_lower.endswith(".xls") or fn_lower.endswith(".csv"):
            files_to_process.append((fn, file_bytes))
        else:
            ext = os.path.splitext(fn)[1].lower() or "unknown"
            ignored_files.append({
                "filename": fn,
                "reason": f"Ignored - Unsupported file type ({ext})"
            })

    if not files_to_process:
        if ignored_files:
            ignored_list_str = ", ".join([f"{item['filename']} ({item['reason']})" for item in ignored_files[:5]])
            raise ValueError(f"No supported result spreadsheets found in upload. Ignored files: {ignored_list_str}")
        raise ValueError("No valid Excel (.xlsx, .xls) or CSV (.csv) files found to process.")

    # 2. Parse all result workbooks
    file_summaries: List[Dict[str, Any]] = []
    all_parsed_rows: List[Dict[str, Any]] = []
    seen_batch_keys: Dict[Tuple[str, int, str], Tuple[str, int]] = {} # composite_key -> (source_file, row_num)
    unique_students: Set[str] = set()
    unique_subjects: Set[str] = set()
    special_status_counts = {"R": 0, "M": 0, "S": 0}
    unsupported_grades_counts: Dict[str, int] = {}
    error_messages_summary: Set[str] = set()

    for fn, file_bytes in files_to_process:
        summary, rows = parse_result_workbook(file_bytes, fn, db)
        file_summaries.append(summary)
        all_parsed_rows.extend(rows)

    if not all_parsed_rows:
        raise ValueError("No student result records found across all uploaded files.")

    # 3. Batch duplicate detection & global row numbering
    valid_count = 0
    invalid_count = 0
    duplicate_count = 0
    final_rows: List[Dict[str, Any]] = []

    for global_idx, r in enumerate(all_parsed_rows):
        row_num = global_idx + 1
        reg_no = r["registration_number"]
        sem_num = r["semester"]
        sub_code = r["subject_code"]
        grade = r["grade"]
        source_file = r["source_file"]
        source_row_num = r["source_row_num"]

        # Track special statuses
        if grade in SPECIAL_STATUS_GRADES:
            special_status_counts[grade] = special_status_counts.get(grade, 0) + 1

        # Track unsupported / non-standard grades
        if not r["is_valid"]:
            for err in r["errors"]:
                if "Unsupported letter grade" in err:
                    unsupported_grades_counts[grade or "Unsupported"] = unsupported_grades_counts.get(grade or "Unsupported", 0) + 1
                    break
                elif "Invalid grade" in err or "Malformed or unknown grade" in err or "out of valid range" in err:
                    unsupported_grades_counts[grade or "Malformed"] = unsupported_grades_counts.get(grade or "Malformed", 0) + 1
                    break

        # Batch duplicate check: (reg_no, sem, sub_code)
        composite_key = (reg_no, sem_num, sub_code)
        if not reg_no.startswith("TEMP_") and not sub_code.startswith("SUB_"):
            if composite_key in seen_batch_keys:
                first_file, first_row = seen_batch_keys[composite_key]
                r["is_duplicate"] = True
                duplicate_count += 1
            else:
                seen_batch_keys[composite_key] = (source_file, source_row_num)

        if r["is_valid"]:
            valid_count += 1
            unique_students.add(reg_no)
            unique_subjects.add(sub_code)
        else:
            invalid_count += 1
            for err in r["errors"]:
                error_messages_summary.add(f"[{source_file} (Row {source_row_num})]: {err}")

        final_rows.append({
            "row_num": row_num,
            "source_file": source_file,
            "source_row_num": source_row_num,
            "registration_number": reg_no,
            "student_name": r["student_name"],
            "branch": r["branch"],
            "program": r["program"],
            "academic_session": r["academic_session"],
            "semester": sem_num,
            "subject_code": sub_code,
            "subject_name": r["subject_name"],
            "credits": r["credits"],
            "grade": grade,
            "grade_point": r["grade_point"],
            "status": r.get("status", "PASS"),
            "examination_month_year": r["examination_month_year"],
            "is_valid": r["is_valid"],
            "errors": r["errors"],
            "is_duplicate": r["is_duplicate"],
        })

    # 4. Check how many of these records already exist in the database
    existing_in_db_count = 0
    if final_rows:
        sample_regs = list({r["registration_number"] for r in final_rows if r["is_valid"]})[:2000]
        if sample_regs:
            existing_results = db.query(Result).join(Student).join(Subject).join(Semester).filter(
                Student.registration_number.in_(sample_regs)
            ).all()
            db_keys = {(r.student.registration_number, r.semester.semester_number, r.subject.code) for r in existing_results}
            for r in final_rows:
                if (r["registration_number"], r["semester"], r["subject_code"]) in db_keys:
                    existing_in_db_count += 1

    # Format description
    if len(files_input) == 1 and files_input[0][0].lower().endswith(".zip"):
        display_filename = files_input[0][0]
        format_name = "Result Archive (.zip)"
    elif len(files_to_process) == 1:
        display_filename = files_to_process[0][0]
        ext = os.path.splitext(display_filename)[1].lower()
        format_name = "Excel 97-2003 (.xls)" if ext == ".xls" else ("Excel Workbook (.xlsx)" if ext == ".xlsx" else "CSV (.csv)")
    else:
        display_filename = f"{len(files_to_process)} Result Spreadsheets"
        format_name = f"Multi-File Batch ({len(files_to_process)} files)"

    # Store in memory session
    session_token = str(uuid.uuid4())
    session_dict = {
        "admin_id": admin_id,
        "filename": display_filename,
        "format_name": format_name,
        "files_detected": len(files_input) if len(files_input) > 1 else len(files_to_process) + len(ignored_files),
        "result_files_count": len(files_to_process),
        "ignored_files_count": len(ignored_files),
        "ignored_files": ignored_files,
        "file_summaries": file_summaries,
        "total_rows": len(final_rows),
        "students_count": len(unique_students),
        "subjects_count": len(unique_subjects),
        "valid_rows": valid_count,
        "invalid_rows": invalid_count,
        "duplicate_rows": duplicate_count,
        "existing_in_db_count": existing_in_db_count,
        "special_status_counts": special_status_counts,
        "unsupported_grades_counts": unsupported_grades_counts,
        "rows": final_rows
    }
    PREVIEW_SESSIONS[session_token] = session_dict

    # Persist session to database for cross-worker reliability
    try:
        # Clean up old expired preview sessions
        db.query(ImportPreviewSession).filter(
            ImportPreviewSession.expires_at < datetime.datetime.utcnow()
        ).delete(synchronize_session=False)

        preview_session_record = ImportPreviewSession(
            token=session_token,
            admin_id=admin_id,
            filename=display_filename,
            format_name=format_name,
            result_files_count=len(files_to_process),
            rows_json=json.dumps(final_rows),
            created_at=datetime.datetime.utcnow(),
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(hours=4)
        )
        db.add(preview_session_record)
        db.commit()
    except Exception as db_err:
        db.rollback()
        # Non-fatal: in-memory cache will still serve requests
        print(f"Warning: could not persist preview session to DB: {db_err}")

    # Extract all sheet names across all processed files
    all_sheets = []
    for s in file_summaries:
        all_sheets.extend(s.get("sheets_detected", []))

    return {
        "filename": display_filename,
        "format_name": format_name,
        "sheets_detected": list(dict.fromkeys(all_sheets)),
        "files_detected": len(files_input) if len(files_input) > 1 else len(files_to_process) + len(ignored_files),
        "result_files_count": len(files_to_process),
        "ignored_files_count": len(ignored_files),
        "ignored_files": ignored_files,
        "file_summaries": file_summaries,
        "total_rows": len(final_rows),
        "students_count": len(unique_students),
        "subjects_count": len(unique_subjects),
        "valid_rows": valid_count,
        "invalid_rows": invalid_count,
        "duplicate_rows": duplicate_count,
        "existing_in_db_count": existing_in_db_count,
        "special_status_counts": special_status_counts,
        "unsupported_grades_counts": unsupported_grades_counts,
        "sample_rows": final_rows[:100],
        "errors_summary": list(error_messages_summary)[:30],
        "preview_session_token": session_token
    }


def process_file_to_preview(
    file_bytes: bytes,
    filename: str,
    db: Session,
    admin_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Backwards-compatible single file preview processor.
    Supports .xlsx, .xls, .csv, and .zip files.
    """
    return process_bulk_files_to_preview([(filename, file_bytes)], db, admin_id=admin_id)


def commit_preview_import(
    session_token: str,
    db: Session,
    overwrite_existing: bool = True,
    admin_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Performs atomic transactional database import for all valid parsed rows in a preview session.
    Retrieves from in-memory cache or persistent database session.
    Rolls back completely if any database error occurs.
    """
    session_data = PREVIEW_SESSIONS.get(session_token)
    
    if not session_data:
        # Fallback to persistent database storage
        session_record = db.query(ImportPreviewSession).filter(
            ImportPreviewSession.token == session_token
        ).first()

        if not session_record:
            raise ValueError("Invalid or expired preview session. Please re-upload the file(s).")

        if datetime.datetime.utcnow() > session_record.expires_at:
            try:
                db.delete(session_record)
                db.commit()
            except Exception:
                db.rollback()
            raise ValueError("Preview session has expired. Please re-upload the file(s).")

        if session_record.admin_id is not None and admin_id is not None and session_record.admin_id != admin_id:
            raise ValueError("Unauthorized: Preview session belongs to another administrator.")

        try:
            parsed_rows = json.loads(session_record.rows_json)
        except Exception:
            raise ValueError("Preview session data is corrupted. Please re-upload the file(s).")

        session_data = {
            "admin_id": session_record.admin_id,
            "filename": session_record.filename or "Uploaded File",
            "format_name": session_record.format_name or "Spreadsheet",
            "result_files_count": session_record.result_files_count or 1,
            "rows": parsed_rows
        }
    else:
        # Check in-memory admin authorization if admin_id is provided
        cached_admin_id = session_data.get("admin_id")
        if cached_admin_id is not None and admin_id is not None and cached_admin_id != admin_id:
            raise ValueError("Unauthorized: Preview session belongs to another administrator.")

    rows = session_data["rows"]
    valid_rows = [r for r in rows if r["is_valid"]]

    if not valid_rows:
        raise ValueError("No valid records found to import.")

    # Deduplicate in-memory by (registration_number, semester, subject_code)
    # Preserving passing grades / re-evaluation over fail or absent
    deduped_valid_rows: Dict[Tuple[str, int, str], Dict[str, Any]] = {}
    for r in valid_rows:
        key = (r["registration_number"], r["semester"], r["subject_code"])
        if key in deduped_valid_rows:
            existing = deduped_valid_rows[key]
            # If previous entry was F or S and new entry is a passing grade, adopt new entry
            if existing.get("grade") in ("F", "S", "M") and r.get("grade") not in ("F", "S", "M"):
                deduped_valid_rows[key] = r
            # If existing is already passing and new is F/S, retain existing
            elif r.get("grade") in ("F", "S", "M") and existing.get("grade") not in ("F", "S", "M"):
                pass
            else:
                # Later file / subsequent re-attempt takes precedence
                deduped_valid_rows[key] = r
        else:
            deduped_valid_rows[key] = r

    rows_to_import = list(deduped_valid_rows.values())

    # Caches for rapid ingestion
    branches_cache = {b.code.upper(): b for b in db.query(Branch).all()}
    programs_cache = {p.code.upper(): p for p in db.query(Program).all()}
    semesters_cache = {s.semester_number: s for s in db.query(Semester).all()}
    grade_map = get_grade_point_mapping(db)
    
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
        for r in rows_to_import:
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

            # Determine grade point, credit points and status
            raw_grade_str = str(r["grade"]).upper() if r.get("grade") else ""
            
            if r.get("grade_point") is not None:
                gp_val = float(r["grade_point"])
            elif raw_grade_str and raw_grade_str in grade_map:
                gp_val = float(grade_map[raw_grade_str])
            else:
                gp_val = 0.0

            if raw_grade_str == "S":
                status_val = "ABSENT"
                gp_val = 0.0
            elif raw_grade_str == "M":
                status_val = "MALPRACTICE"
                gp_val = 0.0
            elif raw_grade_str == "R":
                status_val = "REAPPEAR"
                gp_val = 0.0
            elif raw_grade_str in ["F", "FAIL", "AB"]:
                status_val = "FAIL"
                gp_val = 0.0
            elif r.get("status"):
                status_val = r["status"]
            else:
                status_val = "PASS"

            cp = round(r["credits"] * gp_val, 2)

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

        # Clean up session from memory and database
        PREVIEW_SESSIONS.pop(session_token, None)
        try:
            db.query(ImportPreviewSession).filter(
                ImportPreviewSession.token == session_token
            ).delete(synchronize_session=False)
            db.commit()
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Successfully imported {imported_count} new results, updated {updated_count} records, skipped {skipped_count} duplicates.",
            "filename": session_data.get("filename", ""),
            "files_count": session_data.get("result_files_count", 1),
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
