import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle } from 'lucide-react';

const OnboardingComplete: React.FC = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  
  const handleComplete = () => {
    // Mark onboarding as complete
    updateUser({ onboardingComplete: true });
    navigate('/');
  };
  
  return (
    <div className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          You're All Set!
        </h1>
        
        <p className="mt-4 text-gray-600">
          Your authentic journey begins now. We've set up your roles, goals, and initial tasks.
          You're ready to start living with intention and purpose.
        </p>
        
        <div className="mt-8 space-y-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="font-medium text-gray-900">What's Next?</h3>
            <ul className="mt-2 space-y-2 text-sm text-gray-600">
              <li>• Review your dashboard for an overview of your journey</li>
              <li>• Check your task list and start your first authentic deposit</li>
              <li>• Track your progress in the weekly scorecard</li>
              <li>• Reflect on your experiences in the journal</li>
            </ul>
          </div>
          
          <button
            onClick={handleComplete}
            className="w-full rounded-md bg-primary-500 py-3 px-4 text-center text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Start Your Journey
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingComplete;