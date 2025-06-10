import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.svg'; // This would be your app logo

const onboardingSteps = [
  { path: '/onboarding/welcome', label: 'Welcome' },
  { path: '/onboarding/questions', label: 'Orientation' },
  { path: '/onboarding/roles', label: 'Roles' },
  { path: '/onboarding/vision', label: 'Vision' },
  { path: '/onboarding/goals', label: 'Goals' },
  { path: '/onboarding/tasks', label: 'Tasks' },
  { path: '/onboarding/complete', label: 'Complete' },
];

const OnboardingLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  useEffect(() => {
    const index = onboardingSteps.findIndex(step => step.path === location.pathname);
    if (index !== -1) {
      setCurrentStepIndex(index);
    }
  }, [location.pathname]);
  
  const goToNextStep = () => {
    if (currentStepIndex < onboardingSteps.length - 1) {
      navigate(onboardingSteps[currentStepIndex + 1].path);
    }
  };
  
  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      navigate(onboardingSteps[currentStepIndex - 1].path);
    }
  };
  
  const progressPercentage = ((currentStepIndex) / (onboardingSteps.length - 1)) * 100;
  
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === onboardingSteps.length - 1;
  
  // Don't show navigation on the final completion screen OR the first welcome screen
  const showNavigation = currentStepIndex !== onboardingSteps.length - 1 && currentStepIndex !== 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={logo} alt="Authentic Planner" className="h-8 w-8" />
              <h1 className="text-xl font-bold text-gray-900">Authentic Planner</h1>
            </div>
            <div className="text-sm font-medium text-gray-500">
              {user?.email}
            </div>
          </div>
        </div>
      </header>
      
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Step {currentStepIndex + 1} of {onboardingSteps.length}
            </span>
            <span className="text-sm font-medium text-primary-600">
              {onboardingSteps[currentStepIndex].label}
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
            <motion.div 
              className="h-2 rounded-full bg-primary-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        
        {/* Content area */}
        <div className="rounded-lg bg-white p-6 shadow sm:p-8">
          <Outlet context={{ goToNextStep, goToPreviousStep }} />
        </div>
        
        {/* Navigation buttons - Only show for middle steps (not first or last) */}
        {showNavigation && (
          <div className="mt-8 flex justify-between">
            <button
              onClick={goToPreviousStep}
              disabled={isFirstStep}
              className={`flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                isFirstStep
                  ? 'cursor-not-allowed text-gray-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </button>
            
            <button
              onClick={goToNextStep}
              className="flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              {isLastStep ? (
                <>
                  Complete
                  <Check className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default OnboardingLayout;