import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Calendar, Target, Users, CheckCircle, X, Clock, AlertTriangle } from 'lucide-react';
import TwelveWeekGoalForm from '../components/goals/TwelveWeekGoalForm';
import TwelveWeekGoalEditForm from '../components/goals/TwelveWeekGoalEditForm';
import TaskEventForm from '../components/tasks/TaskEventForm';
import { formatTaskForForm } from '../../utils/taskHelpers'; 
import { parseISO, format, addDays } from 'date-fns'; // at top

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
  start_time?: string;
  end_time?: string;
  is_all_day?: boolean;
  task_roles?: Array<{ role_id: string }>;
  task_domains?: Array<{ domain_id: string }>;
  task_key_relationships?: Array<{ key_relationship_id: string }>;
  task_12wkgoals?: Array<{ goal?: { id: string } }>; // <-- ADD THIS LINE
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

interface WeekModalData {
  goalId: string;
  weekNumber: number;
  weekDates: { start: string; end: string; };
  domains: Array<{ id: string; name: string; }>;
  roles: Array<{ id: string; label: string; category?: string; }>;
}

const TwelveWeekCycle: React.FC = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<TwelveWeekGoal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentCycle, setCurrentCycle] = useState<GlobalCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<TwelveWeekGoal | null>(null);
  const [showTaskForm, setShowTaskForm] = useState<{
    goalId: string;
    weekNumber: number;
    goalTitle: string;
    domains: Array<{ id: string; name: string; }>;
    roles: Array<{ id: string; label: string; category?: string; }>;
  } | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [selectedWeek, setSelectedWeek] = useState<WeekModalData | null>(null);
  const [showWeeklyGoalForm, setShowWeeklyGoalForm] = useState<{
    goalId: string;
    weekNumber: number;
    domains: Array<{ id: string; name: string; }>;
    roles: Array<{ id: string; label: string; category?: string; }>;
  } | null>(null);
  const [editingWeeklyGoal, setEditingWeeklyGoal] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [goalNotes, setGoalNotes] = useState<Record<string, any[]>>({});
  const [newGoalNotes, setNewGoalNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState<string>('');
  const [draggingProgress, setDraggingProgress] = useState<{
    goalId: string;
    startX: number;
    startProgress: number;
    progressBarWidth: number;
  } | null>(null);

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

  // Fetch notes for all goals
  useEffect(() => {
    if (goals.length > 0) {
      fetchGoalNotes();
    }
  }, [goals]);

  const fetchGoalNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const goalIds = goals.map(goal => goal.id);
      if (goalIds.length === 0) return;

      const { data: goalNotesData, error } = await supabase
        .from('0007-ap-goal-notes')
        .select(`
          goal_id,
          note:0007-ap-notes(
            id,
            content,
            created_at,
            updated_at
          )
        `)
        .in('goal_id', goalIds);

      if (error) {
        console.error('Error fetching goal notes:', error);
        return;
      }

      // Group notes by goal_id
      const notesByGoal: Record<string, any[]> = {};
      goalNotesData?.forEach(item => {
        if (item.note) {
          if (!notesByGoal[item.goal_id]) {
            notesByGoal[item.goal_id] = [];
          }
          notesByGoal[item.goal_id].push(item.note);
        }
      });

      // Sort notes by created_at (newest first)
      Object.keys(notesByGoal).forEach(goalId => {
        notesByGoal[goalId].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setGoalNotes(notesByGoal);
    } catch (error) {
      console.error('Error fetching goal notes:', error);
    }
  };

  // Progress bar interaction handlers
  const handleProgressBarClick = async (e: React.MouseEvent, goalId: string) => {
    const progressBar = e.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.round((clickX / rect.width) * 100);
    const clampedProgress = Math.max(0, Math.min(100, newProgress));
    
    await updateGoalProgress(goalId, clampedProgress);
  };

  const handleProgressDragStart = (e: React.MouseEvent | React.TouchEvent, goalId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const progressBar = (e.currentTarget as HTMLElement).closest('.relative') as HTMLElement;
    if (!progressBar) return;
    
    const rect = progressBar.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    setDraggingProgress({
      goalId,
      startX: clientX,
      startProgress: goal.progress,
      progressBarWidth: rect.width
    });
  };

  const updateGoalProgress = async (goalId: string, newProgress: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('0007-ap-goals-12wk')
        .update({ 
          progress: newProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating goal progress:', error);
        return;
      }

      // Update local state
      setGoals(prev => prev.map(goal => 
        goal.id === goalId 
          ? { ...goal, progress: newProgress }
          : goal
      ));
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  };

  // Mouse/touch event handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingProgress) return;
      
      const deltaX = e.clientX - draggingProgress.startX;
      const progressChange = (deltaX / draggingProgress.progressBarWidth) * 100;
      const newProgress = Math.max(0, Math.min(100, draggingProgress.startProgress + progressChange));
      
      // Update local state immediately for smooth dragging
      setGoals(prev => prev.map(goal => 
        goal.id === draggingProgress.goalId 
          ? { ...goal, progress: Math.round(newProgress) }
          : goal
      ));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!draggingProgress) return;
      e.preventDefault();
      
      const deltaX = e.touches[0].clientX - draggingProgress.startX;
      const progressChange = (deltaX / draggingProgress.progressBarWidth) * 100;
      const newProgress = Math.max(0, Math.min(100, draggingProgress.startProgress + progressChange));
      
      // Update local state immediately for smooth dragging
      setGoals(prev => prev.map(goal => 
        goal.id === draggingProgress.goalId 
          ? { ...goal, progress: Math.round(newProgress) }
          : goal
      ));
    };

    const handleMouseUp = async () => {
      if (!draggingProgress) return;
      
      const goal = goals.find(g => g.id === draggingProgress.goalId);
      if (goal) {
        await updateGoalProgress(draggingProgress.goalId, goal.progress);
      }
      
      setDraggingProgress(null);
    };

    if (draggingProgress) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [draggingProgress, goals]);

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

  // Calculate cycle progress
  const calculateCycleProgress = () => {
    if (!currentCycle?.start_date || !currentCycle?.reflection_end) {
      return { percentage: 0, daysRemaining: 0, totalDays: 0 };
    }

    // Use current date/time (same as calendar components)
    const now = new Date();
    const startDate = new Date(currentCycle.start_date + 'T00:00:00Z'); // Treat as UTC
    const endDate = new Date(currentCycle.reflection_end + 'T23:59:59Z'); // End of reflection day in UTC
    
    // Calculate days using UTC dates to avoid timezone issues
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, totalDays - daysPassed);
    const percentage = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));

    return { percentage, daysRemaining, totalDays };
  };

  // Format date range for display
  const formatCycleDateRange = () => {
  if (!currentCycle?.start_date || !currentCycle?.reflection_end) return '';
  const startDate = parseISO(currentCycle.start_date);
  const endDate = parseISO(currentCycle.reflection_end);
  return `${format(startDate, 'd MMM yyyy')} - ${format(endDate, 'd MMM yyyy')}`;
};
    
  const fetchGoals = async () => {
    if (!user) return;

    try {
      const { data: goalsData, error: goalsError } = await supabase
        .from('0007-ap-goals-12wk')
        .select(`
          *,
          goal_domains:0007-ap-goal-domains(
            domain:0007-ap-domains(id, name)
          ),
          goal_roles:0007-ap-goal-roles(
            role:0007-ap-roles(id, label, category)
          )
        `)
        .eq('user_id', user.id)
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

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('0007-ap-tasks')
        .select(`
          *,
          task_roles:0007-ap-task-roles!fk_task(
            role:0007-ap-roles(id, label, category)
          ),
          task_domains:0007-ap-task-domains(
            domain:0007-ap-domains(id, name)
 
         ),
          task_12wkgoals:0007-ap-task-12wkgoals(
            goal:0007-ap-goals-12wk(id, global_cycle_id)
          ),
          task_notes:0007-ap-task-notes(
            note:0007-ap-notes(id, content, created_at)
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
        domains: task.task_domains?.map((td: any) => td.domain).filter(Boolean) || [],
        // Keep the raw relationship data for editing
        task_roles: task.task_roles?.map((tr: any) => ({ role_id: tr.role?.id })).filter(Boolean) || [],
        task_domains: task.task_domains?.map((td: any) => ({ domain_id: td.domain?.id })).filter(Boolean) || [],
        task_12wkgoals: task.task_12wkgoals || [],
        notes: task.task_notes?.map((tn: any) => tn.note).filter(Boolean) || []
      })) || [];

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchCycleNotes = async () => {
    if (!user || !currentCycle) return;

    try {
      const { data: notesData, error } = await supabase
        .from('0007-ap-goal-notes')
        .select(`
          note:0007-ap-notes(
            id,
            content,
            created_at,
            updated_at
          )
        `)
        .eq('goal_id', currentCycle.id);

      if (error) {
        console.error('Error fetching cycle notes:', error);
        return;
      }

      const notes = notesData?.map(item => item.note).filter(Boolean) || [];
      setCycleNotes(notes);
    } catch (error) {
      console.error('Error fetching cycle notes:', error);
    }
  };

  const handleAddCycleNote = async () => {
    if (!newCycleNote.trim() || !user || !currentCycle) return;

    setSavingNote(true);
    try {
      // Create note in centralized notes table
      const { data: noteData, error: noteError } = await supabase
        .from('0007-ap-notes')
        .insert([{
          user_id: user.id,
          content: newCycleNote.trim(),
        }])
        .select()
        .single();

      if (noteError || !noteData) {
        console.error('Error creating note:', noteError);
        return;
      }

      // Link note to current cycle via goal-notes junction table
      const { error: linkError } = await supabase
        .from('0007-ap-goal-notes')
        .insert([{
          goal_id: currentCycle.id,
          note_id: noteData.id,
        }]);

      if (linkError) {
        console.error('Error linking note to cycle:', linkError);
        return;
      }

      // Clear form and refresh notes
      setNewCycleNote('');
      fetchCycleNotes();
    } catch (error) {
      console.error('Error adding cycle note:', error);
    } finally {
      setSavingNote(false);
    }
  };

const handleAddGoalNote = async (goalId: string) => {
    const noteContent = newGoalNotes[goalId]?.trim();
    if (!noteContent || !user) return;

    setSavingNotes(prev => ({ ...prev, [goalId]: true }));
    try {
      // Step 1: Create the note in the centralized '0007-ap-notes' table
      const { data: noteData, error: noteError } = await supabase
        .from('0007-ap-notes')
        .insert([{ user_id: user.id, content: noteContent }])
        .select('id')
        .single();

      if (noteError || !noteData) {
        throw noteError || new Error('Failed to create note.');
      }

      // Step 2: Link the new note to the goal in the '0007-ap-goal-notes' junction table
      const { error: linkError } = await supabase
        .from('0007-ap-goal-notes')
        .insert([{ goal_id: goalId, note_id: noteData.id }]);

      if (linkError) {
        throw linkError;
      }

      // Step 3: Clear the input and refresh the data
      setNewGoalNotes(prev => ({ ...prev, [goalId]: '' }));
      fetchGoalNotes(); // Refresh all goal notes

    } catch (error) {
      console.error('Error adding goal note:', error);
      alert('Failed to add the note. Please try again.');
    } finally {
      setSavingNotes(prev => ({ ...prev, [goalId]: false }));
    }
  };
  
  const handleEditNote = (note: any) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  };

  const handleSaveNoteEdit = async () => {
    if (!editingNoteId || !editingNoteContent.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('0007-ap-notes')
        .update({
          content: editingNoteContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingNoteId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating note:', error);
        return;
      }

      setEditingNoteId(null);
      setEditingNoteContent('');
      fetchGoalNotes(); // Refresh notes
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleCancelNoteEdit = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('0007-ap-notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting note:', error);
        return;
      }

      fetchGoalNotes(); // Refresh notes
    } catch (error) {
      console.error('Error deleting note:', error);
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

  const handleTaskCreated = () => {
    setShowTaskForm(null);
    setSelectedWeek(null);
    fetchTasks(); // Refresh tasks since new task was created
  };

  const handleTaskUpdated = () => {
    setEditingTask(null);
    fetchTasks(); // Refresh tasks since task was updated
  };

  const handleWeeklyGoalCreated = () => {
    setShowWeeklyGoalForm(null);
    fetchGoals();
  };

  const handleWeeklyGoalUpdated = () => {
    setEditingWeeklyGoal(null);
    fetchGoals();
  };

  const handleWeeklyGoalDeleted = () => {
    setEditingWeeklyGoal(null);
    fetchGoals();
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

  const handleWeekClick = (goal: TwelveWeekGoal, weekNumber: number) => {
    const weekDates = getWeekDates(weekNumber);
    setSelectedWeek({
      goalId: goal.id,
      weekNumber,
      weekDates,
      domains: goal.domains || [],
      roles: goal.roles || []
    });
  };

  const getWeekDates = (weekNumber: number) => {
  if (!currentCycle?.start_date) return { start: '', end: '' };

  const cycleStart = parseISO(currentCycle.start_date); // date-fns parses in local, but since only date is used, it's safe
  const weekStart = addDays(cycleStart, (weekNumber - 1) * 7);
  const weekEnd = addDays(weekStart, 6);

  return {
    start: format(weekStart, 'd MMM'), // e.g. '29 Jun'
    end: format(weekEnd, 'd MMM') // e.g. '5 Jul'
  };
};

  const getTasksForWeek = (goalId: string, weekNumber: number) => {
    if (!currentCycle?.start_date) return [];
    
    const cycleStart = new Date(currentCycle.start_date + 'T00:00:00Z'); // Treat as UTC
    const weekStart = new Date(cycleStart);
    weekStart.setDate(cycleStart.getDate() + (weekNumber - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return tasks.filter(task => {
      // Check if task is linked to this goal
      const isLinkedToGoal = task.task_12wkgoals?.some((gt: any) => gt.goal?.id === goalId);
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
    onTaskEdit: (task: Task) => void;
  }> = ({ title, tasks, bgColor, borderColor, textColor, icon, onTaskEdit }) => {
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
            <div 
              key={task.id} 
              className="bg-gray-50 rounded-lg p-3 border hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => onTaskEdit(task)}
              title="Click to edit task"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-gray-900 truncate">
                    {task.title}
                  </h4>
                  {task.due_date && (
                    <p className="text-xs text-gray-500 mt-1">
  Due: {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  })}
  {task.time && ` at ${task.time}`}
</p>
                  )}
                  {task.notes && task.notes.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 font-medium">Notes:</p>
                      {task.notes.slice(0, 2).map((note: any) => (
                        <p key={note.id} className="text-xs text-gray-500 mb-1">
                          {note.content}
                        </p>
                      ))}
                      {task.notes.length > 2 && (
                        <p className="text-xs text-gray-400">+{task.notes.length - 2} more note{task.notes.length > 3 ? 's' : ''}</p>
                      )}
                    </div>
                  )}
                  {task.is_authentic_deposit && (
                    <span className="inline-block mt-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                      📝 {weekTasks.reduce((count, task) => count + (task.notes?.length || 0), 0)} note{weekTasks.reduce((count, task) => count + (task.notes?.length || 0), 0) !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCompleteTask(task.id);
                    }}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                    title="Complete task"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelTask(task.id);
                    }}
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
  const cycleProgress = calculateCycleProgress();
  const cycleDateRange = formatCycleDateRange();

  return (
  <div className="min-h-screen bg-gray-50">
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          {currentCycle.title || '12-Week Cycle'}
        </h1>
        {cycleDateRange && (
          <div className="mt-2 text-center">
            <p className="text-gray-600 mb-3">{cycleDateRange}</p>
             </div>
          )}
      </div>

{/* Wide Progress Bar */}
<div className="w-full max-w-7xl mx-auto mb-6 px-4">
  <div>
    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
      <span>Cycle Progress</span>
      <span>{cycleProgress.daysRemaining} days remaining</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${cycleProgress.percentage}%` }}
      ></div>
    </div>
    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
      <span>{Math.round(cycleProgress.percentage)}% complete</span>
      <span>{cycleProgress.totalDays} total days</span>
    </div>
  </div>
</div>
      
      {/* Add Goal Button - Right aligned below progress bar */}
      <div className="w-full max-w-7xl mx-auto mb-10 px-4 flex justify-end">
        <button
          onClick={() => setShowGoalForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add 12-Week Goal
        </button>
      </div>
      {/* Goals or Empty State */}
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
          <div>
            {/* Current Goals Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Current Goals:</h2>
            </div>
            
            <div className="space-y-8">
            {goals.map(goal => (
              <div key={goal.id} className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">{goal.title}</h2>
                      
                      {/* Interactive Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span>Progress</span>
                          <span>{goal.progress}%</span>
                        </div>
                        <div 
                          className="relative w-full bg-gray-200 rounded-full h-3 cursor-pointer"
                          onClick={(e) => handleProgressBarClick(e, goal.id)}
                        >
                          <div 
                            className="bg-blue-600 h-3 rounded-full transition-all duration-300 relative"
                            style={{ width: `${goal.progress}%` }}
                          >
                            {/* Draggable handle */}
                            <div
                              className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-blue-600 border-2 border-white rounded-full cursor-grab active:cursor-grabbing shadow-md hover:scale-110 transition-transform"
                              onMouseDown={(e) => handleProgressDragStart(e, goal.id)}
                              onTouchStart={(e) => handleProgressDragStart(e, goal.id)}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {goal.description && (
                        <p className="text-gray-600 mb-4">{goal.description}</p>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500">
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
                          
                          return (
                            <div key={weekNumber} className="border rounded-lg">
                              <button
                                onClick={() => handleWeekClick(goal, weekNumber)}
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
                                  {weekTasks.some(task => task.notes && task.notes.length > 0) && (
                                    <p className="text-xs text-purple-600 mt-1">
                                      📝 Has notes
                                    </p>
                                  )}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Weeks 7-12 */}
                      <div className="grid grid-cols-6 gap-3 mb-4">
                        {weeks.slice(6, 12).map(weekNumber => {
                          const weekDates = getWeekDates(weekNumber);
                          const weekTasks = getTasksForWeek(goal.id, weekNumber);
                          
                          return (
                            <div key={weekNumber} className="border rounded-lg">
                              <button
                                onClick={() => handleWeekClick(goal, weekNumber)}
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
                                  {weekTasks.some(task => task.notes && task.notes.length > 0) && (
                                    <p className="text-xs text-purple-600 mt-1">
                                      📝 Has notes
                                    </p>
                                  )}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Week 13 (Reflection Week) */}
                      {currentCycle.reflection_start && currentCycle.reflection_end && (
  <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
    <div className="text-center">
      <h3 className="text-lg font-semibold text-purple-900 mb-1">
        Week 13 (Reflection Week)
      </h3>
      <p className="text-purple-700">
        {format(parseISO(currentCycle.reflection_start), 'd MMM')} - {format(parseISO(currentCycle.reflection_end), 'd MMM')}
      </p>
    </div>
  </div>
)}

                    </div>
                    
                    {/* Goal Notes Section */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Goal Notes</h3>
                      
                      {/* Add Note Form */}
                      <div className="mb-4">
                        <div className="flex gap-2">
                          <textarea
                            value={newGoalNotes[goal.id] || ''}
                            onChange={(e) => setNewGoalNotes(prev => ({ ...prev, [goal.id]: e.target.value }))}
                            placeholder="Add a note about this goal..."
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows={2}
                          />
                          <button
                            onClick={() => handleAddGoalNote(goal.id)}
                            disabled={!newGoalNotes[goal.id]?.trim() || savingNotes[goal.id]}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {savingNotes[goal.id] ? 'Saving...' : 'Add Note'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Display Notes */}
                      <div className="space-y-3">
                        {goalNotes[goal.id] && goalNotes[goal.id].length > 0 ? (
                          goalNotes[goal.id].map((note: any) => (
                            <div key={note.id} className="bg-gray-50 rounded-lg p-3 border hover:bg-gray-100 transition-colors">
                              {editingNoteId === note.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editingNoteContent}
                                    onChange={(e) => setEditingNoteContent(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    rows={3}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleSaveNoteEdit}
                                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={handleCancelNoteEdit}
                                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-start justify-between mb-2">
                                    <p className="text-sm text-gray-900 flex-1">{note.content}</p>
                                    <div className="flex gap-1 ml-2">
                                      <button
                                        onClick={() => handleEditNote(note)}
                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Edit note"
                                      >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Delete note"
                                      >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                      {new Date(note.created_at).toLocaleDateString('en-US', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </p>
                                    {note.updated_at !== note.created_at && (
                                      <p className="text-xs text-gray-400">
                                        (edited {new Date(note.updated_at).toLocaleDateString('en-US', {
                                          day: 'numeric',
                                          month: 'short',
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true
                                        })})
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm italic">No notes yet for this goal.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
          )}
        </div>
      </main>

      {/* Week Details Modal */}
      {selectedWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Week {selectedWeek.weekNumber} Tasks
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {selectedWeek.weekDates.start} - {selectedWeek.weekDates.end}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowWeeklyGoalForm({
                      goalId: selectedWeek.goalId,
                      weekNumber: selectedWeek.weekNumber,
                      domains: selectedWeek.domains,
                      roles: selectedWeek.roles
                    })}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Task
                  </button>
                  <button
                    onClick={() => setSelectedWeek(null)}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {(() => {
                const weekTasks = getTasksForWeek(selectedWeek.goalId, selectedWeek.weekNumber);
                
                if (weekTasks.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No tasks for Week {selectedWeek.weekNumber} yet.</p>
                      <p className="text-sm mb-6">Add your first task to get started with this week.</p>
                      <button
                        onClick={() => setShowWeeklyGoalForm({
                          goalId: selectedWeek.goalId,
                          weekNumber: selectedWeek.weekNumber,
                          domains: selectedWeek.domains,
                          roles: selectedWeek.roles
                        })}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Add your first task
                      </button>
                    </div>
                  );
                }

                const categorizedTasks = categorizeTasksByPriority(weekTasks);
                
                return (
                  <div className="space-y-4">
                    {/* Urgent & Important */}
                    <PriorityQuadrant
                      title="Urgent & Important"
                      tasks={categorizedTasks.urgentImportant}
                      bgColor="bg-red-500"
                      borderColor="border-l-red-500"
                      textColor="text-white"
                      icon={<AlertTriangle className="h-4 w-4" />}
                      onTaskEdit={setEditingTask}
                    />

                    {/* Not Urgent & Important */}
                    <PriorityQuadrant
                      title="Not Urgent & Important"
                      tasks={categorizedTasks.notUrgentImportant}
                      bgColor="bg-green-500"
                      borderColor="border-l-green-500"
                      textColor="text-white"
                      icon={<CheckCircle className="h-4 w-4" />}
                      onTaskEdit={setEditingTask}
                    />

                    {/* Urgent & Not Important */}
                    <PriorityQuadrant
                      title="Urgent & Not Important"
                      tasks={categorizedTasks.urgentNotImportant}
                      bgColor="bg-orange-500"
                      borderColor="border-l-orange-500"
                      textColor="text-white"
                      icon={<Clock className="h-4 w-4" />}
                      onTaskEdit={setEditingTask}
                    />

                    {/* Not Urgent & Not Important */}
                    <PriorityQuadrant
                      title="Not Urgent & Not Important"
                      tasks={categorizedTasks.notUrgentNotImportant}
                      bgColor="bg-gray-500"
                      borderColor="border-l-gray-500"
                      textColor="text-white"
                      icon={<X className="h-4 w-4" />}
                      onTaskEdit={setEditingTask}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

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
        <TaskEventForm
  mode="create"
  onClose={() => setShowWeeklyGoalForm(null)}
  onSubmitSuccess={handleWeeklyGoalCreated}
  initialData={{
    schedulingType: 'task', // Set a default value instead of reading from null
    twelveWeekGoalId: showWeeklyGoalForm.goalId,
    weekNumber: showWeeklyGoalForm.weekNumber,
    cycleStartDate: currentCycle?.start_date,
    selectedRoleIds: showWeeklyGoalForm.roles.map(r => r.id),
    selectedDomainIds: showWeeklyGoalForm.domains.map(d => d.id),
    notes: `Week ${showWeeklyGoalForm.weekNumber} task for 12-week goal`,
    twelveWeekGoalChecked: true // This property only needs to be listed once
  }}
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

      {/* Edit Task Modal */}
      {editingTask && (
  <TaskEventForm
    mode="edit"
    initialData={formatTaskForForm(editingTask)}
    onSubmitSuccess={handleTaskUpdated}
    onClose={() => setEditingTask(null)}
  />
)}

    </div>
  );
};

export default TwelveWeekCycle;