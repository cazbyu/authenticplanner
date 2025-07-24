import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Check, UserPlus, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { format, isValid, parseISO } from 'date-fns';
// Note: EditTask modal would be imported here if used
// import EditTask from './EditTask';

// --- Type Definitions (aligned with 0004-ap- schema) ---
interface Task {
  id: string;
  title: string;
  'due-date': string | null;
  'is-urgent': boolean;
  'is-important': boolean;
  'is-authentic-deposit': boolean;
  'is-twelve-week-goal': boolean;
  'task-roles': { 'role-id': string }[];
  'task-domains': { 'domain-id': string }[];
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
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>; // Allow parent to handle state updates
  roles: Record<string, Role>;
  domains: Record<string, Domain>;
  loading: boolean;
}

/**
 * UnscheduledPriorities displays a draggable list of tasks that have not yet been
 * scheduled on the calendar, organized into the Urgent/Important matrix.
 */
const UnscheduledPriorities: React.FC<UnscheduledPrioritiesProps> = ({ tasks, setTasks, roles, domains, loading }) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [collapsedQuadrants, setCollapsedQuadrants] = useState({
    'urgent-important': false,
    'not-urgent-important': false,
    'urgent-not-important': true, // Collapse less important quadrants by default
    'not-urgent-not-important': true,
  });

  /**
   * Handles quick actions on a task card (e.g., complete, cancel).
   */
  const handleTaskAction = async (taskId: string, action: 'complete' | 'cancel', event?: React.MouseEvent) => {
    event?.stopPropagation();

    const updates = {
      status: action === 'complete' ? 'completed' : 'cancelled',
      'completed-at': action === 'complete' ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from('0004-ap-tasks')
      .update(updates)
      .eq('id', taskId);

    if (!error) {
      // Optimistically remove the task from the UI
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    } else {
      console.error(`Error updating task: ${error.message}`);
    }
  };

  const toggleQuadrant = (quadrantId: string) => {
    setCollapsedQuadrants(prev => ({ ...prev, [quadrantId]: !prev[quadrantId] }));
  };

  // --- Helper Functions ---
  const formatTaskDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      return isValid(date) ? format(date, 'MMM d') : null;
    } catch {
      return null;
    }
  };

  const categorizeTasks = (taskList: Task[]) => ({
    urgentImportant: taskList.filter(t => t['is-urgent'] && t['is-important']),
    notUrgentImportant: taskList.filter(t => !t['is-urgent'] && t['is-important']),
    urgentNotImportant: taskList.filter(t => t['is-urgent'] && !t['is-important']),
    notUrgentNotImportant: taskList.filter(t => !t['is-urgent'] && !t['is-important']),
  });

  const { urgentImportant, notUrgentImportant, urgentNotImportant, notUrgentNotImportant } = categorizeTasks(tasks);

  // --- Sub-Components ---

  const TaskCard: React.FC<{ task: Task; quadrantColor: string; index: number }> = ({ task, quadrantColor, index }) => (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white border-l-4 ${quadrantColor} rounded-r-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab select-none ${snapshot.isDragging ? 'shadow-lg' : ''}`}
          data-task-id={task.id}
          style={{ ...provided.draggableProps.style }}
          onDoubleClick={() => setEditingTask(task)}
        >
          {/* ... card content from previous version ... */}
          <p>{task.title}</p>
        </div>
      )}
    </Draggable>
  );

  const QuadrantSection: React.FC<{ id: string; title: string; tasks: Task[]; bgColor: string; borderColor: string; icon: React.ReactNode; }> = ({ id, title, tasks, bgColor, borderColor, icon }) => {
    const isCollapsed = collapsedQuadrants[id as keyof typeof collapsedQuadrants];
    return (
      <div>
        <button onClick={() => toggleQuadrant(id)} className={`w-full ${bgColor} text-white px-3 py-2 rounded-lg flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            {icon}
            <h4 className="font-medium text-xs">{title}</h4>
            <span className="text-xs opacity-75">({tasks.length})</span>
          </div>
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
        {!isCollapsed && (
          <Droppable droppableId={id}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="pt-2 space-y-2">
                {tasks.map((task, index) => <TaskCard key={task.id} task={task} quadrantColor={borderColor} index={index} />)}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-4 text-center">Loading priorities...</div>;

  return (
    <div className="p-2 space-y-3">
      <QuadrantSection id="urgent-important" title="Urgent & Important" tasks={urgentImportant} bgColor="bg-red-500" borderColor="border-red-500" icon={<AlertTriangle size={14} />} />
      <QuadrantSection id="not-urgent-important" title="Not Urgent & Important" tasks={notUrgentImportant} bgColor="bg-green-500" borderColor="border-green-500" icon={<Check size={14} />} />
      <QuadrantSection id="urgent-not-important" title="Urgent & Not Important" tasks={urgentNotImportant} bgColor="bg-orange-500" borderColor="border-orange-500" icon={<Clock size={14} />} />
      <QuadrantSection id="not-urgent-not-important" title="Not Urgent & Not Important" tasks={notUrgentNotImportant} bgColor="bg-gray-500" borderColor="border-gray-500" icon={<X size={14} />} />
      {/* EditTask Modal would be rendered here */}
    </div>
  );
};

export default UnscheduledPriorities;
