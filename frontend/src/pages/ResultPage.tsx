import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { SemesterResultResponse } from '../types';
import { ResultMarksheet } from '../components/ResultMarksheet';
import { AlertCircle, ArrowLeft, GraduationCap, Search } from 'lucide-react';

export const ResultPage: React.FC = () => {
  const { registrationNumber, semester } = useParams<{
    registrationNumber: string;
    semester: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [resultData, setResultData] = useState<SemesterResultResponse | null>(() => {
    return (location.state as { resultData?: SemesterResultResponse })?.resultData || null;
  });
  const [isLoading, setIsLoading] = useState(!resultData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // If we already have result data for the exact parameters, don't refetch
    if (
      resultData &&
      resultData.student.registration_number.toUpperCase() === registrationNumber?.toUpperCase() &&
      resultData.semester === Number(semester)
    ) {
      return;
    }

    if (!registrationNumber || !semester) {
      setErrorMessage('Missing registration number or semester in URL.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    api.getSemesterResult(registrationNumber.trim().toUpperCase(), Number(semester))
      .then((data) => {
        if (isMounted) {
          setResultData(data);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setErrorMessage(
            err.message || 'Academic result not found for this registration number and semester.'
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [registrationNumber, semester]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <div className="w-6 h-6 border-3 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
              Loading Semester Result
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Reg: {registrationNumber} | Sem: {semester}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !resultData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">
        <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
              Result Not Found
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {errorMessage || 'No examination record was found for the specified student and semester.'}
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search Other Results</span>
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1">
      <ResultMarksheet data={resultData} onBack={handleBack} />
    </div>
  );
};
