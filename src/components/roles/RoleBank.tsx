import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ChevronLeft, UserPlus, Plus, Heart, Edit, Check, X } from 'lucide-react';
import KeyRelationshipForm from './KeyRelationshipForm';
import UnifiedKeyRelationshipCard from './UnifiedKeyRelationshipCard';
import TaskEventForm from '../tasks/TaskEventForm';
import DelegateTaskModal from '../tasks/DelegateTaskModal';
import EditTask from '../tasks/EditTask';
import DepositIdeaCard from '../shared/DepositIdeaCard';
import { toast } from "sonner";

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
  const [showAddDepositIdeaForm, setShowAddDepositIdeaForm] = useState(false);
  const [editingDepositIdea, setEditingDepositIdea] = useState<any | null>(null);
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const [activatingDepositIdea, setActivatingDepositIdea] = useState<DepositIdea | null>(null);
  const [deletingDepositIdea, setDeletingDepositIdea] = useState<DepositIdea | null>(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [sortBy]);

  useEffect(() => {
    if (selectedRole) {
      fetchRoleData(selectedRole.id);
    }
  }, [selectedRole]);

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

      // Fetch Task IDs linked to the role
      const { data: taskRoleLinks, error: taskRoleError } = await supabase
        .from('0007-ap-task-roles')
        .select('task_id')
        .eq('role_id', roleId);
      if (taskRoleError) throw taskRoleError;
      const taskIds = taskRoleLinks?.map(link => link.task_id) || [];

      // Fetch Tasks
      if (taskIds.length > 0) {
        const { data: tasksData, error: tasksError } = await supabase
          .from('0007-ap-tasks')
          .select('*')
          .in('id', taskIds)
          .in('status', ['pending', 'in_progress']);
        if (tasksError) throw tasksError;
        setTasks(tasksData || []);
      } else {
        setTasks([]);
      }

      // Fetch Key Relationships
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('0007-ap-key-relationships')
        .select('*')
        .eq('role_id', roleId);
      if (relationshipsError) throw relationshipsError;
      setRelationships(relationshipsData || []);

      // Fetch Deposit Idea IDs linked to the role
      const { data: roleDepositIdeaLinks, error: roleDepositError } = await supabase
        .from('0007-ap-roles-deposit-ideas')
        .select('deposit_idea_id')
        .eq('role_id', roleId);
      if (roleDepositError) throw roleDepositError;
      const depositIdeaIdsFromRoles = roleDepositIdeaLinks?.map(link => link.deposit_idea_id) || [];

      // Fetch Deposit Idea IDs linked to Key Relationships
      const relationshipIds = relationshipsData?.map(r => r.id) || [];
      let depositIdeaIdsFromKR: string[] = [];
      if (relationshipIds.length > 0) {
        const { data: krDepositLinks, error: krDepositError } = await supabase
          .from('0007-ap-deposit-idea-key-relationships')
          .select('deposit_idea_id')
          .in('key_relationship_id', relationshipIds);
        if (krDepositError) throw krDepositError;
        depositIdeaIdsFromKR = krDepositLinks?.map(link => link.deposit_idea_id) || [];
      }

      // Combine and fetch all unique deposit ideas
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
      const task = tasks.find(t => t.id === taskId);
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
    // Fetch linked roles
    const { data: rolesData } = await supabase
      .from('0007-ap-roles-deposit-ideas')
      .select('role_id')
      .eq('deposit_idea_id', idea.id);

    // Fetch linked domains
    const { data: domainsData } = await supabase
      .from('0007-ap-deposit-idea-domains')
      .select('domain_id')
      .eq('deposit_idea_id', idea.id);

    // Fetch linked key relationships
    const { data: krsData } = await supabase
      .from('0007-ap-deposit-idea-key-relationships')
      .select('key_relationship_id')
      .eq('deposit_idea_id', idea.id);

    // --- NEW: Fetch linked note ---
    let noteContent = '';
    const { data: noteLink } = await supabase
      .from('0007-ap-note-deposit-ideas')
      .select('note:0007-ap-notes(content)') // Fetches the note's content
      .eq('deposit_idea_id', idea.id)
      .single(); // We expect only one note per idea

    if (noteLink && noteLink.note) {
      noteContent = noteLink.note.content;
    }

    const fullIdeaData = {
      ...idea,
      schedulingType: 'depositIdea',
      selectedRoleIds: rolesData?.map(r => r.role_id) || [],
      selectedDomainIds: domainsData?.map(d => d.domain_id) || [],
      selectedKeyRelationshipIds: krsData?.map(kr => kr.key_relationship_id) || [],
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
              <button onClick={() => setShowTaskEventForm(true)} className="flex items-center gap-2 text-blue-600 font-medium">
                <Plus className="h-4 w-4" /> Add Task
              </button>
            </div>
            {loading ? <p>Loading tasks...</p> : (
              tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-4 bg-white rounded-lg border relative group transition-all hover:border-blue-500 hover:shadow-sm">
                      <div className="pr-20">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                      </div>
                      <div className="absolute top-3 right-3 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleTaskAction(task.id, 'complete')} title="Complete"><Check className="h-4 w-4 text-green-500" /></button>
                        <button onClick={() => handleTaskAction(task.id, 'delegate')} title="Delegate"><UserPlus className="h-4 w-4 text-blue-500" /></button>
                        <button onClick={() => setEditingTask(task)} title="Edit"><Edit className="h-4 w-4 text-gray-500" /></button>
                        <button onClick={() => handleTaskAction(task.id, 'cancel')} title="Cancel"><X className="h-4 w-4 text-red-500" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-gray-500 py-4">No active tasks for this role.</p>
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
        {editingTask && <EditTask task={editingTask} onClose={() => setEditingTask(null)} onTaskUpdated={handleTaskUpdated} />}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => (
              <button key={role.id} onClick={() => setSelectedRole(role)} className="p-4 border rounded-lg hover:shadow-md transition text-left bg-white">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{role.icon || '👤'}</span>
                  <div>
                    <h3 className="font-medium">{role.label}</h3>
                    <p className="text-sm text-gray-500 capitalize">{role.category}</p>
                  </div>
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

// This is the new, correctly styled component
const ActivationTypeSelector: React.FC<{
  depositIdea: DepositIdea;
  selectedRole: Role;
  onClose: () => void;
  onActivated: () => void;
}> = ({ depositIdea, selectedRole, onClose, onActivated }) => {
  const [showTaskEventForm, setShowTaskEventForm] = useState<'task' | 'event' | null>(null);
  const [pivotIds, setPivotIds] = useState({ selectedRoleIds: [], selectedDomainIds: [], selectedKeyRelationshipIds: [] });

  useEffect(() => {
    const fetchLinks = async () => {
      const { data: roles } = await supabase.from('0007-ap-roles-deposit-ideas').select('role_id').eq('deposit_idea_id', depositIdea.id);
      const { data: domains } = await supabase.from('0007-ap-deposit-idea-domains').select('domain_id').eq('deposit_idea_id', depositIdea.id);
      const { data: krs } = await supabase.from('0007-ap-deposit-idea-key-relationships').select('key_relationship_id').eq('deposit_idea_id', depositIdea.id);
      setPivotIds({
        selectedRoleIds: roles?.map(r => r.role_id) || [],
        selectedDomainIds: domains?.map(d => d.domain_id) || [],
        selectedKeyRelationshipIds: krs?.map(k => k.key_relationship_id) || [],
      });
    };
    fetchLinks();
  }, [depositIdea]);

  if (showTaskEventForm) {
    return <TaskEventForm
      mode="create"
      initialData={{
        title: depositIdea.title,
        notes: depositIdea.notes || "",
        schedulingType: showTaskEventForm,
        selectedRoleIds: pivotIds.selectedRoleIds.length ? pivotIds.selectedRoleIds : [selectedRole.id],
        selectedDomainIds: pivotIds.selectedDomainIds,
        selectedKeyRelationshipIds: pivotIds.selectedKeyRelationshipIds,
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
