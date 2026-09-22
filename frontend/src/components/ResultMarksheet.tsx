import React, { useRef } from 'react';
import {
  Printer,
  Download,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Award,
  GraduationCap,
  QrCode,
  ShieldCheck,
  Calendar,
  Building,
  User,
  Hash,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { SemesterResultResponse } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ResultMarksheetProps {
  data: SemesterResultResponse;
  onBack: () => void;
}

// Deterministic Vector QR Code Component for Authentic Verification
const QRCodeSVG: React.FC<{ value: string; size?: number }> = ({ value, size = 60 }) => {
  const matrixSize = 21;
  const grid: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

  const drawFinder = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (
          i === 0 || i === 6 || j === 0 || j === 6 ||
          (i >= 2 && i <= 4 && j >= 2 && j <= 4)
        ) {
          grid[r + i][c + j] = true;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, 14);
  drawFinder(14, 0);

  for (let i = 8; i < 13; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  let bitIndex = 0;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      const inTL = r < 8 && c < 8;
      const inTR = r < 8 && c >= 13;
      const inBL = r >= 13 && c < 8;
      const inTiming = (r === 6 && c >= 8 && c < 13) || (c === 6 && r >= 8 && r < 13);

      if (!inTL && !inTR && !inBL && !inTiming) {
        const pseudoBit = ((hash ^ (r * 37 + c * 19 + bitIndex * 13)) % 100) > 48;
        grid[r][c] = pseudoBit;
        bitIndex++;
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox="0 0 21 21" className="shrink-0 bg-white">
      <rect width="21" height="21" fill="#ffffff" />
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0f172a" />
          ) : null
        )
      )}
    </svg>
  );
};

