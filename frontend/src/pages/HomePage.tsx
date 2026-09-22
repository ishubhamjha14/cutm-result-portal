import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  GraduationCap,
  Sparkles,
  Calculator,
  TrendingUp,
  Award,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { api } from '../services/api';
import { PublicMetadata } from '../types';
import confetti from 'canvas-confetti';

interface HomePageProps {
  onOpenGradesModal: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenGradesModal }) => {
  const navigate = useNavigate();
  const [regNo, setRegNo] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('Searching academic records...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<PublicMetadata | null>(null);

  useEffect(() => {
    api.getPublicMeta()
      .then(setMetadata)
      .catch((err) => console.warn('Meta load error:', err));
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanReg = regNo.trim().toUpperCase();
    if (!cleanReg) {
      setErrorMessage('Please enter your university Registration Number.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setLoadingStep('Searching academic records in database...');

    const timer1 = setTimeout(() => {
      setLoadingStep('Calculating SGPA & credit points...');
    }, 400);

    const timer2 = setTimeout(() => {
      setLoadingStep('Computing cumulative CGPA trajectory...');
    }, 800);

    try {
      const resultData = await api.getSemesterResult(cleanReg, selectedSemester);
      clearTimeout(timer1);
      clearTimeout(timer2);

      // Trigger confetti celebration if student scored high SGPA!
      if (resultData.sgpa >= 8.5) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981'],
        });
      }

      navigate(`/result/${cleanReg}/${selectedSemester}`, {
        state: { resultData },
      });
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setErrorMessage(
        err.message || 'Result not found. Please check your registration number and semester.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoFill = (demoReg: string, sem: number) => {
    setRegNo(demoReg);
    setSelectedSemester(sem);
    setErrorMessage(null);
  };

  return (
    <div className="relative overflow-hidden">
      
      {/* Decorative Gradient Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-30 select-none overflow-hidden">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-blob-slow" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-blob-slow delay-1000" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-6 pb-10 sm:pt-16 sm:pb-20 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-5 sm:space-y-7">
        
        {/* University Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[11px] sm:text-sm font-medium backdrop-blur-md shadow-sm max-w-full">
          <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="truncate sm:whitespace-normal">Centurion University of Technology and Management</span>
        </div>

        {/* Hero Headings */}
        <div className="space-y-2 sm:space-y-3 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white font-heading">
            CUTM RESULT PORTAL
          </h1>
          <p className="text-base sm:text-xl font-medium text-slate-700 dark:text-slate-300">
            "Your academic journey, all in one place."
          </p>
          <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Check your semester examination results, automated SGPA, and cumulative CGPA performance instantly.
          </p>
        </div>

        {/* Main Search Card */}
        <div className="max-w-xl mx-auto mt-6 sm:mt-8">
          <div className="glass-panel p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl relative overflow-hidden text-left bg-white/95 dark:bg-slate-900/90">
            
            <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-slate-200 dark:border-slate-800/80 mb-5 sm:mb-6">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/20 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-heading">
                    Check Your Result
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Enter your university registration details
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Official
              </span>
            </div>

            <form onSubmit={handleSearch} className="space-y-4 sm:space-y-5">
              
              {/* Registration Number Input */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Registration Number</span>
                  <span className="text-[10px] text-slate-500 font-normal hidden xs:inline">e.g. 24CSE12345</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={regNo}
                    onChange={(e) => {
                      setRegNo(e.target.value.toUpperCase());
                      setErrorMessage(null);
                    }}
                    placeholder="Enter Registration Number"
                    className="w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all uppercase"
                    autoFocus
                  />
                  {regNo && (
                    <button
                      type="button"
                      onClick={() => setRegNo('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white px-2 py-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Semester Selector Dropdown */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Select Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => {
                    setSelectedSemester(Number(e.target.value));
                    setErrorMessage(null);
                  }}
                  className="w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer font-medium"
                >
                  {(metadata?.semesters || [
                    { semester_number: 1, name: 'Semester 1' },
                    { semester_number: 2, name: 'Semester 2' },
                    { semester_number: 3, name: 'Semester 3' },
                    { semester_number: 4, name: 'Semester 4' },
                    { semester_number: 5, name: 'Semester 5' },
                    { semester_number: 6, name: 'Semester 6' },
                    { semester_number: 7, name: 'Semester 7' },
                    { semester_number: 8, name: 'Semester 8' },
                  ]).map((sem) => (
                    <option key={sem.semester_number} value={sem.semester_number} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {sem.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 sm:gap-3 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-rose-800 dark:text-rose-200">Result Not Found</strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Submit Search Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-xl shadow-indigo-500/25 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{loadingStep}</span>
                  </div>
                ) : (
                  <>
                    <span>VIEW RESULT</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

            </form>

            {/* Quick Demo Test Chips */}
            <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" /> Quick Demo Test Accounts:
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
                {[
                  { reg: '24CSE12345', name: 'Shubham (AI/ML)', sem: 3 },
                  { reg: '24CSE10001', name: 'Ananya (CSE)', sem: 3 },
                  { reg: '24ECE10022', name: 'Rohan (ECE)', sem: 2 },
                  { reg: '24MECH1005', name: 'Priya (ME)', sem: 1 },
                ].map((demo) => (
                  <button
                    key={demo.reg}
                    type="button"
                    onClick={() => handleQuickDemoFill(demo.reg, demo.sem)}
                    className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] sm:text-[11px] font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{demo.reg}</span>
                    <span className="text-slate-500 dark:text-slate-400 hidden xs:inline">({demo.name}, Sem {demo.sem})</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* Feature Highlights Grid */}
      <section className="py-10 sm:py-14 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-900">
        
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 space-y-2 sm:space-y-3">
          <h2 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white font-heading">
            Academic Performance Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Engineered with strict Choice Based Credit System standards for instantaneous, tamper-proof academic results.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 sm:space-y-3 bg-white/90 dark:bg-slate-900/50">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Search className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-heading">
              Instant Result Access
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Real-time query execution across indexed PostgreSQL database without delays or cached stale grades.
            </p>
          </div>

          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 sm:space-y-3 bg-white/90 dark:bg-slate-900/50">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-heading">
              Automatic SGPA Engine
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Calculates Semester Grade Point Average automatically from credits and grade points using Σ(C×GP)/ΣC.
            </p>
          </div>

          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 sm:space-y-3 bg-white/90 dark:bg-slate-900/50">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-heading">
              Automatic Cumulative CGPA
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Synthesizes cumulative performance across all completed academic semesters dynamically.
            </p>
          </div>

          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 sm:space-y-3 bg-white/90 dark:bg-slate-900/50">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-heading">
              Semester Progression
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Interactive visual trajectory charts showcasing individual semester progression and credit milestones.
            </p>
          </div>

        </div>

        {/* Grading scale banner CTA */}
        <div className="mt-8 sm:mt-12 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-50 via-slate-100 to-purple-50 dark:from-indigo-950/60 dark:via-slate-900 dark:to-purple-950/60 border border-indigo-500/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-left">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Learn About CUTM's 10-Point CBCS Grading Scale
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
                Understand how letter grades (O, E, A, B, C, D, F, M, S, R) translate into grade points.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenGradesModal}
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0 text-center"
          >
            View Grading Scale Reference
          </button>
        </div>

      </section>

    </div>
  );
};
