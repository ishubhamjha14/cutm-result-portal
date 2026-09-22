import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
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
} from 'lucide-react';
import { api } from '../../services/api';
import { ImportPreviewResponse } from '../../types';

interface UploadResultsPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const UploadResultsPage: React.FC<UploadResultsPageProps> = ({ onNavigateTab }) => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    filename?: string;
    students_count?: number;
    subjects_count?: number;
    imported_count: number;
    updated_count: number;
    skipped_count?: number;
  } | null>(null);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      setErrorMessage('Supported formats: .xls, .xlsx, .csv. Please upload a valid workbook.');
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setImportResult(null);
    setIsValidating(true);

    try {
      const data = await api.previewUpload(file);
      setPreviewData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to read this Excel file. Please verify that the file is a valid .xls/.xlsx workbook.');
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
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Import execution failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewData(null);
    setSelectedFile(null);
    setErrorMessage(null);
  };

  const goToResults = () => {
    if (onNavigateTab) {
      onNavigateTab('results');
    } else {
      navigate('/admin/results');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
            Bulk Results Ingestion Engine
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Upload examination result datasets in <strong className="text-slate-900 dark:text-white">.xls</strong> (Excel 97-2003), <strong className="text-slate-900 dark:text-white">.xlsx</strong>, or <strong className="text-slate-900 dark:text-white">.csv</strong> format.
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
                  {importResult.filename || 'Examination dataset'} has been committed to the live PostgreSQL database.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-mono font-bold flex items-center gap-1.5 border border-emerald-500/30">
                <Database className="w-3.5 h-3.5" /> Database: Connected ✓
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
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

          <div className="pt-2 flex justify-end">
            <button
              onClick={goToResults}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <span>VIEW RESULTS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
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

      {/* Upload Dropzone */}
      {!previewData && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`glass-panel p-10 sm:p-14 rounded-3xl border-2 border-dashed transition-all text-center relative overflow-hidden bg-white/95 dark:bg-slate-900/90 ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-300 dark:border-slate-800 hover:border-indigo-500/40'
          }`}
        >
          <input
            type="file"
            id="result-file-input"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 shadow-xl">
              {isValidating ? (
                <RefreshCw className="w-8 h-8 animate-spin" />
              ) : (
                <UploadCloud className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                {isValidating ? 'Inspecting & Validating Excel Structure...' : 'Drag & Drop Result File Here'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports <strong className="text-indigo-600 dark:text-indigo-300 font-mono">.xls (Excel 97-2003)</strong>, <strong className="text-purple-600 dark:text-purple-300 font-mono">.xlsx</strong>, and <strong className="text-emerald-600 dark:text-emerald-300 font-mono">.csv</strong>.
              </p>
            </div>

            <label
              htmlFor="result-file-input"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Browse File From Computer</span>
            </label>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500">
              <span>Automatically detects header rows, multi-sheet structures, combined credits (e.g. 2.0+4.0), and semester tags.</span>
            </div>
          </div>
        </div>
      )}

      {/* 2-Phase Validation Preview Modal / Card */}
      {previewData && (
        <div className="space-y-6">
          
          {/* File & Sheet Overview Bar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                IMPORT PREVIEW
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{previewData.filename}</span>
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 font-mono text-[11px] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  Format: {previewData.format_name}
                </span>
                {previewData.sheets_detected.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Sheets: {previewData.sheets_detected.map((s) => `✓ ${s}`).join(', ')}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
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

          {/* Detailed Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            
            <div className="glass-card p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 bg-white dark:bg-slate-900/50">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Rows Detected</span>
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
                <span className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Special Status Records:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 font-mono font-bold text-xs border border-amber-500/30 text-amber-900 dark:text-amber-100">
                    R → {previewData.special_status_counts.R || 0}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 font-mono font-bold text-xs border border-amber-500/30 text-amber-900 dark:text-amber-100">
                    M → {previewData.special_status_counts.M || 0}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 font-mono font-bold text-xs border border-amber-500/30 text-amber-900 dark:text-amber-100">
                    S → {previewData.special_status_counts.S || 0}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-amber-700 dark:text-amber-300">
                Special status records (Repeat, Malpractice, Absent) are valid and imported without assigning arbitrary grade points.
              </span>
            </div>
          )}

          {/* Errors Notice if any */}
          {previewData.errors_summary.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Validation Issues Detected:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-700 dark:text-rose-300/90 font-mono max-h-32 overflow-y-auto">
                {previewData.errors_summary.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl bg-white/95 dark:bg-slate-900/90">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Sample Data Rows (Showing first {previewData.sample_rows.length} records)</span>
              </h3>
            </div>

            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 text-center">Row</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Reg Number</th>
                    <th className="px-3 py-2.5">Student Name</th>
                    <th className="px-3 py-2.5">Branch</th>
                    <th className="px-3 py-2.5 text-center">Sem</th>
                    <th className="px-3 py-2.5">Subject</th>
                    <th className="px-3 py-2.5 text-center">Credits</th>
                    <th className="px-3 py-2.5 text-center">Grade</th>
                    <th className="px-3 py-2.5 text-center">GP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {previewData.sample_rows.map((row) => (
                    <tr
                      key={row.row_num}
                      className={`hover:bg-slate-100/80 dark:hover:bg-slate-800/30 ${
                        !row.is_valid ? 'bg-rose-500/10 text-rose-700 dark:text-rose-200' : ''
                      }`}
                    >
                      <td className="px-3 py-2 text-center text-slate-400 font-mono">{row.row_num}</td>
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
                      <td className="px-3 py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">{row.registration_number}</td>
                      <td className="px-3 py-2 text-slate-900 dark:text-white font-medium">{row.student_name}</td>
                      <td className="px-3 py-2">{row.branch}</td>
                      <td className="px-3 py-2 text-center font-mono">{row.semester}</td>
                      <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-300">{row.subject_code}</td>
                      <td className="px-3 py-2 text-center font-mono">{row.credits}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold">{row.grade}</td>
                      <td className="px-3 py-2 text-center font-mono">{row.grade_point}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCancelPreview}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel & Select Other File
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
                    <span>Importing {previewData.valid_rows.toLocaleString()} Records...</span>
                  </div>
                ) : (
                  <>
                    <span>IMPORT {previewData.valid_rows.toLocaleString()} RESULTS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
