import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Check, UserPlus, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import EditTask from './EditTask';

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_urgent: boolean;
  is_important: boolean;
  is_authentic_deposit: boolean;
  is_twelve_week_goal: boolean;
  status: string;
  notes: string | null;
  task_roles: { role_id: string }[];
  task_domains: { domain_id: string }[];
}

interface Role {
  id: string;
  label: string;
}

interface Domain {
  id: string;
  name: string;
}

interface UnscheduledPrioritiesProps {
  refreshTrigger?: number;
}

const getInitialCollapsedQuadrants = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('collapsed_quadrants');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Failed to parse collapsed_quadrants from localStorage', err);
    }
  }
  return {
    'urgent-important': false,
    'not-urgent-important': false,
    'urgent-not-important': false,
    'not-urgent-not-important': false,
  };
};

const UnscheduledPriorities: React.FC<UnscheduledPrioritiesProps> = ({ refreshTrigger = 0 }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [collapsedQuadrants, setCollapsedQuadrants] = useState(getInitialCollapsedQuadrants);

  // Save collapsed state whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('collapsed_quadrants', JSON.stringify(collapsedQuadrants));
      } catch (err) {
        console.warn('Failed to save collapsed_quadrants to localStorage', err);
      }
    }
  }, [collapsedQuadrants]);

  useEffect(() => {
    fetchUnscheduledTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const fetchUnscheduledTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    try {
      // Fetch roles
      const { data: rolesData } = await supabase
        .from('0007-ap-roles')
        .select('id, label')
        .eq('user_id', user.id);

      if (rolesData) {
        const rolesMap = rolesData.reduce((acc, role) => ({
          ...acc,
          [role.id]: role
        }), {});
        setRoles(rolesMap);
      }

      // Fetch domains
      const { data: domainsData } = await supabase
        .from('0007-ap-domains')
        .select('id, name');

      if (domainsData) {
        const domainsMap = domainsData.reduce((acc, domain) => ({
          ...acc,
          [domain.id]: domain
        }), {});
        setDomains(domainsMap);
      }

      // Fetch ONLY unscheduled tasks (no start_time)
      const { data: tasksData } = await supabase
        .from('0007-ap-tasks')
        .select(`
          *,
          task_roles:0007-ap-task_roles(role_id),
          task_domains:0007-ap-task_domains(domain_id)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .is('start_time', null); // Only get unscheduled tasks

      if (tasksData) {
        // Sort tasks by due_date within each category
        const sortedTasks = tasksData.sort((a, b) => {
          // Tasks with dates come first, sorted by date
          if (a.due_date && b.due_date) {
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          }
          if (a.due_date && !b.due_date) return -1;
          if (!a.due_date && b.due_date) return 1;
          // Both have no date, sort by title
          return a.title.localeCompare(b.title);
        });

        setTasks(sortedTasks);
      }
    } catch (error) {
      console.error('Error fetching unscheduled tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskAction = async (taskId: string, action: 'complete' | 'delegate' | 'cancel', event?: React.MouseEvent) => {
    // Prevent event bubbling to avoid triggering edit modal
    if (event) {
      event.stopPropagation();
    }

    const updates: any = {
      status: action === 'complete' ? 'completed' : action === 'cancel' ? 'cancelled' : 'delegated',
    };

    if (action === 'complete') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('0007-ap-tasks')
      .update(updates)
      .eq('id', taskId);

    if (!error) {
      // Remove task from current view
      setTasks(tasks.filter(t => t.id !== taskId));
    }
  };

  // Ultra-simplified toggle function
  const toggleQuadrant = (quadrantId: string) => {
    setCollapsedQuadrants(prev => ({
      ...prev,
      [quadrantId]: !prev[quadrantId]
    }));
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
  };

  const handleTaskUpdated = () => {
    setEditingTask(null);
    fetchUnscheduledTasks(); // Refresh the task list
  };

  const handleEditCancel = () => {
    setEditingTask(null);
  };

  // Helper function to detect if device is mobile/tablet
  const isMobileDevice = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0)
    );
  };

  // Helper function to safely format dates
  const formatTaskDate = (dateStr: string | null) => {
    if (!dateStr) return null;

    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return null;
      return format(date, 'MMM d');
    } catch (error) {
      console.warn('Date formatting error:', error);
      return null;
    }
  };

  // Categorize tasks into quadrants and sort by date within each
  const categorizeAndSortTasks = (taskList: Task[]) => {
    const categories = {
      urgentImportant: taskList.filter(task => task.is_urgent && task.is_important),
      notUrgentImportant: taskList.filter(task => !task.is_urgent && task.is_important),
      urgentNotImportant: taskList.filter(task => task.is_urgent && !task.is_important),
      notUrgentNotImportant: taskList.filter(task => !task.is_urgent && !task.is_important),
    };

    // Sort each category by date (earliest first, no date at bottom)
    Object.keys(categories).forEach(key => {
      categories[key as keyof typeof categories].sort((a, b) => {
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        return a.title.localeCompare(b.title);
      });
    });

    return categories;
  };

  const { urgentImportant, notUrgentImportant, urgentNotImportant, notUrgentNotImportant } = categorizeAndSortTasks(tasks);

  const TaskCard: React.FC<{ task: Task; quadrantColor: string }> = ({ task, quadrantColor }) => {
    const dateDisplay = formatTaskDate(task.due_date);
    const isMobile = isMobileDevice();

    const handleCardClick = (event: React.MouseEvent) => {
      // Only handle single clicks on mobile/tablet
      if (isMobile) {
        event.preventDefault();
        event.stopPropagation();
        handleTaskEdit(task);
      }
    };

    const handleCardDoubleClick = (event: React.MouseEvent) => {
      // Only handle double clicks on desktop
      if (!isMobile) {
        event.preventDefault();
        event.stopPropagation();
        handleTaskEdit(task);
      }
    };

    return (
      <div
        className={`bg-white border-l-4 ${quadrantColor} border-r border-t border-b border-gray-200 rounded-r-lg p-3 hover:shadow-md transition-all cursor-pointer select-none`}
        onClick={handleCardClick}
        onDoubleClick={handleCardDoubleClick}
        title={isMobile ? "Tap to edit" : "Double-click to edit"}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm leading-tight">{task.title}</h4>
            {dateDisplay ? (
              <div className="flex items-center mt-1 text-xs text-gray-600">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>Due {dateDisplay}</span>
              </div>
            ) : (
              <div className="flex items-center mt-1 text-xs text-gray-400">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>No due date</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
            <button
              onClick={(e) => handleTaskAction(task.id, 'complete', e)}
              className="p-1 rounded-full hover:bg-green-100 hover:text-green-600 transition-colors"
              title="Complete"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => handleTaskAction(task.id, 'delegate', e)}
