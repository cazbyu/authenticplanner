import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Target, CheckCircle, X, Clock, AlertTriangle } from 'lucide-react';
import { parseISO, format, addDays } from 'date-fns';
import TaskEventForm from '../components/tasks/TaskEventForm';
// Note: The GoalForm components would also be refactored to use the new schema
// import TwelveWeekGoalForm from '../components/goals/TwelveWeekGoalForm';

// ============================================================================
// TYPE DEFINITIONS (Aligned with 0004-ap- schema)
// ============================================================================

interface Goal {
  id: string;
  title: string;
  description?: string;
  status: string;
  progress: number;
  'start-date'?: string;
  'end-date'?: string;
  domains: Array<{ id: string; name: string; }>;
  roles: Array<{ id: string; label: string; }>;
}

interface Task {
  id: string;
  title: string;
  'goal-id': string;
  'week-in-cycle': number;
  'due-date'?: string;
  status: string;
  'is-urgent': boolean;
  'is-important': boolean;
}

interface GlobalCycle {
  id: string;
  title?: string;
  'start-date'?: string;
  'end-date'?: string;
  'reflection-start'?: string;
  'reflection-end'?: string;
}

// ============================================================================
// 12 WEEK CYCLE PAGE COMPONENT
// ============================================================================

const TwelveWeekCycle: React.FC = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentCycle, setCurrentCycle] = useState<GlobalCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState<{ goalId: string; weekNumber: number } | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  /**
   * Fetches all necessary data for the page in parallel.
   */
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // First, get the active global cycle
      const { data: cycleData, error: cycleError } = await supabase
        .from('0004-ap-global-cycles')
        .select('*')
        .eq('is-active', true)
        .single();
      if (cycleError) throw cycleError;
      setCurrentCycle(cycleData);

      // Fetch goals and tasks in parallel
      const [goalsRes, tasksRes] = await Promise.all([
        supabase
          .from('0004-ap-goals')
          .select(`*, goal-domains:0004-ap-goal-domains(domain:0004-ap-domains(id, name)), goal-roles:0004-ap-goal-roles(role:0004-ap-roles(id, label))`)
          .eq('user-id', user.id)
          .eq('type', 'twelve_week'),
        supabase
          .from('0004-ap-tasks')
          .select('id, title, goal-id, week-in-cycle, due-date, status, is-urgent, is-important')
          .eq('user-id', user.id)
          .not('goal-id', 'is', null)
      ]);
      
      if (goalsRes.error) throw goalsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      const formattedGoals = (goalsRes.data || []).map(g => ({
          ...g,
          domains: g['goal-domains']?.map((gd: any) => gd.domain).filter(Boolean) || [],
          roles: g['goal-roles']?.map((gr: any) => gr.role).filter(Boolean) || [],
      }));

      setGoals(formattedGoals);
      setTasks(tasksRes.data || []);

    } catch (error) {
      console.error('Error fetching 12-week cycle data:', error);
      toast.error("Failed to load cycle data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [user, fetchData]);

  /**
   * Filters the main tasks state to get tasks for a specific goal and week.
   */
  const getTasksForWeek = (goalId: string, weekNumber: number) => {
    return tasks.filter(task => task['goal-id'] === goalId && task['week-in-cycle'] === weekNumber);
  };

  if (loading) {
    return <div>Loading Cycle...</div>;
  }

  if (!currentCycle) {
    return <div>No active cycle found.</div>;
  }

  return (
    <div className="p-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold">{currentCycle.title || '12-Week Cycle'}</h1>
        {/* Add cycle progress bar here */}
      </header>

      <div className="text-right mb-4">
        <button onClick={() => setShowGoalForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          <Plus className="inline mr-2 h-4 w-4" /> Add Goal
        </button>
      </div>

      <div className="space-y-6">
        {goals.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">No 12-Week Goals Yet</h3>
            <p className="text-gray-600">Create your first goal to begin.</p>
          </div>
        ) : (
          goals.map(goal => (
            <div key={goal.id} className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">{goal.title}</h2>
                <button onClick={() => setExpandedGoals(prev => new Set(prev).has(goal.id) ? (prev.delete(goal.id), new Set(prev)) : new Set(prev.add(goal.id)))}>
                  {expandedGoals.has(goal.id) ? 'Collapse' : 'Expand'}
                </button>
              </div>
              {expandedGoals.has(goal.id) && (
                <div className="p-4 border-t grid grid-cols-6 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(weekNumber => (
                    <div key={weekNumber} className="border rounded-lg p-2 text-center">
                      <h4 className="font-medium text-sm">Week {weekNumber}</h4>
                      <button onClick={() => setShowTaskForm({ goalId: goal.id, weekNumber })} className="text-blue-500 text-xs mt-2">
                         View Tasks ({getTasksForWeek(goal.id, weekNumber).length})
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
                <h3 className="text-lg font-bold mb-4">Tasks for Week {showTaskForm.weekNumber}</h3>
                {/* Task list would be rendered here */}
                <ul>
                    {getTasksForWeek(showTaskForm.goalId, showTaskForm.weekNumber).map(task => (
                        <li key={task.id}>{task.title}</li>
                    ))}
                </ul>
                <button onClick={() => setShowTaskForm(null)} className="mt-4 bg-gray-200 px-4 py-2 rounded">Close</button>
                 <TaskEventForm
                    mode="create"
                    initialData={{
                        'goal-id': showTaskForm.goalId,
                        'week-in-cycle': showTaskForm.weekNumber,
                        // You can pre-fill other data here if needed
                    }}
                    onClose={() => setShowTaskForm(null)}
                    onSubmitSuccess={fetchData}
                />
            </div>
        </div>
      )}
    </div>
  );
};

export default TwelveWeekCycle;
