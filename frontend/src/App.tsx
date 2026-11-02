import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { DocumentLibraryPage } from './pages/DocumentLibraryPage';
import { ResearchWorkspacePage } from './pages/ResearchWorkspacePage';
import { ComparisonPage } from './pages/ComparisonPage';
import { ReportsPage } from './pages/ReportsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-mono-offwhite">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded bg-mono-deepblack flex items-center justify-center text-mono-white font-mono font-bold text-sm shadow-subtle animate-pulse">
            IR
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-mono-medium">
            Loading IntelliResearch Environment...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Unauthenticated Route */}
          <Route path="/login" element={<AuthPage />} />

          {/* Protected Desktop Research Application Shell */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/workspaces" element={<WorkspacesPage />} />
            <Route path="/workspace/:id" element={<ResearchWorkspacePage />} />
            <Route path="/documents" element={<DocumentLibraryPage />} />
            <Route path="/comparisons" element={<ComparisonPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
