import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ChevronLeft, UserPlus, Plus, Heart, Edit, Eye, CheckCircle, Check, X } from 'lucide-react';
import { toast } from "sonner";
import UnifiedKeyRelationshipCard from './UnifiedKeyRelationshipCard'; // Updated to handle all notes in one card
import TaskEventForm from '../tasks/TaskEventForm';
import DelegateTaskModal from '../tasks/DelegateTaskModal';
import EditTask from '../tasks/EditTask';
import DepositIdeaCard from '../shared/DepositIdeaCard';
import { useNavigate } from 'react-router-dom';

interface Role { id: string; label: string; category: string; icon: string; }
interface Task { id: string; title: string; due_date: string; status: string; priority: number; is_urgent: boolean; is_important: boolean; is_authentic_deposit: boolean; notes?: string; }
interface KeyRelationship { id: string; name: string; role_id: string; image_path?: string; notes?: string; }
interface DepositIdea { id: string; description: string; key_relationship_id: string; }
interface Domain { id: string; label: string; }
interface RoleBankProps { selectedRole?: Role | null; onBack?: () => void; }

const RoleBank: React.FC<RoleBankProps> = ({ selectedRole: propSelectedRole, onBack: propOnBack }) => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Role | null>(propSelectedRole || null);
  const [sortBy, setSortBy] = useState<'active' | 'inactive' | 'archived'>('active');
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

  useEffect(() => { fetchRoles(); fetchDomains(); }, []);
  useEffect(() => { if (selectedRole) fetchRoleData(selectedRole.id); }, [selectedRole]);
  useEffect(() => { fetchRoles(); }, [sortBy]);

  const fetchRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let query = supabase.from('0007-ap-roles').select('id, label, category, is_active').eq('user_id', user.id);
      if (sortBy === 'active') query = query.eq('is_active', true);
      else if (sortBy === 'inactive') query = query.eq('is_active', false);
      query = query.order('category', { ascending: true }).order('label', { ascending: true });
      const { data: rolesData, error } = await query;
      if (error) throw error;
      setRoles(rolesData || []);
    } catch (error) { console.error('Error fetching roles:', error); }
    finally { setLoading(false); }
  };

  const fetchDomains = async () => {
    try {
      const { data: domainData, error } = await supabase.from('0007-ap-domains').select('id, name');
      if (error) throw error;
      setDomains((domainData || []).reduce((acc, d) => ({ ...acc, [d.id]: { id: d.id, name: d.name } }), {} as Record<string, Domain>));
    } catch (err) {
      console.error("Error fetching domains:", err); setDomains({});
    }
  };

  const fetchRoleData = async (roleId: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch tasks for role
      const { data: taskRoleLinks } = await supabase.from('0007-ap-task-roles').select('task_id').eq('role_id', roleId);
      const taskIds = taskRoleLinks?.map(link => link.task_id) || [];
      const { data: tasksData } = taskIds.length > 0
        ? await supabase.from('0007-ap-tasks').select(`*, task_roles:0007-ap-task-roles!task_id(role_id)`).eq('user_id', user.id).in('id', taskIds).in('status', ['pending', 'in_progress'])
        : { data: [] };
      setTasks(tasksData || []);

      // 2. Fetch key relationships for role
      const { data: relationshipsData } = await supabase.from('0007-ap-key-relationships').select('*').eq('role_id', roleId);
      setRelationships(relationshipsData || []);

      // 3. Fetch deposit ideas for this role
      const { data: roleDepositIdeaLinks } = await supabase.from('0007-ap-deposit-idea-roles').select('deposit_idea_id').eq('role_id', roleId);
      const depositIdeaIds = roleDepositIdeaLinks?.map(link => link.deposit_idea_id) || [];
      const { data: roleDepositIdeasData } = depositIdeaIds.length > 0
        ? await supabase.from('0007-ap-deposit-ideas').select('*').in('id', depositIdeaIds).eq('is_active', true).is('activated_at', null).eq('archived', false)
        : { data: [] };
      setRoleDepositIdeas(roleDepositIdeasData || []);
    } catch (error) { console.error('Error fetching role data:', error); }
    finally { setLoading(false); }
  };

  const handleAddRelationship = () => { setShowRelationshipForm(true); };
  const handleRelationshipSaved = () => { setShowRelationshipForm(false); if (selectedRole) fetchRoleData(selectedRole.id); };
  const handleAddTask = () => { setShowTaskEventForm(true); };
  const handleTaskCreated = () => { setShowTaskEventForm(false); if (selectedRole) fetchRoleData(selectedRole.id); };
  const handleTaskUpdated = () => { setEditingTask(null); if (selectedRole) fetchRoleData(selectedRole.id); };
  const handleTaskDelegated = () => { setDelegatingTask(null); if (selectedRole) fetchRoleData(selectedRole.id); };

  const handleEditDepositIdea = async (idea: DepositIdea) => {
    const { data: domainLinks } = await supabase.from('0007-ap-deposit-idea-domains').select('domain_id').eq('deposit_idea_id', idea.id);
    const selectedDomainIds = domainLinks?.map(link => link.domain_id) || [];
    const { data: roleLinks } = await supabase.from('0007-ap-deposit-idea-roles').select('role_id').eq('deposit_idea_id', idea.id);
    const selectedRoleIds = roleLinks?.map(link => link.role_id) || [];
    const { data: krLinks } = await supabase.from('0007-ap-deposit-idea-key-relationships').select('key_relationship_id').eq('deposit_idea_id', idea.id);
    const selectedKeyRelationshipIds = krLinks?.map(link => link.key_relationship_id) || [];
    setEditingDepositIdea({ ...idea, selectedDomainIds, selectedRoleIds, selectedKeyRelationshipIds });
  };

  const handleActivateDepositIdea = (idea: DepositIdea) => { setActivatingDepositIdea(idea); };
  const handleDepositIdeaActivated = () => { setActivatingDepositIdea(null); if (activatingDepositIdea && selectedRole) archiveDepositIdea(activatingDepositIdea.id); };
  const archiveDepositIdea = async (depositIdeaId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('0007-ap-deposit-ideas')
        .update({ activated_at: new Date().toISOString(), archived: true, updated_at: new Date().toISOString() })
        .eq('id', depositIdeaId).eq('user_id', user.id);
      if (error) { console.error('Error archiving deposit idea:', error); toast.error('Failed to archive deposit idea'); }
      else { toast.success('Deposit idea activated and archived successfully!'); if (selectedRole) fetchRoleData(selectedRole.id); }
    } catch (error) { console.error('Error archiving deposit idea:', error); toast.error('Failed to archive deposit idea'); }
  };
  const handleDepositIdeaUpdated = () => { setEditingDepositIdea(null); if (selectedRole) fetchRoleData(selectedRole.id); };
  const handleRoleSelect = (role: Role) => { setSelectedRole(role); };
  const handleBack = () => { if (selectedRole) setSelectedRole(null); else if (propOnBack) propOnBack(); };

  // --- INDIVIDUAL ROLE VIEW ---
  if (selectedRole) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 flex-shrink-0">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{selectedRole.label}</h1>
        </div>
        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8" style={{ minHeight: 0 }}>
          {/* Current Tasks */}
          {/* ...Same as before... */}

          {/* Deposit Ideas */}
          {/* ...Same as before... */}

          {/* Key Relationships (Now using UnifiedKeyRelationshipCard for all note logic) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Key Relationships</h2>
              <button onClick={handleAddRelationship} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium">
                <UserPlus className="h-4 w-4" /> Add Key Relationship
              </button>
            </div>
            {relationships.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {relationships.map((rel) => (
                  <UnifiedKeyRelationshipCard
                    key={rel.id}
                    relationship={rel}
                    roleName={selectedRole.label}
                    onRelationshipUpdated={() => { if (selectedRole) fetchRoleData(selectedRole.id); }}
                    onRelationshipDeleted={() => { if (selectedRole) fetchRoleData(selectedRole.id); }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No key relationships yet</h3>
                <p className="text-gray-600 mb-4">Add the important people in your life for this role</p>
                <button onClick={handleAddRelationship} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  <UserPlus className="h-4 w-4" /> Add Your First Relationship
                </button>
              </div>
            )}
          </section>
        </div>
        {/* All Modal Logic Remains */}
        {/* ... (Modals for forms, tasks, deposit ideas, delegation, etc) */}
      </div>
    );
  }

  // --- ROLES GRID VIEW ---
  // ...Same as before...
};

export default RoleBank;
