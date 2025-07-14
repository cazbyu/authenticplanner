import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ChevronLeft, UserPlus, Plus, Heart, Edit, Eye } from 'lucide-react';
import KeyRelationshipForm from './KeyRelationshipForm';

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
}

interface KeyRelationship {
  id: string;
  name: string;
  role_id: string;
  photo_url?: string;
  notes?: string;
}

interface DepositIdea {
  id: string;
  description: string;
  key_relationship_id: string;
}

interface RoleBankProps {
  selectedRole: Role | null;
  onBack: () => void;
}

const RoleBank: React.FC<RoleBankProps> = ({ selectedRole, onBack }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [relationships, setRelationships] = useState<KeyRelationship[]>([]);
  const [depositIdeas, setDepositIdeas] = useState<DepositIdea[]>([]);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<KeyRelationship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedRole) {
      fetchRoleData(selectedRole.id);
    }
  }, [selectedRole]);

  const fetchRoleData = async (roleId: string) => {
    try {
      setLoading(true);
      
      // Fetch tasks for this role using the many-to-many relationship
      const { data: tasksData, error: tasksError } = await supabase
        .from('0007-ap-tasks')
        .select(`
          *,
          0007-ap-task_roles!inner(role_id)
        `)
        .eq('0007-ap-task_roles.role_id', roleId)
        .eq('status', 'pending');

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch key relationships
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('0007-ap-key_relationships')
        .select('*')
        .eq('role_id', roleId);

      if (relationshipsError) throw relationshipsError;
      setRelationships(relationshipsData || []);

      // Fetch deposit ideas for all relationships
      if (relationshipsData && relationshipsData.length > 0) {
        const relationshipIds = relationshipsData.map(rel => rel.id);
        const { data: ideasData, error: ideasError } = await supabase
          .from('0007-ap-deposit_ideas')
          .select('*')
          .in('key_relationship_id', relationshipIds);

        if (ideasError) throw ideasError;
        setDepositIdeas(ideasData || []);
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

  if (!selectedRole) return null;

  const pendingTasks = tasks.filter(task => task.status === 'pending');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-200">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-2xl">{selectedRole.icon}</div>
          <h1 className="text-2xl font-bold text-gray-900">{selectedRole.label}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Current Tasks */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Tasks</h2>
          {loading ? (
            <div className="text-gray-500">Loading tasks...</div>
          ) : pendingTasks.length > 0 ? (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <div key={task.id} className="p-3 bg-gray-50 rounded-lg border">
                  <div className="font-medium text-gray-900">{task.title}</div>
                  {task.due_date && (
                    <div className="text-sm text-gray-600 mt-1">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              No current tasks for this role
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
                    <div className="flex-shrink-0">
                      {rel.photo_url ? (
                        <img
                          src={rel.photo_url}
                          alt={rel.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                          <UserPlus className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
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

        {/* Task Notes */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Notes</h2>
          <div className="text-gray-500 text-center py-8">
            No task notes yet
          </div>
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
          onSave={handleRelationshipSaved}
        />
      )}
    </div>
  );
};

export default RoleBank;