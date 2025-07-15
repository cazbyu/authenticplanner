import React, { useState, useEffect } from 'react';
import { Clock, User, Mail, X, CheckCircle, XCircle, Users, Calendar, Target, AlertTriangle, ChevronDown, ChevronUp, Check, UserPlus } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import DelegateTaskModal from './DelegateTaskModal';
import EditTask from './EditTask';

interface Task {
  id: string;
  title: string;
  due_date?: string;
  time?: string;
  status: string;
  is_urgent: boolean;
  is_important: boolean;
  is_authentic_deposit: boolean;
  priority?: number;
  notes?: string;
  completed_at?: string;
  delegated_to_name?: string;
  delegated_to_email?: string;
  delegates?: {
    name: string;
    email: string;
  };
  task_roles?: Array<{
    role_id: string;
    role?: {
      label: string;
    };
  }>;
  task_domains?: Array<{
    domain_id: string;
    domain?: {
      name: string;
    };
  }>;
  created_at?: string;
}

interface Role {
  id: string;
  label: string;
  category?: string;
  icon?: string;
}

interface Domain {
  id: string;
  name: string;
  description?: string;
}

interface TaskQuadrantsProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  roles: Record<string, Role>;
  domains: Record<string, Domain>;
  loading: boolean;
}

type SortOption = 'priority' | 'due_date' | 'delegated';

