import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { ChevronLeft, UserPlus, Plus, Heart, Edit, Check, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import KeyRelationshipForm from './KeyRelationshipForm';
import UnifiedKeyRelationshipCard from './UnifiedKeyRelationshipCard';
import TaskEventForm from '../tasks/TaskEventForm';
import { formatTaskForForm } from '../../utils/taskHelpers';
import DelegateTaskModal from '../tasks/DelegateTaskModal';
import DepositIdeaCard from '../shared/DepositIdeaCard';
import { toast } from "sonner";
import UniversalTaskCard from '../tasks/UniversalTaskCard'; // Import the UniversalTaskCard

// Interfaces
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
  due_date: string;
  status: string;
  is_urgent: boolean;
  is_important: boolean;
  is_authentic_deposit: boolean;
  is_twelve_week_goal: boolean;
  notes?: string;
  completed_at?: string; // Added for sorting completed tasks
  task_roles: { role_id: string }[];
  task_domains: { domain_id: string }[];
  task_key_relationships: { key_relationship_id: string }[];
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
  title: string;
  description: string;
  notes?: string;
  key_relationship_id: string;
}

interface Domain {
  id: string;
  name: string;
}

interface RoleBankProps {
  selectedRole?: Role | null;
  onBack?: () => void;
}

