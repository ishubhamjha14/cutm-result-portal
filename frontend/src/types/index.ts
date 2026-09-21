export interface StudentInfo {
  id: number;
  registration_number: string;
  name: string;
  branch_code: string;
  branch_name: string;
  program_code: string;
  program_name: string;
  academic_session: string;
  campus?: string;
  email?: string;
  phone?: string;
}

export interface SubjectResultItem {
  subject_code: string;
  subject_name: string;
  credits: number;
  grade: string;
  grade_point: number;
  credit_points: number;
  status: string;
}

export interface SemesterPerformanceSummary {
  semester: number;
  semester_name: string;
  total_credits: number;
  earned_credits: number;
  total_credit_points: number;
  sgpa: number;
  status: string;
}

export interface SemesterResultResponse {
  student: StudentInfo;
  semester: number;
  semester_name: string;
  academic_session: string;
  examination_month_year: string;
  published_date: string;
  subjects: SubjectResultItem[];
  total_credits: number;
  earned_credits: number;
  total_credit_points: number;
  sgpa: number;
  cgpa: number;
  result_status: string;
  semester_progression: SemesterPerformanceSummary[];
}

export interface StudentPerformanceResponse {
  student: StudentInfo;
  current_cgpa: number;
  total_credits_completed: number;
  total_semesters_completed: number;
  semesters: SemesterPerformanceSummary[];
}

export interface PublicMetadata {
  semesters: { semester_number: number; name: string }[];
  branches: { code: string; name: string }[];
  university_name: string;
  system_status: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  admin: AdminUser;
}

export interface ResultListItem {
  id: number;
  student_id: number;
  registration_number: string;
  student_name: string;
  branch_code: string;
  branch_name: string;
  program_name: string;
  semester: number;
  subject_code: string;
  subject_name: string;
  credits: number;
  grade: string;
  grade_point: number;
  credit_points: number;
  academic_session: string;
  examination_month_year: string;
  status: string;
}

export interface ResultListResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  items: ResultListItem[];
}

export interface StudentListItem {
  id: number;
  registration_number: string;
  name: string;
  branch_code: string;
  branch_name: string;
  program_name: string;
  academic_session: string;
  campus: string;
  email?: string;
  phone?: string;
  total_results_count: number;
  current_cgpa?: number;
  created_at: string;
}

export interface StudentListResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  items: StudentListItem[];
}

export interface ImportRowPreview {
  row_num: number;
  registration_number: string;
  student_name: string;
  branch: string;
  program: string;
  academic_session: string;
  semester: number;
  subject_code: string;
  subject_name: string;
  credits: number;
  grade: string;
  grade_point: number;
  is_valid: boolean;
  errors: string[];
  is_duplicate: boolean;
}

export interface ImportPreviewResponse {
  filename: string;
  format_name: string;
  sheets_detected: string[];
  total_rows: number;
  students_count: number;
  subjects_count: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  existing_in_db_count: number;
  special_status_counts?: Record<string, number>;
  sample_rows: ImportRowPreview[];
  errors_summary: string[];
  preview_session_token: string;
}

export interface GradeConfigItem {
  id: number;
  grade_letter: string;
  grade_point: number;
  description: string;
  min_marks: number;
  max_marks: number;
  is_active: boolean;
}

export interface AuditLogItem {
  id: number;
  admin_id?: number;
  admin_email: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: string;
  ip_address?: string;
  timestamp: string;
}

export interface DashboardStats {
  total_students: number;
  total_results: number;
  total_branches: number;
  total_semesters: number;
  total_subjects: number;
  recent_uploads_count: number;
  latest_upload_time?: string;
  branch_distribution: { branch_code: string; branch_name: string; count: number }[];
  semester_distribution: { semester_number: number; semester_name: string; count: number }[];
}
