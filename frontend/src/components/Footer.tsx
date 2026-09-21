import React from 'react';
import { Heart, Mail, Sparkles, GraduationCap } from 'lucide-react';

const LinkedInIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

const GitHubIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 py-10 px-4 sm:px-6 lg:px-8 mt-auto transition-colors duration-200">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center space-y-6">
        
        {/* Creator Attribution */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="text-rose-500 animate-pulse inline-flex items-center">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            </span>
            <span>Made with</span>
            <span className="text-rose-500 animate-pulse inline-flex items-center">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            </span>
            <span>by</span>
          </div>
          
          <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white font-heading bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            SHUBHAM KUMAR JHA
          </h3>
        </div>

        {/* Email Link */}
        <div className="flex items-center justify-center">
          <a
            href="mailto:240101370019@centurionuniv.edu.in"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs sm:text-sm font-mono transition-all duration-200 shadow-sm group break-all"
            title="Send email to Shubham Kumar Jha"
          >
            <span className="p-1 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Mail className="w-3.5 h-3.5" />
            </span>
            <span className="break-all font-medium">240101370019@centurionuniv.edu.in</span>
          </a>
        </div>

        {/* Clickable Social Icons */}
        <div className="flex items-center justify-center gap-4 pt-1">
          {/* LinkedIn Icon */}
          <a
            href="https://www.linkedin.com/in/shubham-kumar-jha-97b9b5328?utm_source=share_via&utm_content=profile&utm_medium=member_android"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-slate-700 dark:text-slate-300 hover:text-[#0A66C2] transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-blue-500/10 hover:-translate-y-0.5 cursor-pointer"
            aria-label="LinkedIn Profile"
            title="LinkedIn"
          >
            <LinkedInIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
          </a>

          {/* GitHub Icon */}
          <a
            href="https://github.com/ishubhamjha14"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-purple-500/10 hover:-translate-y-0.5 cursor-pointer"
            aria-label="GitHub Profile"
            title="GitHub"
          >
            <GitHubIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
          </a>
        </div>

        {/* Subtle Bottom Note */}
        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 w-full flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Centurion University of Technology and Management</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>CUTM Result Portal • End Semester Examination System</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
