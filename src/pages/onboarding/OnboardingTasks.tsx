import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';

interface OnboardingContextType {
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

const OnboardingTasks: React.FC = () => {
  const { goToNextStep, goToPreviousStep } = useOutletContext<OnboardingContextType>();
  const [goals, setGoals] = useState<string[]>(['']);

  const handleGoalChange = (index: number, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
  };

  const addGoal = () => {
    setGoals([...goals, '']);
  };

  const removeGoal = (index: number) => {
    if (goals.length > 1) {
      const newGoals = goals.filter((_, i) => i !== index);
      setGoals(newGoals);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save 12-week goals to localStorage or API
    const validGoals = goals.filter(goal => goal.trim());
    localStorage.setItem('onboarding_12week_goals', JSON.stringify(validGoals));
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
      <h2 className="text-xl font-bold text-gray-900">84 Days of Action & 7 Days of Reflection</h2>
      <p className="mt-2 text-sm text-gray-600">
        12 week goals allow us to see progress while maintaining focus. What will you <strong>achieve</strong> in the next 12 weeks?
      </p>
      
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="space-y-4">
          {goals.map((goal, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="flex-1">
                <textarea
                  value={goal}
                  onChange={(e) => handleGoalChange(index, e.target.value)}
                  placeholder="In 12 weeks I will..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                  rows={2}
                />
              </div>
              
              {index === goals.length - 1 ? (
                <button
                  type="button"
                  onClick={addGoal}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-500 text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  title="Add another goal"
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => removeGoal(index)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Remove this goal"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Single Navigation Row - Centered Continue button between Back and Skip */}
        <div className="mt-8 flex items-center justify-center">
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

export default OnboardingTasks;