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

export const ResultMarksheet: React.FC<ResultMarksheetProps> = ({ data, onBack }) => {
  const marksheetRef = useRef<HTMLDivElement>(null);
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

  // Handle PDF generation via html2canvas and jsPDF
  const handleDownloadPDF = async () => {
    if (!marksheetRef.current) return;
    try {
      setIsExporting(true);
      const element = marksheetRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
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

  // Chart data
  const chartData = semester_progression.map((p) => ({
    name: `Sem ${p.semester}`,
    sgpa: p.sgpa,
    credits: p.total_credits,
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Top Action Bar (hidden in print) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer w-full sm:w-auto justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Search Another Result</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Print Result</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-white" />
            <span>{isExporting ? 'Generating PDF...' : 'Download Official PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main Marksheet Document Container */}
      <div
        ref={marksheetRef}
        className="print-container bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl relative overflow-hidden"
      >
        {/* Subtle Watermark Emblem Background */}
        <div className="absolute right-4 top-1/3 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none text-slate-900 dark:text-slate-100">
          <GraduationCap className="w-96 h-96" />
        </div>

        {/* University Official Header */}
        <div className="text-center pb-6 border-b-2 border-indigo-500/20 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Accredited Grade 'A+' by NAAC | Estd. Under Odisha Act 4 of 2010</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-heading uppercase">
            Centurion University of Technology and Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium max-w-xl mx-auto">
            {student.campus || 'Bhubaneswar Campus, Jatni, Odisha - 752050'}
          </p>
          
          <div className="pt-2">
            <span className="inline-block px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 shadow-inner">
              Provisional End Semester Grade Card
            </span>
          </div>
        </div>

        {/* Student Demographics Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs">
          
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Student Name
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
              {student.name}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Registration Number
            </span>
            <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
              {student.registration_number}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Program / Degree
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {student.program_name} ({student.program_code})
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Discipline / Branch
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {student.branch_name}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Academic Session / Batch
            </span>
            <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
              {student.academic_session}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Semester & Exam Session
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {semester_name} • <span className="font-mono text-indigo-600 dark:text-indigo-300">{examination_month_year}</span>
            </p>
          </div>
        </div>

        {/* Subject Performance Table */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Subject-wise Course Performance</span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Total Subjects: <strong className="text-slate-900 dark:text-white">{subjects.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
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
                  
                  const getGradeBadge = (g: string) => {
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
                          className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold text-[11px] font-mono border ${getGradeBadge(sub.grade)}`}
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
        </div>

        {/* Summary Metric Callouts (SGPA & CGPA) */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* SGPA Callout */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/70 dark:to-slate-900 border-2 border-indigo-500/30 relative overflow-hidden shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Semester SGPA</span>
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                {sgpa.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">/ 10.00</span>
            </div>
            <p className="text-[11px] text-indigo-600/90 dark:text-indigo-300/80 mt-2">
              {semester_name} Performance Index
            </p>
          </div>

          {/* Cumulative CGPA Callout */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/70 dark:to-slate-900 border-2 border-purple-500/30 relative overflow-hidden shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Cumulative CGPA</span>
              <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                {cgpa.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">/ 10.00</span>
            </div>
            <p className="text-[11px] text-purple-600/90 dark:text-purple-300/80 mt-2">
              Across all completed semesters
            </p>
          </div>

          {/* Credits Summary */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
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

          {/* Result Status */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Result Verdict
            </span>
            <div className="my-auto py-1">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold uppercase tracking-wider border ${
                  isPassed
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}
              >
                {isPassed ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{result_status}</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              Published on {published_date}
            </span>
          </div>
        </div>

        {/* Academic Performance Progression Chart (if multi-semester history available) */}
        {chartData.length > 1 && (
          <div className="no-print mt-8 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>SGPA Progression Curve</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Semester-wise academic growth trajectory
                </p>
              </div>
              <span className="text-xs font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20">
                Current CGPA: {cgpa.toFixed(2)}
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
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
                    dot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Official Verification Disclaimer & Digital Seals */}
        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-xs text-slate-500 dark:text-slate-400">
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <QrCode className="w-10 h-10 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
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

          <div className="text-right space-y-1">
            <p className="font-heading font-bold text-slate-800 dark:text-slate-200 text-sm">
              Prof. (Dr.) Examination Controller
            </p>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
              Centurion University of Technology and Management
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
