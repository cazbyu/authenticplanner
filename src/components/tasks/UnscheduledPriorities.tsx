import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Check, UserPlus, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import EditTask from './EditTask';
import DelegateTaskModal from './DelegateTaskModal';

// Helper Interfaces
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

// =========================================================
// 1. QuadrantSection Component (Moved Outside)
// =========================================================
interface QuadrantSectionProps {
  id: string;
  title: string;
  tasks: Task[];
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: React.ReactNode;
  isCollapsed: boolean;
  onToggle: (id: string) => void;
  onTaskCardClick: (task: Task) => void;
  roles: Record<string, Role>;
  domains: Record<string, Domain>;
  handleTaskAction: (taskId: string, action: 'complete' | 'delegate' | 'cancel') => void;
}

const QuadrantSection: React.FC<QuadrantSectionProps> = ({
  id,
  title,
  tasks,
  bgColor,
  borderColor,
  textColor,
  icon,
  isCollapsed,
  onToggle,
  onTaskCardClick,
  roles,
  domains,
  handleTaskAction,
}) => {
  return (
    <div className="mb-4">
      <button
        className={`w-full ${bgColor} ${textColor} px-3 py-2 rounded-lg ...`}
        onClick={() => onToggle(id)}
        type="button"
      >
        {/* ... button content ... */}
      </button>

      {!isCollapsed && (
        <div className="mt-1 bg-gray-50 rounded-lg">
          <div className="space-y-2 p-3">
            {tasks.length > 0 ? (
              tasks.map((task, index) => (
                // This is the fully corrected task card div
                <div
                  key={task.id}
                  onClick={() => onTaskCardClick(task)}
                  className={`bg-white border-l-4 ${borderColor} ...`}
                  data-task-id={task.id}
                  draggable="true"
                >
                  {/* ... content of the task card ... */}
                </div>
              ))
            ) : (
              <p className="text-gray-500 ...">
                No unscheduled tasks in this category
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================
// 2. UnscheduledPriorities Component (Main Component)
// =========================================================
interface UnscheduledPrioritiesProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  roles: Record<string, Role>;
  domains: Record<string, Domain>;
  loading: boolean;
  viewMode?: 'quadrant' | 'list';
}

const UnscheduledPriorities: React.FC<UnscheduledPrioritiesProps> = ({ tasks, setTasks, roles, domains, loading, viewMode = 'quadrant' }) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null);

  // Internal state for collapsing sections
  const [collapsedQuadrants, setCollapsedQuadrants] = useState({
    'urgent-important': false,
    'not-urgent-important': false,
    'urgent-not-important': false,
    'not-urgent-not-important': false,
  });

  // Internal function to toggle sections
  const toggleQuadrant = (quadrantId: string) => {
    setCollapsedQuadrants(prev => ({
      ...prev,
      [quadrantId]: !prev[quadrantId as keyof typeof prev],
    }));
  };
  
  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
  };

  const handleTaskUpdated = () => {
    setEditingTask(null);
    // Refresh tasks after update
    window.location.reload(); // Simple refresh for now
  };

  const handleTaskAction = async (taskId: string, action: 'complete' | 'delegate' | 'cancel') => {
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
      } else if (action === 'cancel') {
        updates.status = 'cancelled';
      }

      const { error } = await supabase
        .from('0007-ap-tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task:', error);
        return;
      }

      // Remove task from local state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error in handleTaskAction:', error);
    }
  };

  const handleTaskDelegated = () => {
    setDelegatingTask(null);
    // Remove the delegated task from the current view
    if (delegatingTask) {
      setTasks(prevTasks => prevTasks.filter(task => task.id !== delegatingTask.id));
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return null;
    }
  };

  // Categorize tasks
  const categorizedTasks = {
    urgentImportant: tasks.filter(task => task.is_urgent && task.is_important),
    notUrgentImportant: tasks.filter(task => !task.is_urgent && task.is_important),
    urgentNotImportant: tasks.filter(task => task.is_urgent && !task.is_important),
    notUrgentNotImportant: tasks.filter(task => !task.is_urgent && !task.is_important),
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-visible" style={{ minHeight: '100%' }}>
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin space-y-4" style={{ height: '100%', overflowY: 'auto' }}>
          
          <QuadrantSection
            id="urgent-important"
            title="Urgent & Important"
            tasks={categorizedTasks.urgentImportant}
            bgColor="bg-red-500"
            borderColor="border-l-red-500"
            textColor="text-white"
            icon={<AlertTriangle className="h-3 w-3 flex-shrink-0" />}
            isCollapsed={collapsedQuadrants['urgent-important']}
            onToggle={toggleQuadrant}
            onTaskCardClick={handleTaskEdit}
            roles={roles}
            domains={domains}
            handleTaskAction={handleTaskAction}
          />

          <QuadrantSection
            id="not-urgent-important"
            title="Not Urgent & Important"
            tasks={categorizedTasks.notUrgentImportant}
            bgColor="bg-green-500"
            borderColor="border-l-green-500"
            textColor="text-white"
            icon={<Check className="h-3 w-3 flex-shrink-0" />}
            isCollapsed={collapsedQuadrants['not-urgent-important']}
            onToggle={toggleQuadrant}
            onTaskCardClick={handleTaskEdit}
            roles={roles}
            domains={domains}
            handleTaskAction={handleTaskAction}
          />
          
          <QuadrantSection
            id="urgent-not-important"
            title="Urgent & Not Important"
            tasks={categorizedTasks.urgentNotImportant}
            bgColor="bg-orange-500"
            borderColor="border-l-orange-500"
            textColor="text-white"
            icon={<Clock className="h-3 w-3 flex-shrink-0" />}
            isCollapsed={collapsedQuadrants['urgent-not-important']}
            onToggle={toggleQuadrant}
            onTaskCardClick={handleTaskEdit}
            roles={roles}
            domains={domains}
            handleTaskAction={handleTaskAction}
          />

          <QuadrantSection
            id="not-urgent-not-important"
            title="Not Urgent & Not Important"
            tasks={categorizedTasks.notUrgentNotImportant}
            bgColor="bg-gray-500"
            borderColor="border-l-gray-500"
            textColor="text-white"
            icon={<X className="h-3 w-3 flex-shrink-0" />}
            isCollapsed={collapsedQuadrants['not-urgent-not-important']}
            onToggle={toggleQuadrant}
            onTaskCardClick={handleTaskEdit}
            roles={roles}
            domains={domains}
            handleTaskAction={handleTaskAction}
          />
        </div>

        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl mx-4">
              <EditTask
                task={editingTask}
                onTaskUpdated={handleTaskUpdated}
                onCancel={() => setEditingTask(null)}
              />
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
    </>
  );
};

export default UnscheduledPriorities;