import React, { useState, useEffect } from 'react';
import { Clock, User, Mail, X, CheckCircle, XCircle, Users, Calendar, Target, AlertTriangle, ChevronDown, ChevronUp, Check, UserPlus } from 'lucide-react';
import { supabase } from '../../supabaseClient';

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

const TaskQuadrants: React.FC<TaskQuadrantsProps> = ({ tasks, setTasks, roles, domains, loading }) => {
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
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let updates: any = {};
      
      if (action === 'complete') {
        updates.completed_at = new Date().toISOString();
        updates.status = 'completed';
      } else if (action === 'delegate') {
        updates.status = 'delegated';
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
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
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

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  const TaskCard: React.FC<{ task: Task; borderColor: string }> = ({ task, borderColor }) => (
    <div className={`bg-white border-l-4 ${borderColor} border-r border-t border-b border-gray-200 rounded-r-lg p-3 mb-2 hover:shadow-md transition-all`}>
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
      <div className="mb-4">
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
          <div className="mt-2 bg-gray-50 rounded-lg p-3">
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

  // Filter tasks by quadrant
  const urgentImportant = tasks.filter(task => task.is_urgent && task.is_important && !task.completed_at);
  const notUrgentImportant = tasks.filter(task => !task.is_urgent && task.is_important && !task.completed_at);
  const urgentNotImportant = tasks.filter(task => task.is_urgent && !task.is_important && !task.completed_at);
  const notUrgentNotImportant = tasks.filter(task => !task.is_urgent && !task.is_important && !task.completed_at);

  return (
    <div className="space-y-4 p-4">
      {/* Urgent & Important - Red */}
      <QuadrantSection
        id="urgent-important"
        title="Urgent & Important"
        tasks={urgentImportant}
        bgColor="bg-red-500"
        textColor="text-white"
        borderColor="border-l-red-500"
        icon={<AlertTriangle className="h-4 w-4" />}
      />

      {/* Not Urgent & Important - Green */}
      <QuadrantSection
        id="not-urgent-important"
        title="Not Urgent & Important"
        tasks={notUrgentImportant}
        bgColor="bg-green-500"
        textColor="text-white"
        borderColor="border-l-green-500"
        icon={<Check className="h-4 w-4" />}
      />

      {/* Urgent & Not Important - Orange */}
      <QuadrantSection
        id="urgent-not-important"
        title="Urgent & Not Important"
        tasks={urgentNotImportant}
        bgColor="bg-orange-500"
        textColor="text-white"
        borderColor="border-l-orange-500"
        icon={<Clock className="h-4 w-4" />}
      />

      {/* Not Urgent & Not Important - Gray */}
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
  );
};

export default TaskQuadrants;