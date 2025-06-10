import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import TaskForm from '../components/tasks/TaskForm';
import { format, differenceInDays, addWeeks, parseISO, differenceInWeeks, startOfWeek, endOfWeek } from 'date-fns';

// ---- Use ONE of the following for Supabase. ----

// If you use a shared supabase client in your project (most common):
import { supabase } from '../supabaseClient';

// // Or, if you don't have a shared client, use this (commented out):
// import { createClient } from '@supabase/supabase-js';
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface WeekBoxProps {
  weekNumber: number;
  startDate: Date;
  isActive?: boolean;
  isCurrent?: boolean;
  onClick: () => void;
}

interface CycleData {
  reflection_end: string;
  cycle_label: string;
  title?: string;
  start_date?: string;
}

interface WeeklyGoal {
  id: string;
  goal_text: string;
  week_number: number;
}

const WeekBox: React.FC<WeekBoxProps> = ({ weekNumber, startDate, isActive, isCurrent, onClick }) => (
  <button
    onClick={onClick}
    className={`
      h-28 w-full rounded-lg border-2 transition-colors
      ${isCurrent && !isActive
        ? 'border-blue-400 bg-blue-100 text-blue-800 ring-2 ring-blue-200' 
        : isActive 
        ? 'border-primary-500 bg-primary-50 text-primary-700' 
        : 'border-gray-200 bg-white hover:bg-gray-50'
      }
    `}
  >
    <div className="flex h-full flex-col items-center justify-center">
      <span className="text-sm font-medium text-gray-600">Week</span>
      <span className="text-xl font-bold">{weekNumber}</span>
      <span className="text-xs text-gray-500 mt-1">
        ({format(startDate, 'dd MMM')})
      </span>
      {isCurrent && (
        <span className="text-xs font-medium text-blue-600 mt-1">Current</span>
      )}
    </div>
  </button>
);

