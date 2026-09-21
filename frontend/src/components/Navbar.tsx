import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Moon, Sun, Shield, Award } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenGradesModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenGradesModal }) => {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, admin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* University Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-3.5 group text-left cursor-pointer focus:outline-none"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
                CUTM
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                PORTAL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Centurion University of Technology and Management
            </p>
          </div>
        </Link>

        {/* Right Navigation & Actions */}
        <div className="flex items-center gap-3">
          
          {/* Grade System Reference Modal Trigger */}
          {onOpenGradesModal && (
            <button
              onClick={onOpenGradesModal}
              className="hidden md:flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Grading System</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            id="theme-toggle-btn"
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* Admin Navigation Button */}
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/admin/dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                isAdminPath
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80'
              }`}
            >
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Admin: {admin?.username || 'Panel'}</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/admin/login')}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
            >
              <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Admin Portal</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
