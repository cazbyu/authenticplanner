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

interface TaskQuadrantsProps {
  refreshTrigger?: number;
}

const TaskQuadrants: React.FC<TaskQuadrantsProps> = ({ refreshTrigger = 0 }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // State for collapsing quadrants
  const [collapsedQuadrants, setCollapsedQuadrants] = useState<Record<string, boolean>>({
    'urgent-important': false,
    'not-urgent-important': false,
    'urgent-not-important': false,
    'not-urgent-not-important': false,
  });

  useEffect(() => {
    fetchTaskData();
  }, [refreshTrigger]);

  const fetchTaskData = async () => {
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

      // Fetch tasks with relationships
      const { data: tasksData } = await supabase
        .from('0007-ap-tasks')
        .select(`
          *,
          task_roles:0007-ap-task_roles(role_id),
          task_domains:0007-ap-task_domains(domain_id)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (tasksData) {
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error fetching task data:', error);
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
    fetchTaskData(); // Refresh the task list
  };

  const handleEditCancel = () => {
    setEditingTask(null);
  };

  // Helper function to detect if device is mobile/tablet
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0);
  };

  // Helper function to safely format dates and times
  const formatTaskDateTime = (dateStr: string | null, timeStr: string | null) => {
    if (!dateStr) return null;

    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return null;

      const dateFormatted = format(date, 'MMM d');
      
      if (!timeStr) return dateFormatted;

      // Handle time formatting - timeStr could be in HH:MM:SS or HH:MM format
      let timeFormatted = '';
      try {
        // Create a date object for time formatting
        const timeDate = new Date(`2000-01-01T${timeStr}`);
        if (isValid(timeDate)) {
          timeFormatted = format(timeDate, 'h:mm a');
          return `${dateFormatted} at ${timeFormatted}`;
        }
      } catch (timeError) {
        // If time formatting fails, just return the date
        console.warn('Time formatting error:', timeError);
      }

      return dateFormatted;
    } catch (error) {
      console.warn('Date formatting error:', error);
      return null;
    }
  };

  // Categorize tasks into quadrants
  const urgentImportant = tasks.filter(task => task.is_urgent && task.is_important);
  const notUrgentImportant = tasks.filter(task => !task.is_urgent && task.is_important);
  const urgentNotImportant = tasks.filter(task => task.is_urgent && !task.is_important);
  const notUrgentNotImportant = tasks.filter(task => !task.is_urgent && !task.is_important);

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const dateTimeDisplay = formatTaskDateTime(task.due_date, task.start_time);
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
        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer select-none"
        onClick={handleCardClick}
        onDoubleClick={handleCardDoubleClick}
        title={isMobile ? "Tap to edit" : "Double-click to edit"}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm leading-tight truncate">{task.title}</h4>
            {dateTimeDisplay ? (
              <div className="flex items-center mt-1 text-xs text-gray-500">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{dateTimeDisplay}</span>
              </div>
            ) : task.due_date || task.start_time ? (
              <div className="flex items-center mt-1 text-xs text-gray-500">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>Unscheduled</span>
              </div>
            ) : (
              <div className="flex items-center mt-1 text-xs text-gray-400">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>No date set</span>
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
        
        {/* Task badges */}
        <div className="flex flex-wrap gap-1 mb-2">
          {task.is_authentic_deposit && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Authentic Deposit
            </span>
          )}
          {task.is_twelve_week_goal && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              12-Week Goal
            </span>
          )}
        </div>

        {/* Roles and domains */}
        <div className="flex flex-wrap gap-1">
          {task.task_roles?.slice(0, 2).map(({ role_id }) => (
            roles[role_id] && (
              <span key={role_id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700 truncate max-w-20">
                {roles[role_id].label}
              </span>
            )
          ))}
          {task.task_domains?.slice(0, 2).map(({ domain_id }) => (
            domains[domain_id] && (
              <span key={domain_id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700 truncate max-w-20">
                {domains[domain_id].name}
              </span>
            )
          ))}
          {(task.task_roles?.length > 2 || task.task_domains?.length > 2) && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-600">
              +{(task.task_roles?.length || 0) + (task.task_domains?.length || 0) - 4}
            </span>
          )}
        </div>
      </div>
    );
  };

  const QuadrantSection: React.FC<{ 
    id: string;
    title: string; 
    tasks: Task[]; 
    bgColor: string;
    textColor: string;
    icon: React.ReactNode;
  }> = ({ id, title, tasks, bgColor, textColor, icon }) => {
    const isCollapsed = collapsedQuadrants[id];
    
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className={`${bgColor} ${textColor} p-3 rounded-t-lg flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              {icon}
              <h3 className="font-semibold text-sm truncate">{title}</h3>
              <span className="text-xs opacity-75 flex-shrink-0">({tasks.length})</span>
            </div>
            <button
              onClick={() => toggleQuadrant(id)}
              className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors flex-shrink-0"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        
        {!isCollapsed && (
          <div className="flex-1 p-3 bg-gray-50 rounded-b-lg overflow-y-auto min-h-0">
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-8">No tasks in this category</p>
              ) : (
                tasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>
        )}
        
        {isCollapsed && (
          <div className="h-2 bg-gray-50 rounded-b-lg flex-shrink-0"></div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Task Priorities</h2>
        <p className="text-gray-600 mt-1">
          Organize your tasks by urgency and importance • {isMobileDevice() ? 'Tap' : 'Double-click'} to edit
        </p>
      </div>

      {/* Desktop: 2x2 Grid with proper scrolling */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <div className="hidden md:grid md:grid-cols-2 gap-4 h-full">
          {/* Urgent & Important */}
          <QuadrantSection
            id="urgent-important"
            title="Urgent & Important"
            tasks={urgentImportant}
            bgColor="bg-red-500"
            textColor="text-white"
            icon={<AlertTriangle className="h-4 w-4 flex-shrink-0" />}
          />

          {/* Not Urgent & Important */}
          <QuadrantSection
            id="not-urgent-important"
            title="Not Urgent & Important"
            tasks={notUrgentImportant}
            bgColor="bg-green-500"
            textColor="text-white"
            icon={<Check className="h-4 w-4 flex-shrink-0" />}
          />

          {/* Urgent & Not Important */}
          <QuadrantSection
            id="urgent-not-important"
            title="Urgent & Not Important"
            tasks={urgentNotImportant}
            bgColor="bg-yellow-500"
            textColor="text-white"
            icon={<Clock className="h-4 w-4 flex-shrink-0" />}
          />

          {/* Not Urgent & Not Important */}
          <QuadrantSection
            id="not-urgent-not-important"
            title="Not Urgent & Not Important"
            tasks={notUrgentNotImportant}
            bgColor="bg-gray-500"
            textColor="text-white"
            icon={<X className="h-4 w-4 flex-shrink-0" />}
          />
        </div>

        {/* Mobile: Stacked Layout with scrolling */}
        <div className="md:hidden space-y-4 h-full overflow-y-auto">
          <QuadrantSection
            id="urgent-important"
            title="Urgent & Important"
            tasks={urgentImportant}
            bgColor="bg-red-500"
            textColor="text-white"
            icon={<AlertTriangle className="h-4 w-4 flex-shrink-0" />}
          />

          <QuadrantSection
            id="not-urgent-important"
            title="Not Urgent & Important"
            tasks={notUrgentImportant}
            bgColor="bg-green-500"
            textColor="text-white"
            icon={<Check className="h-4 w-4 flex-shrink-0" />}
          />

          <QuadrantSection
            id="urgent-not-important"
            title="Urgent & Not Important"
            tasks={urgentNotImportant}
            bgColor="bg-yellow-500"
            textColor="text-white"
            icon={<Clock className="h-4 w-4 flex-shrink-0" />}
          />

          <QuadrantSection
            id="not-urgent-not-important"
            title="Not Urgent & Not Important"
            tasks={notUrgentNotImportant}
            bgColor="bg-gray-500"
            textColor="text-white"
            icon={<X className="h-4 w-4 flex-shrink-0" />}
          />
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl mx-4">
            <EditTask
              task={editingTask}
              onTaskUpdated={handleTaskUpdated}
              onCancel={handleEditCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskQuadrants;