import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  BookOpen,
  UploadCloud,
  ArrowRight,
  Award,
} from 'lucide-react';
import { api } from '../../services/api';
import { DashboardStats } from '../../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface DashboardPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.getDashboardStats()
      .then(setStats)
      .catch((err) => console.error('Failed to load dashboard stats:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const goToTab = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      navigate(`/admin/${tab}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Loading university analytics...</span>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.total_students || 0,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      badge: 'Active Enrolled',
    },
    {
      title: 'Total Subject Results',
      value: stats?.total_results || 0,
      icon: FileSpreadsheet,
      color: 'from-indigo-600 to-purple-600',
      textColor: 'text-purple-600 dark:text-purple-400',
      badge: 'Published Grades',
    },
    {
      title: 'Academic Branches',
      value: stats?.total_branches || 0,
      icon: GraduationCap,
      color: 'from-purple-600 to-pink-600',
      textColor: 'text-pink-600 dark:text-pink-400',
      badge: 'Engineering Depts',
    },
    {
      title: 'Semesters Active',
      value: stats?.total_semesters || 0,
      icon: Layers,
      color: 'from-emerald-600 to-teal-600',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      badge: 'Sem 1 - Sem 8',
    },
    {
      title: 'Distinct Courses',
      value: stats?.total_subjects || 0,
      icon: BookOpen,
      color: 'from-amber-600 to-orange-600',
      textColor: 'text-amber-600 dark:text-amber-400',
      badge: 'Syllabus Subjects',
    },
    {
      title: 'Upload Sessions',
      value: stats?.recent_uploads_count || 0,
      icon: UploadCloud,
      color: 'from-rose-600 to-red-600',
      textColor: 'text-rose-600 dark:text-rose-400',
      badge: 'Imported Batches',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-50 via-slate-100 to-purple-50 dark:from-indigo-950/60 dark:via-slate-900 dark:to-purple-950/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white font-heading">
              Centurion University Examination Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              Live Database
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Real-time academic evaluation metrics and semester examination database controls.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => goToTab('upload')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New Results</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="glass-card p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 sm:space-y-4 relative overflow-hidden bg-white/90 dark:bg-slate-900/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2 sm:p-2.5 rounded-xl bg-gradient-to-tr ${card.color} text-white shadow-md`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {card.value.toLocaleString()}
                </span>
                <span className={`text-[10px] sm:text-[11px] font-semibold ${card.textColor} px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800`}>
                  {card.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Branch Distribution Chart */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 bg-white/90 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
                Branch-wise Student Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enrolled student count across academic departments
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.branch_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                <XAxis dataKey="branch_code" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="count" name="Students" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Semester Results Distribution Chart */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 bg-white/90 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
                Semester Result Records Density
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Number of subject grades published per semester
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.semester_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                <XAxis dataKey="semester_name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="count" name="Results" fill="#a855f7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        <button
          onClick={() => goToTab('results')}
          className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-left hover:border-indigo-500/40 transition-all cursor-pointer group bg-white/90 dark:bg-slate-900/50"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
            Manage Student Results
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Search, edit, delete, add individual results, and export CSV.
          </p>
        </button>

        <button
          onClick={() => goToTab('upload')}
          className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-left hover:border-purple-500/40 transition-all cursor-pointer group bg-white/90 dark:bg-slate-900/50"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
            Bulk Upload CSV / Excel
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            2-phase validation, row duplicate check, and instant preview.
          </p>
        </button>

        <button
          onClick={() => goToTab('grades')}
          className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-left hover:border-amber-500/40 transition-all cursor-pointer group bg-white/90 dark:bg-slate-900/50"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
            Dynamic Grade Point Scale
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure letter grade to point mappings for automated SGPA/CGPA.
          </p>
        </button>

      </div>

    </div>
  );
};