const RoleBank: React.FC<RoleBankProps> = ({ selectedRole: propSelectedRole, onBack: propOnBack }) => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(propSelectedRole || null);
  const [sortBy, setSortBy] = useState<'active' | 'inactive'>('active');
  const [roles, setRoles] = useState<Role[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [relationships, setRelationships] = useState<KeyRelationship[]>([]);
  const [roleDepositIdeas, setRoleDepositIdeas] = useState<DepositIdea[]>([]);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTaskEventForm, setShowTaskEventForm] = useState(false);
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const memoizedInitialData = useMemo(() => formatTaskForForm(editingTask),[editingTask]);
  const [showAddDepositIdeaForm, setShowAddDepositIdeaForm] = useState(false);
  const [editingDepositIdea, setEditingDepositIdea] = useState<any | null>(null);
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const [activatingDepositIdea, setActivatingDepositIdea] = useState<DepositIdea | null>(null);
  const [deletingDepositIdea, setDeletingDepositIdea] = useState<DepositIdea | null>(null);
  
  // Task view state
  const [taskSortBy, setTaskSortBy] = useState<'due_date' | 'priority' | 'completed'>('due_date');
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetchDomains();
    fetchRolesAndDomains(); // Fetch all roles and domains for the UniversalTaskCard
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [sortBy]);

  useEffect(() => {
    if (selectedRole) {
      fetchRoleData(selectedRole.id);
    }
  }, [selectedRole]);

  const [allRoles, setAllRoles] = useState<Record<string, Role>>({});
  const [allDomains, setAllDomains] = useState<Record<string, Domain>>({});

  const fetchRolesAndDomains = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [rolesRes, domainsRes] = await Promise.all([
            supabase.from('0007-ap-roles').select('id, label').eq('user_id', user.id),
            supabase.from('0007-ap-domains').select('id, name')
        ]);

        if (rolesRes.data) {
            const rolesMap = rolesRes.data.reduce((acc, role) => ({ ...acc, [role.id]: role }), {});
            setAllRoles(rolesMap);
        }
        if (domainsRes.data) {
            const domainsMap = domainsRes.data.reduce((acc, domain) => ({ ...acc, [domain.id]: domain }), {});
            setAllDomains(domainsMap);
        }
    } catch (error) {
        console.error("Error fetching all roles and domains:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      let query = supabase
        .from('0007-ap-roles')
        .select('id, label, category, is_active, icon')
        .eq('user_id', user.id);
      
      if (sortBy === 'active') {
        query = query.eq('is_active', true);
      } else if (sortBy === 'inactive') {
        query = query.eq('is_active', false);
      }
      
      const { data: rolesData, error } = await query.order('label', { ascending: true });
      if (error) throw error;
      setRoles(rolesData || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDomains = async () => {
    try {
      const { data: domainData, error } = await supabase.from('0007-ap-domains').select('id, name');
      if (error) throw error;
      setDomains(
        (domainData || []).reduce((acc, d) => ({ ...acc, [d.id]: d }), {})
      );
    } catch (err) {
      console.error("Error fetching domains:", err);
    }
  };

  const fetchRoleData = async (roleId: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get all task IDs linked to this role
      const { data: roleJoins, error: roleJoinsError } = await supabase
        .from('0007-ap-universal-roles-join')
        .select('parent_id')
        .eq('role_id', roleId)
        .eq('parent_type', 'task')
        .eq('user_id', user.id);

      if (roleJoinsError) throw roleJoinsError;
      const taskIds = roleJoins?.map(j => j.parent_id) || [];

      // 2. Fetch all tasks for those IDs
      let tasksData: Task[] = [];
      if (taskIds.length > 0) {
        const { data, error } = await supabase
          .from('0007-ap-tasks')
          .select('*, task_roles:0007-ap-universal-roles-join(role_id), task_domains:0007-ap-universal-domains-join(domain_id)')
          .in('id', taskIds)
          .eq('user_id', user.id);
        if (error) throw error;
        tasksData = data || [];
      }

      const activeTasks = tasksData.filter(task => task.status === 'pending' || task.status === 'in_progress');
      const completedTasksList = tasksData.filter(task => task.status === 'completed');

      setTasks(activeTasks);
      setCompletedTasks(completedTasksList);

      // 3. Fetch Key Relationships for this role
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('0007-ap-key-relationships')
        .select('*')
        .eq('role_id', roleId);
      if (relationshipsError) throw relationshipsError;
      setRelationships(relationshipsData || []);

      // 4. Fetch Deposit Ideas for this role
      const { data: roleJoinsForIdeas, error: roleJoinsErrorForIdeas } = await supabase
        .from('0007-ap-universal-roles-join')
        .select('parent_id')
        .eq('role_id', roleId)
        .eq('parent_type', 'deposit_idea')
        .eq('user_id', user.id);

      if (roleJoinsErrorForIdeas) throw roleJoinsErrorForIdeas;
      const depositIdeaIdsFromRoles = roleJoinsForIdeas?.map(j => j.parent_id) || [];

      const relationshipIds = relationshipsData?.map(r => r.id) || [];
      let depositIdeaIdsFromKR: string[] = [];
      if (relationshipIds.length > 0) {
        const { data: krJoinsForIdeas, error: krJoinsErrorForIdeas } = await supabase
          .from('0007-ap-universal-key-relationships-join')
          .select('parent_id')
          .in('key_relationship_id', relationshipIds)
          .eq('parent_type', 'deposit_idea')
          .eq('user_id', user.id);
        
        if (krJoinsErrorForIdeas) throw krJoinsErrorForIdeas;
        depositIdeaIdsFromKR = krJoinsForIdeas?.map(j => j.parent_id) || [];
      }

      const allDepositIdeaIds = [...new Set([...depositIdeaIdsFromRoles, ...depositIdeaIdsFromKR])];

      if (allDepositIdeaIds.length > 0) {
        const { data: depositIdeasData, error: depositIdeasError } = await supabase
          .from('0007-ap-deposit-ideas')
          .select('*')
          .in('id', allDepositIdeaIds)
          .eq('is_active', true)
          .is('activated_at', null)
          .or('archived.is.null,archived.eq.false');
        if (depositIdeasError) throw depositIdeasError;
        setRoleDepositIdeas(depositIdeasData || []);
      } else {
        setRoleDepositIdeas([]);
      }

    } catch (error) {
      console.error('Error fetching role data:', error);
      toast.error('Failed to load role details.');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskAction = async (taskId: string, action: 'complete' | 'delegate' | 'cancel') => {
    if (action === 'delegate') {
      const task = tasks.find(t => t.id === taskId) || completedTasks.find(t => t.id === taskId);
      if (task) setDelegatingTask(task);
      return;
    }
    
    const updates = {
      status: action === 'complete' ? 'completed' : 'cancelled',
      completed_at: action === 'complete' ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from('0007-ap-tasks').update(updates).eq('id', taskId);
    if (error) {
      toast.error(`Failed to ${action} task.`);
    } else {
      toast.success(`Task ${action}d.`);
      if (selectedRole) fetchRoleData(selectedRole.id);
    }
  };
  
  const handleDepositIdeaUpdated = () => {
    setEditingDepositIdea(null);
    if (selectedRole) fetchRoleData(selectedRole.id);
  };
  
  const handleTaskCreated = () => {
    setShowTaskEventForm(false);
    if (selectedRole) fetchRoleData(selectedRole.id);
  };
  
  const handleTaskUpdated = () => {
    setEditingTask(null);
    if (selectedRole) fetchRoleData(selectedRole.id);
  };
  
  const getTaskPriority = (task: Task) => {
    if (task.is_urgent && task.is_important) return 1;
    if (!task.is_urgent && task.is_important) return 2;
    if (task.is_urgent && !task.is_important) return 3;
    return 4;
  };

  const sortTasks = (tasksToSort: Task[]) => {
    switch (taskSortBy) {
      case 'priority':
        return [...tasksToSort].sort((a, b) => getTaskPriority(a) - getTaskPriority(b));
      case 'due_date':
        return [...tasksToSort].sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
      case 'completed':
        return [...tasksToSort].sort((a, b) => {
          if (!a.completed_at && !b.completed_at) return 0;
          if (!a.completed_at) return 1;
          if (!b.completed_at) return -1;
          return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
        });
      default:
        return tasksToSort;
    }
  };
  
  const TaskSection = () => {
    const currentTasks = taskSortBy === 'completed' ? completedTasks : tasks;
    const sortedTasks = sortTasks(currentTasks);

    return (
        <div className="space-y-2">
            {sortedTasks.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                    {taskSortBy === 'completed' ? 'No completed tasks for this role' : 'No active tasks for this role'}
                </p>
            ) : (
                sortedTasks.map((task) => (
                    <UniversalTaskCard
                        key={task.id}
                        task={{
                            ...task,
                            roles: (task.task_roles || []).map(tr => allRoles[tr.role_id]?.label).filter(Boolean),
                            domains: (task.task_domains || []).map(td => allDomains[td.domain_id]?.name).filter(Boolean),
                        }}
                        onOpen={() => setEditingTask(task)}
                        onComplete={(id) => handleTaskAction(id, 'complete')}
                        onDelegate={(id) => handleTaskAction(id, 'delegate')}
                        onCancel={(id) => handleTaskAction(id, 'cancel')}
                    />
                ))
            )}
        </div>
    );
  };

  const handleRelationshipSaved = () => {
    setShowRelationshipForm(false);
    if (selectedRole) fetchRoleData(selectedRole.id);
  };

  const handleDepositIdeaActivated = () => {
    if (activatingDepositIdea) {
      archiveDepositIdea(activatingDepositIdea.id);
    }
    setActivatingDepositIdea(null);
  };

  const archiveDepositIdea = async (ideaId: string) => {
    const { error } = await supabase
      .from('0007-ap-deposit-ideas')
      .update({ is_active: false, archived: true, activated_at: new Date().toISOString() })
      .eq('id', ideaId);

    if (error) {
      toast.error("Failed to archive the original deposit idea.");
    } else {
      toast.success("Deposit idea activated and archived.");
      if (selectedRole) fetchRoleData(selectedRole.id);
    }
  };
  
  const confirmDeleteDepositIdea = async () => {
    if (!deletingDepositIdea) return;
    const { error } = await supabase.from('0007-ap-deposit-ideas').delete().eq('id', deletingDepositIdea.id);
    if (error) {
      toast.error("Failed to delete deposit idea.");
    } else {
      toast.success("Deposit idea deleted.");
      if (selectedRole) fetchRoleData(selectedRole.id);
    }
    setDeletingDepositIdea(null);
  };

  const handleEditDepositIdea = async (idea: DepositIdea) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const parentId = idea.id;
    const parentType = 'deposit_idea';

    const [rolesJoinRes, domainsJoinRes, krJoinRes, notesJoinRes] = await Promise.all([
      supabase.from('0007-ap-universal-roles-join').select('role_id').eq('parent_id', parentId).eq('parent_type', parentType).eq('user_id', user.id),
      supabase.from('0007-ap-universal-domains-join').select('domain_id').eq('parent_id', parentId).eq('parent_type', parentType).eq('user_id', user.id),
      supabase.from('0007-ap-universal-key-relationships-join').select('key_relationship_id').eq('parent_id', parentId).eq('parent_type', parentType).eq('user_id', user.id),
      supabase.from('0007-ap-universal-notes-join').select('note_id').eq('parent_id', parentId).eq('parent_type', parentType).eq('user_id', user.id)
    ]);

    let noteContent = '';
    const noteId = notesJoinRes.data?.[0]?.note_id;
    if (noteId) {
      const { data: noteData } = await supabase.from('0007-ap-notes').select('content').eq('id', noteId).single();
      noteContent = noteData?.content || '';
    }

    const fullIdeaData = {
      ...idea,
      notes: noteContent,
      schedulingType: 'depositIdea',
      selectedRoleIds: rolesJoinRes.data?.map(r => r.role_id) || [],
      selectedDomainIds: domainsJoinRes.data?.map(d => d.domain_id) || [],
      selectedKeyRelationshipIds: krJoinRes.data?.map(kr => kr.key_relationship_id) || [],
    };

    setEditingDepositIdea(fullIdeaData);
  };
  
  // --- RENDER LOGIC ---

  if (selectedRole) {
    // --- INDIVIDUAL ROLE VIEW ---
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 p-6 border-b">
          <button onClick={() => setSelectedRole(null)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{selectedRole.label}</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Current Tasks Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Current Tasks</h2>
              <div className="flex items-center gap-4">
                <select
                  value={taskSortBy}
                  onChange={(e) => setTaskSortBy(e.target.value as 'due_date' | 'priority' | 'completed')}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="due_date">Due Date</option>
                  <option value="priority">Priority</option>
                  <option value="completed">Completed</option>
                </select>
                
                <button onClick={() => setShowTaskEventForm(true)} className="flex items-center gap-2 text-blue-600 font-medium">
                <Plus className="h-4 w-4" /> Add Task
              </button>
              </div>
            </div>
            {loading ? <p>Loading tasks...</p> : (
              <TaskSection />
            )}
          </section>

          {/* Deposit Ideas Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Deposit Ideas</h2>
              <button onClick={() => setShowAddDepositIdeaForm(true)} className="flex items-center gap-2 text-blue-600 font-medium">
                <Plus className="h-4 w-4" /> Add Idea
              </button>
            </div>
            {loading ? <p>Loading ideas...</p> : (
              roleDepositIdeas.length > 0 ? (
                <div className="space-y-2">
                  {roleDepositIdeas.map((idea) => (
                    <DepositIdeaCard
                      key={idea.id}
                      idea={idea}
                      onEdit={() => handleEditDepositIdea(idea)}
                      onActivate={() => setActivatingDepositIdea(idea)}
                      onDelete={() => setDeletingDepositIdea(idea)}
                    />
                  ))}
                </div>
              ) : <p className="text-center text-gray-500 py-4">No deposit ideas for this role.</p>
            )}
          </section>

          {/* Key Relationships Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Key Relationships</h2>
              <button onClick={() => setShowRelationshipForm(true)} className="flex items-center gap-2 text-blue-600 font-medium">
                <UserPlus className="h-4 w-4" /> Add Relationship
              </button>
            </div>
            {loading ? <p>Loading relationships...</p> : (
              relationships.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {relationships
                    .filter(rel => rel && typeof rel.name === 'string' && rel.name.length > 0)
                    .map((rel) => (
                      <UnifiedKeyRelationshipCard
                        key={rel.id}
                        relationship={rel}
                        roleName={selectedRole.label}
                        onRelationshipUpdated={() => {
                          if (selectedRole) {
                            fetchRoleData(selectedRole.id);
                          }
                        }}
                        onRelationshipDeleted={() => {
                          if (selectedRole) {
                            fetchRoleData(selectedRole.id);
                          }
                        }}
                      />
                    ))}
                </div>
              ) : (
                  <p className="text-center text-gray-500 py-4">No key relationships for this role.</p>
              )
            )}
          </section>
        </div>
        
        {/* Modals for Individual Role View */}
        {showTaskEventForm && <TaskEventForm mode="create" initialData={{ selectedRoleIds: [selectedRole.id] }} onClose={() => setShowTaskEventForm(false)} onSubmitSuccess={handleTaskCreated} />}
        
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl mx-4">
              <TaskEventForm
                key={editingTask.id || "editing"}
                mode="edit"
                initialData={memoizedInitialData}
                onClose={() => setEditingTask(null)}
                onSubmitSuccess={handleTaskUpdated}
              />
            </div>
          </div>
        )}
        
        {delegatingTask && <DelegateTaskModal task={delegatingTask} onClose={() => setDelegatingTask(null)} onTaskDelegated={() => fetchRoleData(selectedRole.id)} />}
        {showRelationshipForm && <KeyRelationshipForm roleId={selectedRole.id} roleName={selectedRole.label} onClose={() => setShowRelationshipForm(false)} onRelationshipCreated={handleRelationshipSaved} />}
        {showAddDepositIdeaForm && <TaskEventForm mode="create" initialData={{ schedulingType: 'depositIdea', selectedRoleIds: [selectedRole.id] }} onClose={() => setShowAddDepositIdeaForm(false)} onSubmitSuccess={() => fetchRoleData(selectedRole.id)} />}
        {editingDepositIdea && <TaskEventForm mode="edit" initialData={{...editingDepositIdea, schedulingType: 'depositIdea'}} onClose={() => setEditingDepositIdea(null)} onSubmitSuccess={handleDepositIdeaUpdated} />}
        {activatingDepositIdea && <ActivationTypeSelector depositIdea={activatingDepositIdea} selectedRole={selectedRole} onClose={() => setActivatingDepositIdea(null)} onActivated={handleDepositIdeaActivated} />}
        {deletingDepositIdea && <ConfirmationModal title="Delete Deposit Idea" onConfirm={confirmDeleteDepositIdea} onCancel={() => setDeletingDepositIdea(null)}><p>Are you sure you want to delete "{deletingDepositIdea.title}"?</p></ConfirmationModal>}
      </div>
    );
  }

  // --- ROLES GRID VIEW ---
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b">
        <h1 className="text-2xl font-bold">Role Bank</h1>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button onClick={() => setSortBy('active')} className={`px-2 py-1 text-xs rounded ${sortBy === 'active' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>Active</button>
            <button onClick={() => setSortBy('inactive')} className={`px-2 py-1 text-xs rounded ${sortBy === 'inactive' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>Inactive</button>
          </div>
          <button onClick={() => setShowAddDepositIdeaForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Deposit Idea
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? <p>Loading roles...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {roles.map(role => (
              <button 
                key={role.id} 
                onClick={() => setSelectedRole(role)} 
                className="group block"
              >
                <div className="relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 hover:border-primary-300 cursor-pointer">
                  {/* Icon */}
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary-100 text-primary-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">{role.icon || '👤'}</span>
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    {role.label}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 capitalize">
                    {role.category}
                  </p>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {showAddDepositIdeaForm && <TaskEventForm mode="create" initialData={{ schedulingType: 'depositIdea' }} onClose={() => setShowAddDepositIdeaForm(false)} onSubmitSuccess={fetchRoles} />}
    </div>
  );
};


// --- HELPER COMPONENTS ---

const ActivationTypeSelector: React.FC<{
  depositIdea: DepositIdea;
  selectedRole: Role;
  onClose: () => void;
  onActivated: () => void;
  relationship?: KeyRelationship;
}> = ({ depositIdea, selectedRole, onClose, onActivated, relationship }) => {
  const [showTaskEventForm, setShowTaskEventForm] = useState<'task' | 'event' | null>(null);
  const [pivotIds, setPivotIds] = useState({ 
    selectedRoleIds: [], 
    selectedDomainIds: [], 
    selectedKeyRelationshipIds: [],
    notes: '' 
  });

  useEffect(() => {
    if (depositIdea) {
      const fetchLinks = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const parentId = depositIdea.id;
          const parentType = 'deposit_idea';

          const [rolesJoinRes, domainsJoinRes, krJoinRes, notesJoinRes] = await Promise.all([
            supabase.from('0007-ap-universal-roles-join').select('role_id').eq('parent_id', parentId).eq('parent_type', parentType).eq('user_id', user.id),
            supabase.from('0007-ap-universal-domains-join').select('domain_id').eq('parent_id', parentId).eq('parent_type', parentType).eq('user_id', user.id),
            supabase.from('0007-ap-universal-key-relationships-join').select('key_relationship_id').eq('parent_id', parentId).eq('parent_type', parentType).eq('user_id', user.id),
            supabase.from('0007-ap-universal-notes-join').select('note_id').eq('parent_id', parentId).eq('parent_type', parentType).eq('user_id', user.id)
          ]);

          let noteContent = '';
          const noteId = notesJoinRes.data?.[0]?.note_id;
          if (noteId) {
            const { data: noteData, error: noteError } = await supabase.from('0007-ap-notes').select('content').eq('id', noteId).single();
            if (noteError && noteError.code !== 'PGRST116') throw noteError;
            noteContent = noteData?.content || '';
          }

          setPivotIds({
            selectedRoleIds: rolesJoinRes.data?.map((r: any) => r.role_id) || [],
            selectedDomainIds: domainsJoinRes.data?.map((d: any) => d.domain_id) || [],
            selectedKeyRelationshipIds: krJoinRes.data?.map((k: any) => k.key_relationship_id) || [],
            notes: noteContent
          });

        } catch (error) {
          toast.error("Failed to load idea details for activation.");
          console.error("Error fetching activation links:", error);
        }
      };
      fetchLinks();
    }
  }, [depositIdea]);

  if (showTaskEventForm) {
    return <TaskEventForm
      mode="create"
      initialData={{
        title: depositIdea.title,
        notes: pivotIds.notes,
        schedulingType: showTaskEventForm,
        selectedRoleIds: pivotIds.selectedRoleIds.length > 0 ? pivotIds.selectedRoleIds : [selectedRole.id],
        selectedDomainIds: pivotIds.selectedDomainIds,
        selectedKeyRelationshipIds: pivotIds.selectedKeyRelationshipIds.length > 0 ? pivotIds.selectedKeyRelationshipIds : (relationship ? [relationship.id] : []),
        authenticDeposit: true,
        isFromDepositIdea: true,
        originalDepositIdeaId: depositIdea.id
      }}
      onSubmitSuccess={onActivated}
      onClose={() => setShowTaskEventForm(null)}
    />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="bg-gray-50 rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-lg font-semibold text-center text-gray-800 mb-5">
          Activate "{depositIdea.title}" as:
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setShowTaskEventForm('task')} 
            className="w-full py-2.5 text-center text-sm font-medium border border-gray-300 bg-white rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all duration-200"
          >
            Task
          </button>
          <button 
            onClick={() => setShowTaskEventForm('event')} 
            className="w-full py-2.5 text-center text-sm font-medium border border-gray-300 bg-white rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all duration-200"
          >
            Event
          </button>
        </div>
        <div className="text-center mt-6">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmationModal: React.FC<{ title: string, onConfirm: () => void, onCancel: () => void, children: React.ReactNode }> = 
({ title, onConfirm, onCancel, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white rounded-lg p-6 max-w-md mx-4">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <div className="mb-4">{children}</div>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded">Confirm</button>
      </div>
    </div>
  </div>
);

export default RoleBank;
