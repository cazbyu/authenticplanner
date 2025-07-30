import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ChevronLeft, UserPlus, Plus, Heart, Edit, Check, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import KeyRelationshipForm from './KeyRelationshipForm';
import UnifiedKeyRelationshipCard from './UnifiedKeyRelationshipCard';
import TaskEventForm from '../tasks/TaskEventForm';
import DelegateTaskModal from '../tasks/DelegateTaskModal';
import DepositIdeaCard from '../shared/DepositIdeaCard';
import { toast } from "sonner";

// ==================================================================================
// INTERFACES
// ==================================================================================
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
  completed_at?: string;
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

// ==================================================================================
// HELPER COMPONENTS (Ideally, these would be in their own separate files)
// ==================================================================================

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

            const { data: roles } = await supabase.from('0007-ap-roles-deposit-ideas').select('role_id').eq('deposit_idea_id', depositIdea.id).eq('user_id', user.id);
            const { data: domains } = await supabase.from('0007-ap-deposit-idea-domains').select('domain_id').eq('deposit_idea_id', depositIdea.id).eq('user_id', user.id);
            const { data: krs } = await supabase.from('0007-ap-deposit-idea-key-relationships').select('key_relationship_id').eq('deposit_idea_id', depositIdea.id).eq('user_id', user.id);
            
            const { data: noteLink, error: noteError } = await supabase.from('0007-ap-note-deposit-ideas').select('note:0007-ap-notes(content)').eq('deposit_idea_id', depositIdea.id).eq('user_id', user.id).single();

            if (noteError && noteError.code !== 'PGRST116') {
                throw noteError;
            }

            setPivotIds({
              selectedRoleIds: (roles as any)?.map((r: any) => r.role_id) || [],
              selectedDomainIds: (domains as any)?.map((d: any) => d.domain_id) || [],
              selectedKeyRelationshipIds: (krs as any)?.map((k: any) => k.key_relationship_id) || [],
              notes: (noteLink as any)?.note?.content || ''
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
        selectedRoleIds: pivotIds.selectedRoleIds.length ? pivotIds.selectedRoleIds : [selectedRole.id],
        selectedDomainIds: pivotIds.selectedDomainIds,
        selectedKeyRelationshipIds: pivotIds.selectedKeyRelationshipIds.length ? pivotIds.selectedKeyRelationshipIds : (relationship ? [relationship.id] : []),
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


// ==================================================================================
// ROLE DETAIL VIEW COMPONENT
// ==================================================================================
interface RoleDetailViewProps {
    selectedRole: Role;
    onBack: () => void;
}

const RoleDetailView: React.FC<RoleDetailViewProps> = ({ selectedRole, onBack }) => {
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
    const [activatingDepositIdea, setActivatingDepositIdea] = useState<DepositIdea | null>(null);
    const [deletingDepositIdea, setDeletingDepositIdea] = useState<DepositIdea | null>(null);
    
    // Task view state
    const [taskViewMode, setTaskViewMode] = useState<'quadrant' | 'list'>('quadrant');
    const [taskSortBy, setTaskSortBy] = useState<'priority' | 'due_date' | 'completed'>('priority');
    const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
    const [collapsedTaskQuadrants, setCollapsedTaskQuadrants] = useState({
        'urgent-important': false,
        'not-urgent-important': false,
        'urgent-not-important': false,
        'not-urgent-not-important': false,
    });

    useEffect(() => {
        if (selectedRole) {
            fetchRoleData(selectedRole.id);
        }
    }, [selectedRole]);

    const fetchRoleData = async (roleId: string) => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: taskRoleLinks } = await supabase.from('0007-ap-task-roles').select('task_id').eq('role_id', roleId);
            const taskIds = taskRoleLinks?.map(link => link.task_id) || [];

            if (taskIds.length > 0) {
                const { data: tasksData } = await supabase
                    .from('0007-ap-tasks')
                    .select(`*, task_roles:0007-ap-task-roles!task_id(role_id), task_domains:0007-ap-task-domains(domain_id), task_key_relationships:0007-ap-task-key-relationships(key_relationship_id)`)
                    .in('id', taskIds)
                    .eq('user_id', user.id);
                
                const activeTasks = (tasksData || []).filter(task => task.status === 'pending' || task.status === 'in_progress');
                const completedTasksList = (tasksData || []).filter(task => task.status === 'completed');
                setTasks(activeTasks);
                setCompletedTasks(completedTasksList);
            } else {
                setTasks([]);
                setCompletedTasks([]);
            }

            const { data: relationshipsData } = await supabase.from('0007-ap-key-relationships').select('*').eq('role_id', roleId);
            setRelationships(relationshipsData || []);

            const { data: roleDepositIdeaLinks } = await supabase.from('0007-ap-roles-deposit-ideas').select('deposit_idea_id').eq('role_id', roleId);
            const depositIdeaIdsFromRoles = roleDepositIdeaLinks?.map(link => link.deposit_idea_id) || [];

            const relationshipIds = relationshipsData?.map(r => r.id) || [];
            let depositIdeaIdsFromKR: string[] = [];
            if (relationshipIds.length > 0) {
                const { data: krDepositLinks } = await supabase.from('0007-ap-deposit-idea-key-relationships').select('deposit_idea_id').in('key_relationship_id', relationshipIds);
                depositIdeaIdsFromKR = krDepositLinks?.map(link => link.deposit_idea_id) || [];
            }

            const allDepositIdeaIds = [...new Set([...depositIdeaIdsFromRoles, ...depositIdeaIdsFromKR])];
            if (allDepositIdeaIds.length > 0) {
                const { data: depositIdeasData } = await supabase
                    .from('0007-ap-deposit-ideas')
                    .select('*')
                    .in('id', allDepositIdeaIds)
                    .eq('is_active', true)
                    .is('activated_at', null)
                    .or('archived.is.null,archived.eq.false');
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
        if (error) toast.error(`Failed to ${action} task.`);
        else {
            toast.success(`Task ${action}d.`);
            fetchRoleData(selectedRole.id);
        }
    };

    const handleTaskUpdated = () => {
        setEditingTask(null);
        fetchRoleData(selectedRole.id);
    };

    const handleTaskCreated = () => {
        setShowTaskEventForm(false);
        fetchRoleData(selectedRole.id);
    };

    const handleDepositIdeaUpdated = () => {
        setEditingDepositIdea(null);
        fetchRoleData(selectedRole.id);
    };
    
    const handleRelationshipSaved = () => {
        setShowRelationshipForm(false);
        fetchRoleData(selectedRole.id);
    };

    const handleDepositIdeaActivated = () => {
        if (activatingDepositIdea) {
            archiveDepositIdea(activatingDepositIdea.id);
        }
        setActivatingDepositIdea(null);
    };

    const archiveDepositIdea = async (ideaId: string) => {
        const { error } = await supabase.from('0007-ap-deposit-ideas').update({ is_active: false, archived: true, activated_at: new Date().toISOString() }).eq('id', ideaId);
        if (error) toast.error("Failed to archive the original deposit idea.");
        else {
            toast.success("Deposit idea activated and archived.");
            fetchRoleData(selectedRole.id);
        }
    };

    const confirmDeleteDepositIdea = async () => {
        if (!deletingDepositIdea) return;
        const { error } = await supabase.from('0007-ap-deposit-ideas').delete().eq('id', deletingDepositIdea.id);
        if (error) toast.error("Failed to delete deposit idea.");
        else {
            toast.success("Deposit idea deleted.");
            fetchRoleData(selectedRole.id);
        }
        setDeletingDepositIdea(null);
    };

    const handleEditDepositIdea = async (idea: DepositIdea) => {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        const { data: rolesData } = await supabase.from('0007-ap-roles-deposit-ideas').select('role_id').eq('deposit_idea_id', idea.id).eq('user_id', user.id);
        const { data: domainsData } = await supabase.from('0007-ap-deposit-idea-domains').select('domain_id').eq('deposit_idea_id', idea.id).eq('user_id', user.id);
        const { data: krsData } = await supabase.from('0007-ap-deposit-idea-key-relationships').select('key_relationship_id').eq('deposit_idea_id', idea.id).eq('user_id', user.id);
        let noteContent = '';
        const { data: noteLink } = await supabase.from('0007-ap-note-deposit-ideas').select('note:0007-ap-notes(content)').eq('deposit_idea_id', idea.id).eq('user_id', user.id).single();
        if (noteLink && (noteLink.note as any)) {
            noteContent = (noteLink.note as any).content;
        }
        setEditingDepositIdea({
            ...idea,
            notes: noteContent,
            schedulingType: 'depositIdea',
            selectedRoleIds: rolesData?.map(r => r.role_id) || [],
            selectedDomainIds: domainsData?.map(d => d.domain_id) || [],
            selectedKeyRelationshipIds: krsData?.map(kr => kr.key_relationship_id) || [],
        });
    };

    const formatTaskForForm = (task: Task) => ({
        id: task.id,
        title: task.title,
        schedulingType: 'task' as const,
        dueDate: task.due_date || '',
        startTime: '',
        endTime: '',
        notes: task.notes || '',
        urgent: task.is_urgent,
        important: task.is_important,
        authenticDeposit: task.is_authentic_deposit,
        twelveWeekGoalChecked: task.is_twelve_week_goal,
        selectedRoleIds: task.task_roles?.map(r => r.role_id) || [],
        selectedDomainIds: task.task_domains?.map(d => d.domain_id) || [],
        selectedKeyRelationshipIds: task.task_key_relationships?.map(kr => kr.key_relationship_id) || [],
    });

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 p-6 border-b">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">{selectedRole.label}</h1>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* All sections like Tasks, Deposit Ideas, Key Relationships go here */}
            </div>
            
            {/* All modals go here */}
            {showTaskEventForm && <TaskEventForm mode="create" initialData={{ selectedRoleIds: [selectedRole.id] }} onClose={() => setShowTaskEventForm(false)} onSubmitSuccess={handleTaskCreated} />}
            {editingTask && <TaskEventForm mode="edit" initialData={formatTaskForForm(editingTask)} onSubmitSuccess={handleTaskUpdated} onClose={() => setEditingTask(null)} />}
            {/* ... other modals */}
        </div>
    );
};