const TwelveWeekCycle: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [quarterlyGoal, setQuarterlyGoal] = useState('');
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newGoalText, setNewGoalText] = useState('');
  const [addingGoal, setAddingGoal] = useState(false);

  useEffect(() => {
    const fetchCycleData = async () => {
      const { data, error } = await supabase
        .from('0007-ap-global-cycles')
        .select('reflection_end, cycle_label, title, start_date')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching cycle data:', error);
        return;
      }

      setCycleData(data);
      setLoading(false);
    };

    fetchCycleData();
  }, []);

  // Calculate remaining days using the exact reflection_end date
  const calculateRemainingDays = (endDateString?: string) => {
    if (!endDateString) return 0;
    
    // Parse the date string and ensure we're using the exact date from the database
    const endDate = parseISO(endDateString);
    const today = new Date();
    
    // Set both dates to start of day for accurate day calculation
    const endDateStartOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const remainingDays = differenceInDays(endDateStartOfDay, todayStartOfDay);
    return Math.max(0, remainingDays); // Don't show negative days
  };

  // Format cycle end date using the exact reflection_end date
  const formatCycleEndDate = (dateString?: string) => {
    if (!dateString) return 'Invalid date';
    
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      // Use the exact date from the database
      return format(date, 'dd MMM yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Calculate cycle start date and week start dates
  const getCycleStartDate = () => {
    if (cycleData?.start_date) {
      return parseISO(cycleData.start_date);
    }
    
    // Fallback: calculate from reflection_end date (13 weeks back)
    if (cycleData?.reflection_end) {
      const reflectionEndDate = parseISO(cycleData.reflection_end);
      return addWeeks(reflectionEndDate, -13);
    }
    
    // Default fallback
    return new Date();
  };

  const cycleStartDate = getCycleStartDate();
  // Use the exact reflection_end date from the database
  const cycleEndDate = cycleData ? parseISO(cycleData.reflection_end) : new Date();

  // Calculate progress percentage
  const today = new Date();
  const totalDays = (cycleEndDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysElapsed = (today.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const progressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  const remainingDays = calculateRemainingDays(cycleData?.reflection_end);

  // Get current cycle name - use title if available, otherwise cycle_label
  const currentCycleName = cycleData?.title || cycleData?.cycle_label || '2025 Cycle #2';

  // Generate week start dates
  const getWeekStartDates = () => {
    const weekDates = [];
    for (let i = 0; i < 12; i++) {
      weekDates.push(addWeeks(cycleStartDate, i));
    }
    return weekDates;
  };

  const weekStartDates = getWeekStartDates();

  // Calculate current week based on today's date - HARDCODED TO WEEK 11 FOR NOW
  const getCurrentWeek = (): number | null => {
    // HARDCODED: Return week 11 as the current week
    return 11;
    
    // Original logic (commented out):
    /*
    const today = new Date();
    
    // Check if we're in the reflection week (week 13)
    const reflectionWeekStart = addWeeks(cycleStartDate, 12);
    const reflectionWeekEnd = addWeeks(cycleStartDate, 13);
    
    if (today >= reflectionWeekStart && today < reflectionWeekEnd) {
      return 13;
    }
    
    // Check which regular week we're in (weeks 1-12)
    for (let i = 0; i < 12; i++) {
      const weekStart = weekStartDates[i];
      const weekEnd = addWeeks(weekStart, 1);
      
      if (today >= weekStart && today < weekEnd) {
        return i + 1;
      }
    }
    
    // If we're before the cycle starts or after it ends
    return null;
    */
  };

  const currentWeek = getCurrentWeek();

  // Set default selected week to current week if not already set
  useEffect(() => {
    if (selectedWeek === null && currentWeek !== null) {
      setSelectedWeek(currentWeek);
    }
  }, [currentWeek, selectedWeek]);

  const handleWeekSelect = (weekNum: number) => {
    setSelectedWeek(weekNum);
  };

  const handleAddTask = () => {
    setShowTaskForm(true);
  };

  const handleTaskSave = (taskData: any) => {
    console.log('Task saved:', taskData);
    setShowTaskForm(false);
  };

  const handleAddWeeklyGoal = async () => {
    if (!newGoalText.trim() || !selectedWeek) return;
    
    setAddingGoal(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('0007-ap-goals_12wk_weeks')
          .insert([{
            goal_id: 'temp-goal-id', // This would be the actual 12-week goal ID
            week_number: selectedWeek,
            title: newGoalText.trim(),
            notes: '',
          }])
          .select()
          .single();

        if (error) {
          console.error('Error adding weekly goal:', error);
        } else if (data) {
          setWeeklyGoals(prev => [...prev, {
            id: data.id,
            goal_text: data.title,
            week_number: data.week_number
          }]);
          setNewGoalText('');
        }
      }
    } catch (err) {
      console.error('Error adding weekly goal:', err);
    } finally {
      setAddingGoal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Main Title and Cycle Information */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">12 Week Goals</h1>
        <h2 className="text-xl text-gray-700 mb-2">{currentCycleName}</h2>
        <p className="text-lg text-gray-600">
          {remainingDays > 0 ? (
            <span className="font-medium text-primary-600">{remainingDays} days remain in the current cycle</span>
          ) : (
            <span className="font-medium text-red-600">Current cycle has ended</span>
          )}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
          <span>Cycle Progress</span>
          <span>Ends {cycleData ? formatCycleEndDate(cycleData.reflection_end) : ''}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div 
            className="h-2 rounded-full bg-primary-500 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column - Main Content (3/4 width) */}
        <div className="lg:col-span-3 space-y-8">
          {/* Goal Section */}
          <div>
            <div className="mb-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Current 12-Week Goal:</h3>
                <button
                  className="flex items-center rounded-md bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Cycle Goal
                </button>
              </div>
              <input
                type="text"
                value={quarterlyGoal}
                onChange={(e) => setQuarterlyGoal(e.target.value)}
                placeholder="Enter your 12-week goal here..."
                className="w-full rounded-lg border border-gray-300 p-3 text-lg"
              />
              <div className="mt-2 text-sm text-gray-600">
                12 Week Goal Score: XX/XX (XXX%)
              </div>
            </div>
          </div>

          {/* Week Grid */}
          <div>
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {Array.from({ length: 12 }, (_, i) => (
                <WeekBox
                  key={i + 1}
                  weekNumber={i + 1}
                  startDate={weekStartDates[i]}
                  isActive={selectedWeek === i + 1}
                  isCurrent={currentWeek === i + 1}
                  onClick={() => handleWeekSelect(i + 1)}
                />
              ))}
            </div>

            {/* Reflection Week */}
            <button 
              onClick={() => handleWeekSelect(13)}
              className={`
                w-full rounded-lg border-2 p-4 text-center transition-colors mb-6
                ${currentWeek === 13 && selectedWeek !== 13
                  ? 'border-blue-400 bg-blue-100 text-blue-800 ring-2 ring-blue-200'
                  : selectedWeek === 13
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
                }
              `}
            >
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold">Week 13 (Reflection Week)</span>
                <span className="text-sm text-gray-500 mt-1">
                  ({format(addWeeks(cycleStartDate, 12), 'dd MMM')})
                </span>
                {currentWeek === 13 && (
                  <span className="text-sm font-medium text-blue-600 mt-1">Current</span>
                )}
              </div>
            </button>
          </div>

          {/* Selected Week Tasks */}
          {selectedWeek && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Tasks (Week {selectedWeek} Goals)</h3>
                <button
                  onClick={handleAddTask}
                  className="flex items-center rounded-md bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Task
                </button>
              </div>

              {/* Task Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="w-16 px-3 py-2 text-left text-xs font-medium text-gray-500">Pr</th>
                      <th className="w-20 px-2 py-2 text-center text-xs font-medium text-gray-500">Complete</th>
                      <th className="w-20 px-2 py-2 text-center text-xs font-medium text-gray-500">Delegate</th>
                      <th className="w-20 px-2 py-2 text-center text-xs font-medium text-gray-500">Follow Up</th>
                      <th className="w-20 px-2 py-2 text-center text-xs font-medium text-gray-500">Cancel</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Task Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            className="w-12 rounded border border-gray-300 px-2 py-1 text-sm"
                            placeholder="A1"
                          />
                        </td>
                        {['Complete', 'Delegate', 'Follow Up', 'Cancel'].map((action) => (
                          <td key={action} className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              className="h-5 w-5 cursor-pointer rounded-full border-2 border-gray-300 checked:border-primary-500 checked:bg-primary-500"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            placeholder="Enter task description"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Weekly Goals Sidebar (1/4 width) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Goals</h3>
              <button
                onClick={() => setNewGoalText('')}
                className="flex items-center text-sm text-primary-600 hover:text-primary-700"
              >
                <Plus className="h-4 w-4 mr-1" />
              </button>
            </div>

            {/* Current Week Goals Header */}
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-800 mb-2">
                Week {selectedWeek || currentWeek || 11} Goals:
              </h4>
              
              {/* Existing goals for this week */}
              <div className="space-y-2 mb-3">
                {weeklyGoals
                  .filter(goal => goal.week_number === (selectedWeek || currentWeek))
                  .map((goal, index) => (
                    <div key={goal.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <span className="text-sm">{goal.goal_text}</span>
                      <button className="text-xs text-red-600 hover:text-red-700">×</button>
                    </div>
                  ))}
              </div>

              {/* Add new goal input */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  placeholder="Enter a goal for this week..."
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddWeeklyGoal();
                    }
                  }}
                />
                <button
                  onClick={handleAddWeeklyGoal}
                  disabled={!newGoalText.trim() || addingGoal}
                  className="w-full px-3 py-2 bg-primary-500 text-white rounded-md text-sm hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingGoal ? 'Adding...' : 'Add Goal'}
                </button>
              </div>

              <div className="mt-3">
                <div className="text-sm text-gray-600">
                  Weekly Goal Score: XX/XX (XXX%)
                </div>
              </div>
            </div>

            {/* Quick Week Navigation */}
            <div className="border-t border-gray-200 pt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Quick Week Navigation</h5>
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 12 }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => handleWeekSelect(i + 1)}
                    className={`
                      text-xs py-1 px-2 rounded transition-colors
                      ${selectedWeek === i + 1
                        ? 'bg-primary-500 text-white'
                        : currentWeek === i + 1
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    W{i + 1}
                  </button>
                ))}
                <button
                  onClick={() => handleWeekSelect(13)}
                  className={`
                    text-xs py-1 px-2 rounded transition-colors col-span-2
                    ${selectedWeek === 13
                      ? 'bg-primary-500 text-white'
                      : currentWeek === 13
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  Reflect
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl">
            <TaskForm
              onSave={handleTaskSave}
              onDelete={() => setShowTaskForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TwelveWeekCycle;