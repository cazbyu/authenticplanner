import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Calendar, Target, Users, CheckCircle, X, Clock, AlertTriangle } from 'lucide-react';
import TwelveWeekGoalForm from '../components/goals/TwelveWeekGoalForm';
import TwelveWeekGoalEditForm from '../components/goals/TwelveWeekGoalEditForm';
import WeeklyGoalForm from '../components/goals/WeeklyGoalForm';
import WeeklyGoalEditForm from '../components/goals/WeeklyGoalEditForm';

interface TwelveWeekGoal {
  id: string;
  title: string;
  description?: string;
  status: string;
  progress: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  global_cycle_id: string;
  domains?: Array<{ id: string; name: string; }>;
  roles?: Array<{ id: string; label: string; category?: string; }>;
}

interface WeeklyGoal {
  id: string;
  goal_id: string;
  week_number: number;
  title: string;
  description?: string;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  due_date?: string;
  time?: string;
  status: string;
  is_urgent: boolean;
  is_important: boolean;
  is_authentic_deposit: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  roles?: Array<{ id: string; label: string; category?: string; }>;
  domains?: Array<{ id: string; name: string; }>;
}

interface GlobalCycle {
  id: string;
  title?: string;
  cycle_label?: string;
  start_date?: string;
  end_date?: string;
  reflection_start?: string;
  reflection_end?: string;
  is_active?: boolean;
}