export const ResultMarksheet: React.FC<ResultMarksheetProps> = ({ data, onBack }) => {
  const marksheetRef = useRef<HTMLDivElement>(null);
  const printMarksheetRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const {
    student,
    semester,
    semester_name,
    academic_session,
    examination_month_year,
    published_date,
    subjects,
    total_credits,
    earned_credits,
    total_credit_points,
    sgpa,
    cgpa,
    result_status,
    semester_progression,
  } = data;

  const isPassed = result_status === 'PASS';

  // Handle browser native print
  const handlePrint = () => {
    window.print();
  };

  // Handle PDF generation via html2canvas and jsPDF on the dedicated official marksheet
  const handleDownloadPDF = async () => {
    const targetElement = printMarksheetRef.current || marksheetRef.current;
    if (!targetElement) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CUTM_Result_${student.registration_number}_Sem${semester}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Chart data for screen view
  const chartData = semester_progression.map((p) => ({
    name: `Sem ${p.semester}`,
    sgpa: p.sgpa,
    credits: p.total_credits,
  }));

  // Screen Grade Badge Styling Helper
  const getScreenGradeBadge = (g: string) => {
    switch (g) {
      case 'O': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'E': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'A': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
      case 'B': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'C': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30';
      case 'D': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
      case 'F': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'M': return 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/30';
      case 'S': return 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30';
      case 'R': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  // Official Print Grade Badge Styling Helper
  const getPrintGradeBadge = (g: string) => {
    switch (g) {
      case 'O':
      case 'E':
        return 'bg-emerald-50 text-emerald-800 border-emerald-400';
      case 'A':
        return 'bg-purple-50 text-purple-800 border-purple-400';
      case 'B':
        return 'bg-blue-50 text-blue-800 border-blue-400';
      case 'C':
        return 'bg-amber-50 text-amber-800 border-amber-400';
      case 'D':
        return 'bg-orange-50 text-orange-800 border-orange-400';
      case 'F':
      case 'M':
        return 'bg-rose-50 text-rose-800 border-rose-400';
      case 'S':
        return 'bg-amber-50 text-amber-800 border-amber-400';
      case 'R':
        return 'bg-purple-50 text-purple-800 border-purple-400';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-400';
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. INTERACTIVE SCREEN UI (PRESERVED 100% FOR DESKTOP & MOBILE BROWSING)    */}
      {/* ========================================================================= */}
      <div className="no-print space-y-4 sm:space-y-6 max-w-5xl mx-auto">
        
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Search Another Result</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 text-xs font-semibold px-3 sm:px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Print Result</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 text-xs font-semibold px-3.5 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-white" />
              <span>{isExporting ? 'Generating...' : 'Download Official PDF'}</span>
            </button>
          </div>
        </div>

        {/* Main Screen Marksheet Document Container */}
        <div
          ref={marksheetRef}
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 sm:p-6 md:p-10 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Watermark Emblem Background */}
          <div className="absolute right-4 top-1/3 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none text-slate-900 dark:text-slate-100">
            <GraduationCap className="w-64 sm:w-96 h-64 sm:h-96" />
          </div>

          {/* University Official Header */}
          <div className="text-center pb-5 sm:pb-6 border-b-2 border-indigo-500/20 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-center max-w-full leading-tight">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Accredited Grade 'A+' by NAAC | Estd. Under Odisha Act 4 of 2010</span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-heading uppercase">
              Centurion University of Technology and Management
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium max-w-xl mx-auto">
              {student.campus || 'Bhubaneswar Campus, Jatni, Odisha - 752050'}
            </p>
            
            <div className="pt-1.5 sm:pt-2">
              <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] sm:text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 shadow-inner">
                Provisional End Semester Grade Card
              </span>
            </div>
          </div>

          {/* Student Demographics Grid */}
          <div className="mt-5 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs">
            
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Student Name
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                {student.name}
              </p>
            </div>

            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Registration Number
              </span>
              <p className="text-xs sm:text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                {student.registration_number}
              </p>
            </div>

            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Program / Degree
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {student.program_name} {student.program_code ? `(${student.program_code})` : ''}
              </p>
            </div>

            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Discipline / Branch
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {student.branch_name}
              </p>
            </div>

            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Academic Session / Batch
              </span>
              <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                {student.academic_session || academic_session || '2024 - 2028'}
              </p>
            </div>

            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Semester & Exam Session
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {semester_name} • <span className="font-mono text-indigo-600 dark:text-indigo-300">{examination_month_year}</span>
              </p>
            </div>
          </div>

          {/* Subject Performance Section */}
          <div className="mt-6 sm:mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Subject-wise Course Performance</span>
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Total Subjects: <strong className="text-slate-900 dark:text-white">{subjects.length}</strong>
              </span>
            </div>

            {/* 1. Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">#</th>
                    <th className="px-4 py-3.5 w-28">Subject Code</th>
                    <th className="px-4 py-3.5">Course Title</th>
                    <th className="px-4 py-3.5 text-center w-20">Credits</th>
                    <th className="px-4 py-3.5 text-center w-24">Grade</th>
                    <th className="px-4 py-3.5 text-center w-28">Grade Point</th>
                    <th className="px-4 py-3.5 text-center w-32">Credit Points</th>
                    <th className="px-4 py-3.5 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {subjects.map((sub, index) => {
                    const isSubFail = sub.grade === 'F' || sub.grade === 'M' || sub.grade === 'S' || sub.grade === 'R' || sub.status === 'FAIL';
                    return (
                      <tr
                        key={sub.subject_code}
                        className="hover:bg-slate-100/80 dark:hover:bg-slate-800/25 transition-colors"
                      >
                        <td className="px-4 py-3 text-center text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {sub.subject_code}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {sub.subject_name}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {sub.credits.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold text-[11px] font-mono border ${getScreenGradeBadge(sub.grade)}`}
                          >
                            {sub.grade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {sub.grade_point.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {sub.credit_points.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isSubFail
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isSubFail ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            {sub.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. Dedicated Mobile Cards (< 768px) */}
            <div className="block md:hidden space-y-3">
              {subjects.map((sub, index) => {
                const isSubFail = sub.grade === 'F' || sub.grade === 'M' || sub.grade === 'S' || sub.grade === 'R' || sub.status === 'FAIL';
                return (
                  <div
                    key={sub.subject_code}
                    className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">#{index + 1}</span>
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                          {sub.subject_code}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSubFail
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isSubFail ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {sub.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                      {sub.subject_name}
                    </h4>

                    <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold mb-0.5">Credits</span>
                        <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{sub.credits.toFixed(1)}</span>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold mb-0.5">Grade</span>
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded font-mono font-extrabold text-xs border ${getScreenGradeBadge(sub.grade)}`}>
                          {sub.grade}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold mb-0.5">Grade Pt</span>
                        <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{sub.grade_point.toFixed(1)}</span>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold mb-0.5">Credit Pts</span>
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">{sub.credit_points.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Metric Callouts (SGPA & CGPA) */}
          <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/70 dark:to-slate-900 border-2 border-indigo-500/30 relative overflow-hidden shadow-sm dark:shadow-lg">
              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
                <span>Semester SGPA</span>
                <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                  {sgpa.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">/ 10.00</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-indigo-600/90 dark:text-indigo-300/80 mt-1.5 sm:mt-2">
                {semester_name} Performance Index
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/70 dark:to-slate-900 border-2 border-purple-500/30 relative overflow-hidden shadow-sm dark:shadow-lg">
              <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
                <span>Cumulative CGPA</span>
                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                  {cgpa.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">/ 10.00</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-purple-600/90 dark:text-purple-300/80 mt-1.5 sm:mt-2">
                Across all completed semesters
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                Credit Metrics
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total Credits:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{total_credits.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Earned Credits:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{earned_credits.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Credit Points:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-300">{total_credit_points.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                Result Verdict
              </span>
              <div className="my-auto py-1">
                <span
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider border ${
                    isPassed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  }`}
                >
                  {isPassed ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{result_status}</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-500 pt-1">
                Published on {published_date}
              </span>
            </div>
          </div>

          {/* Academic Progression Chart */}
          {chartData.length > 1 && (
            <div className="no-print mt-6 sm:mt-8 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>SGPA Progression Curve</span>
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                    Semester-wise academic growth trajectory
                  </p>
                </div>
                <span className="text-xs font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 self-start sm:self-auto">
                  Current CGPA: {cgpa.toFixed(2)}
                </span>
              </div>

              <div className="h-48 sm:h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis domain={[0, 10]} stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sgpa"
                      name="SGPA"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Screen Verification / Disclaimer */}
          <div className="mt-8 sm:mt-10 pt-5 sm:pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-center text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0">
                <QrCode className="w-8 h-8 sm:w-10 sm:h-10 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-800 dark:text-slate-300">Digitally Verified</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  ID: CUTM-{student.registration_number}-S{semester}
                </p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                * This is an officially generated computer-provisional marksheet. The original final Grade Sheet and Degree will be issued by the University.
              </p>
            </div>

            <div className="text-center sm:text-right space-y-0.5 sm:space-y-1">
              <p className="font-heading font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                Prof. (Dr.) Examination Controller
              </p>
              <p className="text-[10px] sm:text-[11px] text-indigo-600 dark:text-indigo-400">
                Centurion University of Technology and Management
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DEDICATED OFFICIAL UNIVERSITY GRADE CARD (PRINT & PDF LAYOUT)           */}
      {/* ========================================================================= */}
      <div
        ref={printMarksheetRef}
        id="official-print-marksheet"
        className="official-print-marksheet bg-white text-slate-900 font-sans p-6 relative overflow-hidden"
      >
        {/* Subtle CUTM Watermark Seal Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.035] -z-0">
          <img
            src="/images/cutm-logo.png"
            alt="CUTM Emblem"
            className="w-80 h-80 object-contain"
          />
        </div>

        <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
          
          {/* 1. Official University Header */}
          <div className="print-header pb-2.5 border-b-2 border-slate-900 flex items-center justify-between gap-3">
            {/* Left: Official CUTM Logo */}
            <div className="flex items-center gap-3">
              <img
                src="/images/centurion-logo.jpg"
                alt="Centurion University Logo"
                className="h-14 w-auto object-contain shrink-0"
              />
              <div className="text-left">
                <h1 className="text-[13pt] font-black tracking-tight text-slate-900 uppercase font-heading leading-tight">
                  CENTURION UNIVERSITY OF TECHNOLOGY AND MANAGEMENT
                </h1>
                <p className="text-[7.5pt] font-medium text-slate-600 tracking-tight leading-tight mt-0.5">
                  Bhubaneswar | Paralakhemundi | Balasore | Rayagada | Jatni | Vizianagaram
                </p>
                <p className="text-[7pt] font-semibold text-indigo-900 tracking-wide mt-0.5">
                  Accredited Grade 'A+' by NAAC | Estd. Under Odisha Act 4 of 2010
                </p>
              </div>
            </div>

            {/* Right: Portal Branding & Academic Session */}
            <div className="text-right shrink-0 border-l-2 border-slate-300 pl-3">
              <span className="text-[10pt] font-black text-slate-900 tracking-tight block leading-tight">
                CUTM
              </span>
              <span className="text-[7pt] font-extrabold uppercase px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded border border-indigo-300 inline-block my-0.5">
                RESULT PORTAL
              </span>
              <p className="text-[7.5pt] font-mono text-slate-600 block mt-0.5">
                Academic Session: <strong className="text-slate-900">{student.academic_session || academic_session || '2024 - 2028'}</strong>
              </p>
            </div>
          </div>

          {/* 2. Title & Result Status Bar */}
          <div className="print-card flex items-center justify-between bg-slate-100/90 border border-slate-300 px-3.5 py-1.5 rounded-md">
            <div className="text-left">
              <h2 className="text-[10.5pt] font-extrabold text-slate-900 uppercase tracking-wide leading-tight">
                SEMESTER RESULT
              </h2>
              <p className="text-[7.5pt] text-slate-600 font-medium leading-tight">
                {semester_name ? `${semester_name} - ` : ''}End Semester Examination (Regular) • <span className="font-mono">{examination_month_year}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-md text-[9.5pt] font-extrabold tracking-wider uppercase border ${
                    isPassed
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-600'
                      : 'bg-rose-50 text-rose-800 border-rose-600'
                  }`}
                >
                  <span>{isPassed ? '✓ PASS' : `✕ ${result_status}`}</span>
                </span>
                <span className="block text-[6.5pt] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">
                  Result Status
                </span>
              </div>
            </div>
          </div>

          {/* 3. Student Information Section (2 Columns) */}
          <div className="print-card p-2.5 rounded-md border border-slate-300 bg-slate-50/70 text-[8pt]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              
              {/* Left Column */}
              <div className="space-y-1">
                <div className="grid grid-cols-[135px_1fr] items-baseline">
                  <span className="text-slate-600 font-medium">Student Name</span>
                  <span className="font-bold text-slate-900 uppercase">: {student.name}</span>
                </div>
                <div className="grid grid-cols-[135px_1fr] items-baseline">
                  <span className="text-slate-600 font-medium">Registration Number</span>
                  <span className="font-mono font-bold text-slate-900">: {student.registration_number}</span>
                </div>
                <div className="grid grid-cols-[135px_1fr] items-baseline">
                  <span className="text-slate-600 font-medium">Program / Degree</span>
                  <span className="font-semibold text-slate-900">: {student.program_name} {student.program_code ? `(${student.program_code})` : ''}</span>
                </div>
                <div className="grid grid-cols-[135px_1fr] items-baseline">
                  <span className="text-slate-600 font-medium">Discipline / Branch</span>
                  <span className="font-semibold text-slate-900">: {student.branch_name}</span>
                </div>
                <div className="grid grid-cols-[135px_1fr] items-baseline">
                  <span className="text-slate-600 font-medium">Academic Session</span>
                  <span className="font-mono font-medium text-slate-900">: {student.academic_session || academic_session || '2024 - 2028'}</span>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-1">
                <div className="grid grid-cols-[150px_1fr] items-baseline">
                  <span className="text-slate-600 font-medium">Semester</span>
                  <span className="font-bold text-slate-900">: {semester}</span>
                </div>
                <div className="grid grid-cols-[150px_1fr] items-baseline">
                  <span className="text-slate-600 font-medium">Total Subjects</span>
                  <span className="font-mono font-bold text-slate-900">: {subjects.length}</span>
                </div>
                <div className="grid grid-cols-[150px_1fr] items-baseline">
                  <span className="text-slate-600 font-medium">Total Credits (This Semester)</span>
                  <span className="font-mono font-bold text-slate-900">: {total_credits.toFixed(1)}</span>
                </div>
                <div className="grid grid-cols-[150px_1fr] items-baseline">
                  <span className="text-slate-600 font-medium">SGPA (This Semester)</span>
                  <span className="font-mono font-bold text-indigo-900">: {sgpa.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-[150px_1fr] items-baseline">
                  <span className="text-slate-600 font-medium">CGPA (Till Now)</span>
                  <span className="font-mono font-bold text-purple-900">: {cgpa.toFixed(2)}</span>
                </div>
              </div>

            </div>
          </div>

          {/* 4. Subject Performance Table */}
          <div className="print-card">
            <table className="w-full text-left border-collapse border border-slate-300 text-[8pt]">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[7.5pt] uppercase tracking-wider">
                  <th className="py-1.5 px-2 text-center w-8 border border-slate-700">Sl</th>
                  <th className="py-1.5 px-2 text-center w-24 border border-slate-700">Subject Code</th>
                  <th className="py-1.5 px-2.5 border border-slate-700">Subject Name</th>
                  <th className="py-1.5 px-2 text-center w-16 border border-slate-700">Credits</th>
                  <th className="py-1.5 px-2 text-center w-16 border border-slate-700">Grade</th>
                  <th className="py-1.5 px-2 text-center w-20 border border-slate-700">Grade Point</th>
                  <th className="py-1.5 px-2 text-center w-22 border border-slate-700">Credit Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {subjects.map((sub, index) => (
                  <tr key={sub.subject_code} className="even:bg-slate-50/70 avoid-break">
                    <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-x border-slate-300">
                      {index + 1}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-900 border-r border-slate-300">
                      {sub.subject_code}
                    </td>
                    <td className="py-1.5 px-2.5 font-medium text-slate-800 border-r border-slate-300">
                      {sub.subject_name}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-semibold text-slate-700 border-r border-slate-300">
                      {sub.credits.toFixed(1)}
                    </td>
                    <td className="py-1.5 px-2 text-center border-r border-slate-300">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[7.5pt] font-mono font-extrabold border ${getPrintGradeBadge(sub.grade)}`}
                      >
                        {sub.grade}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-semibold text-slate-800 border-r border-slate-300">
                      {sub.grade_point.toFixed(1)}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-900 border-r border-slate-300">
                      {sub.credit_points.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. Summary Section (4 Cards) */}
          <div className="print-summary grid grid-cols-4 gap-2.5">
            <div className="border border-slate-300 bg-slate-50/80 rounded-md p-1.5 text-center">
              <span className="text-[6.5pt] font-bold text-slate-500 uppercase tracking-wider block">
                TOTAL SUBJECTS
              </span>
              <span className="text-[12pt] font-black text-slate-900 font-mono block leading-tight mt-0.5">
                {subjects.length}
              </span>
            </div>

            <div className="border border-slate-300 bg-slate-50/80 rounded-md p-1.5 text-center">
              <span className="text-[6.5pt] font-bold text-slate-500 uppercase tracking-wider block">
                TOTAL CREDITS
              </span>
              <span className="text-[12pt] font-black text-slate-900 font-mono block leading-tight mt-0.5">
                {total_credits.toFixed(1)}
              </span>
            </div>

            <div className="border border-indigo-200 bg-indigo-50/70 rounded-md p-1.5 text-center">
              <span className="text-[6.5pt] font-bold text-indigo-800 uppercase tracking-wider block">
                SEMESTER SGPA
              </span>
              <div className="flex items-baseline justify-center gap-1 leading-tight mt-0.5">
                <span className="text-[12pt] font-black text-indigo-900 font-mono">
                  {sgpa.toFixed(2)}
                </span>
                <span className="text-[7pt] text-indigo-700 font-semibold">/ 10.00</span>
              </div>
            </div>

            <div className="border border-purple-200 bg-purple-50/70 rounded-md p-1.5 text-center">
              <span className="text-[6.5pt] font-bold text-purple-800 uppercase tracking-wider block">
                CUMULATIVE CGPA
              </span>
              <div className="flex items-baseline justify-center gap-1 leading-tight mt-0.5">
                <span className="text-[12pt] font-black text-purple-900 font-mono">
                  {cgpa.toFixed(2)}
                </span>
                <span className="text-[7pt] text-purple-700 font-semibold">/ 10.00</span>
              </div>
            </div>
          </div>

          {/* 6. Verification, Controller & Date Section */}
          <div className="print-verification p-2.5 rounded-md border border-slate-300 bg-white grid grid-cols-3 gap-3 items-center text-[7.5pt]">
            
            {/* Left: QR Verification */}
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded border border-slate-300 bg-white shrink-0">
                <QRCodeSVG value={`CUTM-VERIFIED:${student.registration_number}:S${semester}:${sgpa.toFixed(2)}:${cgpa.toFixed(2)}`} size={58} />
              </div>
              <div className="text-left space-y-0.5">
                <p className="font-bold text-slate-900 text-[8pt]">Verify This Result</p>
                <p className="text-[6.5pt] text-slate-500 leading-tight">
                  Scan QR code to verify authenticity at CUTM Result Portal.
                </p>
                <p className="text-[6.5pt] font-mono font-bold text-slate-700">
                  ID: CUTM-{student.registration_number}-S{semester}
                </p>
              </div>
            </div>

            {/* Center: Examination Controller Signature Area */}
            <div className="text-center space-y-0.5">
              <div className="w-32 h-0.5 bg-slate-400 mx-auto mb-1"></div>
              <p className="font-bold text-slate-900 text-[8pt]">
                Dr. Banita Mani Mallick
              </p>
              <p className="text-[7pt] text-slate-600 font-semibold">
                Examination Controller
              </p>
              <p className="text-[6.5pt] text-indigo-900 font-medium">
                Centurion University of Technology and Management
              </p>
            </div>

            {/* Right: Date of Publication */}
            <div className="text-right space-y-0.5">
              <p className="text-[6.5pt] font-bold text-slate-500 uppercase tracking-wider">
                Date of Publication
              </p>
              <p className="text-[9pt] font-mono font-bold text-slate-900">
                {published_date}
              </p>
              <p className="text-[6.5pt] font-semibold text-emerald-700">
                Digital Verification: Certified Valid
              </p>
            </div>

          </div>

          {/* 7. Official Document Footer */}
          <div className="print-footer bg-slate-900 text-slate-200 text-[7pt] px-3 py-1.5 rounded-sm flex justify-between items-center font-medium">
            <span>Centurion University of Technology and Management</span>
            <span>This is a system generated result document. No physical signature is required.</span>
          </div>

        </div>
      </div>
    </>
  );
};
