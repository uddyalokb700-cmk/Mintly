import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';

// Lazy-loaded pages for optimal bundle splitting and fast initial page loads
const WelcomePage = React.lazy(() => import('./pages/WelcomePage').then(m => ({ default: m.WelcomePage })));
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const OnboardingPage = React.lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const TransactionsPage = React.lazy(() => import('./pages/TransactionsPage').then(m => ({ default: m.TransactionsPage })));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const BudgetSettingsPage = React.lazy(() => import('./pages/BudgetSettingsPage').then(m => ({ default: m.BudgetSettingsPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoadingSpinner: React.FC = () => (
  <div className="min-h-screen bg-[#080B0A] flex flex-col items-center justify-center gap-3">
    <div className="w-9 h-9 rounded-full border-2 border-mint-400 border-t-transparent animate-spin" />
    <span className="text-xs font-mono text-charcoal-400 tracking-wider uppercase">Loading Mintly...</span>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  if (!token) {
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  if (token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoadingSpinner />}>
                <Routes>
                  {/* Public Auth Routes */}
                  <Route
                    path="/welcome"
                    element={
                      <PublicOnlyRoute>
                        <WelcomePage />
                      </PublicOnlyRoute>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <PublicOnlyRoute>
                        <LoginPage />
                      </PublicOnlyRoute>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <PublicOnlyRoute>
                        <RegisterPage />
                      </PublicOnlyRoute>
                    }
                  />
                  <Route
                    path="/forgot-password"
                    element={
                      <PublicOnlyRoute>
                        <ForgotPasswordPage />
                      </PublicOnlyRoute>
                    }
                  />

                  {/* Onboarding Wizard */}
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <OnboardingPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected App Layout */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardPage />} />
                    <Route path="transactions" element={<TransactionsPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="budget" element={<BudgetSettingsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
