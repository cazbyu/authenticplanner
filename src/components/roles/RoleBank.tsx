import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, ArrowLeft, User, Edit2, Trash2 } from 'lucide-react';

interface Role {
  id: string;
  label: string;
  category: string;
  icon: string;
  is_active: boolean;
}

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string;
  priority: number;
}

interface DepositIdea {
  id: string;
  description: string;
  is_active: boolean;
}

interface KeyRelationship {
  id: string;
  name: string;
  role_id: string;
}

interface TaskFormData {
  title: string;
  due_date: string;
  time: string;
  priority: number;
  notes: string;
}

export default function RoleBank() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'main' | 'roles' | 'depositIdeas' | 'keyRelationships' | 'roleDetail'>('main');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [depositIdeas, setDepositIdeas] = useState<DepositIdea[]>([]);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    title: '',
    due_date: '',
    time: '',
    priority: 5,
    notes: ''
  });
  const [newDepositIdea, setNewDepositIdea] = useState('');
  const [newRelationshipName, setNewRelationshipName] = useState('');

  useEffect(() => {
    if (user) {
      fetchRoles();
      fetchDepositIdeas();
      fetchKeyRelationships();
    }
  }, [user]);

  useEffect(() => {
    if (selectedRole) {
      fetchRoleTasks();
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('0007-ap-roles')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('label');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchRoleTasks = async () => {
    if (!selectedRole) return;

    try {
      const { data, error } = await supabase
        .from('0007-ap-tasks')
        .select(`
          id,
          title,
          status,
          due_date,
          priority,
          0007-ap-task_roles!inner(role_id)
        `)
        .eq('user_id', user?.id)
        .eq('0007-ap-task_roles.role_id', selectedRole.id)
        .in('status', ['pending', 'in_progress'])
        .order('due_date');

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching role tasks:', error);
    }
  };

  const fetchDepositIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('0007-ap-deposit_ideas')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepositIdeas(data || []);
    } catch (error) {
      console.error('Error fetching deposit ideas:', error);
    }
  };

  const fetchKeyRelationships = async () => {
    try {
      const { data, error } = await supabase
        .from('0007-ap-key_relationships')
        .select('*')
        .order('name');

      if (error) throw error;
      setKeyRelationships(data || []);
    } catch (error) {
      console.error('Error fetching key relationships:', error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !taskForm.title.trim()) return;

    try {
      // Create task
      const { data: taskData, error: taskError } = await supabase
        .from('0007-ap-tasks')
        .insert({
          user_id: user?.id,
          title: taskForm.title,
          due_date: taskForm.due_date || null,
          time: taskForm.time || null,
          priority: taskForm.priority,
          notes: taskForm.notes || null,
          status: 'pending'
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Link task to role
      const { error: linkError } = await supabase
        .from('0007-ap-task_roles')
        .insert({
          task_id: taskData.id,
          role_id: selectedRole.id
        });

      if (linkError) throw linkError;

      // Reset form and refresh
      setTaskForm({
        title: '',
        due_date: '',
        time: '',
        priority: 5,
        notes: ''
      });
      setShowTaskForm(false);
      fetchRoleTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleCreateDepositIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepositIdea.trim()) return;

    try {
      const { error } = await supabase
        .from('0007-ap-deposit_ideas')
        .insert({
          description: newDepositIdea,
          key_relationship_id: selectedRole?.id || null,
          is_active: true
        });

      if (error) throw error;

      setNewDepositIdea('');
      setShowDepositForm(false);
      fetchDepositIdeas();
    } catch (error) {
      console.error('Error creating deposit idea:', error);
    }
  };

  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRelationshipName.trim()) return;

    try {
      const { error } = await supabase
        .from('0007-ap-key_relationships')
        .insert({
          name: newRelationshipName,
          role_id: selectedRole?.id || null
        });

      if (error) throw error;

      setNewRelationshipName('');
      setShowRelationshipForm(false);
      fetchKeyRelationships();
    } catch (error) {
      console.error('Error creating relationship:', error);
    }
  };

  const renderMainView = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Role Bank</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Roles */}
        <div 
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setCurrentView('roles')}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Roles</h3>
          <p className="text-3xl font-bold text-blue-600">{roles.length}</p>
          <p className="text-sm text-gray-600 mt-2">Click to view roles</p>
        </div>

        {/* Deposit Ideas */}
        <div 
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setCurrentView('depositIdeas')}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Deposit Ideas</h3>
          <p className="text-3xl font-bold text-green-600">{depositIdeas.length}</p>
          <p className="text-sm text-gray-600 mt-2">Click to view ideas</p>
        </div>

        {/* Key Relationships */}
        <div 
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setCurrentView('keyRelationships')}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Key Relationships</h3>
          <p className="text-3xl font-bold text-purple-600">{keyRelationships.length}</p>
          <p className="text-sm text-gray-600 mt-2">Click to view relationships</p>
        </div>
      </div>
    </div>
  );

  const renderRolesView = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Active Roles</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              setSelectedRole(role);
              setCurrentView('roleDetail');
            }}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">{role.icon}</div>
              <h3 className="font-semibold text-gray-900">{role.label}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRoleDetail = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setCurrentView('roles')}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Roles
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{selectedRole?.label}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Tasks */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Current Tasks</h3>
            <button
              onClick={() => setShowTaskForm(true)}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Task
            </button>
          </div>
          
          {showTaskForm && (
            <form onSubmit={handleCreateTask} className="mb-4 p-4 bg-gray-50 rounded-lg">
              <input
                type="text"
                placeholder="Task title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="w-full p-2 border rounded mb-2"
                required
              />
              <input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                className="w-full p-2 border rounded mb-2"
              />
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: parseInt(e.target.value) })}
                className="w-full p-2 border rounded mb-2"
              >
                {[1,2,3,4,5,6,7,8,9].map(p => (
                  <option key={p} value={p}>Priority {p}</option>
                ))}
              </select>
              <div className="flex space-x-2">
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                  Add
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowTaskForm(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900">{task.title}</h4>
                {task.due_date && (
                  <p className="text-sm text-gray-600">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                )}
                <p className="text-sm text-gray-600">Priority: {task.priority}</p>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-gray-500 text-center py-4">No current tasks</p>
            )}
          </div>
        </div>

        {/* Deposit Ideas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Deposit Ideas</h3>
            <button
              onClick={() => setShowDepositForm(true)}
              className="flex items-center text-green-600 hover:text-green-800"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Idea
            </button>
          </div>

          {showDepositForm && (
            <form onSubmit={handleCreateDepositIdea} className="mb-4 p-4 bg-gray-50 rounded-lg">
              <textarea
                placeholder="Deposit idea description"
                value={newDepositIdea}
                onChange={(e) => setNewDepositIdea(e.target.value)}
                className="w-full p-2 border rounded mb-2"
                rows={3}
                required
              />
              <div className="flex space-x-2">
                <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded text-sm">
                  Add
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowDepositForm(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {depositIdeas.map((idea) => (
              <div key={idea.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-900">{idea.description}</p>
              </div>
            ))}
            {depositIdeas.length === 0 && (
              <p className="text-gray-500 text-center py-4">No deposit ideas</p>
            )}
          </div>
        </div>

        {/* Key Relationships */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Key Relationships</h3>
            <button
              onClick={() => setShowRelationshipForm(true)}
              className="flex items-center text-purple-600 hover:text-purple-800"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Relationship
            </button>
          </div>

          {showRelationshipForm && (
            <form onSubmit={handleCreateRelationship} className="mb-4 p-4 bg-gray-50 rounded-lg">
              <input
                type="text"
                placeholder="Relationship name"
                value={newRelationshipName}
                onChange={(e) => setNewRelationshipName(e.target.value)}
                className="w-full p-2 border rounded mb-2"
                required
              />
              <div className="flex space-x-2">
                <button type="submit" className="px-3 py-1 bg-purple-600 text-white rounded text-sm">
                  Add
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowRelationshipForm(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {keyRelationships.map((relationship) => (
              <div key={relationship.id} className="p-3 bg-gray-50 rounded-lg flex items-center">
                <User className="w-8 h-8 text-gray-400 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">{relationship.name}</h4>
                </div>
              </div>
            ))}
            {keyRelationships.length === 0 && (
              <p className="text-gray-500 text-center py-4">No key relationships</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDepositIdeasView = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Deposit Ideas</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">All Deposit Ideas</h3>
          <button
            onClick={() => setShowDepositForm(true)}
            className="flex items-center text-green-600 hover:text-green-800"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Idea
          </button>
        </div>

        {showDepositForm && (
          <form onSubmit={handleCreateDepositIdea} className="mb-4 p-4 bg-gray-50 rounded-lg">
            <textarea
              placeholder="Deposit idea description"
              value={newDepositIdea}
              onChange={(e) => setNewDepositIdea(e.target.value)}
              className="w-full p-2 border rounded mb-2"
              rows={3}
              required
            />
            <div className="flex space-x-2">
              <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded text-sm">
                Add
              </button>
              <button 
                type="button" 
                onClick={() => setShowDepositForm(false)}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {depositIdeas.map((idea) => (
            <div key={idea.id} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-900">{idea.description}</p>
            </div>
          ))}
          {depositIdeas.length === 0 && (
            <p className="text-gray-500 text-center py-8 col-span-full">No deposit ideas</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderKeyRelationshipsView = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Key Relationships</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">All Key Relationships</h3>
          <button
            onClick={() => setShowRelationshipForm(true)}
            className="flex items-center text-purple-600 hover:text-purple-800"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Relationship
          </button>
        </div>

        {showRelationshipForm && (
          <form onSubmit={handleCreateRelationship} className="mb-4 p-4 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder="Relationship name"
              value={newRelationshipName}
              onChange={(e) => setNewRelationshipName(e.target.value)}
              className="w-full p-2 border rounded mb-2"
              required
            />
            <div className="flex space-x-2">
              <button type="submit" className="px-3 py-1 bg-purple-600 text-white rounded text-sm">
                Add
              </button>
              <button 
                type="button" 
                onClick={() => setShowRelationshipForm(false)}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {keyRelationships.map((relationship) => (
            <div key={relationship.id} className="p-4 bg-gray-50 rounded-lg flex items-center">
              <User className="w-12 h-12 text-gray-400 mr-4" />
              <div>
                <h4 className="font-medium text-gray-900">{relationship.name}</h4>
              </div>
            </div>
          ))}
          {keyRelationships.length === 0 && (
            <p className="text-gray-500 text-center py-8 col-span-full">No key relationships</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {currentView === 'main' && renderMainView()}
      {currentView === 'roles' && renderRolesView()}
      {currentView === 'roleDetail' && renderRoleDetail()}
      {currentView === 'depositIdeas' && renderDepositIdeasView()}
      {currentView === 'keyRelationships' && renderKeyRelationshipsView()}
    </div>
  );
}