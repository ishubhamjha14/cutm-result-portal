import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { GradeScaleModal } from './components/GradeScaleModal';
import { HomePage } from './pages/HomePage';
import { ResultPage } from './pages/ResultPage';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminLayout } from './pages/admin/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { ResultsManagerPage } from './pages/admin/ResultsManagerPage';
import { UploadResultsPage } from './pages/admin/UploadResultsPage';
import { StudentsManagerPage } from './pages/admin/StudentsManagerPage';
import { GradeConfigPage } from './pages/admin/GradeConfigPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { ProtectedRoute } from './components/ProtectedRoute';

const PublicLayout: React.FC<{
  onOpenGradesModal: () => void;
  children: React.ReactNode;
}> = ({ onOpenGradesModal, children }) => {
  const location = useLocation();
  const isAdminLogin = location.pathname === '/admin/login';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {!isAdminLogin && <Navbar onOpenGradesModal={onOpenGradesModal} />}
      <div className="flex-1 flex flex-col">{children}</div>
      <Footer />
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PublicLayout onOpenGradesModal={() => setIsGradeModalOpen(true)}>
              <HomePage onOpenGradesModal={() => setIsGradeModalOpen(true)} />
            </PublicLayout>
          }
        />
        <Route
          path="/result/:registrationNumber/:semester"
          element={
            <PublicLayout onOpenGradesModal={() => setIsGradeModalOpen(true)}>
              <ResultPage />
            </PublicLayout>
          }
        />
        <Route
          path="/admin/login"
          element={
            <PublicLayout onOpenGradesModal={() => setIsGradeModalOpen(true)}>
              <AdminLogin />
            </PublicLayout>
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="results" element={<ResultsManagerPage />} />
          <Route path="upload" element={<UploadResultsPage />} />
          <Route path="students" element={<StudentsManagerPage />} />
          <Route path="grades" element={<GradeConfigPage />} />
          <Route path="audit" element={<AuditLogsPage />} />
        </Route>

        {/* Fallback to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Grade System Reference Modal */}
      <GradeScaleModal
        isOpen={isGradeModalOpen}
        onClose={() => setIsGradeModalOpen(false)}
      />
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
