import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';

interface OnboardingContextType {
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

const OnboardingVision: React.FC = () => {
  const { goToNextStep, goToPreviousStep } = useOutletContext<OnboardingContextType>();
  const [vision, setVision] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToNextStep();
  };

  const handleSkip = () => {
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
        Imagine who you are after 1,826 sunsets (5 years). Keep it simple, but what does your ideal life look like?
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
        
        {/* Single Navigation Row - Centered Continue button between Back and Skip */}
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center space-x-8">
            <button
              type="button"
              onClick={goToPreviousStep}
              className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
            >
              ← Back
            </button>
            
            <button
              type="submit"
              className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Continue
            </button>
            
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
            >
              Skip for now →
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

export default OnboardingVision;