import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  FolderArchive,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  ArrowRight,
  RefreshCw,
  FileCheck,
  X,
  Layers,
  Database,
  Info,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileX,
  Check,
  FileUp,
} from 'lucide-react';
import { api } from '../../services/api';
import { ImportPreviewResponse, ImportRowPreview } from '../../types';

interface UploadResultsPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const UploadResultsPage: React.FC<UploadResultsPageProps> = ({ onNavigateTab }) => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(true);

  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    filename?: string;
    files_count?: number;
    students_count?: number;
    subjects_count?: number;
    imported_count: number;
    updated_count: number;
    skipped_count?: number;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Table filtering & pagination state
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'INVALID' | 'SPECIAL' | 'DUPLICATE'>('ALL');
  const [fileFilter, setFileFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 25;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSingleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleMultiFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleZipFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    // Filter valid result/archive extensions
    const validFiles: File[] = [];
    for (const f of files) {
      const ext = f.name.toLowerCase();
      if (ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.zip')) {
        validFiles.push(f);
      }
    }

    if (validFiles.length === 0) {
      setErrorMessage('Supported formats: .xlsx, .xls, .csv, or .zip. Please select valid files.');
      return;
    }

    setSelectedFiles(validFiles);
    setErrorMessage(null);
    setImportResult(null);
    setIsValidating(true);
    setCurrentPage(1);
    setStatusFilter('ALL');
    setFileFilter('ALL');
    setSearchTerm('');

    try {
      let data: ImportPreviewResponse;
      if (validFiles.length === 1 && !validFiles[0].name.toLowerCase().endsWith('.zip')) {
        // Single Excel / CSV file
        data = await api.previewUpload(validFiles[0]);
      } else {
        // Multiple Excel files or ZIP archive
        data = await api.previewBulkUpload(validFiles);
      }
      setPreviewData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to process result files. Please verify format and contents.');
      setPreviewData(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    setIsImporting(true);
    setErrorMessage(null);

    try {
      const result = await api.confirmImport(previewData.preview_session_token, overwriteExisting);
      setImportResult(result);
      setPreviewData(null);
      setSelectedFiles([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Import execution failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewData(null);
    setSelectedFiles([]);
    setErrorMessage(null);
  };

  const goToResults = () => {
    if (onNavigateTab) {
      onNavigateTab('results');
    } else {
      navigate('/admin/results');
    }
  };

  // Filtered rows for the preview table
  const filteredRows = useMemo(() => {
    if (!previewData || !previewData.sample_rows) return [];

    return previewData.sample_rows.filter((row: ImportRowPreview) => {
      // 1. File filter
      if (fileFilter !== 'ALL' && row.source_file !== fileFilter) {
        return false;
      }

      // 2. Status filter
      if (statusFilter === 'VALID' && !row.is_valid) return false;
      if (statusFilter === 'INVALID' && row.is_valid) return false;
      if (statusFilter === 'DUPLICATE' && !row.is_duplicate) return false;
      if (statusFilter === 'SPECIAL') {
        const g = (row.grade || '').toUpperCase();
        if (!['R', 'M', 'S'].includes(g)) return false;
      }

      // 3. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchReg = (row.registration_number || '').toLowerCase().includes(q);
        const matchName = (row.student_name || '').toLowerCase().includes(q);
        const matchSubCode = (row.subject_code || '').toLowerCase().includes(q);
        const matchSubName = (row.subject_name || '').toLowerCase().includes(q);
        const matchBranch = (row.branch || '').toLowerCase().includes(q);
        if (!matchReg && !matchName && !matchSubCode && !matchSubName && !matchBranch) {
          return false;
        }
      }

      return true;
    });
  }, [previewData, fileFilter, statusFilter, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
            Bulk Results Ingestion Engine
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Upload single file, multiple Excel files (<strong className="text-slate-900 dark:text-white">.xlsx, .xls, .csv</strong>), or a university result <strong className="text-indigo-600 dark:text-indigo-400">ZIP archive</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/sample_data/cutm_sample_results.csv"
            download="cutm_sample_results.csv"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Sample CSV</span>
          </a>
        </div>
      </div>

      {/* Success Banner */}
      {importResult && (
        <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs space-y-4 animate-in fade-in shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  IMPORT COMPLETE ✓
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300/80">
                  {importResult.message || 'All valid examination datasets have been atomically committed to the live database.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-mono font-bold flex items-center gap-1.5 border border-emerald-500/30">
                <Database className="w-3.5 h-3.5" /> Database: Committed ✓
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-emerald-500/20">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Files</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{importResult.files_count || 1}</p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-emerald-500/20">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Students</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{importResult.students_count || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-emerald-500/20">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Subjects</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{importResult.subjects_count || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">New Records</span>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">+{importResult.imported_count}</p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-emerald-500/20">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">Updated</span>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-300 font-mono">{importResult.updated_count}</p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-emerald-500/20">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Duplicates Skipped</span>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-300 font-mono">{importResult.skipped_count || 0}</p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => setImportResult(null)}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold hover:bg-emerald-100/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Upload More Results
            </button>
            <button
              onClick={goToResults}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <span>VIEW RESULTS DIRECTORY</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <strong className="block text-rose-800 dark:text-rose-200 font-bold">Upload Notice</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Dropzone & Action Buttons */}
      {!previewData && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`glass-panel p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all text-center relative overflow-hidden bg-white/95 dark:bg-slate-900/90 shadow-xl ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-300 dark:border-slate-800 hover:border-indigo-500/40'
          }`}
        >
          {/* Hidden File Inputs */}
          <input
            type="file"
            id="single-file-input"
            accept=".csv, .xlsx, .xls"
            onChange={handleSingleFileInput}
            className="hidden"
          />
          <input
            type="file"
            id="multi-excel-input"
            accept=".csv, .xlsx, .xls"
            multiple
            onChange={handleMultiFileInput}
            className="hidden"
          />
          <input
            type="file"
            id="zip-file-input"
            accept=".zip"
            onChange={handleZipFileInput}
            className="hidden"
          />

          <div className="max-w-xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 shadow-xl">
              {isValidating ? (
                <RefreshCw className="w-8 h-8 animate-spin" />
              ) : (
                <UploadCloud className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                {isValidating ? 'Inspecting & Validating Result Datasets...' : 'Upload Examination Results'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Drag and drop files here, or choose one of the options below:
              </p>
            </div>

            {/* Three Prominent Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <label
                htmlFor="multi-excel-input"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Upload Multiple Excel Files</span>
              </label>

              <label
                htmlFor="zip-file-input"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
              >
                <FolderArchive className="w-4 h-4" />
                <span>Upload Result ZIP</span>
              </label>

              <label
                htmlFor="single-file-input"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
              >
                <FileUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Single File (.xls/.xlsx/.csv)</span>
              </label>
            </div>

            {/* Selected files feedback while validating */}
            {isValidating && selectedFiles.length > 0 && (
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/20 text-xs text-left space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{selectedFiles.length} file(s) selected:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 flex flex-wrap items-center justify-center gap-3">
              <span>✓ Multiple Excel files supported</span>
              <span>✓ ZIP auto-extracts & ignores PDF/DOCX</span>
              <span>✓ R, M, S special statuses preserved</span>
              <span>✓ Unsupported grades (B+) flagged for review</span>
            </div>
          </div>
        </div>
      )}

      {/* Combined Bulk Result Preview */}
      {previewData && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* File Overview Bar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  BULK RESULT PREVIEW
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {previewData.format_name}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{previewData.filename}</span>
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Files Detected: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{previewData.files_detected || 1}</strong>
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Result Files: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{previewData.result_files_count || 1}</strong>
                </span>
                {previewData.ignored_files_count && previewData.ignored_files_count > 0 ? (
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Ignored Files: <strong className="text-slate-500 font-mono">{previewData.ignored_files_count}</strong>
                  </span>
                ) : null}
                {previewData.sheets_detected && previewData.sheets_detected.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Sheets: {previewData.sheets_detected.join(', ')}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer shadow-sm">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Update Existing Student Records</span>
              </label>
            </div>
          </div>

          {/* Processed & Ignored Files List */}
          {previewData.file_summaries && previewData.file_summaries.length > 0 && (
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Detected Files Breakdown ({previewData.file_summaries.length} Result Files{previewData.ignored_files_count ? `, ${previewData.ignored_files_count} Ignored` : ''})</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {previewData.file_summaries.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-mono text-[11px] truncate text-slate-900 dark:text-slate-200" title={f.filename}>
                        {f.filename}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[10px] shrink-0 border border-emerald-500/20">
                      {f.valid_rows}/{f.total_rows} rows
                    </span>
                  </div>
                ))}

                {previewData.ignored_files && previewData.ignored_files.map((ig, idx) => (
                  <div
                    key={`ig-${idx}`}
                    className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between opacity-75"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <FileX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px] truncate text-slate-600 dark:text-slate-400" title={ig.filename}>
                        {ig.filename}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      Ignored ({ig.reason.replace('Ignored - ', '')})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            
            <div className="glass-card p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 bg-white dark:bg-slate-900/50">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Rows</span>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{previewData.total_rows.toLocaleString()}</p>
            </div>

            <div className="glass-card p-3.5 rounded-2xl border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-1">
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">Students</span>
              <p className="text-xl font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">{previewData.students_count.toLocaleString()}</p>
            </div>

            <div className="glass-card p-3.5 rounded-2xl border border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20 space-y-1">
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase">Subjects</span>
              <p className="text-xl font-extrabold text-purple-700 dark:text-purple-300 font-mono">{previewData.subjects_count.toLocaleString()}</p>
            </div>

            <div className="glass-card p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Valid Records</span>
              <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">{previewData.valid_rows.toLocaleString()}</p>
            </div>

            <div className="glass-card p-3.5 rounded-2xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 space-y-1">
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase">Invalid</span>
              <p className="text-xl font-extrabold text-rose-700 dark:text-rose-300 font-mono">{previewData.invalid_rows}</p>
            </div>

            <div className="glass-card p-3.5 rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">Duplicates</span>
              <p className="text-xl font-extrabold text-amber-700 dark:text-amber-300 font-mono">{previewData.duplicate_rows}</p>
            </div>
          </div>

          {/* Special Status Records Banner */}
          {previewData.special_status_counts && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 shrink-0">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Special Examination Statuses:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 font-mono font-bold text-xs border border-amber-500/30 text-amber-900 dark:text-amber-100">
                    S (Absent): {previewData.special_status_counts.S || 0} record(s) [Special Status]
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 font-mono font-bold text-xs border border-amber-500/30 text-amber-900 dark:text-amber-100">
                    M (Malpractice): {previewData.special_status_counts.M || 0} record(s) [Special Status]
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 font-mono font-bold text-xs border border-amber-500/30 text-amber-900 dark:text-amber-100">
                    R (Repeat / Reappear): {previewData.special_status_counts.R || 0} record(s) [Special Status]
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-amber-700 dark:text-amber-300">
                Special examination statuses (S, M, R) are preserved as official statuses and not treated as standard graded results.
              </span>
            </div>
          )}

          {/* Unsupported Grades Notice */}
          {previewData.unsupported_grades_counts && Object.keys(previewData.unsupported_grades_counts).length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs space-y-2 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Unsupported Grades Detected (Marked as Invalid / Needs Review):</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(previewData.unsupported_grades_counts).map(([grade, count]) => (
                  <span key={grade} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 font-mono font-bold text-xs border border-rose-500/30 text-rose-700 dark:text-rose-300">
                    {grade}: {count} record{count > 1 ? 's' : ''}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/90">
                Supported CUTM letter grades are O, E, A, B, C, D, F and special statuses M, S, R. Unsupported grades (e.g. B+) are not guessed or converted.
              </p>
            </div>
          )}

          {/* Errors Notice if any */}
          {previewData.errors_summary && previewData.errors_summary.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-2 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Validation Issues Summary ({previewData.invalid_rows} invalid records):</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-700 dark:text-rose-300/90 font-mono max-h-36 overflow-y-auto">
                {previewData.errors_summary.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table Section */}
          <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl bg-white/95 dark:bg-slate-900/90 space-y-0">
            
            {/* Table Search & Filter Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  All Rows ({previewData.sample_rows.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('VALID'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === 'VALID'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  Valid Only ({previewData.valid_rows})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('INVALID'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === 'INVALID'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'
                  }`}
                >
                  Invalid ({previewData.invalid_rows})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('SPECIAL'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === 'SPECIAL'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                  }`}
                >
                  Special Status
                </button>
              </div>

              {/* Source File Filter & Search */}
              <div className="flex items-center gap-2">
                {previewData.file_summaries && previewData.file_summaries.length > 1 && (
                  <select
                    value={fileFilter}
                    onChange={(e) => { setFileFilter(e.target.value); setCurrentPage(1); }}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Files ({previewData.file_summaries.length})</option>
                    {previewData.file_summaries.map((f, i) => (
                      <option key={i} value={f.filename}>{f.filename}</option>
                    ))}
                  </select>
                )}

                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search reg, name..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5">File</th>
                    <th className="px-3 py-2.5 text-center">Row</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Registration Number</th>
                    <th className="px-3 py-2.5">Student Name</th>
                    <th className="px-3 py-2.5">Branch</th>
                    <th className="px-3 py-2.5 text-center">Sem</th>
                    <th className="px-3 py-2.5">Subject Code</th>
                    <th className="px-3 py-2.5">Subject</th>
                    <th className="px-3 py-2.5 text-center">Credits</th>
                    <th className="px-3 py-2.5 text-center">Grade</th>
                    <th className="px-3 py-2.5 text-center">GP</th>
                    <th className="px-3 py-2.5">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-8 text-center text-slate-500">
                        No records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => (
                      <tr
                        key={row.row_num}
                        className={`hover:bg-slate-100/80 dark:hover:bg-slate-800/30 transition-colors ${
                          !row.is_valid ? 'bg-rose-500/10 text-rose-800 dark:text-rose-200' : ''
                        }`}
                      >
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500 max-w-[140px] truncate" title={row.source_file}>
                          {row.source_file || 'File'}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-400 font-mono">
                          {row.source_row_num || row.row_num}
                        </td>
                        <td className="px-3 py-2">
                          {row.is_valid ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              VALID
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" title={row.errors.join(', ')}>
                              INVALID
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {row.registration_number}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-white font-medium">
                          {row.student_name}
                        </td>
                        <td className="px-3 py-2">{row.branch}</td>
                        <td className="px-3 py-2 text-center font-mono">{row.semester}</td>
                        <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-300 font-semibold">
                          {row.subject_code}
                        </td>
                        <td className="px-3 py-2 max-w-[160px] truncate" title={row.subject_name}>
                          {row.subject_name}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">{row.credits}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold">
                          {row.grade === 'S' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                              S (Absent)
                            </span>
                          ) : row.grade === 'M' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/30">
                              M (Malpractice)
                            </span>
                          ) : row.grade === 'R' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-800 dark:text-blue-200 border border-blue-500/30">
                              R (Repeat)
                            </span>
                          ) : (
                            row.grade && row.grade !== '-' ? row.grade : '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-medium">
                          {['R', 'M', 'S'].includes(row.grade) ? (
                            <span className="text-slate-400 dark:text-slate-500 text-[11px]">N/A (Status)</span>
                          ) : (
                            typeof row.grade_point === 'number' ? Number(row.grade_point.toFixed(2)) : (row.grade_point ?? '—')
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-rose-600 dark:text-rose-400 max-w-[200px] truncate" title={row.errors.join('; ')}>
                          {row.errors.length > 0 ? row.errors.join('; ') : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Bottom Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              
              {/* Pagination controls */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  Showing {filteredRows.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to {Math.min(currentPage * rowsPerPage, filteredRows.length)} of {filteredRows.length} records
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 py-0.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancelPreview}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel & Select Other Files
                </button>

                <button
                  type="button"
                  disabled={previewData.valid_rows === 0 || isImporting}
                  onClick={handleConfirmImport}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isImporting ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Importing {previewData.valid_rows.toLocaleString()} Results...</span>
                    </div>
                  ) : (
                    <>
                      <span>IMPORT ALL {previewData.valid_rows.toLocaleString()} VALID RESULTS</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
