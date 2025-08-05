import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import TaskEventForm from '../tasks/TaskEventForm';
import { formatTaskForForm } from '../../utils/taskHelpers';
import DelegateTaskModal from '../tasks/DelegateTaskModal';
import UniversalTaskCard from '../tasks/UniversalTaskCard';

interface KeyRelationship {
  id: string;
  role_id: string;
  name: string;
  notes?: string;
  image_path?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  is_urgent: boolean;
  is_important: boolean;
  is_authentic_deposit: boolean;
  is_twelve_week_goal?: boolean;
  notes?: string;
  completed_at?: string;
  task_roles?: Array<{ role_id: string }>;
  task_domains?: Array<{ domain_id: string }>;
}

interface DepositIdea {
  id: string;
  title?: string;
  notes?: string;
  is_active: boolean;
  activated_at?: string;
  archived?: boolean;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: string;
  label: string;
}

interface Domain {
    id: string;
    name: string;
}

interface UnifiedKeyRelationshipCardProps {
  relationship: KeyRelationship;
  roleName: string;
  onRelationshipUpdated: () => void;
  onRelationshipDeleted: () => void;
}

const UnifiedKeyRelationshipCard: React.FC<UnifiedKeyRelationshipCardProps> = ({
  relationship,
  roleName,
  onRelationshipUpdated,
}) => {
  const [name, setName] = useState(relationship.name);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [depositIdeas, setDepositIdeas] = useState<DepositIdea[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const memoizedInitialData = useMemo(() => formatTaskForForm(editingTask), [editingTask]);
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null);
  const [taskSortBy, setTaskSortBy] = useState<'priority' | 'due_date' | 'completed'>('priority');
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [showAddDepositIdeaForm, setShowAddDepositIdeaForm] = useState(false);
  const [editingDepositIdea, setEditingDepositIdea] = useState<any | null>(null);
  const [deletingDepositIdea, setDeletingDepositIdea] = useState<DepositIdea | null>(null);
  const [activatingDepositIdea, setActivatingDepositIdea] = useState<DepositIdea | null>(null);
  const [allRoles, setAllRoles] = useState<Record<string, Role>>({});
  const [allDomains, setAllDomains] = useState<Record<string, Domain>>({});

  useEffect(() => {
    if (isExpanded) {
        fetchRolesAndDomains();
        loadRelationshipData();
        loadNotes();
    }
  }, [relationship.id, isExpanded]);

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

  const loadRelationshipData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch tasks
      const { data: taskKeyRels } = await supabase
        .from('0007-ap-universal-key-relationships-join')
        .select('parent_id')
        .eq('key_relationship_id', relationship.id)
        .eq('parent_type', 'task')
        .eq('user_id', user.id);
      const taskIds = taskKeyRels?.map(j => j.parent_id) || [];
      
      let allTasks: Task[] = [];
      if (taskIds.length > 0) {
        const { data: tasksData, error: tasksError } = await supabase
            .from('0007-ap-tasks')
            .select('*, task_roles:0007-ap-universal-roles-join(role_id), task_domains:0007-ap-universal-domains-join(domain_id)')
            .in('id', taskIds);
        if(tasksError) throw tasksError;
        allTasks = tasksData || [];
      }
      setTasks(allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress'));
      setCompletedTasks(allTasks.filter(t => t.status === 'completed'));
      
      // Fetch deposit ideas
      const { data: ideaKeyRels } = await supabase
        .from('0007-ap-universal-key-relationships-join')
        .select('parent_id')
        .eq('key_relationship_id', relationship.id)
        .eq('parent_type', 'deposit_idea')
        .eq('user_id', user.id);
      const ideaIds = ideaKeyRels?.map(j => j.parent_id) || [];

      let allIdeas: DepositIdea[] = [];
      if(ideaIds.length > 0) {
        const { data: ideasData, error: ideasError } = await supabase
            .from('0007-ap-deposit-ideas')
            .select('*')
            .in('id', ideaIds)
            .eq('is_active', true)
            .is('activated_at', null)
            .or('archived.is.null,archived.eq.false');
        if(ideasError) throw ideasError;
        allIdeas = ideasData || [];
      }
      setDepositIdeas(allIdeas);

    } catch (error) {
      console.error('Error loading relationship data:', error);
      toast.error("Failed to load relationship details.");
    }
  };

  const loadNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: noteLinks } = await supabase
        .from('0007-ap-universal-notes-join')
        .select('note:0007-ap-notes(id, content, created_at, updated_at)')
        .eq('parent_id', relationship.id)
        .eq('parent_type', 'key_relationship')
        .eq('user_id', user.id);
        
      const relationshipNotes = noteLinks?.map((link: any) => link.note).filter(Boolean) || [];
      setNotes(relationshipNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: noteData, error: noteError } = await supabase
        .from('0007-ap-notes')
        .insert({ user_id: user.id, content: newNote.trim() })
        .select()
        .single();
      if (noteError) throw noteError;

      const { error: linkError } = await supabase
        .from('0007-ap-universal-notes-join')
        .insert({ note_id: noteData.id, parent_id: relationship.id, parent_type: 'key_relationship', user_id: user.id });
      if (linkError) throw linkError;

      setNewNote('');
      loadNotes();
      toast.success("Note added!");
    } catch (err: any) {
      toast.error("Failed to add note: " + (err.message || err));
    }
    setAddingNote(false);
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
      loadRelationshipData();
    }
  };

  const handleTaskCreated = () => { setShowAddTaskForm(false); loadRelationshipData(); };
  const handleTaskUpdated = () => { setEditingTask(null); loadRelationshipData(); };
  const handleDepositIdeaCreated = () => { setShowAddDepositIdeaForm(false); loadRelationshipData(); };
  const handleDepositIdeaUpdated = () => { setEditingDepositIdea(null); loadRelationshipData(); };

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
  
    setEditingDepositIdea(fullIdeaData as any);
  };

  const handleDeleteDepositIdea = async () => {
    if (!deletingDepositIdea) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('0007-ap-deposit-ideas').delete().eq('id', deletingDepositIdea.id).eq('user_id', user.id);
      if (error) {
        toast.error('Failed to delete deposit idea');
      } else {
        toast.success('Deposit idea deleted successfully!');
        setDeletingDepositIdea(null);
        loadRelationshipData();
        onRelationshipUpdated();
      }
    } catch (error) {
      toast.error('Failed to delete deposit idea');
    }
  };
  
  const archiveDepositIdea = async (ideaId: string) => {
    const { error } = await supabase
      .from('0007-ap-deposit-ideas')
      .update({
        is_active: false,
        archived: true,
        activated_at: new Date().toISOString()
      })
      .eq('id', ideaId);
    if (error) {
      toast.error("Failed to archive the original deposit idea.");
    } else {
      toast.success("Deposit Idea has been activated!");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm relative">
      <div className="flex items-center mb-3">
        <div>
          <div className="font-bold text-lg text-gray-900">{name}</div>
          <div className="text-sm text-gray-500">{roleName}</div>
        </div>
        <button className="ml-auto text-gray-400 hover:text-primary-600 transition" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div>
          {/* --- Tasks --- */}
          <div className="mb-4">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <span>Tasks</span>
              <span className="text-xs bg-gray-100 rounded px-2">
                {taskSortBy === 'completed' ? completedTasks.length : tasks.length}
              </span>
              <button onClick={() => setShowAddTaskForm(true)} className="ml-auto text-xs bg-blue-600 text-white rounded px-1 py-0.5 hover:bg-blue-700 transition-colors">Add</button>
            </div>
            
            <div className="flex items-center justify-end mb-3">
              <select
                value={taskSortBy}
                onChange={(e) => setTaskSortBy(e.target.value as 'priority' | 'due_date' | 'completed')}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="priority">Priority</option>
                <option value="due_date">Due Date</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="space-y-1">
              {sortTasks(taskSortBy === 'completed' ? completedTasks : tasks).length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-4">
                  {taskSortBy === 'completed' ? 'No completed tasks' : 'No tasks for this relationship'}
                </div>
              ) : (
                sortTasks(taskSortBy === 'completed' ? completedTasks : tasks).map((task) => (
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
          </div>

          {/* --- Deposit Ideas --- */}
          <div className="mb-4">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <span>Deposit Ideas</span>
              <span className="text-xs bg-gray-100 rounded px-2">{depositIdeas.length}</span>
              <button onClick={() => setShowAddDepositIdeaForm(true)} className="ml-auto text-xs bg-green-600 text-white rounded px-1 py-0.5 hover:bg-green-700 transition-colors">Add</button>
            </div>
            {depositIdeas.length === 0 ? <div className="text-gray-400 text-sm">No deposit ideas for this relationship.</div> : (
              <ul className="space-y-2">
                {depositIdeas.map((idea) => (
                  <li key={idea.id} className="p-2 border rounded">
                    <div className="flex items-center justify-between">
                      <span className="flex-1">{idea.title || idea.notes || "No Title"}</span>
                    </div>
                    <div className="flex justify-end items-center gap-2 mt-2 text-xs">
                      <button onClick={() => setActivatingDepositIdea(idea)} className="bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700 transition-colors">Activate</button>
                      <button onClick={() => handleEditDepositIdea(idea)} className="bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 transition-colors">Update</button>
                      <button onClick={() => setDeletingDepositIdea(idea)} className="bg-red-600 text-white rounded px-3 py-1 hover:bg-red-700 transition-colors">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* --- Notes Section --- */}
          <div className="mb-4">
            <div className="font-semibold mb-2">Notes</div>
            <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add note content..." className="w-full border rounded px-2 py-1 text-sm mb-2" />
            <button onClick={addNote} disabled={!newNote.trim() || addingNote} className="mb-2 px-1.5 py-0.5 rounded bg-primary-600 text-white disabled:bg-gray-300 text-xs">
              {addingNote ? 'Saving...' : 'Add Note'}
            </button>
            {notes.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {notes.map((note) => (
                  <li key={note.id} className="p-2 bg-gray-50 rounded border text-sm">
                    <span>{note.content}</span>
                    <span className="block text-xs text-gray-400 mt-1">{new Date(note.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : <div className="text-sm text-gray-400 mt-2">No notes yet.</div>}
          </div>
        </div>
      )}

      {/* Modals */}
      {activatingDepositIdea && (
        <ActivationTypeSelector
          depositIdea={activatingDepositIdea}
          selectedRole={{ id: relationship.role_id, label: roleName }}
          relationship={relationship}
          onClose={() => setActivatingDepositIdea(null)}
          onActivated={async () => {
            if (activatingDepositIdea) {
              await archiveDepositIdea(activatingDepositIdea.id);
            }
            setActivatingDepositIdea(null);
            loadRelationshipData();
            onRelationshipUpdated();
          }}
        />
      )}

      {showAddTaskForm && <TaskEventForm mode="create" initialData={{ schedulingType: 'task', selectedRoleIds: [relationship.role_id], selectedKeyRelationshipIds: [relationship.id] }} onSubmitSuccess={handleTaskCreated} onClose={() => setShowAddTaskForm(false)} />}
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

      {delegatingTask && <DelegateTaskModal task={delegatingTask} onClose={() => setDelegatingTask(null)} onTaskUpdated={loadRelationshipData} />}
      {showAddDepositIdeaForm && <TaskEventForm mode="create" initialData={{ schedulingType: 'depositIdea', selectedRoleIds: [relationship.role_id], selectedKeyRelationshipIds: [relationship.id] }} onSubmitSuccess={handleDepositIdeaCreated} onClose={() => setShowAddDepositIdeaForm(false)} />}
      {editingDepositIdea && <TaskEventForm mode="edit" initialData={editingDepositIdea as any} onSubmitSuccess={handleDepositIdeaUpdated} onClose={() => setEditingDepositIdea(null)} />}
      
      {deletingDepositIdea && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Deposit Idea</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete "{deletingDepositIdea.title || deletingDepositIdea.notes || 'this deposit idea'}"? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeletingDepositIdea(null)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handleDeleteDepositIdea} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for activating deposit ideas
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

export default UnifiedKeyRelationshipCard;
