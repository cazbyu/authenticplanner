import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.svg';

// --- Type Definitions ---

/**
 * Defines the shape of the context object passed down to each onboarding step
 * via the <Outlet /> component. This allows child components to trigger navigation.
 */
export interface OnboardingContextType {
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

// --- Constants ---

/**
 * Defines the sequence and metadata for each step in the onboarding process.
 * This serves as the single source of truth for the layout's progress logic.
 */
const ONBOARDING_STEPS = [
  { path: '/onboarding/welcome', label: 'Welcome' },
  { path: '/onboarding/roles', label: 'Roles' },
  { path: '/onboarding/vision', label: 'Vision' },
  { path: '/onboarding/goals', label: 'Goals' },
  { path: '/onboarding/tasks', label: 'Tasks' },
  { path: '/onboarding/complete', label: 'Complete' },
];

/**
 * OnboardingLayout provides the consistent UI shell for the multi-step user onboarding process.
 * It includes the header, a dynamic progress bar, and renders the current step's content
 * via a React Router Outlet.
 */
const OnboardingLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Effect to synchronize the current step index with the URL path.
  // This ensures the progress bar is accurate even on page refresh.
  useEffect(() => {
    const index = ONBOARDING_STEPS.findIndex(step => step.path === location.pathname);
    if (index !== -1) {
      setCurrentStepIndex(index);
    }
  }, [location.pathname]);

  const goToNextStep = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      const nextStep = ONBOARDING_STEPS[currentStepIndex + 1];
      navigate(nextStep.path);
    }
  };
  
  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      const previousStep = ONBOARDING_STEPS[currentStepIndex - 1];
      navigate(previousStep.path);
    }
  };

  // Calculate the progress percentage for the visual progress bar.
  const progressPercentage = ((currentStepIndex) / (ONBOARDING_STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={logo} alt="Authentic Planner" className="h-8 w-8" />
              <h1 className="text-xl font-bold text-gray-900">Authentic Planner Setup</h1>
            </div>
            <div className="text-sm font-medium text-gray-500">
              {user?.email}
            </div>
          </div>
        </div>
      </header>
      
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 min-h-[calc(100vh-120px)]">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
            </span>
            <span className="text-sm font-medium text-primary-600">
              {ONBOARDING_STEPS[currentStepIndex].label}
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
            <motion.div 
              className="h-2 rounded-full bg-primary-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>
        
        {/* Content area for the current step */}
        <div className="rounded-lg bg-white p-6 shadow sm:p-8 mb-8">
          {/* Child routes (e.g., OnboardingWelcome) are rendered here */}
          <Outlet context={{ goToNextStep, goToPreviousStep }} />
        </div>
      </main>
    </div>
  );
};

export default OnboardingLayout;
