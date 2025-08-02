import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Check, UserPlus, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
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

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return null;
    }
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
                
<h2 className="text-lg font-bold text-gray-800 mb-2">Your Priorities</h2>
{loading ? (
  <div className="flex h-32 items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
  </div>
) : (
  tasks.length === 0 ? (
    <p className="text-gray-500 italic text-center py-6">No unscheduled tasks.</p>
  ) : (
    <ul className="space-y-1">
      {tasks.map((task, idx) => (
        <li
          key={task.id}
          data-task-id={task.id}
          draggable="true"
          onClick={() => setEditingTask(task)}
          className="flex items-center bg-white border border-gray-200 rounded-md px-2 py-1 shadow-sm hover:bg-blue-50 cursor-pointer text-xs"
        >
          <span className="text-gray-600 font-medium flex-1 truncate">
            {idx + 1}. {task.title}
          </span>
        </li>
      ))}
    </ul>
  )
)}
          
        </div>

        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl mx-4">
              <TaskEventForm
              mode="edit"
              initialData={formatTaskForForm(editingTask)}
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