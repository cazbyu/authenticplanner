import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { CheckCircle } from 'lucide-react';

// Layouts
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const OnboardingLayout = lazy(() => import('./layouts/OnboardingLayout'));

// --- Page Components (Lazy Loaded) ---
// Main App Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AuthenticCalendar = lazy(() => import('./pages/AuthenticCalendar'));
const TwelveWeekCycle = lazy(() => import('./pages/TwelveWeekCycle'));
const RoleBankPage = lazy(() => import('./pages/RoleBank'));
const DomainDashboard = lazy(() => import('./pages/DomainDashboard'));
const DomainDetail = lazy(() => import('./pages/DomainDetail'));
const NotesFollowUp = lazy(() => import('./pages/NotesFollowUp')); // Placeholder for Reflections
const FullScorecard = lazy(() => import('./pages/FullScorecard'));
const Settings = lazy(() => import('./pages/Settings'));

// Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const PaymentCheck = lazy(() => import('./pages/auth/PaymentCheck'));

// Onboarding Pages
const OnboardingWelcome = lazy(() => import('./pages/onboarding/OnboardingWelcome'));
const OnboardingRoles = lazy(() => import('./pages/onboarding/OnboardingRoles'));
const OnboardingVision = lazy(() => import('./pages/onboarding/OnboardingVision'));
const OnboardingGoals = lazy(() => import('./pages/onboarding/OnboardingGoals'));
const OnboardingTasks = lazy(() => import('./pages/onboarding/OnboardingTasks'));
const OnboardingComplete = lazy(() => import('./pages/onboarding/OnboardingComplete'));


// --- Reusable Components ---

/**
 * A full-screen loading component displayed while lazy-loaded components are fetched.
 */
const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white">
    <div className="flex flex-col items-center">
      <div className="animate-pulse-slow">
        <CheckCircle className="h-16 w-16 text-primary-500" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-gray-800">
        Loading your authentic journey...
      </h2>
    </div>
  </div>
);

/**
 * This component protects routes that require a user to be authenticated.
 * It also handles redirecting users to the appropriate place based on their
 * onboarding status.
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If the user is authenticated but hasn't completed onboarding, redirect them.
  if (user && !user.onboardingComplete) {
    return <Navigate to="/onboarding/welcome" replace />;
  }

  return <>{children}</>;
};

/**
 * This component specifically protects the onboarding flow.
 * It ensures an authenticated user can access it, but redirects them
 * to the main dashboard if they have already completed onboarding.
 */
const OnboardingRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, user, isLoading } = useAuth();
  
    if (isLoading) {
      return <LoadingScreen />;
    }
  
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
  
    // If the user has already completed onboarding, don't let them go back.
    if (user && user.onboardingComplete) {
      return <Navigate to="/dashboard" replace />;
    }
  
    return <>{children}</>;
  };


function App() {
  return (
    // Suspense is required by React to show a fallback (LoadingScreen) while
    // lazy-loaded components are being fetched.
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* --- Public Routes --- */}
        {/* Routes accessible to everyone, like login and payment pages. */}
        <Route path="/login" element={<Login />} />
        <Route path="/payment-check" element={<PaymentCheck />} />

        {/* --- Onboarding Routes --- */}
        {/* A protected route that guides new users through setup. */}
        <Route
          path="/onboarding"
          element={<OnboardingRoute><OnboardingLayout /></OnboardingRoute>}
        >
          <Route path="welcome" element={<OnboardingWelcome />} />
          <Route path="roles" element={<OnboardingRoles />} />
          <Route path="vision" element={<OnboardingVision />} />
          <Route path="goals" element={<OnboardingGoals />} />
          <Route path="tasks" element={<OnboardingTasks />} />
          <Route path="complete" element={<OnboardingComplete />} />
        </Route>

        {/* --- Main Application Routes --- */}
        {/* The core of the app, protected and using the MainLayout. */}
        <Route
          path="/"
          element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="calendar" element={<AuthenticCalendar />} />
          <Route path="twelve-week-cycle" element={<TwelveWeekCycle />} />
          <Route path="role-bank" element={<RoleBankPage />} />
          <Route path="domains" element={<DomainDashboard />} />
          <Route path="domains/:domainId" element={<DomainDetail />} />
          <Route path="reflections" element={<NotesFollowUp />} />
          <Route path="scorecard" element={<FullScorecard />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* --- Fallback Route --- */}
        {/* Redirects any unknown URL to the dashboard. */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
