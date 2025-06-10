import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface OnboardingContextType {
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

const OnboardingGoals: React.FC = () => {
  const { goToNextStep, goToPreviousStep } = useOutletContext<OnboardingContextType>();
  const [goals, setGoals] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validGoals = goals.filter(goal => goal.trim());
    
    if (validGoals.length > 0) {
      setSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Delete existing one-year goals for this user
          await supabase
            .from('0007-ap-onboarding-goals')
            .delete()
            .eq('user_id', user.id)
            .eq('goal_type', 'one_year');
          
          // Insert new one-year goals
          const goalInserts = validGoals.map(goal => ({
            user_id: user.id,
            goal_text: goal.trim(),
            goal_type: 'one_year'
          }));
          
          const { error } = await supabase
            .from('0007-ap-onboarding-goals')
            .insert(goalInserts);
          
          if (error) {
            console.error('Error saving goals:', error);
          }
        }
      } catch (err) {
        console.error('Error saving goals:', err);
      } finally {
        setSaving(false);
      }
    }
    
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
      <h2 className="text-xl font-bold text-gray-900">365 Sunsets</h2>
      <p className="mt-2 text-sm text-gray-600">
        What improvements would you like to <strong>strive</strong> for in the next year?
      </p>
      
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="space-y-4">
          {goals.map((goal, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="flex-1">
                <textarea
                  value={goal}
                  onChange={(e) => handleGoalChange(index, e.target.value)}
                  placeholder="In 12 months I would like to..."
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
              disabled={saving}
              className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Continue'}
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

export default OnboardingGoals;