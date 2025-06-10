import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, Star, Users, Target } from 'lucide-react';

interface OnboardingContextType {
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

const OnboardingWelcome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { goToNextStep } = useOutletContext<OnboardingContextType>();
  
  return (
    <div className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
          <CheckCircle className="h-10 w-10 text-primary-600" />
        </div>
        
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Welcome to Your Authentic Journey</h1>
        
        <div className="mt-6 rounded-lg bg-primary-50 p-6 text-left">
          <p className="text-gray-700 leading-relaxed">
            The Authentic Planner is designed as a <strong>role-based, balance-focused, goal-driven system</strong> to help you intentionally invest your time, energy, and resources where they matter most— let's get started!
          </p>
        </div>
        
        <div className="mt-8 space-y-4 text-left">
          <div className="flex items-start">
            <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary-100">
              <Users className="h-5 w-5 text-secondary-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Role-Based Living</h3>
              <p className="mt-1 text-sm text-gray-600">
                Define your life roles and align your actions to what matters most in each area of your authentic self.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent-100">
              <Star className="h-5 w-5 text-accent-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Balance-Focused Wellness</h3>
              <p className="mt-1 text-sm text-gray-600">
                Track your activities across 8 domains: Physical, Emotional, Intellectual, Spiritual, Financial, Social, Recreational, and Community.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-success-100">
              <Target className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Goal-Driven Strategic Rhythms</h3>
              <p className="mt-1 text-sm text-gray-600">
                From 5-year vision to daily execution, organize your life in meaningful cycles that drive intentional progress.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <button
            onClick={goToNextStep}
            className="w-full rounded-md bg-primary-500 py-3 px-4 text-center text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Begin Your Authentic Journey
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingWelcome;