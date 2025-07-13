import React, { useState, useEffect } from 'react';
import { Clock, User, Mail, X, CheckCircle, XCircle, Users, Calendar, Target, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface Task {
  id: string;
  title: string;
  due_date?: string;
  time?: string;
  status: string;
  is_urgent: boolean;
  is_important: boolean;
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
  roles: Role[];
  domains: Domain[];
  loading: boolean;
}

const TaskQuadrants: React.FC<TaskQuadrantsProps> = ({ tasks, setTasks, roles, domains, loading }) => {
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'delegated'>('priority');
  const [delegatedTasks, setDelegatedTasks] = useState<Task[]>([]);
  const [selectedDelegatedTask, setSelectedDelegatedTask] = useState<Task | null>(null);

  // Fetch delegated tasks when sortBy changes to 'delegated'
  useEffect(() => {
    if (sortBy === 'delegated') {
      fetchDelegatedTasks();
    }
  }, [sortBy]);

  const fetchDelegatedTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: delegatedTasksData, error } = await supabase
        .from('0007-ap-tasks')
        .select(`
          id,
          title,
          due_date,
          time,
          is_urgent,
          is_important,
          priority,
          notes,
          created_at,
          delegated_to_contact_id,
          delegates:delegated_to_contact_id (
            name,
            email
          ),
          0007-ap-task_roles (
            role_id,
            0007-ap-roles:role_id (
              label
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'delegated')
        .is('completed_at', null)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching delegated tasks:', error);
        return;
      }

      setDelegatedTasks(delegatedTasksData || []);
    } catch (error) {
      console.error('Error in fetchDelegatedTasks:', error);
    }
  };

  const handleDelegatedTaskAction = async (taskId: string, action: 'complete' | 'cancel') => {
    try {
      const updates: any = {};
      
      if (action === 'complete') {
        updates.completed_at = new Date().toISOString();
        updates.status = 'completed';
      } else if (action === 'cancel') {
        updates.status = 'pending';
        updates.delegated_to_contact_id = null;
      }

      const { error } = await supabase
        .from('0007-ap-tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task:', error);
        return;
      }

      // Refresh delegated tasks
      fetchDelegatedTasks();
      setSelectedDelegatedTask(null);
    } catch (error) {
      console.error('Error in handleDelegatedTaskAction:', error);
    }
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
        // For now, just mark as delegated - you can add delegation logic later
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

      // Update local state by removing completed tasks or updating status
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

  const sortTasks = (taskList: Task[]): Task[] => {
    return [...taskList].sort((a, b) => {
      if (sortBy === 'date') {
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        const aPriority = a.priority || 0;
        const bPriority = b.priority || 0;
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'delegated') {
        const aDelegated = a.status === 'delegated' ? 1 : 0;
        const bDelegated = b.status === 'delegated' ? 1 : 0;
        if (aDelegated !== bDelegated) {
          return bDelegated - aDelegated;
        }
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  };

  const TaskCard: React.FC<{ task: Task; showPriorityBadge?: boolean }> = ({ task, showPriorityBadge = false }) => {
    const getPriorityColor = (task: Task) => {
      if (task.is_urgent && task.is_important) return 'bg-red-100 text-red-800';
      if (task.is_important) return 'bg-green-100 text-green-800';
      if (task.is_urgent) return 'bg-yellow-100 text-yellow-800';
      return 'bg-gray-100 text-gray-800';
    };

    const getPriorityLabel = (task: Task) => {
      if (task.is_urgent && task.is_important) return 'Urgent & Important';
      if (task.is_important) return 'Important';
      if (task.is_urgent) return 'Urgent';
      return 'Normal';
    };

    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
            
            {task.due_date && (
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <Clock className="w-4 h-4 mr-1" />
                {new Date(task.due_date).toLocaleDateString()}
                {task.time && ` at ${task.time}`}
              </div>
            )}

            {showPriorityBadge && (
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getPriorityColor(task)}`}>
                {getPriorityLabel(task)}
              </span>
            )}

            {sortBy === 'delegated' && task.status === 'delegated' && (task.delegated_to_name || task.delegated_to_email) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-2">
                <div className="flex items-center text-sm text-blue-800">
                  <User className="w-4 h-4 mr-1" />
                  <span className="font-medium">Delegated to:</span>
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  {task.delegated_to_name && <div>{task.delegated_to_name}</div>}
                  {task.delegated_to_email && (
                    <div className="flex items-center">
                      <Mail className="w-3 h-3 mr-1" />
                      <a href={`mailto:${task.delegated_to_email}`} className="hover:underline">
                        {task.delegated_to_email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {task.notes && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{task.notes}</p>
            )}
          </div>

          <div className="flex space-x-1 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTaskAction(task.id, 'complete', e);
              }}
              className="p-1 rounded-full hover:bg-green-100 hover:text-green-600 transition-colors"
              title="Complete"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTaskAction(task.id, 'delegate', e);
              }}
              className="p-1 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"
              title="Delegate"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const QuadrantSection: React.FC<{
    id: string;
    title: string;
    tasks: Task[];
    bgColor: string;
    textColor: string;
    icon: React.ReactNode;
  }> = ({ id, title, tasks, bgColor, textColor, icon }) => {
    const sortedTasks = sortTasks(tasks);

    return (
      <div className={`${bgColor} rounded-lg p-6 min-h-[400px]`}>
        <div className={`flex items-center mb-4 ${textColor}`}>
          {icon}
          <h3 className="text-lg font-semibold ml-2 flex-1">{title}</h3>
          <span className="ml-2 text-sm opacity-75">({sortedTasks.length})</span>
        </div>
        
        <div className="space-y-3">
          {sortedTasks.length === 0 ? (
            <p className={`text-sm opacity-75 ${textColor} text-center py-8`}>No tasks in this category</p>
          ) : (
            sortedTasks.map((task) => (
              <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
                    
                    {task.due_date && (
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    )}

                    {task.notes && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{task.notes}</p>
                    )}
                  </div>

                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskAction(task.id, 'complete', e);
                      }}
                      className="p-1 rounded-full hover:bg-green-100 hover:text-green-600 transition-colors"
                      title="Complete"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskAction(task.id, 'delegate', e);
                      }}
                      className="p-1 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"
                      title="Delegate"
                    >
                      <User className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const DelegatedTaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const getPriorityColor = (task: Task) => {
      if (task.is_urgent && task.is_important) return 'bg-red-100 text-red-800';
      if (task.is_important) return 'bg-green-100 text-green-800';
      if (task.is_urgent) return 'bg-yellow-100 text-yellow-800';
      return 'bg-gray-100 text-gray-800';
    };

    const getPriorityLabel = (task: Task) => {
      if (task.is_urgent && task.is_important) return 'Urgent & Important';
      if (task.is_important) return 'Important';
      if (task.is_urgent) return 'Urgent';
      return 'Normal';
    };

    return (
      <div 
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedDelegatedTask(task)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-lg mb-2">{task.title}</h4>
            
            <div className="flex items-center gap-4 mb-3">
              {task.due_date && (
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1" />
                  Due: {new Date(task.due_date).toLocaleDateString()}
                </div>
              )}
              
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task)}`}>
                {getPriorityLabel(task)}
              </span>
            </div>

            {/* Delegation Info */}
            {task.delegates && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                <div className="flex items-center text-sm text-blue-800 mb-1">
                  <User className="w-4 h-4 mr-1" />
                  <span className="font-medium">Delegated to:</span>
                </div>
                <div className="text-sm text-blue-700">
                  <div className="font-medium">{task.delegates.name}</div>
                  {task.delegates.email && (
                    <div className="flex items-center mt-1">
                      <Mail className="w-3 h-3 mr-1" />
                      <a 
                        href={`mailto:${task.delegates.email}`} 
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {task.delegates.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Roles */}
            {task.task_roles && task.task_roles.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Users className="w-4 h-4 mr-1" />
                  <span className="font-medium">Roles:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {task.task_roles.map((taskRole, index) => (
                    <span 
                      key={index}
                      className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                    >
                      {taskRole.role?.label || 'Unknown Role'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Preview */}
            {task.notes && (
              <div className="text-sm text-gray-600 line-clamp-2">
                <span className="font-medium">Notes: </span>
                {task.notes}
              </div>
            )}
          </div>

          <div className="flex space-x-2 ml-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelegatedTaskAction(task.id, 'complete');
              }}
              className="p-2 rounded-full bg-green-100 hover:bg-green-200 text-green-600 transition-colors"
              title="Mark as Completed"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelegatedTaskAction(task.id, 'cancel');
              }}
              className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
              title="Cancel Delegation"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Filter tasks by quadrant
  const urgentImportant = tasks.filter(task => task.is_urgent && task.is_important && !task.completed_at);
  const notUrgentImportant = tasks.filter(task => !task.is_urgent && task.is_important && !task.completed_at);
  const urgentNotImportant = tasks.filter(task => task.is_urgent && !task.is_important && !task.completed_at);
  const notUrgentNotImportant = tasks.filter(task => !task.is_urgent && !task.is_important && !task.completed_at);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Task Priorities</h2>
        <div className="flex items-center space-x-2">
          <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'priority' | 'date' | 'delegated')}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="priority">Priority</option>
            <option value="date">Due Date</option>
            <option value="delegated">Delegated</option>
          </select>
        </div>
      </div>

      {/* Delegated Tasks View */}
      {sortBy === 'delegated' ? (
        <div className="space-y-4">
          <div className="flex items-center text-lg font-semibold text-gray-900">
            <User className="w-5 h-5 mr-2" />
            Delegated Tasks ({delegatedTasks.length})
          </div>
          
          {delegatedTasks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No delegated tasks</h3>
              <p className="text-gray-600">You don't have any outstanding delegated tasks.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {delegatedTasks.map((task) => (
                <DelegatedTaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Quadrant View - Restored Original Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QuadrantSection
            id="urgent-important"
            title="Urgent & Important"
            tasks={urgentImportant}
            bgColor="bg-red-50 border border-red-200"
            textColor="text-red-700"
            icon={<AlertCircle className="w-5 h-5" />}
          />
          
          <QuadrantSection
            id="not-urgent-important"
            title="Important, Not Urgent"
            tasks={notUrgentImportant}
            bgColor="bg-green-50 border border-green-200"
            textColor="text-green-700"
            icon={<Target className="w-5 h-5" />}
          />
          
          <QuadrantSection
            id="urgent-not-important"
            title="Urgent, Not Important"
            tasks={urgentNotImportant}
            bgColor="bg-yellow-50 border border-yellow-200"
            textColor="text-yellow-700"
            icon={<Clock className="w-5 h-5" />}
          />
          
          <QuadrantSection
            id="not-urgent-not-important"
            title="Neither Urgent nor Important"
            tasks={notUrgentNotImportant}
            bgColor="bg-gray-50 border border-gray-200"
            textColor="text-gray-700"
            icon={<Calendar className="w-5 h-5" />}
          />
        </div>
      )}

      {/* Delegated Task Detail Modal */}
      {selectedDelegatedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedDelegatedTask.title}
                  </h2>
                  
                  <div className="flex items-center gap-4 mb-4">
                    {selectedDelegatedTask.due_date && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        Due: {new Date(selectedDelegatedTask.due_date).toLocaleDateString()}
                      </div>
                    )}
                    
                    {selectedDelegatedTask.created_at && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-1" />
                        Delegated: {new Date(selectedDelegatedTask.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Priority Badge */}
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    selectedDelegatedTask.is_urgent && selectedDelegatedTask.is_important 
                      ? 'bg-red-100 text-red-800' 
                      : selectedDelegatedTask.is_important 
                      ? 'bg-green-100 text-green-800' 
                      : selectedDelegatedTask.is_urgent 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedDelegatedTask.is_urgent && selectedDelegatedTask.is_important 
                      ? 'Urgent & Important' 
                      : selectedDelegatedTask.is_important 
                      ? 'Important' 
                      : selectedDelegatedTask.is_urgent 
                      ? 'Urgent' 
                      : 'Normal'}
                  </span>
                </div>
                
                <button
                  onClick={() => setSelectedDelegatedTask(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Delegate Information */}
              {selectedDelegatedTask.delegates && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center text-blue-800 mb-2">
                    <User className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Delegated to:</span>
                  </div>
                  <div className="text-blue-700">
                    <div className="font-medium text-lg">{selectedDelegatedTask.delegates.name}</div>
                    {selectedDelegatedTask.delegates.email && (
                      <div className="flex items-center mt-1">
                        <Mail className="w-4 h-4 mr-1" />
                        <a 
                          href={`mailto:${selectedDelegatedTask.delegates.email}`} 
                          className="hover:underline"
                        >
                          {selectedDelegatedTask.delegates.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Roles */}
              {selectedDelegatedTask.task_roles && selectedDelegatedTask.task_roles.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center text-gray-700 mb-3">
                    <Users className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Associated Roles:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedDelegatedTask.task_roles.map((taskRole, index) => (
                      <span 
                        key={index}
                        className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full font-medium"
                      >
                        {taskRole.role?.label || 'Unknown Role'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedDelegatedTask.notes && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">Notes:</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap">
                    {selectedDelegatedTask.notes}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => handleDelegatedTaskAction(selectedDelegatedTask.id, 'cancel')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Cancel Delegation
                </button>
                <button
                  onClick={() => handleDelegatedTaskAction(selectedDelegatedTask.id, 'complete')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Mark as Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskQuadrants;