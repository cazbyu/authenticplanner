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
        
        <p className="mt-4 text-gray-600">
          Hello{user?.name ? `, ${user.name}` : ''}! We're excited to help you live a more intentional,
          role-based life through structured goal-setting and strategic rhythms.
        </p>
        
        <div className="mt-8 space-y-4 text-left">
          <div className="flex items-start">
            <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary-100">
              <Users className="h-5 w-5 text-secondary-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Role-Based Living</h3>
              <p className="mt-1 text-sm text-gray-600">
                Define your life roles and align your actions to what matters most in each area.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent-100">
              <Star className="h-5 w-5 text-accent-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Wellness Balance</h3>
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
              <h3 className="text-lg font-medium text-gray-900">Strategic Time Rhythms</h3>
              <p className="mt-1 text-sm text-gray-600">
                From 5-year vision to daily execution, organize your life in meaningful cycles.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <button
            onClick={goToNextStep}
            className="w-full rounded-md bg-primary-500 py-2 px-4 text-center text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Let's Begin Your Journey
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingWelcome;