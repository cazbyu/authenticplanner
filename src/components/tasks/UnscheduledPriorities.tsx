import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Check, UserPlus, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { format, isValid, parseISO } from 'date-fns';
import EditTask from './EditTask';

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
  
  // State to track if a task is being dragged
  const [isDragging, setIsDragging] = useState(false);
  
  // Simplified collapsed state - no complex initialization
  const [collapsedQuadrants, setCollapsedQuadrants] = useState({
    'urgent-important': false,
    'not-urgent-important': false,
    'urgent-not-important': false,
    'not-urgent-not-important': false,
  });

  const handleTaskAction = async (taskId: string, action: 'complete' | 'delegate' | 'cancel', event?: React.MouseEvent) => {
    // Prevent event bubbling to avoid triggering edit modal
    if (event) {
      event.stopPropagation();
    }

    const updates: any = {
      status: action === 'complete' ? 'completed' : action === 'cancel' ? 'cancelled' : 'delegated',
    };
    
    if (action === 'complete') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('0007-ap-tasks')
      .update(updates)
      .eq('id', taskId);

    if (!error) {
      // Remove task from current view
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    }
  };

  // Ultra-simplified toggle function
  const toggleQuadrant = (quadrantId: string) => {
    setCollapsedQuadrants(prev => ({
      ...prev,
      [quadrantId]: !prev[quadrantId]
    }));
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
  };

  const handleTaskUpdated = () => {
    setEditingTask(null);
    // Parent component will handle refresh via refreshTrigger
  };

  const handleEditCancel = () => {
    setEditingTask(null);
  };

  // Helper function to detect if device is mobile/tablet
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0);
  };

  // Helper function to safely format dates
  const formatTaskDate = (dateStr: string | null) => {
    if (!dateStr) return null;

    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return null;
      return format(date, 'MMM d');
    } catch (error) {
      console.warn('Date formatting error:', error);
      return null;
    }
  };

  // Categorize tasks into quadrants and sort by date within each
  const categorizeAndSortTasks = (taskList: Task[]) => {
    const categories = {
      urgentImportant: taskList.filter(task => task.is_urgent && task.is_important),
      notUrgentImportant: taskList.filter(task => !task.is_urgent && task.is_important),
      urgentNotImportant: taskList.filter(task => task.is_urgent && !task.is_important),
      notUrgentNotImportant: taskList.filter(task => !task.is_urgent && !task.is_important),
    };

    // Sort each category by date (earliest first, no date at bottom)
    Object.keys(categories).forEach(key => {
      categories[key as keyof typeof categories].sort((a, b) => {
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        return a.title.localeCompare(b.title);
      });
    });

    return categories;
  };

  // For list view, sort all tasks by priority
  const sortTasksByPriority = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      // First by urgency and importance
      if (a.is_urgent && a.is_important && (!b.is_urgent || !b.is_important)) return -1;
      if (b.is_urgent && b.is_important && (!a.is_urgent || !a.is_important)) return 1;
      if (a.is_urgent && !a.is_important && !b.is_urgent) return -1;
      if (b.is_urgent && !b.is_important && !a.is_urgent) return 1;
      if (a.is_important && !b.is_important) return -1;
      if (b.is_important && !a.is_important) return 1;
      
      // Then by due date
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      
      // Finally by title
      return a.title.localeCompare(b.title);
    });
  };
  const { urgentImportant, notUrgentImportant, urgentNotImportant, notUrgentNotImportant } = categorizeAndSortTasks(tasks);
  const prioritizedTasks = sortTasksByPriority(tasks);

  const TaskCard: React.FC<{ task: Task; quadrantColor: string; index: number }> = ({ task, quadrantColor, index }) => {
    const dateDisplay = formatTaskDate(task.due_date);
    const isMobile = isMobileDevice();
    
    const handleCardClick = (event: React.MouseEvent) => {
      // Only handle single clicks on mobile/tablet
      if (isMobile) {
        event.preventDefault();
        event.stopPropagation();
        handleTaskEdit(task);
      }
    };

    const handleCardDoubleClick = (event: React.MouseEvent) => {
      // Only handle double clicks on desktop
      if (!isMobile) {
        event.preventDefault();
        event.stopPropagation();
        handleTaskEdit(task);
      }
    };
    
    return (
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`bg-white border-l-4 ${quadrantColor} border-r border-t border-b border-gray-200 rounded-r-lg p-3 hover:shadow-md transition-all cursor-pointer select-none ${snapshot.isDragging ? 'shadow-lg' : ''}`}
            onClick={handleCardClick}
            onDoubleClick={handleCardDoubleClick}
            title={isMobile ? "Tap to edit or drag to calendar" : "Double-click to edit or drag to calendar"}
            data-task-id={task.id}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-sm leading-tight">{task.title}</h4>
                {dateDisplay ? (
                  <div className="flex items-center mt-1 text-xs text-gray-600">
                    <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span>Due {dateDisplay}</span>
                  </div>
                ) : (
                  <div className="flex items-center mt-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span>No due date</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
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
            
            {/* Task badges */}
            <div className="flex flex-wrap gap-1 mb-2">
              {task.is_authentic_deposit && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Deposit
                </span>
              )}
              {task.is_twelve_week_goal && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  12-Week
                </span>
              )}
            </div>

            {/* Roles and domains - compact display */}
            <div className="flex flex-wrap gap-1">
              {task.task_roles?.slice(0, 1).map(({ role_id }) => (
                roles[role_id] && (
                  <span key={role_id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700 truncate max-w-16">
                    {roles[role_id].label}
                  </span>
                )
              ))}
              {task.task_domains?.slice(0, 1).map(({ domain_id }) => (
                domains[domain_id] && (
                  <span key={domain_id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700 truncate max-w-16">
                    {domains[domain_id].name}
                  </span>
                )
              ))}
              {(task.task_roles?.length > 1 || task.task_domains?.length > 1) && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-600">
                  +{(task.task_roles?.length || 0) + (task.task_domains?.length || 0) - 2}
                </span>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  const QuadrantSection: React.FC<{ 
    id: string;
    title: string; 
    tasks: Task[]; 
    bgColor: string;
    borderColor: string;
    textColor: string;
    icon: React.ReactNode;
  }> = ({ id, title, tasks, bgColor, borderColor, textColor, icon }) => {
    const isCollapsed = collapsedQuadrants[id];
    
    return (
      <div className="mb-4">
        <Droppable droppableId={`quadrant-${id}`} type="TASK">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {/* Header - Always visible, compact when collapsed */}
              <button 
                className={`w-full ${bgColor} ${textColor} px-3 py-2 rounded-lg flex-shrink-0 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                onClick={() => toggleQuadrant(id)}
                type="button"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    {icon}
                    <h4 className="font-medium text-xs truncate">{title}</h4>
                    <span className="text-xs opacity-75 flex-shrink-0">({tasks.length})</span>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {isCollapsed ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronUp className="h-3 w-3" />
                    )}
                  </div>
                </div>
              </button>
              
              {/* Content - Only visible when expanded */}
              {!isCollapsed && (
                <div className="mt-1 bg-gray-50 rounded-lg">
                  <div className="space-y-2 p-3">
                    {tasks.length === 0 ? (
                      <p className="text-gray-500 text-xs italic text-center py-4">No unscheduled tasks in this category</p>
                    ) : (
                      tasks.map((task, index) => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          quadrantColor={borderColor} 
                          index={index} 
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
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
        {/* Quadrant sections with consistent padding from left edge and uniform spacing */}
       {viewMode === 'quadrant' ? (
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin grid grid-cols-2 gap-4" style={{ height: '100%', overflowY: 'auto' }}>
          {/* Top Row */}
          <div>
            {/* Urgent & Important - Red */}
            <QuadrantSection
              id="urgent-important"
              title="Urgent & Important"
              tasks={urgentImportant}
              bgColor="bg-red-500"
              borderColor="border-l-red-500"
              textColor="text-white"
              icon={<AlertTriangle className="h-3 w-3 flex-shrink-0" />}
            />
          </div>
          
          <div>
            {/* Not Urgent & Important - Green */}
            <QuadrantSection
              id="not-urgent-important"
              title="Not Urgent & Important"
              tasks={notUrgentImportant}
              bgColor="bg-green-500"
              borderColor="border-l-green-500"
              textColor="text-white"
              icon={<Check className="h-3 w-3 flex-shrink-0" />}
            />
          </div>
          
          {/* Bottom Row */}
          <div>
            {/* Urgent & Not Important - Orange */}
            <QuadrantSection
              id="urgent-not-important"
              title="Urgent & Not Important"
              tasks={urgentNotImportant}
              bgColor="bg-orange-500"
              borderColor="border-l-orange-500"
              textColor="text-white"
              icon={<Clock className="h-3 w-3 flex-shrink-0" />}
            />
          </div>
          
          <div>
            {/* Not Urgent & Not Important - Gray */}
            <QuadrantSection
              id="not-urgent-not-important"
              title="Not Urgent & Not Important"
              tasks={notUrgentNotImportant}
              bgColor="bg-gray-500"
              borderColor="border-l-gray-500"
              textColor="text-white"
              icon={<X className="h-3 w-3 flex-shrink-0" />}
            />
          </div>
        </div>
       ) : (
         /* List View - Sorted by priority */
         <div className="flex-1 overflow-y-auto p-4">
           <div className="space-y-2">
             {prioritizedTasks.length === 0 ? (
               <p className="text-gray-500 text-center py-8">No unscheduled tasks found</p>
             ) : (
               prioritizedTasks.map((task, index) => {
                 // Determine border color based on priority
                 let borderColor = "border-l-gray-500";
                 if (task.is_urgent && task.is_important) borderColor = "border-l-red-500";
                 else if (!task.is_urgent && task.is_important) borderColor = "border-l-green-500";
                 else if (task.is_urgent && !task.is_important) borderColor = "border-l-orange-500";
                 
                 return (
                   <Draggable key={task.id} draggableId={task.id} index={index}>
                     {(provided, snapshot) => (
                       <div 
                         ref={provided.innerRef}
                         {...provided.draggableProps}
                         {...provided.dragHandleProps}
                         className={`bg-white border-l-4 ${borderColor} border-r border-t border-b border-gray-200 rounded-r-lg p-3 hover:shadow-md transition-all cursor-pointer select-none ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                         onDoubleClick={() => handleTaskEdit(task)}
                         title="Double-click to edit or drag to calendar"
                       >
                         <div className="flex items-start justify-between mb-2">
                           <div className="flex-1 min-w-0">
                             <h4 className="font-medium text-gray-900 text-sm leading-tight">{task.title}</h4>
                             {formatTaskDate(task.due_date) ? (
                               <div className="flex items-center mt-1 text-xs text-gray-600">
                                 <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                                 <span>Due {formatTaskDate(task.due_date)}</span>
                               </div>
                             ) : null}
                           </div>
                           <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
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
                         
                         {/* Task badges */}
                         <div className="flex flex-wrap gap-1">
                           {task.is_authentic_deposit && (
                             <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                               Deposit
                             </span>
                           )}
                           {task.is_twelve_week_goal && (
                             <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                               12-Week
                             </span>
                           )}
                           {task.task_roles?.slice(0, 1).map(({ role_id }) => (
                             roles[role_id] && (
                               <span key={role_id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700 truncate max-w-16">
                                 {roles[role_id].label}
                               </span>
                             )
                           ))}
                         </div>
                       </div>
                     )}
                   </Draggable>
                 );
               })
             )}
           </div>
         </div>
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

export default UnscheduledPriorities;