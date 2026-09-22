import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, Shield, Award } from 'lucide-react';
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
    <header className="no-print sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
        
        {/* University Brand Area */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 text-left shrink-0">
          {/* Clickable Official CUTM Logo (Opens https://www.cutm.ac.in/ in new tab) */}
          <a
            href="https://www.cutm.ac.in/"
            target="_blank"
            rel="noopener noreferrer"
            title="Visit Centurion University of Technology and Management"
            aria-label="Visit Centurion University of Technology and Management"
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-1 flex items-center justify-center shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden group shrink-0"
          >
            <img
              src="/images/cutm-logo.png"
              alt="CUTM - Centurion University of Technology and Management"
              className="w-full h-full object-contain"
            />
          </a>

          {/* Portal Title & Info (Navigates to Portal Home) */}
          <Link
            to="/"
            className="group text-left cursor-pointer focus:outline-none"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white font-heading group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                CUTM
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                PORTAL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Centurion University of Technology and Management
            </p>
          </Link>
        </div>

        {/* Right Navigation & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
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
            className="p-2 sm:p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shrink-0"
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
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 ${
                isAdminPath
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80'
              }`}
            >
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>
                <span className="hidden xs:inline">Admin: </span>
                {admin?.username || 'Panel'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/admin/login')}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shrink-0"
            >
              <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>
                <span className="inline sm:hidden">Admin</span>
                <span className="hidden sm:inline">Admin Portal</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
