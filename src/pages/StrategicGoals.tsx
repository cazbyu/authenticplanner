import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Edit3, Plus, Target, Calendar, Eye } from 'lucide-react';

interface OnboardingResponse {
  id: string;
  why_here: string | null;
  area_of_focus: string | null;
  current_challenge: string | null;
  vision_statement: string | null;
  created_at: string;
  updated_at: string;
}

interface OnboardingGoal {
  id: string;
  goal_text: string;
  goal_type: 'one_year' | 'twelve_week';
  created_at: string;
  updated_at: string;
}

const StrategicGoals: React.FC = () => {
  const [onboardingData, setOnboardingData] = useState<OnboardingResponse | null>(null);
  const [oneYearGoals, setOneYearGoals] = useState<OnboardingGoal[]>([]);
  const [twelveWeekGoals, setTwelveWeekGoals] = useState<OnboardingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingVision, setEditingVision] = useState(false);
  const [visionText, setVisionText] = useState('');

  useEffect(() => {
    fetchStrategicGoalsData();
  }, []);

  const fetchStrategicGoalsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // Fetch onboarding responses
      const { data: onboardingRes, error: onboardingError } = await supabase
        .from('0007-ap-onboarding-responses')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (onboardingError && onboardingError.code !== 'PGRST116') {
        console.error('Error fetching onboarding responses:', onboardingError);
      } else if (onboardingRes) {
        setOnboardingData(onboardingRes);
        setVisionText(onboardingRes.vision_statement || '');
      }

      // Fetch onboarding goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('0007-ap-onboarding-goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
      } else if (goalsData) {
        setOneYearGoals(goalsData.filter(goal => goal.goal_type === 'one_year'));
        setTwelveWeekGoals(goalsData.filter(goal => goal.goal_type === 'twelve_week'));
      }

    } catch (err) {
      console.error('Error fetching strategic goals data:', err);
      setError('Failed to load strategic goals data');
    } finally {
      setLoading(false);
    }
  };

  const handleVisionSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('0007-ap-onboarding-responses')
        .upsert({
          user_id: user.id,
          vision_statement: visionText.trim(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating vision:', error);
      } else {
        setEditingVision(false);
        fetchStrategicGoalsData(); // Refresh data
      }
    } catch (err) {
      console.error('Error saving vision:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent align-[-0.125em]"></div>
          <p className="mt-2 text-gray-600">Loading your strategic goals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strategic Goals</h1>
          <p className="mt-1 text-sm text-gray-600">
            Your vision, goals, and strategic direction from onboarding
          </p>
        </div>
      </div>

      {/* Vision Statement Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Five-Year Vision</h2>
          </div>
          <button
            onClick={() => setEditingVision(!editingVision)}
            className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
          >
            <Edit3 className="h-4 w-4" />
            <span>{editingVision ? 'Cancel' : 'Edit'}</span>
          </button>
        </div>

        {editingVision ? (
          <div className="space-y-4">
            <textarea
              value={visionText}
              onChange={(e) => setVisionText(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={4}
              placeholder="In five years, I see myself..."
            />
            <div className="flex space-x-2">
              <button
                onClick={handleVisionSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingVision(false);
                  setVisionText(onboardingData?.vision_statement || '');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            {onboardingData?.vision_statement ? (
              <p className="text-gray-700 leading-relaxed">{onboardingData.vision_statement}</p>
            ) : (
              <p className="text-gray-500 italic">No vision statement set. Complete onboarding to add your vision.</p>
            )}
            {onboardingData?.updated_at && (
              <p className="mt-2 text-xs text-gray-500">
                Last updated: {formatDate(onboardingData.updated_at)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* One-Year Goals Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">365 Sunsets (One-Year Goals)</h2>
          </div>
          <span className="text-sm text-gray-500">{oneYearGoals.length} goals</span>
        </div>

        {oneYearGoals.length > 0 ? (
          <div className="space-y-3">
            {oneYearGoals.map((goal, index) => (
              <div key={goal.id} className="flex items-start space-x-3 p-3 bg-amber-50 rounded-md">
                <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-gray-900">{goal.goal_text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {formatDate(goal.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No one-year goals set. Complete onboarding to add your goals.</p>
        )}
      </div>

      {/* Twelve-Week Goals Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">84 Days of Action (12-Week Goals)</h2>
          </div>
          <span className="text-sm text-gray-500">{twelveWeekGoals.length} goals</span>
        </div>

        {twelveWeekGoals.length > 0 ? (
          <div className="space-y-3">
            {twelveWeekGoals.map((goal, index) => (
              <div key={goal.id} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-md">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-gray-900">{goal.goal_text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {formatDate(goal.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No 12-week goals set. Complete onboarding to add your goals.</p>
        )}
      </div>

      {/* Onboarding Context Section */}
      {onboardingData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Journey Context</h2>
          <div className="space-y-4">
            {onboardingData.why_here && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Why you're here:</h3>
                <p className="text-gray-600 text-sm">{onboardingData.why_here}</p>
              </div>
            )}
            {onboardingData.area_of_focus && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Area of focus:</h3>
                <p className="text-gray-600 text-sm">{onboardingData.area_of_focus}</p>
              </div>
            )}
            {onboardingData.current_challenge && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Current challenge:</h3>
                <p className="text-gray-600 text-sm">{onboardingData.current_challenge}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategicGoals;