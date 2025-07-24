import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Target, Clock, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { parseISO, format, addDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
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
      const { data: cycleData, error: cycleError } = await supabase
        .from('0004-ap-global-cycles')
        .select('*')
        .eq('is-active', true)
        .single();
      if (cycleError && cycleError.code !== 'PGRST116') throw cycleError;
      setCurrentCycle(cycleData);

      if (cycleData) {
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
      }
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
   * Calculates the progress of the current 12-week cycle.
   */
  const calculateCycleProgress = () => {
    if (!currentCycle?.['start-date'] || !currentCycle?.['reflection-end']) {
      return { percentage: 0, daysRemaining: 0, totalDays: 0 };
    }
    const now = new Date();
    const startDate = parseISO(currentCycle['start-date']);
    const endDate = parseISO(currentCycle['reflection-end']);
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const daysPassed = differenceInDays(now, startDate) + 1;
    const daysRemaining = Math.max(0, totalDays - daysPassed);
    const percentage = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
    return { percentage, daysRemaining, totalDays };
  };

  const cycleProgress = calculateCycleProgress();

  /**
   * Filters the main tasks state to get tasks for a specific goal and week.
   */
  const getTasksForWeek = (goalId: string, weekNumber: number) => {
    return tasks.filter(task => task['goal-id'] === goalId && task['week-in-cycle'] === weekNumber);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading Cycle...</div>;
  }

  if (!currentCycle) {
    return <div className="p-8 text-center">No active cycle found.</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{currentCycle.title || '12-Week Cycle'}</h1>
        <p className="text-gray-600 mt-1">{format(parseISO(currentCycle['start-date']!), 'MMM d, yyyy')} - {format(parseISO(currentCycle['reflection-end']!), 'MMM d, yyyy')}</p>
      </header>

      {/* Cycle Progress Bar */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Cycle Progress</span>
          <span>{cycleProgress.daysRemaining} days remaining</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${cycleProgress.percentage}%` }}></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto text-right mb-6">
        <button onClick={() => setShowGoalForm(true)} className="inline-flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
          <Plus className="mr-2 h-4 w-4" /> Add 12-Week Goal
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {goals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800">No 12-Week Goals Yet</h3>
            <p className="text-gray-500 mt-2">Create your first goal to begin your journey.</p>
          </div>
        ) : (
          goals.map(goal => (
            <div key={goal.id} className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">{goal.title}</h2>
                <button onClick={() => setExpandedGoals(prev => new Set(prev).has(goal.id) ? (prev.delete(goal.id), new Set(prev)) : new Set(prev.add(goal.id)))}>
                  {expandedGoals.has(goal.id) ? 'Collapse' : 'Expand'}
                </button>
              </div>
              {expandedGoals.has(goal.id) && (
                <div className="p-4 border-t grid grid-cols-4 md:grid-cols-6 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(weekNumber => (
                    <div key={weekNumber} className="border rounded-lg p-2 text-center hover:bg-gray-50 transition">
                      <h4 className="font-medium text-sm text-gray-700">Week {weekNumber}</h4>
                      <button onClick={() => setShowTaskForm({ goalId: goal.id, weekNumber })} className="text-primary-600 text-xs mt-2">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
                <h3 className="text-lg font-bold mb-4">Tasks for Week {showTaskForm.weekNumber}</h3>
                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {getTasksForWeek(showTaskForm.goalId, showTaskForm.weekNumber).map(task => (
                        <div key={task.id} className="p-2 border rounded">{task.title}</div>
                    ))}
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setShowTaskForm(null)} className="bg-gray-200 px-4 py-2 rounded">Close</button>
                    <button onClick={() => { /* Logic to open TaskEventForm pre-filled */ }} className="bg-primary-600 text-white px-4 py-2 rounded">Add Task</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default TwelveWeekCycle;
