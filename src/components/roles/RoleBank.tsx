import React, { useState, useEffect } from 'react';
import { Users, Star, X, Plus, ChevronRight, UserPlus, Lightbulb, Heart } from 'lucide-react';
import TaskForm from '../tasks/TaskForm';
import KeyRelationshipForm from './KeyRelationshipForm';
import { supabase } from '../../supabaseClient';
import { Task } from '../../types';

interface Role {
  id: string;
  label: string;
  category: string;
  icon?: string;
  domains?: string[];
}

interface RoleBankTask extends Task {
  role_id: string;
  is_deposit: boolean;
  due_date?: string;
  notes?: string;
}

interface DepositIdea {
  id: string;
  role_id: string;
  description: string;
  is_active: boolean;
}

interface Relationship {
  id: string;
  role_id: string;
  name: string;
}

interface KeyRelationship {
  id: string;
  role_id: string;
  name: string;
  notes?: string;
  image_url?: string;
}

type MainView = 'menu' | 'active-roles' | 'deposit-ideas' | 'key-relationships';

const RoleBank: React.FC = () => {
  const [activeRoles, setActiveRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [tasks, setTasks] = useState<RoleBankTask[]>([]);
  const [depositIdeas, setDepositIdeas] = useState<DepositIdea[]>([]);
  const [relationships, setRelationships] = useState<KeyRelationship[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);
  const [selectedDepositIdea, setSelectedDepositIdea] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<MainView>('menu');

  useEffect(() => {
    const fetchActiveRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('0007-ap-roles')
        .select(`
          id,
          label,
          category,
          icon,
          preset_role_id,
          custom_role_id
        `)
        .eq('user_id', user.id)
        .eq('is_active', true); // Only fetch active roles

      setActiveRoles(roles || []);
      setLoading(false);
    };

    fetchActiveRoles();
  }, []);

  useEffect(() => {
    if (!selectedRole) return;

    const fetchRoleData = async () => {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('role_id', selectedRole.id)
        .gte('due_date', new Date().toISOString().split('T')[0]);
      
      setTasks(taskData || []);

      // Fetch key relationships
      const { data: relationshipData } = await supabase
        .from('0007-ap-key_relationships')
        .select('*')
        .eq('role_id', selectedRole.id);
      
      setRelationships(relationshipData || []);

      // For now, we'll keep deposit ideas empty since they're managed per relationship
      setDepositIdeas([]);
    };

    fetchRoleData();
  }, [selectedRole]);

  const handleTaskSave = async (taskData: any) => {
    setShowTaskForm(false);
    setSelectedDepositIdea(null);
  };

  const handleRelationshipCreated = () => {
    setShowRelationshipForm(false);
    // Refresh role data to show new relationship
    if (selectedRole) {
      fetchRoleData();
    }
  };

  const fetchRoleData = async () => {
    if (!selectedRole) return;

    const { data: taskData } = await supabase
      .from('tasks')
      .select('*')
      .eq('role_id', selectedRole.id)
      .gte('due_date', new Date().toISOString().split('T')[0]);
    
    setTasks(taskData || []);

    // Fetch key relationships
    const { data: relationshipData } = await supabase
      .from('0007-ap-key_relationships')
      .select('*')
      .eq('role_id', selectedRole.id);
    
    setRelationships(relationshipData || []);
  };

  const handleDepositToggle = async (idea: DepositIdea) => {
    if (idea.is_active) {
      setSelectedDepositIdea(idea.id);
      setShowTaskForm(true);
    }
  };

  const getRoleStats = (roleId: string) => {
    const roleTasks = tasks.filter(t => t.role_id === roleId);
    return {
      deposits: roleTasks.filter(t => t.is_deposit).length,
      tasks: roleTasks.filter(t => !t.is_deposit).length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Main menu view
  if (currentView === 'menu') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Roles */}
          <button
            onClick={() => setCurrentView('active-roles')}
            className="group bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Roles</h3>
              <p className="text-sm text-gray-600 mb-4">
                View and manage your current life roles
              </p>
              <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                <span className="text-sm font-medium">View Roles</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </button>

          {/* Deposit Ideas */}
          <button
            onClick={() => setCurrentView('deposit-ideas')}
            className="group bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-green-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <Lightbulb className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Deposit Ideas</h3>
              <p className="text-sm text-gray-600 mb-4">
                Brainstorm ways to invest in your roles
              </p>
              <div className="flex items-center text-green-600 group-hover:text-green-700">
                <span className="text-sm font-medium">View Ideas</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </button>

          {/* Key Relationships */}
          <button
            onClick={() => setCurrentView('key-relationships')}
            className="group bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                <Heart className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Key Relationships</h3>
              <p className="text-sm text-gray-600 mb-4">
                Manage important people in your life
              </p>
              <div className="flex items-center text-purple-600 group-hover:text-purple-700">
                <span className="text-sm font-medium">View Relationships</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Active Roles view
  if (currentView === 'active-roles') {
    if (selectedRole) {
      // Individual role detail view (existing functionality)
      return (
        <div className="fixed inset-0 bg-gray-100 z-50 overflow-auto">
          <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedRole.label}</h2>
                <button
                  onClick={() => setSelectedRole(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Current Tasks */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Current Tasks</h3>
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span>{task.title}</span>
                        <span className="text-sm text-gray-500">
                          {task.due_date && new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deposit Ideas */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Deposit Ideas</h3>
                  <div className="space-y-2">
                    {depositIdeas.map(idea => (
                      <div key={idea.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span>{idea.description}</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={idea.is_active}
                            onChange={() => handleDepositToggle(idea)}
                            className="rounded border-gray-300 text-primary-600 mr-2"
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    ))}
                    <button className="flex items-center text-primary-600 hover:text-primary-700 mt-2">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Deposit Idea
                    </button>
                  </div>
                </div>

                {/* Key Relationships */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Key Relationships</h3>
                    <button
                      onClick={() => setShowRelationshipForm(true)}
                      className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Add Key Relationship</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {relationships.map(rel => (
                      <div key={rel.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-3">
                          {/* Profile Image */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                              {rel.image_url ? (
                                <img 
                                  src={rel.image_url} 
                                  alt={rel.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )}
                            </div>
                          </div>
                          
                          {/* Name and Notes */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{rel.name}</div>
                            {rel.notes && (
                              <div className="text-sm text-gray-600 mt-1 line-clamp-2">{rel.notes}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {relationships.length === 0 && (
                      <div className="col-span-full text-center py-6 text-gray-500">
                        <UserPlus className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-sm">No key relationships yet.</p>
                        <button
                          onClick={() => setShowRelationshipForm(true)}
                          className="text-sm text-primary-600 hover:text-primary-700 mt-1"
                        >
                          Add your first relationship
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Task Notes */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Task Notes</h3>
                  <div className="space-y-3">
                    {tasks.filter(t => t.notes).map(task => (
                      <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium mb-1">{task.title}</div>
                        <div className="text-sm text-gray-600">{task.notes}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showTaskForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white rounded-lg w-full max-w-2xl p-6">
                <TaskForm
                  onSave={handleTaskSave}
                  onCancel={() => {
                    setShowTaskForm(false);
                    setSelectedDepositIdea(null);
                  }}
                  initialRole={selectedRole}
                  initialTask={selectedDepositIdea ? {
                    title: depositIdeas.find(i => i.id === selectedDepositIdea)?.description
                  } : undefined}
                />
              </div>
            </div>
          )}

          {showRelationshipForm && selectedRole && (
            <KeyRelationshipForm
              roleId={selectedRole.id}
              roleName={selectedRole.label}
              onClose={() => setShowRelationshipForm(false)}
              onRelationshipCreated={handleRelationshipCreated}
            />
          )}
        </div>
      );
    }

    // Active roles grid view
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentView('menu')}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Active Roles</h2>
          </div>
        </div>

        {activeRoles.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Roles</h3>
            <p className="text-gray-600">You haven't set up any active roles yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {activeRoles.map(role => {
              const stats = getRoleStats(role.id);
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1 truncate">{role.label}</h3>
                    <p className="text-sm text-gray-500 mb-3">{role.category}</p>
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                      <span>{stats.deposits} Deposits</span>
                      <span>{stats.tasks} Tasks</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Placeholder views for other sections
  if (currentView === 'deposit-ideas') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentView('menu')}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Deposit Ideas</h2>
          </div>
        </div>
        <div className="text-center py-12">
          <Lightbulb className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Deposit Ideas</h3>
          <p className="text-gray-600">This section will be implemented soon.</p>
        </div>
      </div>
    );
  }

  if (currentView === 'key-relationships') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentView('menu')}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Key Relationships</h2>
          </div>
        </div>
        <div className="text-center py-12">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Key Relationships</h3>
          <p className="text-gray-600">This section will be implemented soon.</p>
        </div>
      </div>
    );
  }

  return null;
};

export default RoleBank;