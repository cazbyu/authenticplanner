import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { CheckCircle } from 'lucide-react';
import './App.css';

// Layouts
import MainLayout from './layouts/MainLayout';
import OnboardingLayout from './layouts/OnboardingLayout';

// Pages
import AuthenticCalendar from './pages/AuthenticCalendar';
import CycleTracker from './pages/CycleTracker';
import TwelveWeekCycle from './pages/TwelveWeekCycle';
import Settings from './pages/Settings';
import Login from './pages/auth/Login';
import PaymentCheck from './pages/auth/PaymentCheck';
import OnboardingWelcome from './pages/onboarding/OnboardingWelcome';
import OnboardingRoles from './pages/onboarding/OnboardingRoles';
import OnboardingVision from './pages/onboarding/OnboardingVision';
import OnboardingGoals from './pages/onboarding/OnboardingGoals';
import OnboardingTasks from './pages/onboarding/OnboardingTasks';
import OnboardingComplete from './pages/onboarding/OnboardingComplete';
import DomainDashboard from './pages/DomainDashboard';
import DomainDetail from './pages/DomainDetail';
import RoleBankPage from './pages/RoleBank';
import FullScorecard from './pages/FullScorecard';

// Loading screen component
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

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login\" replace />;
  }
  
  return <>{children}</>;
};

// Onboarding check component (still defined, but we'll no longer wrap MainLayout with it)
const OnboardingCheck = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (user && !user.onboardingComplete) {
    return <Navigate to="/onboarding/welcome\" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { isLoading } = useAuth();
  const [appReady, setAppReady] = useState(false);
  
  useEffect(() => {
    // Simulate loading essential resources
    const timer = setTimeout(() => {
      setAppReady(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading || !appReady) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/payment-check" element={<PaymentCheck />} />
      
      {/* Onboarding routes (still protected, still use OnboardingLayout) */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingLayout />
          </ProtectedRoute>
        }
      >
        <Route path="welcome" element={<OnboardingWelcome />} />
        <Route path="roles" element={<OnboardingRoles />} />
        <Route path="vision" element={<OnboardingVision />} />
        <Route path="goals" element={<OnboardingGoals />} />
        <Route path="tasks" element={<OnboardingTasks />} />
        <Route path="complete" element={<OnboardingComplete />} />
      </Route>
      
      {/* Main app routes - Default to Authentic Calendar */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Default route now goes to calendar */}
        <Route index element={<AuthenticCalendar />} />
        <Route path="calendar" element={<AuthenticCalendar />} />
        <Route path="twelve-week-cycle" element={<TwelveWeekCycle />} />
        <Route path="role-bank" element={<RoleBankPage />} />
        <Route path="domains" element={<DomainDashboard />} />
        <Route path="domains/:domainId" element={<DomainDetail />} />
        <Route path="settings" element={<Settings />} />
        <Route path="scorecard/full" element={<FullScorecard />} />
      </Route>
      
      {/* Redirect any other route to home (which is now calendar) */}
      <Route path="*" element={<Navigate to="/\" replace />} />
    </Routes>
  );
}

export default App;
