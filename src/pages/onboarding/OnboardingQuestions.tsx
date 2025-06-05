import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { OnboardingAnswers } from '../../types';

interface OnboardingContextType {
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

const OnboardingQuestions: React.FC = () => {
  const { goToNextStep } = useOutletContext<OnboardingContextType>();
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    whyHere: '',
    areaOfFocus: '',
    currentChallenge: '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAnswers(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real app, save this to your state management or API
    localStorage.setItem('onboarding_answers', JSON.stringify(answers));
    
    goToNextStep();
  };
  
  const isComplete = answers.whyHere && answers.areaOfFocus && answers.currentChallenge;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-xl font-bold text-gray-900">Tell Us About Yourself</h2>
      <p className="mt-2 text-sm text-gray-600">
        Let's start with a few orientation questions to personalize your experience.
      </p>
      
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label htmlFor="whyHere" className="label">
            Why are you here? What brought you to the Authentic Planner?
          </label>
          <textarea
            id="whyHere"
            name="whyHere"
            rows={3}
            value={answers.whyHere}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="I want to bring more intentionality to my daily actions..."
          />
        </div>
        
        <div>
          <label htmlFor="areaOfFocus" className="label">
            Which area of life do you feel needs more attention right now?
          </label>
          <textarea
            id="areaOfFocus"
            name="areaOfFocus"
            rows={3}
            value={answers.areaOfFocus}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="I feel my physical health has been neglected lately..."
          />
        </div>
        
        <div>
          <label htmlFor="currentChallenge" className="label">
            What challenge are you working through right now?
          </label>
          <textarea
            id="currentChallenge"
            name="currentChallenge"
            rows={3}
            value={answers.currentChallenge}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="I'm trying to balance my work responsibilities with family time..."
          />
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            disabled={!isComplete}
            className={`w-full rounded-md py-2 px-4 text-center text-sm font-medium text-white ${
              isComplete
                ? 'bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
                : 'cursor-not-allowed bg-gray-300'
            }`}
          >
            Continue
          </button>
          
          {!isComplete && (
            <p className="mt-2 text-center text-xs text-gray-500">
              Please answer all questions to continue
            </p>
          )}
        </div>
      </form>
    </motion.div>
  );
};

export default OnboardingQuestions;