// ==================================================================================
// MAIN ROLE BANK COMPONENT
// ==================================================================================
interface RoleBankProps {
  selectedRole?: Role | null;
  onBack?: () => void;
}

const RoleBank: React.FC<RoleBankProps> = ({ selectedRole: propSelectedRole, onBack: propOnBack }) => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(propSelectedRole || null);
  const [sortBy, setSortBy] = useState<'active' | 'inactive'>('active');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDepositIdeaForm, setShowAddDepositIdeaForm] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, [sortBy]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let query = supabase.from('0007-ap-roles').select('id, label, category, is_active, icon').eq('user_id', user.id);
      if (sortBy === 'active') query = query.eq('is_active', true);
      else if (sortBy === 'inactive') query = query.eq('is_active', false);
      const { data: rolesData, error } = await query.order('label', { ascending: true });
      if (error) throw error;
      setRoles(rolesData || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (selectedRole) {
    return <RoleDetailView selectedRole={selectedRole} onBack={() => setSelectedRole(null)} />;
  }

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
              <button key={role.id} onClick={() => setSelectedRole(role)} className="group block">
                <div className="relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 hover:border-primary-300 cursor-pointer">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary-100 text-primary-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">{role.icon || '👤'}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">{role.label}</h3>
                  <p className="text-sm text-gray-600 mb-4 capitalize">{role.category}</p>
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

export default RoleBank;
