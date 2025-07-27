import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Check, UserPlus, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { format, isValid, parseISO } from 'date-fns';
import EditTask from './EditTask';

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
}) => {
  return (
    <div className="mb-4">
      <button
        className={`w-full ${bgColor} ${textColor} px-3 py-2 rounded-lg flex-shrink-0 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        onClick={() => onToggle(id)}
        type="button"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            {icon}
            <h4 className="font-medium text-xs truncate">{title}</h4>
            <span className="text-xs opacity-75 flex-shrink-0">({tasks.length})</span>
          </div>
          <div className="flex-shrink-0 ml-2">
            {isCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </div>
        </div>
      </button>

      {!isCollapsed && (
        <Droppable droppableId={`quadrant-${id}`} type="TASK">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="mt-1 bg-gray-50 rounded-lg">
              <div className="space-y-2 p-3">
                {tasks.length > 0 ? (
                  tasks.map((task, index) => (
                    <Draggable draggableId={task.id} index={index} key={task.id}>
                      {(providedDraggable) => (
                        <div
                          ref={providedDraggable.innerRef}
                          {...providedDraggable.draggableProps}
                          {...providedDraggable.dragHandleProps}
                          onClick={() => onTaskCardClick(task)}
                          className={`bg-white border-l-4 ${borderColor} border-r border-t border-b border-gray-200 rounded-r-lg p-3 hover:shadow-md transition-all cursor-pointer select-none`}
                        >
                          <h4 className="font-medium text-gray-900 text-sm leading-tight">{task.title}</h4>
                          {/* Add other task details here if needed */}
                        </div>
                      )}
                    </Draggable>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs italic text-center py-4">No unscheduled tasks in this category</p>
                )}
              </div>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
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
    // You may need a way to trigger a refresh in the parent here
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
  );
};

export default UnscheduledPriorities;