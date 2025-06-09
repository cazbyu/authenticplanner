import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Check, UserPlus, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import EditTask from './EditTask';
import { Task } from '../../types';

interface PriorityTask extends Task {
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
  const [tasks, setTasks] = useState<PriorityTask[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<PriorityTask | null>(null);
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
    if (!user) {
      console.warn('No authenticated user found when fetching unscheduled tasks');
      setLoading(false);
      return;
    }

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

  const handleTaskEdit = (task: PriorityTask) => {
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
              className="p-1 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"
              title="Delegate"
            >
              <UserPlus className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => handleTaskAction(task.id, 'cancel', e)}
              className="p-1 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
              title="Cancel"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Task metadata */}
        <div className="flex flex-wrap gap-1 mt-2">
          {task.is_authentic_deposit && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
              Authentic Deposit
            </span>
          )}
          {task.is_twelve_week_goal && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              12-Week Goal
            </span>
          )}
          {task.task_roles?.map((taskRole) => {
            const role = roles[taskRole.role_id];
            return role ? (
              <span key={taskRole.role_id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {role.label}
              </span>
            ) : null;
          })}
          {task.task_domains?.map((taskDomain) => {
            const domain = domains[taskDomain.domain_id];
            return domain ? (
              <span key={taskDomain.domain_id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                {domain.name}
              </span>
            ) : null;
          })}
        </div>

        {task.notes && (
          <div className="mt-2 text-xs text-gray-600 line-clamp-2">
            {task.notes}
          </div>
        )}
      </div>
    );
  };

  const QuadrantSection: React.FC<{
    title: string;
    tasks: Task[];
    quadrantId: string;
    quadrantColor: string;
    icon: React.ReactNode;
  }> = ({ title, tasks, quadrantId, quadrantColor, icon }) => {
    const isCollapsed = collapsedQuadrants[quadrantId];

    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => toggleQuadrant(quadrantId)}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${quadrantColor.replace('border-l-', 'bg-').replace('-500', '-100')}`}>
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {isCollapsed ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {!isCollapsed && (
          <div className="px-4 pb-4 space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No unscheduled tasks in this quadrant</p>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard key={task.id} task={task} quadrantColor={quadrantColor} />
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Unscheduled Priorities</h2>
          <p className="text-gray-600 mt-1">Tasks organized by urgency and importance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuadrantSection
          title="Urgent & Important"
          tasks={urgentImportant}
          quadrantId="urgent-important"
          quadrantColor="border-l-red-500"
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
        />

        <QuadrantSection
          title="Not Urgent & Important"
          tasks={notUrgentImportant}
          quadrantId="not-urgent-important"
          quadrantColor="border-l-blue-500"
          icon={<Clock className="h-5 w-5 text-blue-600" />}
        />

        <QuadrantSection
          title="Urgent & Not Important"
          tasks={urgentNotImportant}
          quadrantId="urgent-not-important"
          quadrantColor="border-l-yellow-500"
          icon={<UserPlus className="h-5 w-5 text-yellow-600" />}
        />

        <QuadrantSection
          title="Not Urgent & Not Important"
          tasks={notUrgentNotImportant}
          quadrantId="not-urgent-not-important"
          quadrantColor="border-l-gray-500"
          icon={<X className="h-5 w-5 text-gray-600" />}
        />
      </div>

      {editingTask && (
        <EditTask
          task={editingTask}
          onTaskUpdated={handleTaskUpdated}
          onCancel={handleEditCancel}
        />
      )}
    </div>
  );
};

export default UnscheduledPriorities;