import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';

interface OnboardingContextType {
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

const OnboardingVision: React.FC = () => {
  const { goToNextStep } = useOutletContext<OnboardingContextType>();
  const [vision, setVision] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real app, save this to your state management or API
    localStorage.setItem('onboarding_vision', vision);
    
    goToNextStep();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-xl font-bold text-gray-900">Your Five-Year Vision</h2>
      <p className="mt-2 text-sm text-gray-600">
        Take a moment to envision where you want to be in five years. What does your ideal life look like?
      </p>
      
      <form onSubmit={handleSubmit} className="mt-6">
        <div>
          <label htmlFor="vision" className="label">
            Write your vision statement
          </label>
          <textarea
            id="vision"
            rows={6}
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="In five years, I see myself..."
          />
        </div>
        
        <div className="mt-6">
          <button
            type="submit"
            disabled={!vision.trim()}
            className={`w-full rounded-md py-2 px-4 text-center text-sm font-medium text-white ${
              vision.trim()
                ? 'bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
                : 'cursor-not-allowed bg-gray-300'
            }`}
          >
            Continue
          </button>
          
          {!vision.trim() && (
            <p className="mt-2 text-center text-xs text-gray-500">
              Please write your vision statement to continue
            </p>
          )}
        </div>
      </form>
    </motion.div>
  );
};

export default OnboardingVision;