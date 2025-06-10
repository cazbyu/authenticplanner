import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, Trash2, Plus, Target, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Role {
  id: string;
  label: string;
  category: string;
}

interface Domain {
  id: string;
  name: string;
}

interface WeeklyGoal {
  id: string;
  week_number: number;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled';
  progress: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  due_date?: string;
  is_urgent: boolean;
  is_important: boolean;
}

interface TwelveWeekGoal {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number;
  created_at: string;
  domains: Domain[];
  roles: Role[];
  weeklyGoals: WeeklyGoal[];
  tasks: Task[];
}

interface TwelveWeekGoalCardProps {
  goal: TwelveWeekGoal;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (goal: TwelveWeekGoal) => void;
  onDelete: (goalId: string) => void;
  onAddWeeklyGoal: (goalId: string) => void;
  onAddTask: (goalId: string) => void;
}

const TwelveWeekGoalCard: React.FC<TwelveWeekGoalCardProps> = ({
  goal,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddWeeklyGoal,
  onAddTask
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDomainColor = (domainName: string) => {
    const colors: Record<string, string> = {
      'Physical': 'bg-blue-100 text-blue-800',
      'Emotional': 'bg-pink-100 text-pink-800',
      'Intellectual': 'bg-purple-100 text-purple-800',
      'Spiritual': 'bg-indigo-100 text-indigo-800',
      'Financial': 'bg-green-100 text-green-800',
      'Social': 'bg-orange-100 text-orange-800',
      'Recreational': 'bg-teal-100 text-teal-800',
      'Community': 'bg-red-100 text-red-800'
    };
    return colors[domainName] || 'bg-gray-100 text-gray-800';
  };

  const completedTasks = goal.tasks.filter(task => task.status === 'completed').length;
  const totalTasks = goal.tasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Goal Header - Always Visible */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{goal.title}</h3>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                {goal.status}
              </span>
            </div>
            
            {goal.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{goal.description}</p>
            )}

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{goal.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>

            {/* Domains and Roles */}
            <div className="space-y-2">
              {goal.domains.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500 mr-1">Domains:</span>
                  {goal.domains.slice(0, 3).map(domain => (
                    <span key={domain.id} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDomainColor(domain.name)}`}>
                      {domain.name}
                    </span>
                  ))}
                  {goal.domains.length > 3 && (
                    <span className="text-xs text-gray-500">+{goal.domains.length - 3} more</span>
                  )}
                </div>
              )}

              {goal.roles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500 mr-1">Roles:</span>
                  {goal.roles.slice(0, 2).map(role => (
                    <span key={role.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
                      {role.label}
                    </span>
                  ))}
                  {goal.roles.length > 2 && (
                    <span className="text-xs text-gray-500">+{goal.roles.length - 2} more</span>
                  )}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {goal.weeklyGoals.length} weekly goals
              </span>
              <span className="flex items-center">
                <Target className="h-4 w-4 mr-1" />
                {completedTasks}/{totalTasks} tasks
              </span>
              <span className="text-xs">
                Created {format(new Date(goal.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => onEdit(goal)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Edit goal"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Delete goal"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              onClick={onToggleExpand}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-6">
          {/* Weekly Goals Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Weekly Goals
              </h4>
              <button
                onClick={() => onAddWeeklyGoal(goal.id)}
                className="flex items-center text-sm text-primary-600 hover:text-primary-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Weekly Goal
              </button>
            </div>

            {goal.weeklyGoals.length > 0 ? (
              <div className="space-y-2">
                {goal.weeklyGoals.map(weeklyGoal => (
                  <div key={weeklyGoal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Week {weeklyGoal.week_number}:</span>
                        <span className="text-sm text-gray-900">{weeklyGoal.title}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(weeklyGoal.status)}`}>
                          {weeklyGoal.status}
                        </span>
                      </div>
                      {weeklyGoal.description && (
                        <p className="text-xs text-gray-600 mt-1">{weeklyGoal.description}</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {weeklyGoal.progress}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No weekly goals yet. Add some to break down your 12-week goal.</p>
            )}
          </div>

          {/* Tasks Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Associated Tasks
              </h4>
              <button
                onClick={() => onAddTask(goal.id)}
                className="flex items-center text-sm text-primary-600 hover:text-primary-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </button>
            </div>

            {goal.tasks.length > 0 ? (
              <div className="space-y-2">
                {goal.tasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.title}
                        </span>
                        {task.is_urgent && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Urgent
                          </span>
                        )}
                        {task.is_important && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Important
                          </span>
                        )}
                      </div>
                      {task.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                ))}
                {goal.tasks.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{goal.tasks.length - 5} more tasks
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No tasks linked to this goal yet. Add tasks to track your progress.</p>
            )}
          </div>

          {/* All Domains and Roles (when expanded) */}
          {(goal.domains.length > 3 || goal.roles.length > 2) && (
            <div className="space-y-3">
              {goal.domains.length > 3 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">All Wellness Domains:</h5>
                  <div className="flex flex-wrap gap-2">
                    {goal.domains.map(domain => (
                      <span key={domain.id} className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getDomainColor(domain.name)}`}>
                        {domain.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {goal.roles.length > 2 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">All Associated Roles:</h5>
                  <div className="flex flex-wrap gap-2">
                    {goal.roles.map(role => (
                      <span key={role.id} className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-secondary-100 text-secondary-800">
                        <Users className="h-3 w-3 mr-1" />
                        {role.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Goal</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete "{goal.title}"? This action cannot be undone and will remove all associated weekly goals and task links.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(goal.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwelveWeekGoalCard;