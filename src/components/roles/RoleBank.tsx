import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ChevronLeft, UserPlus, Plus, Heart, Edit, Check, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import KeyRelationshipForm from './KeyRelationshipForm';
import UnifiedKeyRelationshipCard from './UnifiedKeyRelationshipCard';
import TaskEventForm from '../tasks/TaskEventForm';
import DelegateTaskModal from '../tasks/DelegateTaskModal';
// import EditTask from '../tasks/EditTask'; // No longer needed
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
  is_twelve_week_goal: boolean;
  notes?: string;
  completed_at?: string;
  // Added to support the form formatter
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
  const [showAddDepositIdeaForm, setShowAddDepositIdeaForm] = useState(false);
  const [editingDepositIdea, setEditingDepositIdea] = useState<any | null>(null);
  const [domains, setDomains] = useState<Record<string, Domain>>({});
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

      console.log("DEBUG: Current auth user.id is", user?.id);
      
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
          .select(`
            *,
            task_roles:0007-ap-task-roles!task_id(role_id),
            task_domains:0007-ap-task-domains(domain_id),
            task_key_relationships:0007-ap-task-key-relationships(key_relationship_id)
          `)
          .in('id', taskIds)
          .eq('user_id', user.id);
        if (tasksError) throw tasksError;
        
        // Separate active and completed tasks
        const activeTasks = (tasksData || []).filter(task => 
          task.status === 'pending' || task.status === 'in_progress'
        );
        const completedTasksList = (tasksData || []).filter(task => 
          task.status === 'completed'
        );
        
        setTasks(activeTasks);
        setCompletedTasks(completedTasksList);
      } else {
        setTasks([]);
        setCompletedTasks([]);
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
  
  // Helper function to sort tasks
  const sortTasks = (tasksToSort: Task[]) => {
    switch (taskSortBy) {
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
  
  // Helper component for quadrant sections
  const QuadrantSection: React.FC<{
    id: string;
    title: string;
    tasks: Task[];
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: React.ReactNode;
  }> = ({ id, title, tasks, bgColor, textColor, borderColor, icon }) => {
    const isCollapsed = collapsedTaskQuadrants[id as keyof typeof collapsedTaskQuadrants];
    
    return (
      <div className="h-full flex flex-col">
        {/* Header - Always visible */}
        <button 
          className={`w-full ${bgColor} ${textColor} px-4 py-3 rounded-lg flex items-center justify-between hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          onClick={() => setCollapsedTaskQuadrants(prev => ({ 
            ...prev, 
            [id]: !prev[id as keyof typeof prev] 
          }))}
          type="button"
        >
          <div className="flex items-center space-x-2 min-w-0">
            {icon}
            <h4 className="font-medium text-sm truncate">{title}</h4>
            <span className="text-sm opacity-90 flex-shrink-0">({tasks.length})</span>
          </div>
          <div className="flex-shrink-0 ml-2">
            {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
        
        {/* Content - Only visible when expanded */}
        {!isCollapsed && (
          <div className="flex-1 bg-gray-50 rounded-lg mt-2 overflow-hidden">
            <div className="h-full overflow-y-auto p-3">
              {tasks.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-4">
                  No tasks in this category
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      borderColor={borderColor}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Helper component for task cards
  const TaskCard: React.FC<{
    task: Task;
    borderColor: string;
  }> = ({ task, borderColor }) => (
    <div 
      className={`p-3 border-l-4 ${borderColor} bg-gray-50 rounded cursor-pointer hover:bg-gray-100 hover:shadow-sm transition-all`}
      onClick={() => setEditingTask(task)}
      title="Click to edit task"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm mb-1">{task.title}</h4>
          
          {task.due_date && (
            <div className="flex items-center text-xs text-gray-600 mb-2">
              <Clock className="h-3 w-3 mr-1" />
              <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}

          {/* Priority and Type Tags */}
          <div className="flex flex-wrap gap-1 mb-2">
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
            {task.is_twelve_week_goal && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                12W Goal
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTaskAction(task.id, 'complete');
            }}
            className="p-1 rounded-full hover:bg-green-100 hover:text-green-600 transition-colors"
            title="Complete"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTaskAction(task.id, 'delegate');
            }}
            className="p-1 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"
            title="Delegate"
          >
            <UserPlus className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTaskAction(task.id, 'cancel');
            }}
            className="p-1 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
            title="Cancel"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
  
  // Task Section Component
  const TaskSection = () => {
    const currentTasks = taskSortBy === 'completed' ? completedTasks : tasks;
    
    if (taskViewMode === 'quadrant' && taskSortBy === 'priority') {
      // 2x2 Quadrant Grid View (like Task Priorities)
      return (
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* Top Row */}
          <div className="flex flex-col">
            <QuadrantSection
              id="urgent-important"
              title="Urgent & Important"
              tasks={currentTasks.filter(task => task.is_urgent && task.is_important)}
              bgColor="bg-red-500"
              textColor="text-white"
              borderColor="border-l-red-500"
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>
          
          <div className="flex flex-col">
            <QuadrantSection
              id="not-urgent-important"
              title="Not Urgent & Important"
              tasks={currentTasks.filter(task => !task.is_urgent && task.is_important)}
              bgColor="bg-green-500"
              textColor="text-white"
              borderColor="border-l-green-500"
              icon={<Check className="h-4 w-4" />}
            />
          </div>
          
          {/* Bottom Row */}
          <div className="flex flex-col">
            <QuadrantSection
              id="urgent-not-important"
              title="Urgent & Not Important"
              tasks={currentTasks.filter(task => task.is_urgent && !task.is_important)}
              bgColor="bg-orange-500"
              textColor="text-white"
              borderColor="border-l-orange-500"
              icon={<Clock className="h-4 w-4" />}
            />
          </div>
          
          <div className="flex flex-col">
            <QuadrantSection
              id="not-urgent-not-important"
              title="Not Urgent & Not Important"
              tasks={currentTasks.filter(task => !task.is_urgent && !task.is_important)}
              bgColor="bg-gray-500"
              textColor="text-white"
              borderColor="border-l-gray-500"
              icon={<X className="h-4 w-4" />}
            />
          </div>
        </div>
      );
    } else {
      // List View
      return (
        <div className="space-y-2">
          {sortTasks(currentTasks).length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              {taskSortBy === 'completed' ? 'No completed tasks for this role' : 'No active tasks for this role'}
            </p>
          ) : (
            sortTasks(currentTasks).map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                borderColor="border-l-blue-500"
              />
            ))
          )}
        </div>
      );
    }
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
    
    // Fetch linked roles
    const { data: rolesData } = await supabase
      .from('0007-ap-roles-deposit-ideas')
      .select('role_id')
      .eq('deposit_idea_id', idea.id)
      .eq('user_id', user.id);

    // Fetch linked domains
    const { data: domainsData } = await supabase
      .from('0007-ap-deposit-idea-domains')
      .select('domain_id')
      .eq('deposit_idea_id', idea.id)
      .eq('user_id', user.id);

    // Fetch linked key relationships
    const { data: krsData } = await supabase
      .from('0007-ap-deposit-idea-key-relationships')
      .select('key_relationship_id')
      .eq('deposit_idea_id', idea.id)
      .eq('user_id', user.id);

    // Fetch linked note
    let noteContent = '';
    const { data: noteLink } = await supabase
      .from('0007-ap-note-deposit-ideas')
      .select('note:0007-ap-notes(content)')
      .eq('deposit_idea_id', idea.id)
      .eq('user_id', user.id)
      .single();

    if (noteLink && (noteLink.note as any)) {
      noteContent = (noteLink.note as any).content;
    }

    const fullIdeaData = {
      ...idea,
      notes: noteContent, // Use the fetched note content
      schedulingType: 'depositIdea',
      selectedRoleIds: rolesData?.map(r => r.role_id) || [],
      selectedDomainIds: domainsData?.map(d => d.domain_id) || [],
      selectedKeyRelationshipIds: krsData?.map(kr => kr.key_relationship_id) || [],
    };

    setEditingDepositIdea(fullIdeaData);
  };
  
  // --- Helper to format task data for the form ---
  const formatTaskForForm = (task: Task) => {
    return {
      id: task.id,
      title: task.title,
      schedulingType: 'task' as const,
      dueDate: task.due_date || '',
      startTime: '', // Tasks in this view are unscheduled
      endTime: '',
      notes: task.notes || '',
      urgent: task.is_urgent,
      important: task.is_important,
      authenticDeposit: task.is_authentic_deposit,
      twelveWeekGoalChecked: task.is_twelve_week_goal,
      selectedRoleIds: task.task_roles?.map(r => r.role_id) || [],
      selectedDomainIds: task.task_domains?.map(d => d.domain_id) || [],
      selectedKeyRelationshipIds: task.task_key_relationships?.map(kr => kr.key_relationship_id) || [],
    };
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
                {/* Task View Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTaskViewMode('quadrant')}
                    className={`px-2 py-1 text-xs rounded ${
                      taskViewMode === 'quadrant'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Quadrant
                  </button>
                  <button
                    onClick={() => setTaskViewMode('list')}
                    className={`px-2 py-1 text-xs rounded ${
                      taskViewMode === 'list'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    List
                  </button>
                </div>
                
                <select
                  value={taskSortBy}
                  onChange={(e) => setTaskSortBy(e.target.value as 'priority' | 'due_date' | 'completed')}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="priority">Priority</option>
                  <option value="due_date">Due Date</option>
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
        
        {/* MODIFIED: Use TaskEventForm for editing tasks */}
        {editingTask && (
          <TaskEventForm
            mode="edit"
            initialData={formatTaskForForm(editingTask)}
            onSubmitSuccess={handleTaskUpdated}
            onClose={() => setEditingTask(null)}
          />
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

            // Securely fetch all related data with user_id check
            const { data: roles } = await supabase.from('0007-ap-roles-deposit-ideas').select('role_id').eq('deposit_idea_id', depositIdea.id).eq('user_id', user.id);
            const { data: domains } = await supabase.from('0007-ap-deposit-idea-domains').select('domain_id').eq('deposit_idea_id', depositIdea.id).eq('user_id', user.id);
            const { data: krs } = await supabase.from('0007-ap-deposit-idea-key-relationships').select('key_relationship_id').eq('deposit_idea_id', depositIdea.id).eq('user_id', user.id);
            
            const { data: noteLink, error: noteError } = await supabase.from('0007-ap-note-deposit-ideas').select('note:0007-ap-notes(content)').eq('deposit_idea_id', depositIdea.id).eq('user_id', user.id).single();

            // Ignore the expected error if no note is found
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

export default RoleBank;