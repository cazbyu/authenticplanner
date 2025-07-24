import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Clock, X, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

// --- Type Definitions (aligned with 0004-ap- schema) ---
interface Task {
  id: string;
  title: string;
  'due-date'?: string;
  status: string;
  'is-urgent': boolean;
  'is-important': boolean;
  'is-authentic-deposit': boolean;
  'task-roles'?: Array<{ 'role-id': string; role?: { label: string; } }>;
  'task-domains'?: Array<{ 'domain-id': string; domain?: { name: string; } }>;
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
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  roles: Record<string, Role>;
  domains: Record<string, Domain>;
  loading: boolean;
}

/**
 * TaskQuadrants displays ALL tasks (scheduled and unscheduled) in the
 * Urgent/Important matrix format. It's a read-only analysis view.
 */
const TaskQuadrants: React.FC<TaskQuadrantsProps> = ({ tasks, roles, domains, loading }) => {
  const [collapsedQuadrants, setCollapsedQuadrants] = useState({
    'urgent-important': false,
    'not-urgent-important': false,
    'urgent-not-important': false,
    'not-urgent-not-important': false,
  });

  const toggleQuadrant = (quadrantId: string) => {
    setCollapsedQuadrants(prev => ({ ...prev, [quadrantId]: !prev[quadrantId] }));
  };

  const categorizeTasks = (taskList: Task[]) => ({
    urgentImportant: taskList.filter(t => t['is-urgent'] && t['is-important']),
    notUrgentImportant: taskList.filter(t => !t['is-urgent'] && t['is-important']),
    urgentNotImportant: taskList.filter(t => t['is-urgent'] && !t['is-important']),
    notUrgentNotImportant: taskList.filter(t => !t['is-urgent'] && !t['is-important']),
  });

  const { urgentImportant, notUrgentImportant, urgentNotImportant, notUrgentNotImportant } = categorizeTasks(tasks);

  // --- Sub-Components ---
  const TaskCard: React.FC<{ task: Task; borderColor: string }> = ({ task, borderColor }) => (
    <div className={`bg-white border-l-4 ${borderColor} rounded-r-lg p-3 shadow-sm`}>
      <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
      {/* Add more task details if needed */}
    </div>
  );

  const QuadrantSection: React.FC<{ id: string; title: string; tasks: Task[]; bgColor: string; textColor: string; borderColor: string; icon: React.ReactNode; }> = ({ id, title, tasks, bgColor, textColor, borderColor, icon }) => {
    const isCollapsed = collapsedQuadrants[id as keyof typeof collapsedQuadrants];
    return (
      <div className="flex flex-col">
        <button onClick={() => toggleQuadrant(id)} className={`w-full ${bgColor} ${textColor} px-4 py-3 rounded-lg flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            {icon}
            <span className="font-medium text-sm">{title}</span>
            <span>({tasks.length})</span>
          </div>
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        {!isCollapsed && (
          <div className="bg-gray-50 rounded-b-lg p-3 space-y-2">
            {tasks.length > 0 ? tasks.map(task => <TaskCard key={task.id} task={task} borderColor={borderColor} />) : <p className="text-xs text-gray-500 italic">No tasks in this category.</p>}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center">Loading tasks...</div>;

  return (
    <div className="h-full flex flex-col p-4 bg-gray-100">
      <header className="pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Task Priorities Matrix</h1>
        <p className="text-sm text-gray-600">A complete overview of all your active tasks.</p>
      </header>
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4">
        <QuadrantSection id="urgent-important" title="Urgent & Important" tasks={urgentImportant} bgColor="bg-red-100" textColor="text-red-800" borderColor="border-red-500" icon={<AlertTriangle size={16} />} />
        <QuadrantSection id="not-urgent-important" title="Not Urgent & Important" tasks={notUrgentImportant} bgColor="bg-green-100" textColor="text-green-800" borderColor="border-green-500" icon={<Check size={16} />} />
        <QuadrantSection id="urgent-not-important" title="Urgent & Not Important" tasks={urgentNotImportant} bgColor="bg-orange-100" textColor="text-orange-800" borderColor="border-orange-500" icon={<Clock size={16} />} />
        <QuadrantSection id="not-urgent-not-important" title="Not Urgent & Not Important" tasks={notUrgentNotImportant} bgColor="bg-gray-200" textColor="text-gray-800" borderColor="border-gray-500" icon={<X size={16} />} />
      </div>
    </div>
  );
};

export default TaskQuadrants;
