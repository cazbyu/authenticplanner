import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ChevronLeft, UserPlus, Plus, Heart, Edit, Eye } from 'lucide-react';
import { Check, X } from 'lucide-react';
import KeyRelationshipForm from './KeyRelationshipForm';
import TaskEventForm from '../tasks/TaskEventForm';
import DelegateTaskModal from '../tasks/DelegateTaskModal';
import { getSignedImageUrl } from '../../utils/imageHelpers';
import EditTask from '../tasks/EditTask';
import DepositIdeaCard from '../shared/DepositIdeaCard';
import DepositIdeaEditForm from '../shared/DepositIdeaEditForm';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";

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

interface Domain {
  id: string;
  label: string;
}

interface RoleBankProps {
  selectedRole?: Role | null;
  onBack?: () => void;
}

const RoleBank: React.FC<RoleBankProps> = ({ selectedRole: propSelectedRole, onBack: propOnBack }) => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Role | null>(propSelectedRole || null);
  const [sortBy, setSortBy] = useState<'active' | 'inactive' | 'archived'>('active');
  const [roles, setRoles] = useState<Role[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [relationships, setRelationships] = useState<KeyRelationship[]>([]);
  const [roleDepositIdeas, setRoleDepositIdeas] = useState<DepositIdea[]>([]);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<KeyRelationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaskEventForm, setShowTaskEventForm] = useState(false);
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);
  const [showAddDepositIdeaForm, setShowAddDepositIdeaForm] = useState(false);
  const [editingDepositIdea, setEditingDepositIdea] = useState<any | null>(null);
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const [activatingDepositIdea, setActivatingDepositIdea] = useState<DepositIdea | null>(null);
  const [relationshipTasks, setRelationshipTasks] = useState<Record<string, Task[]>>({});
  const [relationshipDepositIdeas, setRelationshipDepositIdeas] = useState<Record<string, DepositIdea[]>>({});
  
  useEffect(() => {
     console.log("Domains passed to DepositIdeaForm in RoleBank:", domains);
    fetchRoles();
    fetchDomains();
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

      let query = supabase
        .from('0007-ap-roles')
        .select('id, label, category, is_active')
        .eq('user_id', user.id);
      
      if (sortBy === 'active') {
        query = query.eq('is_active', true);
      } else if (sortBy === 'inactive') {
        query = query.eq('is_active', false);
      }
      // For archived, we'll need to add archived column logic later
      
      query = query.order('category', { ascending: true })
                   .order('label', { ascending: true });

      const { data: rolesData, error } = await query;
      if (error) throw error;
      setRoles(rolesData || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch roles when sort changes
  useEffect(() => {
    fetchRoles();
  }, [sortBy]);

  const fetchDomains = async () => {
  try {
    const { data: domainData, error } = await supabase
      .from('0007-ap-domains')
      .select('id, name');
    if (error) throw error;
    // Store domains as Record<string, Domain> for consistency
    setDomains(
      (domainData || []).reduce((acc, d) => ({ 
        ...acc, 
        [d.id]: { id: d.id, name: d.name } 
      }), {} as Record<string, Domain>)
    );
  } catch (err) {
    console.error("Error fetching domains:", err);
    setDomains({});
  }
};

  const fetchRoleData = async (roleId: string) => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get task IDs that are linked to this specific role
      const { data: taskRoleLinks, error: taskRoleError } = await supabase
        .from('0007-ap-task-roles')
        .select('task_id')
        .eq('role_id', roleId);

      if (taskRoleError) throw taskRoleError;

      const taskIds = taskRoleLinks?.map(link => link.task_id) || [];

      // Now fetch only those tasks
      const { data: tasksData, error: tasksError } = taskIds.length > 0 
        ? await supabase
        .from('0007-ap-tasks')
        .select(`
          *,
          task_roles:0007-ap-task-roles!task_id(role_id)
        `)
        .eq('user_id', user.id)
        .in('id', taskIds)
        .in('status', ['pending', 'in_progress'])
        : { data: [], error: null };

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch key relationships
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('0007-ap-key-relationships')
        .select('*')
        .eq('role_id', roleId);

      if (relationshipsError) throw relationshipsError;
      setRelationships(relationshipsData || []);
      setKeyRelationships(relationshipsData || []);

      // Fetch tasks and deposit ideas for each key relationship
      if (relationshipsData && relationshipsData.length > 0) {
        await fetchRelationshipContent(relationshipsData);
      }

      // Fetch deposit ideas specifically associated with this role
      const { data: roleDepositIdeaLinks, error: roleDepositError } = await supabase
        .from('0007-ap-deposit-idea-roles')
        .select('deposit_idea_id')
        .eq('role_id', roleId);

      if (roleDepositError) throw roleDepositError;

      const depositIdeaIds = roleDepositIdeaLinks?.map(link => link.deposit_idea_id) || [];

      // Now fetch the actual deposit ideas
      const { data: roleDepositIdeasData, error: depositIdeasError } = depositIdeaIds.length > 0
        ? await supabase
            .from('0007-ap-deposit-ideas')
            .select('*')
            .in('id', depositIdeaIds)
            .eq('is_active', true)
            .is('activated_at', null)  // Not activated
            .eq('archived', false)     // Not archived
        : { data: [], error: null };

      if (depositIdeasError) throw depositIdeasError;
      setRoleDepositIdeas(roleDepositIdeasData || []);

      // Also fetch deposit ideas for key relationships (existing functionality)
      if (relationshipsData && relationshipsData.length > 0) {
        const relationshipIds = relationshipsData.map(rel => rel.id);
        const { data: relationshipDepositIdeas, error: relationshipDepositError } = await supabase
          .from('0007-ap-deposit-ideas')
          .select('*')
          .in('key_relationship_id', relationshipIds)
          .eq('is_active', true)
          .is('activated_at', null)  // Not activated
          .eq('archived', false);    // Not archived

        if (relationshipDepositError) throw relationshipDepositError;
        
        // Combine role-specific deposit ideas with relationship deposit ideas
        const allDepositIdeas = [
          ...(roleDepositIdeasData || []),
          ...(relationshipDepositIdeas || [])
        ];
        
        // Remove duplicates based on ID
        const uniqueDepositIdeas = allDepositIdeas.filter((idea, index, self) => 
          index === self.findIndex(i => i.id === idea.id)
        );
        
        setRoleDepositIdeas(uniqueDepositIdeas);
      } else {
        // If no relationships, just use role-specific deposit ideas
        setRoleDepositIdeas(roleDepositIdeasData || []);
      }

    } catch (error) {
      console.error('Error fetching role data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelationshipContent = async (relationships: KeyRelationship[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const relationshipIds = relationships.map(rel => rel.id);

      // Fetch tasks linked to these key relationships
      const { data: taskLinks } = await supabase
        .from('0007-ap-task-key-relationships')
        .select(`
          key_relationship_id,
          task:0007-ap-tasks(
            id,
            title,
            due_date,
            status,
            is_urgent,
            is_important,
            is_authentic_deposit,
            notes
          )
        `)
        .in('key_relationship_id', relationshipIds);

      // Fetch deposit ideas linked to these key relationships
      const { data: depositIdeas } = await supabase
        .from('0007-ap-deposit-ideas')
        .select('*')
        .in('key_relationship_id', relationshipIds)
        .eq('is_active', true)
        .is('activated_at', null)  // Not activated
        .neq('archived', true);    // Not archived (handles null values properly)

      // Group tasks by relationship
      const tasksByRelationship: Record<string, Task[]> = {};
      taskLinks?.forEach(link => {
        if (link.task && (link.task.status === 'pending' || link.task.status === 'in_progress')) {
          const relId = link.key_relationship_id;
          if (!tasksByRelationship[relId]) {
            tasksByRelationship[relId] = [];
          }
          tasksByRelationship[relId].push(link.task);
        }
      });

      // Group deposit ideas by relationship
      const depositIdeasByRelationship: Record<string, DepositIdea[]> = {};
      depositIdeas?.forEach(idea => {
        const relId = idea.key_relationship_id;
        if (relId) {
          if (!depositIdeasByRelationship[relId]) {
            depositIdeasByRelationship[relId] = [];
          }
          depositIdeasByRelationship[relId].push(idea);
        }
      });

      setRelationshipTasks(tasksByRelationship);
      setRelationshipDepositIdeas(depositIdeasByRelationship);
    } catch (error) {
      console.error('Error fetching relationship content:', error);
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
    setShowTaskEventForm(true);
  };

  const handleTaskCreated = () => {
    setShowTaskEventForm(false);
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

  const handleEditDepositIdea = async (idea: DepositIdea) => {
  // 1. Get domains linked to this deposit idea
  const { data: domainLinks } = await supabase
    .from('0007-ap-deposit-idea-domains')
    .select('domain_id')
    .eq('deposit_idea_id', idea.id);

  // 2. Extract the domain IDs
  const selectedDomainIds = domainLinks?.map(link => link.domain_id) || [];

  // 3. Do the same for roles (optional, but helps!)
  const { data: roleLinks } = await supabase
    .from('0007-ap-deposit-idea-roles')
    .select('role_id')
    .eq('deposit_idea_id', idea.id);

  const selectedRoleIds = roleLinks?.map(link => link.role_id) || [];

  // 4. Same for key relationships (optional)
  const { data: krLinks } = await supabase
    .from('0007-ap-deposit-idea-key-relationships')
    .select('key_relationship_id')
    .eq('deposit_idea_id', idea.id);

  const selectedKeyRelationshipIds = krLinks?.map(link => link.key_relationship_id) || [];

  // 5. Now open the modal and pass all the correct info!
  setEditingDepositIdea({
    ...idea,
    selectedDomainIds,
    selectedRoleIds,
    selectedKeyRelationshipIds,
  });
};

  const handleActivateDepositIdea = (idea: DepositIdea) => {
    // Show selection dialog for Task vs Event
    setActivatingDepositIdea(idea);
  };

  const handleDepositIdeaActivated = () => {
    setActivatingDepositIdea(null);
    // Archive the deposit idea and refresh data
    if (activatingDepositIdea && selectedRole) {
      archiveDepositIdea(activatingDepositIdea.id);
    }
  };

  const archiveDepositIdea = async (depositIdeaId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('0007-ap-deposit-ideas')
        .update({
          activated_at: new Date().toISOString(),
          archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', depositIdeaId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error archiving deposit idea:', error);
        toast.error('Failed to archive deposit idea');
      } else {
        toast.success('Deposit idea activated and archived successfully!');
        if (selectedRole) {
          fetchRoleData(selectedRole.id);
        }
      }
    } catch (error) {
      console.error('Error archiving deposit idea:', error);
      toast.error('Failed to archive deposit idea');
    }
  };
  const handleDepositIdeaUpdated = () => {
    setEditingDepositIdea(null);
    if (selectedRole) {
      fetchRoleData(selectedRole.id);
    }
  };


  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const handleBack = () => {
    if (selectedRole) {
      setSelectedRole(null);
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

  // --- INDIVIDUAL ROLE VIEW (with guaranteed scroll) ---
  if (selectedRole) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 flex-shrink-0">
          <button
            onClick={() => setSelectedRole(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{selectedRole.label}</h1>
        </div>
        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8" style={{ minHeight: 0 }}>
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
              <button
  onClick={() => setShowAddDepositIdeaForm(true)}
  className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
>
  <Plus className="h-4 w-4" />
  Add Deposit Idea
</button>

            </div>
            {roleDepositIdeas.length > 0 ? (
              <div className="space-y-2">
                {roleDepositIdeas.map((idea) => (
                  <DepositIdeaCard
                    key={idea.id}
                    idea={idea}
                    roles={roles.reduce((acc, role) => ({ ...acc, [role.id]: role }), {})}
                    domains={domains}
                    onEdit={handleEditDepositIdea}
                    onActivate={handleActivateDepositIdea}
                    showEditButton={true}
                    showActivateButton={true}
                    className="bg-blue-50 border-blue-200"
                  />
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                No deposit ideas yet
              </div>
            )}
          </section>
{showAddDepositIdeaForm && selectedRole && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl mx-4">
              <TaskEventForm
                mode="create"
                initialData={{
                  schedulingType: 'depositIdea',
                  selectedRoleIds: [selectedRole.id]
                }}
                onSubmitSuccess={() => {
                  setShowAddDepositIdeaForm(false);
                  fetchRoleData(selectedRole.id);
                }}
                onClose={() => setShowAddDepositIdeaForm(false)}
              />
            </div>
          </div>
)}

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
                  <div 
                    key={rel.id} 
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
                    onClick={() => handleEditRelationship(rel)}
                  >
                    <div className="flex items-start gap-3">
                      <RelationshipImage relationship={rel} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 truncate transition-colors">{rel.name}</h3>
                        <p className="text-sm text-gray-600 group-hover:text-blue-600 mb-2 transition-colors">Key Relationship</p>
                        {rel.notes && (
                          <div className="bg-gray-50 rounded-md p-2 mb-3">
                            <p className="text-xs font-medium text-gray-700 mb-1">Notes:</p>
                            <p className="text-sm text-gray-600">{rel.notes}</p>
                          </div>
                        )}
                        
                        {/* Active Tasks */}
                        {relationshipTasks[rel.id] && relationshipTasks[rel.id].length > 0 && (
                          <div className="bg-blue-50 rounded-md p-2 mb-3">
                            <p className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Active Tasks ({relationshipTasks[rel.id].length})
                            </p>
                            <div className="space-y-1">
                              {relationshipTasks[rel.id].slice(0, 2).map((task) => (
                                <div key={task.id} className="flex items-center justify-between">
                                  <span className="text-xs text-blue-800 truncate flex-1">{task.title}</span>
                                  <div className="flex gap-1 ml-2">
                                    {task.is_urgent && (
                                      <span className="inline-block w-2 h-2 bg-red-400 rounded-full" title="Urgent" />
                                    )}
                                    {task.is_important && (
                                      <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full" title="Important" />
                                    )}
                                    {task.is_authentic_deposit && (
                                      <span className="inline-block w-2 h-2 bg-green-400 rounded-full" title="Authentic Deposit" />
                                    )}
                                  </div>
                                </div>
                              ))}
                              {relationshipTasks[rel.id].length > 2 && (
                                <p className="text-xs text-blue-600 italic">
                                  +{relationshipTasks[rel.id].length - 2} more tasks
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Active Deposit Ideas */}
                        {relationshipDepositIdeas[rel.id] && relationshipDepositIdeas[rel.id].length > 0 && (
                          <div className="bg-purple-50 rounded-md p-2 mb-3">
                            <p className="text-xs font-medium text-purple-700 mb-2 flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              Deposit Ideas ({relationshipDepositIdeas[rel.id].length})
                            </p>
                            <div className="space-y-1">
                              {relationshipDepositIdeas[rel.id].slice(0, 2).map((idea) => (
                                <div key={idea.id} className="text-xs text-purple-800 truncate">
                                  {idea.title || idea.description}
                                </div>
                              ))}
                              {relationshipDepositIdeas[rel.id].length > 2 && (
                                <p className="text-xs text-purple-600 italic">
                                  +{relationshipDepositIdeas[rel.id].length - 2} more ideas
                                </p>
                              )}
                            </div>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditRelationship(rel);
                        }}
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

        {/* Task Event Form Modal */}
        {showTaskEventForm && selectedRole && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl mx-4">
              <TaskEventForm
                mode="create"
                initialData={{
                  schedulingType: 'task',
                  selectedRoleIds: [selectedRole.id]
                }}
                onSubmitSuccess={handleTaskCreated}
                onClose={() => setShowTaskEventForm(false)}
              />
            </div>
          </div>
        )}

        {/* Activate Deposit Idea Form Modal */}
        {activatingDepositIdea && selectedRole && (
          <ActivationTypeSelector
            depositIdea={activatingDepositIdea}
            selectedRole={selectedRole}
            onClose={() => setActivatingDepositIdea(null)}
            onActivated={handleDepositIdeaActivated}
          />
        )}

        {/* Delegate Task Modal */}
        {delegatingTask && (
          <DelegateTaskModal
            task={delegatingTask}
            onClose={() => setDelegatingTask(null)}
            onTaskDelegated={handleTaskDelegated}
          />
        )}

        {/* Edit Task Modal */}
        {editingTask && (
          <EditTask
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onTaskUpdated={handleTaskUpdated}
          />
        )}

        {/* Edit Deposit Idea Modal */}
        {editingDepositIdea && selectedRole && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl mx-4">
              <TaskEventForm
  mode="edit"
  initialData={{
    id: editingDepositIdea.id,
    title: editingDepositIdea.title || editingDepositIdea.description || '',
    notes: editingDepositIdea.notes || '',
    schedulingType: 'depositIdea',
    selectedRoleIds: editingDepositIdea.selectedRoleIds || [selectedRole.id],
    selectedDomainIds: editingDepositIdea.selectedDomainIds || [],
    selectedKeyRelationshipIds: editingDepositIdea.selectedKeyRelationshipIds || [],
  }}
  onSubmitSuccess={handleDepositIdeaUpdated}
  onClose={() => setEditingDepositIdea(null)}
/>

            </div>
          </div>
        )}
      </div>
    );
  }

  // --- ROLES GRID VIEW ---
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between p-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          {propOnBack && (
            <button
              onClick={propOnBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Role Bank</h1>
          </div>
        </div>
        
        {/* Sort Filter and Add Button */}
        <div className="absolute right-6 flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('active')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                sortBy === 'active'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Active Roles
            </button>
            <button
              onClick={() => setSortBy('inactive')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                sortBy === 'inactive'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Not Activated
            </button>
          </div>
          
          <button
            onClick={() => setShowAddDepositIdeaForm(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Deposit Idea
          </button>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
        <div className="grid gap-4 grid-cols-3 pr-2">
          {roles.length === 0 ? (
            <div className="text-center py-12 col-span-3">
              <div className="text-gray-500 mb-4">
                {sortBy === 'active' && 'No active roles found'}
                {sortBy === 'inactive' && 'No inactive roles found'}
              </div>
              <p className="text-sm text-gray-400">
                {sortBy === 'active' && 'Add roles in Settings to get started with your Role Bank'}
                {sortBy === 'inactive' && 'All your roles are currently active'}
              </p>
            </div>
          ) : (
            roles.map(role => (
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
                    <p className="text-sm text-gray-500 capitalize">
                      {role.category}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Add Deposit Idea Form Modal - Global */}
      {showAddDepositIdeaForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl mx-4">
            <TaskEventForm
              mode="create"
              initialData={{
                schedulingType: 'depositIdea'
              }}
              onSubmitSuccess={() => {
                setShowAddDepositIdeaForm(false);
                // Refresh data if needed
              }}
              onClose={() => setShowAddDepositIdeaForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// --- ACTIVATION TYPE SELECTOR COMPONENT ---
const ActivationTypeSelector: React.FC<{
  depositIdea: DepositIdea;
  selectedRole: Role;
  onClose: () => void;
  onActivated: () => void;
}> = ({ depositIdea, selectedRole, onClose, onActivated }) => {
  const [selectedType, setSelectedType] = useState<'task' | 'event' | null>(null);
  const [showTaskEventForm, setShowTaskEventForm] = useState(false);

  // ---- PASTE THIS BLOCK BELOW ----

  const [pivotIds, setPivotIds] = useState({
    selectedRoleIds: [],
    selectedDomainIds: [],
    selectedKeyRelationshipIds: []
  });

  useEffect(() => {
    if (!depositIdea) return;
    (async () => {
      // Fetch Roles linked to Deposit Idea
      const { data: ideaRoles } = await supabase
        .from("0007-ap-deposit-idea-roles")
        .select("role_id")
        .eq("deposit_idea_id", depositIdea.id);

      // Fetch Domains linked to Deposit Idea
      const { data: ideaDomains } = await supabase
        .from("0007-ap-deposit-idea-domains")
        .select("domain_id")
        .eq("deposit_idea_id", depositIdea.id);

      // Fetch Key Relationships linked to Deposit Idea
      const { data: ideaKRs } = await supabase
        .from("0007-ap-deposit-idea-key-relationships")
        .select("key_relationship_id")
        .eq("deposit_idea_id", depositIdea.id);

      setPivotIds({
        selectedRoleIds: ideaRoles?.map(r => r.role_id) || [],
        selectedDomainIds: ideaDomains?.map(d => d.domain_id) || [],
        selectedKeyRelationshipIds: ideaKRs?.map(k => k.key_relationship_id) || [],
      });
    })();
  }, [depositIdea]);

  const handleTypeSelect = (type: 'task' | 'event') => {
    setSelectedType(type);
    setShowTaskEventForm(true);
  };

  // ---- END OF PASTE ----

  const handleFormSuccess = () => {
    setShowTaskEventForm(false);
    onActivated();
  };

  if (showTaskEventForm && selectedType) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-full max-w-2xl mx-4">
          <TaskEventForm
  mode="create"
  initialData={{
    title: depositIdea.title,
    notes: depositIdea.notes || "",
    schedulingType: selectedType,
    selectedRoleIds: pivotIds.selectedRoleIds.length
      ? pivotIds.selectedRoleIds
      : [selectedRole.id], // fallback if empty
    selectedDomainIds: pivotIds.selectedDomainIds,
    selectedKeyRelationshipIds: pivotIds.selectedKeyRelationshipIds,
    authenticDeposit: true,
    isFromDepositIdea: true
  }}
  onSubmitSuccess={handleFormSuccess}
  onClose={() => {
    setShowTaskEventForm(false);
    setSelectedType(null);
  }}
/>

        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Activate Deposit Idea</h3>
        <p className="text-sm text-gray-600 mb-4">
          How would you like to activate "{depositIdea.title}"?
        </p>
        <div className="space-y-3">
          <button
            onClick={() => handleTypeSelect('task')}
            className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-900">Create as Task</div>
            <div className="text-sm text-gray-600">Add to your task list with optional due date</div>
          </button>
          <button
            onClick={() => handleTypeSelect('event')}
            className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-900">Create as Event</div>
            <div className="text-sm text-gray-600">Schedule on your calendar with specific date and time</div>
          </button>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// --- SUPPORT COMPONENT ---
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