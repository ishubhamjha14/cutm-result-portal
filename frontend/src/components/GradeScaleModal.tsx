import React from 'react';
import { X, Award, Calculator } from 'lucide-react';

interface GradeScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GradeScaleModal: React.FC<GradeScaleModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const gradingScales = [
    { grade: 'O', points: '10.0', desc: 'Outstanding', marks: '90% - 100%', color: 'text-amber-600 dark:text-amber-400 bg-amber-400/10 border-amber-400/30' },
    { grade: 'E', points: '9.0', desc: 'Excellent', marks: '80% - 89.9%', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
    { grade: 'A', points: '8.0', desc: 'Very Good', marks: '70% - 79.9%', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-400/10 border-indigo-400/30' },
    { grade: 'B', points: '7.0', desc: 'Good', marks: '60% - 69.9%', color: 'text-blue-600 dark:text-blue-400 bg-blue-400/10 border-blue-400/30' },
    { grade: 'C', points: '6.0', desc: 'Above Average', marks: '50% - 59.9%', color: 'text-teal-600 dark:text-teal-400 bg-teal-400/10 border-teal-400/30' },
    { grade: 'D', points: '5.0', desc: 'Pass', marks: '40% - 49.9%', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
    { grade: 'F', points: '0.0', desc: 'Fail', marks: 'Below 40%', color: 'text-rose-600 dark:text-rose-400 bg-rose-400/10 border-rose-400/30' },
    { grade: 'M', points: 'Status', desc: 'Mal Practice', marks: 'Special Status', color: 'text-rose-600 dark:text-rose-500 bg-rose-500/10 border-rose-500/30' },
    { grade: 'S', points: 'Status', desc: 'Absent', marks: 'Special Status', color: 'text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/30' },
    { grade: 'R', points: 'Status', desc: 'Repeat/Reappear', marks: 'Special Status', color: 'text-purple-600 dark:text-purple-500 bg-purple-500/10 border-purple-500/30' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                CUTM Academic Grading System
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                10-Point Choice Based Credit System (CBCS) Scale & Formulas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grade Table */}
        <div className="mt-6 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Letter Grade & Point Values
          </h4>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Grade Point</th>
                  <th className="px-4 py-3">Qualitative Rating</th>
                  <th className="px-4 py-3">Percentage Equivalent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {gradingScales.map((item) => (
                  <tr key={item.grade} className="hover:bg-slate-100/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] border ${item.color}`}>
                        {item.grade}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-900 dark:text-white">
                      {item.points}
                    </td>
                    <td className="px-4 py-2.5">{item.desc}</td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 font-mono">{item.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Formulas breakdown */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* SGPA Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                <Calculator className="w-4 h-4" />
                <span>SGPA Calculation</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                SGPA = Σ(Credit × Grade Point) / Σ(Total Credits)
              </p>
              <p className="text-[11px] text-slate-500">
                Computed individually for each semester based on registered subject credits.
              </p>
            </div>

            {/* CGPA Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold">
                <Calculator className="w-4 h-4" />
                <span>Cumulative CGPA</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                CGPA = Σ(All Sem Credits × GP) / Σ(All Sem Credits)
              </p>
              <p className="text-[11px] text-slate-500">
                Credit-weighted cumulative average calculated across all completed semesters.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
