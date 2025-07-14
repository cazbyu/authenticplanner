import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, 
  Plus, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  UserPlus,
  Edit,
  Eye
} from 'lucide-react';
import KeyRelationshipForm from './KeyRelationshipForm';

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
  due_date: string | null;
  status: string;
  priority: number | null;
  is_urgent: boolean;
  is_important: boolean;
}

interface KeyRelationship {
  id: string;
  name: string;
  role_id: string;
  photo_url?: string;
  notes?: string;
}

interface RoleStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
}

interface RoleBankProps {
  selectedRole: Role | null;
  onClose: () => void;
}

const RoleBank: React.FC<RoleBankProps> = ({ selectedRole, onClose }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [relationships, setRelationships] = useState<KeyRelationship[]>([]);
  const [stats, setStats] = useState<RoleStats>({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    upcomingTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<KeyRelationship | null>(null);

  useEffect(() => {
    if (selectedRole && user) {
      fetchRoleData();
    }
  }, [selectedRole, user]);

  const fetchRoleData = async () => {
    if (!selectedRole || !user) return;

    setLoading(true);
    try {
      // Fetch tasks for this role using the many-to-many relationship
      const { data: tasksData, error: tasksError } = await supabase
        .from('0007-ap-tasks')
        .select(`
          *,
          0007-ap-task_roles!inner(role_id)
        `)
        .eq('0007-ap-task_roles.role_id', selectedRole.id)
        .eq('user_id', user.id);

      if (tasksError) throw tasksError;

      // Fetch key relationships for this role
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('0007-ap-key_relationships')
        .select('*')
        .eq('role_id', selectedRole.id);

      if (relationshipsError) throw relationshipsError;

      setTasks(tasksData || []);
      setRelationships(relationshipsData || []);

      // Calculate stats
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      const pendingTasks = tasksData?.filter(task => task.status === 'pending') || [];
      const completedTasks = tasksData?.filter(task => task.status === 'completed') || [];
      const overdueTasks = pendingTasks.filter(task => 
        task.due_date && task.due_date < today
      );
      const upcomingTasks = pendingTasks.filter(task => 
        task.due_date && task.due_date >= today
      );

      setStats({
        totalTasks: tasksData?.length || 0,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        upcomingTasks: upcomingTasks.length
      });

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
    fetchRoleData(); // Refresh the data
  };

  if (!selectedRole) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{selectedRole.label}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto h-full">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm text-blue-600">Total Tasks</p>
                      <p className="text-xl font-semibold text-blue-900">{stats.totalTasks}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm text-green-600">Completed</p>
                      <p className="text-xl font-semibold text-green-900">{stats.completedTasks}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <div>
                      <p className="text-sm text-red-600">Overdue</p>
                      <p className="text-xl font-semibold text-red-900">{stats.overdueTasks}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                    <div>
                      <p className="text-sm text-yellow-600">Upcoming</p>
                      <p className="text-xl font-semibold text-yellow-900">{stats.upcomingTasks}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Tasks */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Tasks</h3>
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No tasks assigned to this role yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          {task.due_date && (
                            <p className="text-sm text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {task.is_urgent && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Urgent</span>
                          )}
                          {task.is_important && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Important</span>
                          )}
                          <span className={`px-2 py-1 text-xs rounded ${
                            task.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Deposit Ideas */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Deposit Ideas</h3>
                <button className="flex items-center text-primary-600 hover:text-primary-700 transition-colors">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Deposit Idea
                </button>
              </div>

              {/* Key Relationships */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Key Relationships</h3>
                  <button
                    onClick={handleAddRelationship}
                    className="flex items-center text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add Key Relationship
                  </button>
                </div>

                {relationships.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No key relationships yet.</p>
                    <button
                      onClick={handleAddRelationship}
                      className="text-sm text-primary-600 hover:text-primary-700 mt-2"
                    >
                      Add your first relationship
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {relationships.map((rel) => (
                      <div key={rel.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            {rel.photo_url ? (
                              <img
                                src={rel.photo_url}
                                alt={rel.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                                <Users className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-semibold text-gray-900 truncate">{rel.name}</h4>
                            <p className="text-sm text-gray-500 mb-2">Key Relationship</p>
                            {rel.notes && (
                              <div className="mb-3">
                                <p className="text-xs font-medium text-gray-700 mb-1">Notes:</p>
                                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded text-wrap break-words">
                                  {rel.notes}
                                </p>
                              </div>
                            )}
                            <div className="flex space-x-2">
                              <button className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                                <Eye className="w-3 h-3 inline mr-1" />
                                View Details
                              </button>
                              <button 
                                onClick={() => handleEditRelationship(rel)}
                                className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                              >
                                <Edit className="w-3 h-3 inline mr-1" />
                                Edit
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Task Notes */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Notes</h3>
                <div className="text-center py-8 text-gray-500">
                  <p>No task notes yet.</p>
                </div>
              </div>
            </div>
          )}
        </div>
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
          onSave={handleRelationshipSaved}
        />
      )}
    </div>
  );
};

export default RoleBank;