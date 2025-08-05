import React, { useState, useEffect, useMemo } from 'react';
import { Clock, X, Check, UserPlus, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import DelegateTaskModal from './DelegateTaskModal';
import TaskEventForm from '../tasks/TaskEventForm';
import { formatTaskForForm } from '../../utils/taskHelpers';
import UniversalTaskCard from '../tasks/UniversalTaskCard';

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
  task_roles?: Array<{ role_id: string; role?: { label: string } }>;
  task_domains?: Array<{ domain_id: string; domain?: { name: string } }>;
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

const TaskQuadrants: React.FC<TaskQuadrantsProps> = ({ tasks, setTasks, roles, domains, loading }) => {
  const [sortBy, setSortBy] = useState<'priority' | 'due_date' | 'delegated' | 'completed'>('priority');
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const memoizedInitialData = useMemo(() => formatTaskForForm(editingTask), [editingTask]);

  const [collapsedQuadrants, setCollapsedQuadrants] = useState({
    'urgent-important': false,
    'not-urgent-important': false,
    'urgent-not-important': false,
    'not-urgent-not-important': false,
  });

  const toggleQuadrant = (quadrantId: string) => {
    setCollapsedQuadrants(prev => ({
      ...prev,
      [quadrantId]: !prev[quadrantId],
    }));
  };

  const handleTaskAction = async (taskId: string, action: string, e: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (action === 'delegate') {
      const task = tasks.find(t => t.id === taskId);
      if (task) setDelegatingTask(task);
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
      if (action === 'cancel') {
        updates.status = 'canceled';
      }
      const { error } = await supabase
        .from('0007-ap-tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task:', error);
        return;
      }

      if (action === 'complete' || action === 'cancel') {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        setFilteredTasks(prev => prev.filter(task => task.id !== taskId));
      } else {
        setTasks(prev => prev.map(task => (task.id === taskId ? { ...task, ...updates } : task)));
      }
    } catch (error) {
      console.error('Error in handleTaskAction:', error);
    }
  };

  const handleTaskEdit = (task: Task) => setEditingTask(task);

  const handleTaskUpdated = () => {
    setEditingTask(null);
    if (sortBy === 'delegated') fetchFilteredTasks();
  };

  const handleEditCancel = () => setEditingTask(null);

  const handleTaskDelegated = () => {
    setDelegatingTask(null);
    if (delegatingTask) {
      setTasks(prev => prev.filter(task => task.id !== delegatingTask.id));
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
          is_urgent,
          is_important,
          created_at,
          completed_at,
          status,
          task_roles,
          task_domains
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
        setFilteredTasks(data || []);
      }
    } catch (error) {
      console.error(`Error fetching ${sortBy} tasks:`, error);
    }
  };

  useEffect(() => {
    if (sortBy === 'delegated' || sortBy === 'completed') fetchFilteredTasks();
  }, [sortBy]);

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
        return filteredTasks;
      case 'priority':
      default:
        return taskList;
    }
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
      <div className="h-full flex flex-col">
        <button
          className={`w-full ${bgColor} ${textColor} px-4 py-3 rounded-lg flex items-center justify-between hover:opacity-90 transition-opacity`}
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
        {!isCollapsed && (
          <div className="flex-1 bg-gray-50 rounded-lg mt-2 overflow-hidden">
            <div className="h-full overflow-y-auto p-3">
              {tasks.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-4">
                  No unscheduled tasks in this category
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => (
                    <UniversalTaskCard
                      key={task.id}
                      task={{
                        ...task,
                        roles: (task.task_roles || []).map(tr => roles[tr.role_id]?.label).filter(Boolean),
                        domains: (task.task_domains || []).map(td => domains[td.domain_id]?.name).filter(Boolean),
                      }}
                      onOpen={() => handleTaskEdit(task)}
                      onComplete={id => handleTaskAction(id, 'complete', { stopPropagation: () => {} } as any)}
                      onDelegate={id => handleTaskAction(id, 'delegate', { stopPropagation: () => {} } as any)}
                      onCancel={id => handleTaskAction(id, 'cancel', { stopPropagation: () => {} } as any)}
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
        <h1 className="text-2xl font-bold text-gray-900">Task Priorities</h1>
        <div className="flex items-center">
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
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
          <div className="h-full p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="flex flex-col">
                <QuadrantSection
                  id="urgent-important"
                  title="Urgent & Important"
                  tasks={urgentImportant}
                  bgColor="bg-red-500"
                  textColor="text-white"
                  icon={<AlertTriangle className="h-4 w-4" />}
                />
              </div>
              <div className="flex flex-col">
                <QuadrantSection
                  id="not-urgent-important"
                  title="Not Urgent & Important"
                  tasks={notUrgentImportant}
                  bgColor="bg-green-500"
                  textColor="text-white"
                  icon={<Check className="h-4 w-4" />}
                />
              </div>
              <div className="flex flex-col">
                <QuadrantSection
                  id="urgent-not-important"
                  title="Urgent & Not Important"
                  tasks={urgentNotImportant}
                  bgColor="bg-yellow-400"
                  textColor="text-white"
                  icon={<Clock className="h-4 w-4" />}
                />
              </div>
              <div className="flex flex-col">
                <QuadrantSection
                  id="not-urgent-not-important"
                  title="Not Urgent & Not Important"
                  tasks={notUrgentNotImportant}
                  bgColor="bg-gray-500"
                  textColor="text-white"
                  icon={<X className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="space-y-2">
              {sortedTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {sortBy === 'delegated' ? 'No delegated tasks found' : 'No tasks found'}
                </p>
              ) : (
                sortedTasks.map(task => (
                  <UniversalTaskCard
                    key={task.id}
                    task={{
                      ...task,
                      roles: (task.task_roles || []).map(tr => roles[tr.role_id]?.label).filter(Boolean),
                      domains: (task.task_domains || []).map(td => domains[td.domain_id]?.name).filter(Boolean),
                    }}
                    onOpen={() => handleTaskEdit(task)}
                    onComplete={id => handleTaskAction(id, 'complete', { stopPropagation: () => {} } as any)}
                    onDelegate={id => handleTaskAction(id, 'delegate', { stopPropagation: () => {} } as any)}
                    onCancel={id => handleTaskAction(id, 'cancel', { stopPropagation: () => {} } as any)}
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
            <TaskEventForm
              key={editingTask.id || "editing"}
              mode="edit"
              initialData={memoizedInitialData}
              onClose={handleEditCancel}
              onSubmitSuccess={handleTaskUpdated}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskQuadrants;
