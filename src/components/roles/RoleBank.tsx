import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ChevronLeft, UserPlus, Plus, Heart, Edit, Eye } from 'lucide-react';
import { Check, X } from 'lucide-react';
import KeyRelationshipForm from './KeyRelationshipForm';
import TaskForm from '../tasks/TaskForm';
import DelegateTaskModal from '../tasks/DelegateTaskModal';
import { getSignedImageUrl } from '../../utils/imageHelpers';
import EditTask from '../tasks/EditTask';

interface Role {
  id: string;
  label: string;
  category: string;
  icon: string;
}

interface Task {
  id: string;
  title: string;
  due_date: string;
  status: string;
  priority: number;
  is_urgent: boolean;
  is_important: boolean;
  is_authentic_deposit: boolean;
  notes?: string;
}

interface KeyRelationship {
  id: string;
  name: string;
  role_id: string;
  image_path?: string;
  notes?: string;
}

interface DepositIdea {
  id: string;
  description: string;
  key_relationship_id: string;
}

interface RoleBankProps {
  selectedRole?: Role | null;
  onBack?: () => void;
}

const RoleBank: React.FC<RoleBankProps> = ({ selectedRole: propSelectedRole, onBack: propOnBack }) => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(propSelectedRole || null);
  const [selectedSection, setSelectedSection] = useState<'roles' | 'deposits' | 'relationships' | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [relationships, setRelationships] = useState<KeyRelationship[]>([]);
  const [depositIdeas, setDepositIdeas] = useState<DepositIdea[]>([]);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<KeyRelationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRoleData(selectedRole.id);
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rolesData, error } = await supabase
        .from('0007-ap-roles')
        .select('id, label, category')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('label', { ascending: true });

      if (error) throw error;
      setRoles(rolesData || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleData = async (roleId: string) => {
    try {
      setLoading(true);
      
      // Fetch tasks for this role using the many-to-many relationship
      const { data: tasksData, error: tasksError } = await supabase
        .from('0007-ap-tasks')
        .select(`
          *,
          0007-ap-task_roles!inner(role_id),
          task_roles:0007-ap-task_roles(role_id, 0007-ap-roles:role_id(label))
        `)
        .eq('0007-ap-task_roles.role_id', roleId)
        .in('status', ['pending', 'in_progress']);

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch key relationships
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('0007-ap-key_relationships')
        .select('*')
        .eq('role_id', roleId);

      if (relationshipsError) throw relationshipsError;
      setRelationships(relationshipsData || []);
      setKeyRelationships(relationshipsData || []);

      // Fetch deposit ideas for all relationships
      if (relationshipsData && relationshipsData.length > 0) {
        const relationshipIds = relationshipsData.map(rel => rel.id);
        const { data: ideasData, error: ideasError } = await supabase
          .from('0007-ap-deposit_ideas')
          .select('*')
          .in('key_relationship_id', relationshipIds);

        if (ideasError) throw ideasError;
        setDepositIdeas(ideasData || []);
      } else {
        setDepositIdeas([]);
      }

    } catch (error) {
      console.error('Error fetching role data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRelationship = () => {
    setEditingRelationship(null);
    setShowRelationshipForm(true);
  };

  const handleEditRelationship = (relationship: KeyRelationship) => {
    setEditingRelationship(relationship);
    setShowRelationshipForm(true);
  };

  const handleRelationshipSaved = () => {
    setShowRelationshipForm(false);
    setEditingRelationship(null);
    if (selectedRole) {
      fetchRoleData(selectedRole.id);
    }
  };

  const handleAddTask = () => {
    setShowTaskForm(true);
  };

  const handleTaskCreated = () => {
    setShowTaskForm(false);
    if (selectedRole) {
      fetchRoleData(selectedRole.id);
    }
  };

  const handleTaskAction = async (taskId: string, action: 'complete' | 'delegate' | 'cancel') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let updates: any = {};
      
      if (action === 'complete') {
        updates.completed_at = new Date().toISOString();
        updates.status = 'completed';
      } else if (action === 'cancel') {
        updates.status = 'cancelled';
      } else if (action === 'delegate') {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          setDelegatingTask(task);
          return;
        }
      }

      if (action !== 'delegate') {
        const { error } = await supabase
          .from('0007-ap-tasks')
          .update(updates)
          .eq('id', taskId);

        if (!error && selectedRole) {
          fetchRoleData(selectedRole.id);
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleTaskUpdated = () => {
    setEditingTask(null);
    if (selectedRole) {
      fetchRoleData(selectedRole.id);
    }
  };

  const handleTaskDelegated = () => {
    setDelegatingTask(null);
    if (selectedRole) {
      fetchRoleData(selectedRole.id);
    }
  };
  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setSelectedSection(null);
  };

  const handleBack = () => {
    if (selectedRole) {
      setSelectedRole(null);
      setSelectedSection(null);
    } else if (selectedSection) {
      setSelectedSection(null);
    } else if (propOnBack) {
      propOnBack();
    }
  };

  // Group roles by category
  const rolesByCategory = roles.reduce((acc, role) => {
    if (!acc[role.category]) {
      acc[role.category] = [];
    }
    acc[role.category].push(role);
    return acc;
  }, {} as Record<string, Role[]>);

  // If a role is selected, show role details
  if (selectedRole) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-200">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{selectedRole.label}</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8" style={{ height: 'calc(100% - 80px)' }}>
          {/* Current Tasks */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Current Tasks</h2>
              <button 
                onClick={handleAddTask}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            </div>
            {loading ? (
              <div className="text-gray-500">Loading tasks...</div>
            ) : tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow relative">
                    {/* Action buttons in top right */}
                    <div className="absolute top-3 right-3 flex items-center space-x-1">
                      <button
                        onClick={() => handleTaskAction(task.id, 'complete')}
                        className="p-1 rounded-full hover:bg-green-100 hover:text-green-600 transition-colors"
                        title="Complete"
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </button>
                      <button
                        onClick={() => handleTaskAction(task.id, 'delegate')}
                        className="p-1 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"
                        title="Delegate"
                      >
                        <UserPlus className="h-4 w-4 text-blue-500" />
                      </button>
                      <button
                        onClick={() => handleEditTask(task)}
                        className="p-1 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleTaskAction(task.id, 'cancel')}
                        className="p-1 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Cancel"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>

                    {/* Task content with padding to avoid overlap with buttons */}
                    <div className="pr-20">
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                        {task.due_date && (
                          <div className="text-sm text-gray-600 mb-2">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {task.is_urgent && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                            Urgent
                          </span>
                        )}
                        {task.is_important && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                            Important
                          </span>
                        )}
                        {task.is_authentic_deposit && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                            Deposit
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-gray-400 mb-2">No current tasks for this role</div>
                <button 
                  onClick={handleAddTask}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  Add your first task
                </button>
              </div>
            )}
          </section>

          {/* Deposit Ideas */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Deposit Ideas</h2>
              <button className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium">
                <Plus className="h-4 w-4" />
                Add Deposit Idea
              </button>
            </div>
            {depositIdeas.length > 0 ? (
              <div className="space-y-2">
                {depositIdeas.map((idea) => (
                  <div key={idea.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-gray-900">{idea.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                No deposit ideas yet
              </div>
            )}
          </section>

          {/* Key Relationships */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Key Relationships</h2>
              <button
                onClick={handleAddRelationship}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <UserPlus className="h-4 w-4" />
                Add Key Relationship
              </button>
            </div>

            {relationships.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {relationships.map((rel) => (
                  <div key={rel.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <RelationshipImage relationship={rel} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{rel.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">Key Relationship</p>
                        {rel.notes && (
                          <div className="bg-gray-50 rounded-md p-2 mb-3">
                            <p className="text-xs font-medium text-gray-700 mb-1">Notes:</p>
                            <p className="text-sm text-gray-600">{rel.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button className="flex-1 text-sm text-blue-600 hover:text-blue-700 font-medium py-1 px-2 rounded hover:bg-blue-50 transition-colors flex items-center justify-center gap-1">
                        <Eye className="h-3 w-3" />
                        View Details
                      </button>
                      <button
                        onClick={() => handleEditRelationship(rel)}
                        className="flex-1 text-sm text-gray-600 hover:text-gray-700 font-medium py-1 px-2 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No key relationships yet</h3>
                <p className="text-gray-600 mb-4">
                  Add the important people in your life for this role
                </p>
                <button
                  onClick={handleAddRelationship}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Your First Relationship
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Key Relationship Form Modal */}
        {showRelationshipForm && (
          <KeyRelationshipForm
            roleId={selectedRole.id}
            roleName={selectedRole.label}
            existingRelationship={editingRelationship}
            onClose={() => {
              setShowRelationshipForm(false);
              setEditingRelationship(null);
            }}
            onRelationshipCreated={handleRelationshipSaved}
          />
        )}

        {/* Task Form Modal */}
        {showTaskForm && selectedRole && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl mx-4">
              <TaskForm
                onClose={() => setShowTaskForm(false)}
                onTaskCreated={handleTaskCreated}
                initialFormData={{
                  selectedRoleIds: [selectedRole.id]
                }}
              />
            </div>
          </div>
        )}

        {/* Delegate Task Modal */}
        {delegatingTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <DelegateTaskModal
              taskId={delegatingTask.id}
              taskTitle={delegatingTask.title}
              onClose={() => setDelegatingTask(null)}
              onDelegated={handleTaskDelegated}
            />
          </div>
        )}

        {/* Edit Task Modal */}
        {editingTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
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
  }

  // If a section is selected, show section content
  if (selectedSection === 'roles') {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 p-6 border-b border-gray-200">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Active Roles</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6" style={{ height: 'calc(100% - 80px)' }}>
          {roles.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No active roles found</div>
              <p className="text-sm text-gray-400">
                Add roles in Settings to get started with your Role Bank
              </p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-3">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all text-left group bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{role.icon || '👤'}</div>
                    <div>
                      <h3 className="font-medium text-gray-900 group-hover:text-primary-600">
                        {role.label}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">{role.category}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main three boxes view
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Role Bank</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Roles Box */}
          <button
            onClick={() => setSelectedSection('roles')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left group h-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">Active Roles</h2>
            </div>
            <p className="text-gray-600 text-sm">
              View and manage your life roles and their associated tasks and relationships
            </p>
            <div className="mt-4 text-sm text-gray-500">
              {roles.length} active role{roles.length !== 1 ? 's' : ''}
            </div>
          </button>

          {/* Deposit Ideas Box */}
          <button
            onClick={() => setSelectedSection('deposits')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left group h-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Plus className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">Deposit Ideas</h2>
            </div>
            <p className="text-gray-600 text-sm">
              Authentic deposits to invest in your key relationships
            </p>
            <div className="mt-4 text-sm text-gray-500">
              {depositIdeas.length} deposit idea{depositIdeas.length !== 1 ? 's' : ''}
            </div>
          </button>

          {/* Key Relationships Box */}
          <button
            onClick={() => setSelectedSection('relationships')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left group h-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Heart className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600">Key Relationships</h2>
            </div>
            <p className="text-gray-600 text-sm">
              Important people in your life across all your roles
            </p>
            <div className="mt-4 text-sm text-gray-500">
              {relationships.length} relationship{relationships.length !== 1 ? 's' : ''}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// Component to handle image display with signed URLs
const RelationshipImage: React.FC<{ relationship: KeyRelationship }> = ({ relationship }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const loadImage = async () => {
      if (relationship.image_path) {
        const signedUrl = await getSignedImageUrl(relationship.image_path);
        if (signedUrl) {
          setImageUrl(signedUrl);
        }
      }
    };
    
    loadImage();
  }, [relationship.image_path]);
  
  if (imageUrl) {
    return (
      <div className="flex-shrink-0">
        <img
          src={imageUrl}
          alt={relationship.name}
          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
        />
      </div>
    );
  }
  
  return (
    <div className="flex-shrink-0">
      <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
        <UserPlus className="h-8 w-8 text-gray-400" />
      </div>
    </div>
  );
};

export default RoleBank;