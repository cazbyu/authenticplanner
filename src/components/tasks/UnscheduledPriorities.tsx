import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Check, UserPlus, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { formatDate } from '../../utils/helpers';
import TaskEventForm from './TaskEventForm'; // Import TaskEventForm instead of EditTask
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
  task_key_relationships: { key_relationship_id: string }[]; // Added for completeness
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
// 1. QuadrantSection Component (Unchanged)
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
                          data-task-id={task.id}
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
                              <div className="flex flex-wrap gap-1 mb-2">
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTaskAction(task.id, 'complete');
                                }}
                                className="p-1 rounded-full hover:bg-green-100 hover:text-green-600 transition-colors"
                                title="Complete"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTaskAction(task.id, 'delegate');
                                }}
                                className="p-1 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                title="Delegate"
                              >
                                <UserPlus className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTaskAction(task.id, 'cancel');
                                }}
                                className="p-1 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                                title="Cancel"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
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
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null);

  const [collapsedQuadrants, setCollapsedQuadrants] = useState({
    'urgent-important': false,
    'not-urgent-important': false,
    'urgent-not-important': false,
    'not-urgent-not-important': false,
  });

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
    // You might want a more sophisticated refresh logic, but for now this works
    window.location.reload(); 
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

      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error in handleTaskAction:', error);
    }
  };

  const handleTaskDelegated = () => {
    setDelegatingTask(null);
    if (delegatingTask) {
      setTasks(prevTasks => prevTasks.filter(task => task.id !== delegatingTask.id));
    }
  };

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

  // --- Helper to format task data for the form ---
  const formatTaskForForm = (task: Task) => {
    const convertToTime = (isoString: string | null) => isoString ? new Date(isoString).toTimeString().slice(0, 5) : '';
    
    return {
      id: task.id,
      title: task.title,
      schedulingType: 'task' as const,
      dueDate: task.due_date || (task.start_time ? new Date(task.start_time).toISOString().split('T')[0] : ''),
      startTime: convertToTime(task.start_time),
      endTime: convertToTime(task.end_time),
      notes: task.notes || '',
      urgent: task.is_urgent,
      important: task.is_important,
      authenticDeposit: task.is_authentic_deposit,
      twelveWeekGoalChecked: task.is_twelve_week_goal,
      selectedRoleIds: task.task_roles?.map(r => r.role_id) || [],
      selectedDomainIds: task.task_domains?.map(d => d.domain_id) || [],
      selectedKeyRelationshipIds: task.task_key_relationships?.map(kr => kr.key_relationship_id) || [],
    };
  };

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

        {/* --- MODAL SECTION --- */}
        {editingTask && (
          <TaskEventForm
            mode="edit"
            initialData={formatTaskForForm(editingTask)}
            onSubmitSuccess={handleTaskUpdated}
            onClose={() => setEditingTask(null)}
          />
        )}
      </div>

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
