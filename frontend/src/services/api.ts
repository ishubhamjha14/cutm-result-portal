import {
  SemesterResultResponse,
  StudentPerformanceResponse,
  PublicMetadata,
  AuthResponse,
  AdminUser,
  ResultListResponse,
  ResultListItem,
  StudentListResponse,
  StudentInfo,
  ImportPreviewResponse,
  GradeConfigItem,
  AuditLogItem,
  DashboardStats,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL 
  ? (import.meta.env.VITE_API_URL as string).replace(/\/+$/, '') 
  : '';
const BASE_URL = `${API_BASE}/api`;

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('cutm_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'An unexpected error occurred.';
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorJson.message || errorDetail;
    } catch {
      errorDetail = res.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Public Endpoints
  async getPublicMeta(): Promise<PublicMetadata> {
    const res = await fetch(`${BASE_URL}/public/meta`);
    return handleResponse<PublicMetadata>(res);
  },

  async getSemesterResult(regNo: string, semester: number): Promise<SemesterResultResponse> {
    const res = await fetch(`${BASE_URL}/results/${encodeURIComponent(regNo)}/${semester}`);
    return handleResponse<SemesterResultResponse>(res);
  },

  async getStudentPerformance(regNo: string): Promise<StudentPerformanceResponse> {
    const res = await fetch(`${BASE_URL}/student/${encodeURIComponent(regNo)}/performance`);
    return handleResponse<StudentPerformanceResponse>(res);
  },

  // Auth Endpoints
  async login(username_or_email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_or_email, password }),
    });
    const data = await handleResponse<AuthResponse>(res);
    if (data.access_token) {
      localStorage.setItem('cutm_admin_token', data.access_token);
      localStorage.setItem('cutm_admin_user', JSON.stringify(data.admin));
    }
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
    } catch (e) {
      console.warn('Logout API error:', e);
    } finally {
      localStorage.removeItem('cutm_admin_token');
      localStorage.removeItem('cutm_admin_user');
    }
  },

  async getMe(): Promise<AdminUser> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeader(),
    });
    return handleResponse<AdminUser>(res);
  },

  // Admin Dashboard & Meta
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: getAuthHeader(),
    });
    return handleResponse<DashboardStats>(res);
  },

  async getBranches(): Promise<{ id: number; code: string; name: string }[]> {
    const res = await fetch(`${BASE_URL}/admin/branches`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async getSemesters(): Promise<{ id: number; semester_number: number; name: string }[]> {
    const res = await fetch(`${BASE_URL}/admin/semesters`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async getPrograms(): Promise<{ id: number; code: string; name: string }[]> {
    const res = await fetch(`${BASE_URL}/admin/programs`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  // Admin Results
  async getResults(params: {
    page?: number;
    limit?: number;
    search?: string;
    branch_id?: number;
    semester_id?: number;
    academic_session?: string;
  }): Promise<ResultListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.branch_id) query.append('branch_id', params.branch_id.toString());
    if (params.semester_id) query.append('semester_id', params.semester_id.toString());
    if (params.academic_session) query.append('academic_session', params.academic_session);

    const res = await fetch(`${BASE_URL}/admin/results?${query.toString()}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<ResultListResponse>(res);
  },

  async createResult(data: any): Promise<ResultListItem> {
    const res = await fetch(`${BASE_URL}/admin/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<ResultListItem>(res);
  },

  async updateResult(id: number, data: any): Promise<ResultListItem> {
    const res = await fetch(`${BASE_URL}/admin/results/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<ResultListItem>(res);
  },

  async deleteResult(id: number): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/admin/results/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async bulkDeleteResults(result_ids: number[]): Promise<{ message: string; deleted_count: number }> {
    const res = await fetch(`${BASE_URL}/admin/results/bulk-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(result_ids),
    });
    return handleResponse(res);
  },

  // Bulk & Single File Upload
  async previewUpload(file: File): Promise<ImportPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('files', file);

    const res = await fetch(`${BASE_URL}/admin/results/preview-upload`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });
    return handleResponse<ImportPreviewResponse>(res);
  },

  async previewBulkUpload(files: File[]): Promise<ImportPreviewResponse> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
      formData.append('file', file);
    }

    try {
      const res = await fetch(`${BASE_URL}/admin/results/preview-bulk`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
      });

      if (res.status === 404 || res.status === 405) {
        // Fallback to /preview-upload if preview-bulk is unavailable on older deployment
        const fallbackRes = await fetch(`${BASE_URL}/admin/results/preview-upload`, {
          method: 'POST',
          headers: getAuthHeader(),
          body: formData,
        });
        return handleResponse<ImportPreviewResponse>(fallbackRes);
      }

      return handleResponse<ImportPreviewResponse>(res);
    } catch (err: any) {
      // If network error on preview-bulk, attempt preview-upload as fallback
      try {
        const fallbackRes = await fetch(`${BASE_URL}/admin/results/preview-upload`, {
          method: 'POST',
          headers: getAuthHeader(),
          body: formData,
        });
        return handleResponse<ImportPreviewResponse>(fallbackRes);
      } catch {
        throw err;
      }
    }
  },

  async confirmImport(preview_session_token: string, overwrite_existing = true): Promise<{
    success: boolean;
    message: string;
    filename?: string;
    files_count?: number;
    students_count?: number;
    subjects_count?: number;
    imported_count: number;
    updated_count: number;
    skipped_count?: number;
    failed_count?: number;
  }> {
    const res = await fetch(`${BASE_URL}/admin/results/confirm-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ preview_session_token, overwrite_existing }),
    });
    return handleResponse(res);
  },

  // Admin Students
  async getStudents(params: {
    page?: number;
    limit?: number;
    search?: string;
    branch_id?: number;
    academic_session?: string;
  }): Promise<StudentListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.branch_id) query.append('branch_id', params.branch_id.toString());
    if (params.academic_session) query.append('academic_session', params.academic_session);

    const res = await fetch(`${BASE_URL}/admin/students?${query.toString()}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<StudentListResponse>(res);
  },

  async createStudent(data: any): Promise<StudentInfo> {
    const res = await fetch(`${BASE_URL}/admin/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<StudentInfo>(res);
  },

  async updateStudent(id: number, data: any): Promise<StudentInfo> {
    const res = await fetch(`${BASE_URL}/admin/students/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<StudentInfo>(res);
  },

  async deleteStudent(id: number): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/admin/students/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  // Admin Grades
  async getGrades(): Promise<GradeConfigItem[]> {
    const res = await fetch(`${BASE_URL}/admin/grades`, {
      headers: getAuthHeader(),
    });
    return handleResponse<GradeConfigItem[]>(res);
  },

  async createGrade(data: any): Promise<GradeConfigItem> {
    const res = await fetch(`${BASE_URL}/admin/grades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<GradeConfigItem>(res);
  },

  async updateGrade(id: number, data: any): Promise<GradeConfigItem> {
    const res = await fetch(`${BASE_URL}/admin/grades/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<GradeConfigItem>(res);
  },

  async deleteGrade(id: number): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/admin/grades/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  // Admin Audit Logs
  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    search?: string;
  }): Promise<{ total: number; page: number; limit: number; total_pages: number; items: AuditLogItem[] }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.action) query.append('action', params.action);
    if (params.search) query.append('search', params.search);

    const res = await fetch(`${BASE_URL}/admin/audit-logs?${query.toString()}`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },
};