const TwelveWeekCycle: React.FC = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<TwelveWeekGoal[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentCycle, setCurrentCycle] = useState<GlobalCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<TwelveWeekGoal | null>(null);
  const [showWeeklyGoalForm, setShowWeeklyGoalForm] = useState<{
    goalId: string;
    weekNumber: number;
    domains: Array<{ id: string; name: string; }>;
    roles: Array<{ id: string; label: string; category?: string; }>;
  } | null>(null);
  const [editingWeeklyGoal, setEditingWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchCurrentCycle();
    }
  }, [user]);

  useEffect(() => {
    if (user && currentCycle) {
      fetchGoals();
      fetchTasks();
    }
  }, [user, currentCycle]);

  useEffect(() => {
    if (user) {
      fetchWeeklyGoals();
    }
  }, [user]);
  const fetchCurrentCycle = async () => {
    try {
      const { data, error } = await supabase
        .from('0007-ap-global-cycles')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching current cycle:', error);
        return;
      }

      setCurrentCycle(data);
    } catch (error) {
      console.error('Error fetching current cycle:', error);
    }
  };

  const fetchGoals = async () => {
    if (!user) return;

    try {
      const { data: goalsData, error: goalsError } = await supabase
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
        .eq('global_cycle_id', currentCycle?.id)
        .order('created_at', { ascending: false });

      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
        return;
      }

      const formattedGoals = goalsData?.map(goal => ({
        ...goal,
        domains: goal.goal_domains?.map((gd: any) => gd.domain).filter(Boolean) || [],
        roles: goal.goal_roles?.map((gr: any) => gr.role).filter(Boolean) || []
      })) || [];

      setGoals(formattedGoals);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('0007-ap-goal_weekly_goals')
        .select(`
          *,
          goal:0007-ap-goals_12wk_main!inner(user_id)
        `)
        .eq('goal.user_id', user.id)
        .order('week_number', { ascending: true });

      if (error) {
        console.error('Error fetching weekly goals:', error);
        return;
      }

      setWeeklyGoals(data || []);
    } catch (error) {
      console.error('Error fetching weekly goals:', error);
    }
  };

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('0007-ap-tasks')
        .select(`
          *,
          task_roles:0007-ap-task_roles(
            role:0007-ap-roles(id, label, category)
          ),
          task_domains:0007-ap-task_domains(
            domain:0007-ap-domains(id, name)
          ),
          goal_tasks:0007-ap-goal_tasks(
            goal:0007-ap-goals_12wk_main(id, global_cycle_id)
          )
        `)
        .eq('user_id', user.id)
        .eq('is_twelve_week_goal', true)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        return;
      }

      const formattedTasks = tasksData?.map(task => ({
        ...task,
        roles: task.task_roles?.map((tr: any) => tr.role).filter(Boolean) || [],
        domains: task.task_domains?.map((td: any) => td.domain).filter(Boolean) || []
      })) || [];

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleGoalCreated = (newGoal: TwelveWeekGoal) => {
    setShowGoalForm(false);
    fetchGoals(); // Refresh goals instead of manual state update
  };

  const handleGoalUpdated = (updatedGoal: TwelveWeekGoal) => {
    setEditingGoal(null);
    fetchGoals(); // Refresh goals instead of manual state update
  };

  const handleGoalDeleted = (deletedGoalId: string) => {
    setEditingGoal(null);
    fetchGoals(); // Refresh goals instead of manual state update
  };

  const handleWeeklyGoalCreated = (newWeeklyGoal: WeeklyGoal) => {
    setShowWeeklyGoalForm(null);
    fetchTasks(); // Refresh tasks since new task was created
  };

  const handleWeeklyGoalUpdated = (updatedWeeklyGoal: WeeklyGoal) => {
    setEditingWeeklyGoal(null);
    fetchTasks(); // Refresh tasks in case task was updated
  };

  const handleWeeklyGoalDeleted = (deletedWeeklyGoalId: string) => {
    setEditingWeeklyGoal(null);
    fetchTasks(); // Refresh tasks in case task was deleted
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  const toggleWeekExpansion = (weekKey: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey);
      } else {
        newSet.add(weekKey);
      }
      return newSet;
    });
  };

  const getWeekDates = (weekNumber: number) => {
    if (!currentCycle?.start_date) return { start: '', end: '' };
    
    const cycleStart = new Date(currentCycle.start_date);
    const weekStart = new Date(cycleStart);
    weekStart.setDate(cycleStart.getDate() + (weekNumber - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return {
      start: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  };

  const getTasksForWeek = (goalId: string, weekNumber: number) => {
    if (!currentCycle?.start_date) return [];
    
    const cycleStart = new Date(currentCycle.start_date);
    const weekStart = new Date(cycleStart);
    weekStart.setDate(cycleStart.getDate() + (weekNumber - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return tasks.filter(task => {
      // Check if task is linked to this goal
      const isLinkedToGoal = task.goal_tasks?.some((gt: any) => gt.goal?.id === goalId);
      if (!isLinkedToGoal) return false;
      
      // Check if task falls within this week
      if (!task.due_date) return false;
      
      const taskDate = new Date(task.due_date);
      return taskDate >= weekStart && taskDate <= weekEnd;
    });
  };

  const categorizeTasksByPriority = (tasks: Task[]) => {
    return {
      urgentImportant: tasks.filter(task => task.is_urgent && task.is_important),
      notUrgentImportant: tasks.filter(task => !task.is_urgent && task.is_important),
      urgentNotImportant: tasks.filter(task => task.is_urgent && !task.is_important),
      notUrgentNotImportant: tasks.filter(task => !task.is_urgent && !task.is_important)
    };
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('0007-ap-tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error completing task:', error);
        return;
      }

      // Remove from local state
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('0007-ap-tasks')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error cancelling task:', error);
        return;
      }

      // Remove from local state
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error cancelling task:', error);
    }
  };

  const PriorityQuadrant: React.FC<{
    title: string;
    tasks: Task[];
    bgColor: string;
    borderColor: string;
    textColor: string;
    icon: React.ReactNode;
  }> = ({ title, tasks, bgColor, borderColor, textColor, icon }) => {
    if (tasks.length === 0) return null;

    return (
      <div className={`border-l-4 ${borderColor} bg-white rounded-lg shadow-sm`}>
        <div className={`${bgColor} ${textColor} px-3 py-2 rounded-t-lg flex items-center gap-2`}>
          {icon}
          <span className="font-medium text-sm">{title}</span>
          <span className="ml-auto text-xs opacity-90">({tasks.length})</span>
        </div>
        <div className="p-3 space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="bg-gray-50 rounded-lg p-3 border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-gray-900 truncate">
                    {task.title}
                  </h4>
                  {task.due_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                      {task.time && ` at ${task.time}`}
                    </p>
                  )}
                  {task.is_authentic_deposit && (
                    <span className="inline-block mt-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                      Authentic Deposit
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                    title="Complete task"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleCancelTask(task.id)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                    title="Cancel task"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your 12-week cycle...</p>
        </div>
      </div>
    );
  }

  if (!currentCycle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Cycle</h2>
          <p className="text-gray-600 mb-6">
            There's no active 12-week cycle currently running. Please contact your administrator to set up a new cycle.
          </p>
        </div>
      </div>
    );
  }

  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);
  const reflectionWeekDates = currentCycle.reflection_start && currentCycle.reflection_end
    ? `${new Date(currentCycle.reflection_start).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${new Date(currentCycle.reflection_end).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
    : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {currentCycle.title || '12-Week Cycle'}
              </h1>
              {currentCycle.start_date && currentCycle.end_date && (
                <p className="text-gray-600 mt-1">
                  {new Date(currentCycle.start_date).toLocaleDateString()} - {new Date(currentCycle.end_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowGoalForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add 12-Week Goal
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {goals.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No 12-Week Goals Yet</h3>
              <p className="text-gray-600 mb-6">
                Start by creating your first 12-week goal to begin your focused execution cycle.
              </p>
              <button
                onClick={() => setShowGoalForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Goal
              </button>
            </div>
          ) : (
            goals.map(goal => (
              <div key={goal.id} className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">{goal.title}</h2>
                      {goal.description && (
                        <p className="text-gray-600 mb-4">{goal.description}</p>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${goal.progress}%` }}
                            ></div>
                          </div>
                          <span>{goal.progress}%</span>
                        </div>
                        
                        {goal.domains && goal.domains.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span>Domains:</span>
                            {goal.domains.map(domain => (
                              <span key={domain.id} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                {domain.name}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {goal.roles && goal.roles.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{goal.roles.length} role{goal.roles.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingGoal(goal)}
                        className="text-gray-400 hover:text-gray-600 p-2"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleGoalExpansion(goal.id)}
                        className="text-gray-400 hover:text-gray-600 p-2"
                      >
                        <svg 
                          className={`h-5 w-5 transition-transform ${expandedGoals.has(goal.id) ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {expandedGoals.has(goal.id) && (
                  <div className="p-6">
                    {/* Weekly Progress - 6 boxes in 2 rows */}
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Progress</h3>
                      
                      {/* Weeks 1-6 */}
                      <div className="grid grid-cols-6 gap-3 mb-3">
                        {weeks.slice(0, 6).map(weekNumber => {
                          const weekDates = getWeekDates(weekNumber);
                          const weekTasks = getTasksForWeek(goal.id, weekNumber);
                          const weekKey = `${goal.id}-week-${weekNumber}`;
                          const isExpanded = expandedWeeks.has(weekKey);
                          
                          return (
                            <div key={weekNumber} className="border rounded-lg">
                              <button
                                onClick={() => toggleWeekExpansion(weekKey)}
                                className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                              >
                                <div className="text-center">
                                  <h4 className="font-medium text-gray-900 text-sm">Week {weekNumber}</h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    ({weekDates.start})
                                  </p>
                                  {weekTasks.length > 0 && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      {weekTasks.length} task{weekTasks.length !== 1 ? 's' : ''}
                                    </p>
                                  )}
                                </div>
                              </button>
                              
                              {isExpanded && (
                                <div className="border-t p-4">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-medium text-gray-900">Week {weekNumber} Tasks</h4>
                                    <button
                                      onClick={() => setShowWeeklyGoalForm({
                                        goalId: goal.id,
                                        weekNumber,
                                        domains: goal.domains || [],
                                        roles: goal.roles || []
                                      })}
                                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                                    >
                                      <Plus className="h-3 w-3" />
                                      Add Task
                                    </button>
                                  </div>

                                  {weekTasks.length === 0 ? (
                                    <div className="text-center py-6 text-gray-500">
                                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">No tasks for Week {weekNumber} yet.</p>
                                      <button
                                        onClick={() => setShowWeeklyGoalForm({
                                          goalId: goal.id,
                                          weekNumber,
                                          domains: goal.domains || [],
                                          roles: goal.roles || []
                                        })}
                                        className="text-blue-600 hover:text-blue-700 text-sm mt-2"
                                      >
                                        Add your first task
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {(() => {
                                        const categorizedTasks = categorizeTasksByPriority(weekTasks);
                                        
                                        return (
                                          <div className="space-y-3">
                                            {/* Urgent & Important */}
                                            <PriorityQuadrant
                                              title="Urgent & Important"
                                              tasks={categorizedTasks.urgentImportant}
                                              bgColor="bg-red-500"
                                              borderColor="border-l-red-500"
                                              textColor="text-white"
                                              icon={<AlertTriangle className="h-3 w-3" />}
                                            />

                                            {/* Not Urgent & Important */}
                                            <PriorityQuadrant
                                              title="Not Urgent & Important"
                                              tasks={categorizedTasks.notUrgentImportant}
                                              bgColor="bg-green-500"
                                              borderColor="border-l-green-500"
                                              textColor="text-white"
                                              icon={<CheckCircle className="h-3 w-3" />}
                                            />

                                            {/* Urgent & Not Important */}
                                            <PriorityQuadrant
                                              title="Urgent & Not Important"
                                              tasks={categorizedTasks.urgentNotImportant}
                                              bgColor="bg-orange-500"
                                              borderColor="border-l-orange-500"
                                              textColor="text-white"
                                              icon={<Clock className="h-3 w-3" />}
                                            />

                                            {/* Not Urgent & Not Important */}
                                            <PriorityQuadrant
                                              title="Not Urgent & Not Important"
                                              tasks={categorizedTasks.notUrgentNotImportant}
                                              bgColor="bg-gray-500"
                                              borderColor="border-l-gray-500"
                                              textColor="text-white"
                                              icon={<X className="h-3 w-3" />}
                                            />
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Weeks 7-12 */}
                      <div className="grid grid-cols-6 gap-3 mb-4">
                        {weeks.slice(6, 12).map(weekNumber => {
                          const weekDates = getWeekDates(weekNumber);
                          const weekTasks = getTasksForWeek(goal.id, weekNumber);
                          const weekKey = `${goal.id}-week-${weekNumber}`;
                          const isExpanded = expandedWeeks.has(weekKey);
                          
                          return (
                            <div key={weekNumber} className="border rounded-lg">
                              <button
                                onClick={() => toggleWeekExpansion(weekKey)}
                                className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                              >
                                <div className="text-center">
                                  <h4 className="font-medium text-gray-900 text-sm">Week {weekNumber}</h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    ({weekDates.start})
                                  </p>
                                  {weekTasks.length > 0 && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      {weekTasks.length} task{weekTasks.length !== 1 ? 's' : ''}
                                    </p>
                                  )}
                                </div>
                              </button>
                              
                              {isExpanded && (
                                <div className="border-t p-4">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-medium text-gray-900">Week {weekNumber} Tasks</h4>
                                    <button
                                      onClick={() => setShowWeeklyGoalForm({
                                        goalId: goal.id,
                                        weekNumber,
                                        domains: goal.domains || [],
                                        roles: goal.roles || []
                                      })}
                                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                                    >
                                      <Plus className="h-3 w-3" />
                                      Add Task
                                    </button>
                                  </div>

                                  {weekTasks.length === 0 ? (
                                    <div className="text-center py-6 text-gray-500">
                                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">No tasks for Week {weekNumber} yet.</p>
                                      <button
                                        onClick={() => setShowWeeklyGoalForm({
                                          goalId: goal.id,
                                          weekNumber,
                                          domains: goal.domains || [],
                                          roles: goal.roles || []
                                        })}
                                        className="text-blue-600 hover:text-blue-700 text-sm mt-2"
                                      >
                                        Add your first task
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {(() => {
                                        const categorizedTasks = categorizeTasksByPriority(weekTasks);
                                        
                                        return (
                                          <div className="space-y-3">
                                            {/* Urgent & Important */}
                                            <PriorityQuadrant
                                              title="Urgent & Important"
                                              tasks={categorizedTasks.urgentImportant}
                                              bgColor="bg-red-500"
                                              borderColor="border-l-red-500"
                                              textColor="text-white"
                                              icon={<AlertTriangle className="h-3 w-3" />}
                                            />

                                            {/* Not Urgent & Important */}
                                            <PriorityQuadrant
                                              title="Not Urgent & Important"
                                              tasks={categorizedTasks.notUrgentImportant}
                                              bgColor="bg-green-500"
                                              borderColor="border-l-green-500"
                                              textColor="text-white"
                                              icon={<CheckCircle className="h-3 w-3" />}
                                            />

                                            {/* Urgent & Not Important */}
                                            <PriorityQuadrant
                                              title="Urgent & Not Important"
                                              tasks={categorizedTasks.urgentNotImportant}
                                              bgColor="bg-orange-500"
                                              borderColor="border-l-orange-500"
                                              textColor="text-white"
                                              icon={<Clock className="h-3 w-3" />}
                                            />

                                            {/* Not Urgent & Not Important */}
                                            <PriorityQuadrant
                                              title="Not Urgent & Not Important"
                                              tasks={categorizedTasks.notUrgentNotImportant}
                                              bgColor="bg-gray-500"
                                              borderColor="border-l-gray-500"
                                              textColor="text-white"
                                              icon={<X className="h-3 w-3" />}
                                            />
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Week 13 (Reflection Week) */}
                      {reflectionWeekDates && (
                        <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-purple-900 mb-1">
                              Week 13 (Reflection Week)
                            </h3>
                            <p className="text-purple-700">{reflectionWeekDates}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modals */}
      {showGoalForm && (
        <TwelveWeekGoalForm
          onClose={() => setShowGoalForm(false)}
          onGoalCreated={handleGoalCreated}
        />
      )}

      {editingGoal && (
        <TwelveWeekGoalEditForm
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onGoalUpdated={handleGoalUpdated}
          onGoalDeleted={handleGoalDeleted}
        />
      )}

      {showWeeklyGoalForm && (
        <WeeklyGoalForm
          onClose={() => setShowWeeklyGoalForm(null)}
          onGoalCreated={handleWeeklyGoalCreated}
          twelveWeekGoalId={showWeeklyGoalForm.goalId}
          weekNumber={showWeeklyGoalForm.weekNumber}
          prefilledDomains={showWeeklyGoalForm.domains}
          prefilledRoles={showWeeklyGoalForm.roles}
        />
      )}

      {editingWeeklyGoal && (
        <WeeklyGoalEditForm
          weeklyGoal={editingWeeklyGoal}
          onClose={() => setEditingWeeklyGoal(null)}
          onGoalUpdated={handleWeeklyGoalUpdated}
          onGoalDeleted={handleWeeklyGoalDeleted}
        />
      )}
    </div>
  );
};

export default TwelveWeekCycle;