import React, { useState, useRef, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { Check, UserPlus, X, Clock, AlertTriangle, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import TaskEventForm from '../tasks/TaskEventForm';
import { formatTaskForForm } from '../../utils/taskHelpers'; 
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
// 2. UnscheduledPriorities Component (Main Component)
// =========================================================
interface UnscheduledPrioritiesProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  roles: Record<string, Role>;
  domains: Record<string, Domain>;
  loading: boolean;
 }

const UnscheduledPriorities: React.FC<UnscheduledPrioritiesProps> = ({ tasks, setTasks, roles, domains, loading }) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null);

const memoizedInitialData = useMemo(
  () => formatTaskForForm(editingTask),
  [editingTask]
);  

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
  };

  const handleTaskUpdated = () => {
    setEditingTask(null);
    // Refresh tasks after update
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

  const formatTaskDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return null;
    }
  };

  const getPriorityColor = (task: Task) => {
    if (task.status === "completed") return "border-blue-500";
    if (task.is_urgent && task.is_important) return "border-red-500";
    if (!task.is_urgent && task.is_important) return "border-green-500";
    if (task.is_urgent && !task.is_important) return "border-yellow-400";
    return "border-gray-400";
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
                
<h2 className="text-sm font-bold text-gray-800 mb-2">Your Priorities</h2>
{loading ? (
  <div className="flex h-32 items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
  </div>
) : (
  tasks.length === 0 ? (
    <p className="text-gray-500 italic text-center py-6">No unscheduled tasks.</p>
  ) : (
    <div className="space-y-2">
      {tasks.map((task, idx) => (
        <div
          key={task.id}
          data-task-id={task.id}
          draggable="true"
          className={`flex items-center justify-between border rounded-lg shadow bg-white px-3 py-2 hover:shadow-md cursor-pointer transition border-l-4 ${getPriorityColor(task)}`}
          onClick={() => setEditingTask(task)}
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm flex items-center gap-2">
              {task.title}
              {task.due_date && (
                <span className="text-xs text-gray-500 font-normal">
                  ({formatTaskDate(task.due_date)})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              className="hover:text-indigo-600 p-1"
              title="Follow Up"
              onClick={(e) => { 
                e.stopPropagation(); 
                // Add follow up functionality here if needed
              }}
            >
              <Bell className="w-3 h-3" />
            </button>
            <button
              className="hover:text-green-600 p-1"
              title="Complete"
              onClick={(e) => { 
                e.stopPropagation(); 
                handleTaskAction(task.id, 'complete');
              }}
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              className="hover:text-blue-600 p-1"
              title="Delegate"
              onClick={(e) => { 
                e.stopPropagation(); 
                handleTaskAction(task.id, 'delegate');
              }}
            >
              <UserPlus className="w-3 h-3" />
            </button>
            <button
              className="hover:text-red-600 p-1"
              title="Cancel"
              onClick={(e) => { 
                e.stopPropagation(); 
                handleTaskAction(task.id, 'cancel');
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
)}
          
        </div>

        {editingTask && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="w-full max-w-2xl mx-4">
      <TaskEventForm
        key={editingTask.id || "editing"}
        mode="edit"
        initialData={memoizedInitialData}
        onClose={() => setEditingTask(null)}
        onSubmitSuccess={handleTaskUpdated}
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