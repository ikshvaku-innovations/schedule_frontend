import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfDashboardPage from './pages/ProfDashboardPage';
import ReportPage from './pages/ReportPage';


function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-state" style={{ height: '100vh' }}>
        <div className="spinner large"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function ProfProtectedRoute({ children }: { children: ReactNode }) {
  const profSession = localStorage.getItem('prof_session');
  if (!profSession) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profdashboard"
        element={
          <ProfProtectedRoute>
            <ProfDashboardPage />
          </ProfProtectedRoute>
        }
      />
      <Route
        path="/report/:jobId/:userId"
        element={<ReportPage />}
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