const TaskQuadrants: React.FC<TaskQuadrantsProps> = ({ tasks, setTasks, roles, domains, loading }) => {
  const [sortBy, setSortBy] = useState<'priority' | 'due_date' | 'delegated' | 'completed'>('priority');
  const [delegatedTasks, setDelegatedTasks] = useState<Task[]>([]);
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [collapsedQuadrants, setCollapsedQuadrants] = useState({
    'urgent-important': false,
    'not-urgent-important': false,
    'urgent-not-important': false,
    'not-urgent-not-important': false,
  });

  const toggleQuadrant = (quadrantId: string) => {
    setCollapsedQuadrants(prev => ({
      ...prev,
      [quadrantId]: !prev[quadrantId]
    }));
  };

  const handleTaskAction = async (taskId: string, action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Handle delegation differently - open modal instead of direct action
    if (action === 'delegate') {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setDelegatingTask(task);
      }
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let updates: any = {};
      
      if (action === 'complete') {
        updates.completed_at = new Date().toISOString();
        updates.status = 'completed';
      }

      const { error } = await supabase
        .from('0007-ap-tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task:', error);
        return;
      }

      if (action === 'complete') {
        // Remove from both regular tasks and delegated tasks
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        setDelegatedTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      } else {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, ...updates } : task
          )
        );
      }
    } catch (error) {
      console.error('Error in handleTaskAction:', error);
    }
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
  };

  const handleTaskUpdated = () => {
    setEditingTask(null);
    // Refresh both task lists
    if (sortBy === 'delegated') {
      fetchFilteredTasks();
    }
    // The parent component will handle refreshing the main tasks via refreshTrigger
  };

  const handleEditCancel = () => {
    setEditingTask(null);
  };

  const handleTaskDelegated = () => {
    setDelegatingTask(null);
    // Remove the delegated task from the current view
    if (delegatingTask) {
      setTasks(prevTasks => prevTasks.filter(task => task.id !== delegatingTask.id));
    }
  };

  const fetchFilteredTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('0007-ap-tasks')
        .select(`
          id,
          title,
          due_date,
          time,
          is_urgent,
          is_important,
          priority,
          notes,
          created_at,
          completed_at,
          delegated_to_contact_id,
          delegates:delegated_to_contact_id(name, email),
          0007-ap-task_roles(role_id, 0007-ap-roles:role_id(label))
        `)
        .eq('user_id', user.id);
        
      if (sortBy === 'delegated') {
        query = query.eq('status', 'delegated').is('completed_at', null);
      } else if (sortBy === 'completed') {
        query = query.eq('status', 'completed').not('completed_at', 'is', null);
      }
      
      query = query.order('due_date', { ascending: true });
      
      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching ${sortBy} tasks:`, error);
        return;
      }

      if (sortBy === 'delegated' || sortBy === 'completed') {
        setDelegatedTasks(data || []);
      }
    } catch (error) {
      console.error(`Error fetching ${sortBy} tasks:`, error);
    }
  };

  useEffect(() => {
    if (sortBy === 'delegated' || sortBy === 'completed') {
      fetchFilteredTasks();
    }
  }, [sortBy]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  const sortTasks = (taskList: Task[]) => {
    switch (sortBy) {
      case 'due_date':
        return [...taskList].sort((a, b) => {
          if (a.due_date && b.due_date) {
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          }
          if (a.due_date && !b.due_date) return -1;
          if (!a.due_date && b.due_date) return 1;
          return a.title.localeCompare(b.title);
        });
      case 'delegated':
      case 'completed':
        return delegatedTasks;
      case 'priority':
      default:
        return taskList;
    }
  };

  const TaskCard: React.FC<{ task: Task; borderColor: string }> = ({ task, borderColor }) => {
    const handleCardDoubleClick = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      handleTaskEdit(task);
    };

    return (
    <div 
      className={`bg-white border-l-4 ${borderColor} border-r border-t border-b border-gray-200 rounded-r-lg p-3 mb-2 hover:shadow-md transition-all cursor-pointer`}
      onDoubleClick={handleCardDoubleClick}
      title="Double-click to edit task"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm mb-1">{task.title}</h4>
          
          {task.due_date && (
            <div className="flex items-center text-xs text-gray-600 mb-2">
              <Clock className="h-3 w-3 mr-1" />
              <span>Due {formatDate(task.due_date)}</span>
            </div>
          )}

          {/* Role and Domain Tags */}
          <div className="flex flex-wrap gap-1">
            {task.task_roles?.slice(0, 1).map(({ role_id }) => (
              roles[role_id] && (
                <span key={role_id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                  {roles[role_id].label}
                </span>
              )
            ))}
            {task.task_domains?.slice(0, 1).map(({ domain_id }) => (
              domains[domain_id] && (
                <span key={domain_id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                  {domains[domain_id].name}
                </span>
              )
            ))}
            {task.is_authentic_deposit && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                Deposit
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 ml-2">
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
    </div>
    );
  };

  const QuadrantSection: React.FC<{
    id: string;
    title: string;
    tasks: Task[];
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: React.ReactNode;
  }> = ({ id, title, tasks, bgColor, textColor, borderColor, icon }) => {
    const isCollapsed = collapsedQuadrants[id];
    
    return (
      <div className="h-full flex flex-col">
        {/* Header - Always visible */}
        <button 
          className={`w-full ${bgColor} ${textColor} px-4 py-3 rounded-lg flex items-center justify-between hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          onClick={() => toggleQuadrant(id)}
          type="button"
        >
          <div className="flex items-center space-x-2">
            {icon}
            <span className="font-medium text-sm">{title}</span>
            <span className="text-sm opacity-90">({tasks.length})</span>
          </div>
          <div className="flex-shrink-0">
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </div>
        </button>
        
        {/* Content - Only visible when expanded */}
        {!isCollapsed && (
          <div className="flex-1 bg-gray-50 rounded-lg mt-2 overflow-hidden">
            <div className="h-full overflow-y-auto p-3">
              {tasks.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-4">
                  No unscheduled tasks in this category
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      borderColor={borderColor}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const sortedTasks = sortTasks(tasks);

  // Filter tasks by quadrant for priority view
  const urgentImportant = sortedTasks.filter(task => task.is_urgent && task.is_important && !task.completed_at);
  const notUrgentImportant = sortedTasks.filter(task => !task.is_urgent && task.is_important && !task.completed_at);
  const urgentNotImportant = sortedTasks.filter(task => task.is_urgent && !task.is_important && !task.completed_at);
  const notUrgentNotImportant = sortedTasks.filter(task => !task.is_urgent && !task.is_important && !task.completed_at);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">All Task Priorities</h1>
        <div className="flex items-center">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'priority' | 'due_date' | 'delegated' | 'completed')}
              className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="priority">Sort: Priority</option>
              <option value="due_date">Sort: Due Date</option>
              <option value="delegated">Sort: Delegated</option>
              <option value="completed">Sort: Completed</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {sortBy === 'priority' ? (
          /* Priority Quadrant View - Vertical Layout */
          <div className="h-full p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Top Row */}
              <div className="flex flex-col">
                {/* Urgent & Important - Top Left */}
                <QuadrantSection
                  id="urgent-important"
                  title="Urgent & Important"
                  tasks={urgentImportant}
                  bgColor="bg-red-500"
                  textColor="text-white"
                  borderColor="border-l-red-500"
                  icon={<AlertTriangle className="h-4 w-4" />}
                />
              </div>
              
              <div className="flex flex-col">
                {/* Not Urgent & Important - Top Right */}
                <QuadrantSection
                  id="not-urgent-important"
                  title="Not Urgent & Important"
                  tasks={notUrgentImportant}
                  bgColor="bg-green-500"
                  textColor="text-white"
                  borderColor="border-l-green-500"
                  icon={<Check className="h-4 w-4" />}
                />
              </div>
              
              <div className="flex flex-col">
                {/* Urgent & Not Important - Bottom Left */}
                <QuadrantSection
                  id="urgent-not-important"
                  title="Urgent & Not Important"
                  tasks={urgentNotImportant}
                  bgColor="bg-orange-500"
                  textColor="text-white"
                  borderColor="border-l-orange-500"
                  icon={<Clock className="h-4 w-4" />}
                />
              </div>
              
              <div className="flex flex-col">
                {/* Not Urgent & Not Important - Bottom Right */}
                <QuadrantSection
                  id="not-urgent-not-important"
                  title="Not Urgent & Not Important"
                  tasks={notUrgentNotImportant}
                  bgColor="bg-gray-500"
                  textColor="text-white"
                  borderColor="border-l-gray-500"
                  icon={<X className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>
        ) : (
          /* List View for Due Date and Delegated */
          <div className="h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="space-y-2">
              {sortedTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {sortBy === 'delegated' ? 'No delegated tasks found' : 'No tasks found'}
                </p>
              ) : (
                sortedTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    borderColor="border-l-blue-500"
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delegate Task Modal */}
      {delegatingTask && (
        <DelegateTaskModal
          taskId={delegatingTask.id}
          taskTitle={delegatingTask.title}
          onClose={() => setDelegatingTask(null)}
          onDelegated={handleTaskDelegated}
        />
      )}

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