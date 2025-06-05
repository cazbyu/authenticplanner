import React, { useState, useEffect } from 'react';
import { Users, Star, X, Plus, ChevronRight } from 'lucide-react';
import TaskForm from '../tasks/TaskForm';
import { supabase } from '../../supabaseClient';

interface Role {
  id: string;
  label: string;
  category: string;
  icon?: string;
  domains?: string[];
}

interface Task {
  id: string;
  title: string;
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

const RoleBank: React.FC = () => {
  const [activeRoles, setActiveRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [depositIdeas, setDepositIdeas] = useState<DepositIdea[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedDepositIdea, setSelectedDepositIdea] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

      const { data: depositData } = await supabase
        .from('deposit_ideas')
        .select('*')
        .eq('role_id', selectedRole.id);
      
      setDepositIdeas(depositData || []);

      const { data: relationshipData } = await supabase
        .from('relationships')
        .select('*')
        .eq('role_id', selectedRole.id);
      
      setRelationships(relationshipData || []);
    };

    fetchRoleData();
  }, [selectedRole]);

  const handleTaskSave = async (taskData: any) => {
    setShowTaskForm(false);
    setSelectedDepositIdea(null);
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

  // Compact sidebar view
  if (!selectedRole) {
    return (
      <div className="space-y-2">
        {activeRoles.map(role => {
          const stats = getRoleStats(role.id);
          return (
            <div
              key={role.id}
              onClick={() => setSelectedRole(role)}
              className="bg-white rounded p-2 cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{role.label}</span>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{stats.deposits}D</span>
                  <span>{stats.tasks}T</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Full page view when role is selected
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
              <h3 className="text-lg font-medium mb-4">Key Relationships</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {relationships.map(rel => (
                  <div key={rel.id} className="p-3 bg-gray-50 rounded-lg">
                    {rel.name}
                  </div>
                ))}
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
    </div>
  );
};

export default RoleBank;