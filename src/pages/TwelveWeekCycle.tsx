import React, { useState, useEffect } from 'react';
import { Plus, Target, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import TaskForm from '../components/tasks/TaskForm';
import TwelveWeekGoalForm from '../components/goals/TwelveWeekGoalForm';
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
      h-20 w-full rounded-lg border-2 transition-colors
      ${isCurrent && !isActive
        ? 'border-blue-400 bg-blue-100 text-blue-800 ring-2 ring-blue-200' 
        : isActive 
        ? 'border-primary-500 bg-primary-50 text-primary-700' 
        : 'border-gray-200 bg-white hover:bg-gray-50'
      }
    `}
  >
    <div className="flex h-full flex-col items-center justify-center">
      <span className="text-xs font-medium text-gray-600">Week</span>
      <span className="text-lg font-bold">{weekNumber}</span>
      <span className="text-xs text-gray-500">
        ({format(startDate, 'dd MMM')})
      </span>
      {isCurrent && (
        <span className="text-xs font-medium text-blue-600">Current</span>
      )}
    </div>
  </button>
);

const TwelveWeekCycle: React.FC = () => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [twelveWeekGoals, setTwelveWeekGoals] = useState<TwelveWeekGoal[]>([]);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [selectedWeekByGoal, setSelectedWeekByGoal] = useState<Record<string, number>>({});
  const [newGoalTextByGoal, setNewGoalTextByGoal] = useState<Record<string, string>>({});
  const [addingGoalByGoal, setAddingGoalByGoal] = useState<Record<string, boolean>>({});

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

      // Set default selected week to current week (11) for each goal
      const defaultWeekSelection: Record<string, number> = {};
      transformedGoals.forEach(goal => {
        defaultWeekSelection[goal.id] = 11; // Current week
      });
      setSelectedWeekByGoal(defaultWeekSelection);

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

  const handleWeekSelect = (goalId: string, weekNum: number) => {
    setSelectedWeekByGoal(prev => ({
      ...prev,
      [goalId]: weekNum
    }));
  };

  const handleToggleGoalExpand = (goalId: string) => {
    setExpandedGoal(expandedGoal === goalId ? null : goalId);
  };

  const handleGoalCreated = () => {
    setShowGoalForm(false);
    fetchTwelveWeekGoals(); // Refresh the goals list
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

  const handleAddWeeklyGoal = async (goalId: string) => {
    const goalText = newGoalTextByGoal[goalId];
    const selectedWeek = selectedWeekByGoal[goalId];
    
    if (!goalText?.trim() || !selectedWeek) return;
    
    setAddingGoalByGoal(prev => ({ ...prev, [goalId]: true }));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('0007-ap-goal_weekly_goals')
          .insert([{
            goal_id: goalId,
            week_number: selectedWeek,
            title: goalText.trim(),
            description: '',
          }])
          .select()
          .single();

        if (error) {
          console.error('Error adding weekly goal:', error);
        } else if (data) {
          // Clear the input for this goal
          setNewGoalTextByGoal(prev => ({ ...prev, [goalId]: '' }));
          // TODO: Refresh weekly goals for this specific goal
        }
      }
    } catch (err) {
      console.error('Error adding weekly goal:', err);
    } finally {
      setAddingGoalByGoal(prev => ({ ...prev, [goalId]: false }));
    }
  };

  const handleTaskSave = (taskData: any) => {
    console.log('Task saved:', taskData);
    setShowTaskForm(false);
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

        {/* Goals List with Nested Weekly View */}
        <div className="space-y-4">
          {twelveWeekGoals.length > 0 ? (
            twelveWeekGoals.map(goal => (
              <div key={goal.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                {/* Goal Header - Always Visible */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{goal.title}</h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800`}>
                          {goal.status}
                        </span>
                      </div>
                      
                      {goal.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{goal.description}</p>
                      )}

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{goal.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Domains and Roles */}
                      <div className="space-y-2">
                        {goal.domains.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-gray-500 mr-1">Domains:</span>
                            {goal.domains.slice(0, 3).map(domain => (
                              <span key={domain.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {domain.name}
                              </span>
                            ))}
                            {goal.domains.length > 3 && (
                              <span className="text-xs text-gray-500">+{goal.domains.length - 3} more</span>
                            )}
                          </div>
                        )}

                        {goal.roles.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-gray-500 mr-1">Roles:</span>
                            {goal.roles.slice(0, 2).map(role => (
                              <span key={role.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
                                {role.label}
                              </span>
                            ))}
                            {goal.roles.length > 2 && (
                              <span className="text-xs text-gray-500">+{goal.roles.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quick Stats */}
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {goal.weeklyGoals.length} weekly goals
                        </span>
                        <span className="flex items-center">
                          <Target className="h-4 w-4 mr-1" />
                          {goal.tasks.length} tasks
                        </span>
                        <span className="text-xs">
                          Created {format(new Date(goal.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleToggleGoalExpand(goal.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        title={expandedGoal === goal.id ? 'Collapse' : 'Expand'}
                      >
                        {expandedGoal === goal.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content - Weekly View, Goals, and Tasks */}
                {expandedGoal === goal.id && (
                  <div className="border-t border-gray-200 p-4 space-y-6">
                    {/* Weekly View Grid */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Calendar className="h-5 w-5 mr-2" />
                        Weekly View
                      </h4>
                      
                      {/* Week Grid */}
                      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                        {Array.from({ length: 12 }, (_, i) => (
                          <WeekBox
                            key={i + 1}
                            weekNumber={i + 1}
                            startDate={weekStartDates[i]}
                            isActive={selectedWeekByGoal[goal.id] === i + 1}
                            isCurrent={currentWeek === i + 1}
                            onClick={() => handleWeekSelect(goal.id, i + 1)}
                          />
                        ))}
                      </div>

                      {/* Reflection Week */}
                      <button 
                        onClick={() => handleWeekSelect(goal.id, 13)}
                        className={`
                          w-full rounded-lg border-2 p-3 text-center transition-colors mb-6
                          ${currentWeek === 13 && selectedWeekByGoal[goal.id] !== 13
                            ? 'border-blue-400 bg-blue-100 text-blue-800 ring-2 ring-blue-200'
                            : selectedWeekByGoal[goal.id] === 13
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-md font-bold">Week 13 (Reflection Week)</span>
                          <span className="text-sm text-gray-500 mt-1">
                            ({format(addWeeks(cycleStartDate, 12), 'dd MMM')})
                          </span>
                          {currentWeek === 13 && (
                            <span className="text-sm font-medium text-blue-600 mt-1">Current</span>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Weekly Goals Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">
                          Week {selectedWeekByGoal[goal.id] || currentWeek || 11} Goals
                        </h4>
                        <button
                          onClick={() => setNewGoalTextByGoal(prev => ({ ...prev, [goal.id]: '' }))}
                          className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Goal
                        </button>
                      </div>

                      {/* Add new goal input */}
                      <div className="space-y-3 mb-4">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={newGoalTextByGoal[goal.id] || ''}
                            onChange={(e) => setNewGoalTextByGoal(prev => ({ ...prev, [goal.id]: e.target.value }))}
                            placeholder={`Enter a goal for week ${selectedWeekByGoal[goal.id] || currentWeek || 11}...`}
                            className="flex-1 rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddWeeklyGoal(goal.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddWeeklyGoal(goal.id)}
                            disabled={!newGoalTextByGoal[goal.id]?.trim() || addingGoalByGoal[goal.id]}
                            className="px-4 py-2 bg-primary-500 text-white rounded-md text-sm hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addingGoalByGoal[goal.id] ? 'Adding...' : 'Add'}
                          </button>
                        </div>

                        <div className="text-sm text-gray-600">
                          Weekly Goal Score: XX/XX (XXX%)
                        </div>
                      </div>
                    </div>

                    {/* Weekly Tasks Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">
                          Week {selectedWeekByGoal[goal.id] || currentWeek || 11} Tasks
                        </h4>
                        <button
                          onClick={() => setShowTaskForm(true)}
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
                            {Array.from({ length: 8 }).map((_, index) => (
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
                                      className="h-4 w-4 cursor-pointer rounded border-2 border-gray-300 checked:border-primary-500 checked:bg-primary-500"
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
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No 12-Week Goals Yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first 12-week goal to start tracking your progress and organizing your weekly goals and tasks.
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