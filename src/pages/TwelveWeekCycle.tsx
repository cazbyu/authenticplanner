import React, { useState, useEffect } from 'react';
import { Plus, Target } from 'lucide-react';
import TaskForm from '../components/tasks/TaskForm';
import TwelveWeekGoalForm from '../components/goals/TwelveWeekGoalForm';
import TwelveWeekGoalCard from '../components/goals/TwelveWeekGoalCard';
import { format, differenceInDays, addWeeks, parseISO, differenceInWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '../supabaseClient';

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

interface Role {
  id: string;
  label: string;
  category: string;
}

interface Domain {
  id: string;
  name: string;
}

interface TwelveWeekGoal {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number;
  created_at: string;
  domains: Domain[];
  roles: Role[];
  weeklyGoals: any[];
  tasks: any[];
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
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [quarterlyGoal, setQuarterlyGoal] = useState('');
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newGoalText, setNewGoalText] = useState('');
  const [addingGoal, setAddingGoal] = useState(false);
  const [twelveWeekGoals, setTwelveWeekGoals] = useState<TwelveWeekGoal[]>([]);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchCycleData(),
        fetchTwelveWeekGoals()
      ]);
      setLoading(false);
    };

    fetchData();
  }, []);

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
  };

  const fetchTwelveWeekGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch main goals with their relationships
      const { data: goals, error: goalsError } = await supabase
        .from('0007-ap-goals_12wk_main')
        .select(`
          *,
          goal_domains:0007-ap-goal_domains(
            domain:0007-ap-domains(id, name)
          ),
          goal_roles:0007-ap-goal_roles(
            role:0007-ap-roles(id, label, category)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
        return;
      }

      // Transform the data to match our interface
      const transformedGoals: TwelveWeekGoal[] = (goals || []).map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        progress: goal.progress,
        created_at: goal.created_at,
        domains: goal.goal_domains?.map((gd: any) => gd.domain).filter(Boolean) || [],
        roles: goal.goal_roles?.map((gr: any) => gr.role).filter(Boolean) || [],
        weeklyGoals: [], // TODO: Fetch weekly goals
        tasks: [] // TODO: Fetch associated tasks
      }));

      setTwelveWeekGoals(transformedGoals);
    } catch (error) {
      console.error('Error fetching 12-week goals:', error);
    }
  };

  // Calculate remaining days using the exact reflection_end date
  const calculateRemainingDays = (endDateString?: string) => {
    if (!endDateString) return 0;
    
    const endDate = parseISO(endDateString);
    const today = new Date();
    
    const endDateStartOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const remainingDays = differenceInDays(endDateStartOfDay, todayStartOfDay);
    return Math.max(0, remainingDays);
  };

  // Format cycle end date using the exact reflection_end date
  const formatCycleEndDate = (dateString?: string) => {
    if (!dateString) return 'Invalid date';
    
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
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
    
    if (cycleData?.reflection_end) {
      const reflectionEndDate = parseISO(cycleData.reflection_end);
      return addWeeks(reflectionEndDate, -13);
    }
    
    return new Date();
  };

  const cycleStartDate = getCycleStartDate();
  const cycleEndDate = cycleData ? parseISO(cycleData.reflection_end) : new Date();

  // Calculate progress percentage
  const today = new Date();
  const totalDays = (cycleEndDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysElapsed = (today.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const progressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  const remainingDays = calculateRemainingDays(cycleData?.reflection_end);
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

  // Calculate current week - HARDCODED TO WEEK 11 FOR NOW
  const getCurrentWeek = (): number | null => {
    return 11;
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
            goal_id: 'temp-goal-id',
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

  const handleGoalCreated = () => {
    setShowGoalForm(false);
    fetchTwelveWeekGoals(); // Refresh the goals list
  };

  const handleToggleGoalExpand = (goalId: string) => {
    setExpandedGoal(expandedGoal === goalId ? null : goalId);
  };

  const handleEditGoal = (goal: TwelveWeekGoal) => {
    // TODO: Implement edit functionality
    console.log('Edit goal:', goal);
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('0007-ap-goals_12wk_main')
        .delete()
        .eq('id', goalId);

      if (error) {
        console.error('Error deleting goal:', error);
        return;
      }

      // Refresh the goals list
      fetchTwelveWeekGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleAddWeeklyGoalToGoal = (goalId: string) => {
    // TODO: Implement add weekly goal to specific 12-week goal
    console.log('Add weekly goal to goal:', goalId);
  };

  const handleAddTaskToGoal = (goalId: string) => {
    // TODO: Implement add task to specific 12-week goal
    console.log('Add task to goal:', goalId);
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

      {/* 12-Week Goals Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Target className="h-6 w-6 text-primary-600" />
            <h3 className="text-2xl font-bold text-gray-900">12-Week Goals</h3>
          </div>
          <button
            onClick={() => setShowGoalForm(true)}
            className="flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add 12-Week Goal
          </button>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          {twelveWeekGoals.length > 0 ? (
            twelveWeekGoals.map(goal => (
              <TwelveWeekGoalCard
                key={goal.id}
                goal={goal}
                isExpanded={expandedGoal === goal.id}
                onToggleExpand={() => handleToggleGoalExpand(goal.id)}
                onEdit={handleEditGoal}
                onDelete={handleDeleteGoal}
                onAddWeeklyGoal={handleAddWeeklyGoalToGoal}
                onAddTask={handleAddTaskToGoal}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No 12-Week Goals Yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first 12-week goal to start tracking your progress and organizing your tasks.
              </p>
              <button
                onClick={() => setShowGoalForm(true)}
                className="inline-flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First 12-Week Goal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column - Main Content (3/4 width) */}
        <div className="lg:col-span-3 space-y-8">
          {/* Week Grid */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Weekly View</h3>
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
        </div>

        {/* Right Column - Weekly Goals Sidebar (1/4 width) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-4 space-y-6">
            {/* Weekly Goals Section */}
            <div>
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
            </div>

            {/* Weekly Tasks Section */}
            {selectedWeek && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Weekly Tasks</h3>
                  <button
                    onClick={handleAddTask}
                    className="flex items-center rounded-md bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Task
                  </button>
                </div>

                {/* Task Table - Compact version for sidebar */}
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Pr</th>
                        <th className="px-1 py-1 text-center text-xs font-medium text-gray-500">✓</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Task</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              className="w-8 rounded border border-gray-300 px-1 py-0.5 text-xs"
                              placeholder="A1"
                            />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <input
                              type="checkbox"
                              className="h-3 w-3 cursor-pointer rounded border border-gray-300"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              className="w-full rounded border border-gray-300 px-1 py-0.5 text-xs"
                              placeholder="Task description"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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

      {/* Modals */}
      {showGoalForm && (
        <TwelveWeekGoalForm
          onClose={() => setShowGoalForm(false)}
          onGoalCreated={handleGoalCreated}
        />
      )}

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