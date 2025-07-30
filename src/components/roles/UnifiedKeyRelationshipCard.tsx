import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp, Clock, AlertTriangle, UserPlus } from 'lucide-react';
import { getSignedImageUrl } from '../../utils/imageHelpers';
import TaskEventForm from '../tasks/TaskEventForm';
import EditTask from '../tasks/EditTask';
import DelegateTaskModal from '../tasks/DelegateTaskModal';

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
  task_roles?: Array<{
    role_id: string;
  }>;
  task_domains?: Array<{
    domain_id: string;
  }>;
}

interface DepositIdea {
  id: string;
  title?: string;
  notes?: string;
  is_active: boolean;
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
  onRelationshipDeleted,
}) => {
  // State for the relationship data
  const [name, setName] = useState(relationship.name);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // State for tasks, deposit ideas, and notes
  const [tasks, setTasks] = useState<Task[]>([]);
  const [depositIdeas, setDepositIdeas] = useState<DepositIdea[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  // State for new note input - simplified to single content box
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Collapsible
  const [isExpanded, setIsExpanded] = useState(false);
  // State for task management
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<'quadrant' | 'list'>('quadrant');
  const [taskSortBy, setTaskSortBy] = useState<'priority' | 'due_date' | 'completed'>('priority');
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [collapsedTaskQuadrants, setCollapsedTaskQuadrants] = useState({
    'urgent-important': false,
    'not-urgent-important': false,
    'urgent-not-important': false,
    'not-urgent-not-important': false,
  });
  // State for deposit ideas management
  const [showAddDepositIdeaForm, setShowAddDepositIdeaForm] = useState(false);
  const [editingDepositIdea, setEditingDepositIdea] = useState<DepositIdea | null>(null);
  const [deletingDepositIdea, setDeletingDepositIdea] = useState<DepositIdea | null>(null);
  const [activatingDepositIdea, setActivatingDepositIdea] = useState<DepositIdea | null>(null);

  // Load initial data
  useEffect(() => {
    loadRelationshipData();
    loadNotes();
    loadImage();
  }, [relationship.id]);

  const loadImage = async () => {
    if (relationship.image_path) {
      const signedUrl = await getSignedImageUrl(relationship.image_path);
      if (signedUrl) setImagePreview(signedUrl);
    } else {
      setImagePreview(null);
    }
  };

  // Fetch tasks and deposit ideas for this key relationship
  const loadRelationshipData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      console.log("DEBUG: Current auth user.id is", user?.id);

      if (!user) return;

      // Fetch tasks
      const { data: taskLinks } = await supabase
        .from('0007-ap-task-key-relationships')
        .select(`
          task:0007-ap-tasks(
            id,
            title,
            status,
            due_date,
            start_time,
            end_time,
            is_urgent,
            is_important,
            is_authentic_deposit,
            is_twelve_week_goal,
            notes,
            completed_at,
            task_roles:0007-ap-task-roles!task_id(role_id),
            task_domains:0007-ap-task-domains(domain_id)
          )
        `)
        .eq('key_relationship_id', relationship.id);
      const relationshipTasks = taskLinks?.map(link => link.task).filter(Boolean) || [];
      
      // Separate active and completed tasks
      const activeTasks = relationshipTasks.filter(
        (task: Task) => task.status === 'pending' || task.status === 'in_progress'
      );
      const completedTasksList = relationshipTasks.filter(
        (task: Task) => task.status === 'completed'
      );
      
      setTasks(activeTasks);
      setCompletedTasks(completedTasksList);
      
      // Also check for deposit ideas linked via the junction table
      const { data: depositIdeaLinks } = await supabase
        .from('0007-ap-deposit-idea-key-relationships')
        .select(`
          deposit_idea:0007-ap-deposit-ideas(
            id,
            title,
            notes,
            is_active,
            activated_at,
            archived
          )
        `)
        .eq('key_relationship_id', relationship.id);
      const linkedDepositIdeas = depositIdeaLinks?.map(link => link.deposit_idea).filter(idea => 
        idea && 
        idea.is_active && 
        !idea.activated_at && 
        (!idea.archived || idea.archived === false)
      ) || [];

      // Combine and remove duplicates
      const allDepositIdeas = [...linkedDepositIdeas];
      const uniqueDepositIdeas = allDepositIdeas.filter((idea, index, self) => 
        index === self.findIndex(i => i.id === idea.id)
      );
      setDepositIdeas(uniqueDepositIdeas);
    } catch (error) {
      console.error('Error loading relationship data:', error);
    }
  };

  // Fetch notes
  const loadNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      console.log("DEBUG: Current auth user.id is", user?.id);

      if (!user) return;

      const { data: noteLinks } = await supabase
        .from('0007-ap-note-key-relationships')
        .select(`
          note:0007-ap-notes(id, content, created_at, updated_at, user_id)
        `)
        .eq('key_relationship_id', relationship.id);
      const relationshipNotes = noteLinks?.map(link => link.note).filter(Boolean) || [];
      setNotes(relationshipNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  // Add note - simplified to single content
  const addNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      console.log("DEBUG: Current auth user.id is", user?.id);

      if (!user) throw new Error("User not authenticated");

      const { data: noteData, error: noteError } = await supabase
        .from('0007-ap-notes')
        .insert({ user_id: user.id, content: newNote.trim() })
        .select()
        .single();
      if (noteError) {
        toast.error("Failed to add note: " + noteError.message);
        setAddingNote(false);
        return;
      }

      const { error: linkError } = await supabase
        .from('0007-ap-note-key-relationships')
        .insert({ note_id: noteData.id, key_relationship_id: relationship.id });
      if (linkError) {
        toast.error("Failed to link note: " + linkError.message);
        setAddingNote(false);
        return;
      }

      setNewNote('');
      loadNotes();
      toast.success("Note added!");
    } catch (err: any) {
      toast.error("Failed to add note: " + (err.message || err));
    }
    setAddingNote(false);
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
      <div className="border rounded-lg">
        <div 
          className={`${bgColor} ${textColor} px-3 py-2 rounded-t-lg flex items-center justify-between cursor-pointer`}
          onClick={() => setCollapsedTaskQuadrants(prev => ({ ...prev, [id]: !prev[id as keyof typeof prev] }))}
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{title}</span>
            <span className="text-xs bg-white bg-opacity-20 rounded px-2">{tasks.length}</span>
          </div>
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
        {!isCollapsed && (
          <div className="p-2 space-y-1">
            {tasks.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-2">No tasks</div>
            ) : (
              tasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  borderColor={borderColor}
                />
              ))
            )}
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
    <div className={`p-2 border-l-4 ${borderColor} bg-gray-50 rounded text-sm`}>
      <div className="flex items-center justify-between">
        <span className="flex-1">{task.title}</span>
        <div className="flex items-center gap-1">
          {task.is_authentic_deposit && (
            <span className="text-xs bg-green-100 text-green-700 px-1 rounded">AD</span>
          )}
          {task.is_twelve_week_goal && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">12W</span>
          )}
        </div>
      </div>
      {task.due_date && (
        <div className="text-xs text-gray-500 mt-1">
          Due: {new Date(task.due_date).toLocaleDateString()}
        </div>
      )}
      <div className="flex justify-end items-center gap-1 mt-2">
        <button 
          onClick={() => handleEditTask(task)}
          className="text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700 transition-colors"
        >
          Edit
        </button>
        <button 
          onClick={() => setDelegatingTask(task)}
          className="text-xs bg-purple-600 text-white rounded px-2 py-1 hover:bg-purple-700 transition-colors"
        >
          <UserPlus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  // Handlers for tasks and ideas
  const handleTaskCreated = () => { setShowAddTaskForm(false); loadRelationshipData(); };
  const handleEditTask = (task: Task) => { setEditingTask(task); };
  const handleTaskUpdated = () => { setEditingTask(null); loadRelationshipData(); };
  const handleDepositIdeaCreated = () => { setShowAddDepositIdeaForm(false); loadRelationshipData(); };
  
  const handleEditDepositIdea = async (idea: DepositIdea) => {
    const { data: { user } } = await supabase.auth.getUser();
  // Fetch linked roles
  const { data: rolesData } = await supabase
    .from('0007-ap-roles-deposit-ideas')
    .select('role_id')
    .eq('deposit_idea_id', idea.id)
    .eq('user_id', user.id);
    
    console.log('Fetched rolesData for Deposit Idea:', rolesData);

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

  // Fetch linked notes
  let noteContent = '';
  const { data: noteLink } = await supabase
    .from('0007-ap-note-deposit-ideas')
    .select('note:0007-ap-notes(content)')
    .eq('deposit_idea_id', idea.id)
    .eq('user_id', user.id)
    .single();

    console.log("Fetched rolesData for Deposit Idea:", rolesData);

  if (noteLink && noteLink.note) {
    noteContent = noteLink.note.content;
  }

  const fullIdeaData = {
    ...idea,
    notes: noteContent,
    schedulingType: 'depositIdea',
    selectedRoleIds: rolesData?.map(r => String(r.role_id)) || [],
    selectedDomainIds: domainsData?.map(d => String(d.domain_id)) || [],
    selectedKeyRelationshipIds: krsData?.map(kr => String(kr.key_relationship_id)) || [],
  };
  console.log('Setting editingDepositIdea:', fullIdeaData);
  setEditingDepositIdea(fullIdeaData);
};


  const handleDepositIdeaUpdated = () => { setEditingDepositIdea(null); loadRelationshipData(); };

  const handleDeleteDepositIdea = async () => {
    if (!deletingDepositIdea) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();

      console.log("DEBUG: Current auth user.id is", user?.id);

      if (!user) return;
      const { error } = await supabase.from('0007-ap-deposit-ideas').delete().eq('id', deletingDepositIdea.id).eq('user_id', user.id);
      if (error) {
        toast.error('Failed to delete deposit idea');
      } else {
        toast.success('Deposit idea deleted successfully!');
        setDeletingDepositIdea(null);
        loadRelationshipData(); // This only refreshes the current card
        onRelationshipUpdated(); // This tells the parent page to refresh
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
        {imagePreview && <img src={imagePreview} alt={name} className="h-10 w-10 rounded-full object-cover border mr-3" />}
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
            
            {/* Task View Controls */}
            <div className="flex items-center justify-between mb-3">
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
            </div>

            {/* Task Content */}
            {taskViewMode === 'quadrant' && taskSortBy === 'priority' ? (
              // Quadrant View
              <div className="space-y-2">
                <QuadrantSection
                  id="urgent-important"
                  title="Urgent & Important"
                  tasks={tasks.filter(task => task.is_urgent && task.is_important)}
                  bgColor="bg-red-500"
                  textColor="text-white"
                  borderColor="border-l-red-500"
                  icon={<AlertTriangle className="h-3 w-3" />}
                />
                
                <QuadrantSection
                  id="not-urgent-important"
                  title="Not Urgent & Important"
                  tasks={tasks.filter(task => !task.is_urgent && task.is_important)}
                  bgColor="bg-green-500"
                  textColor="text-white"
                  borderColor="border-l-green-500"
                  icon={<Check className="h-3 w-3" />}
                />
                
                <QuadrantSection
                  id="urgent-not-important"
                  title="Urgent & Not Important"
                  tasks={tasks.filter(task => task.is_urgent && !task.is_important)}
                  bgColor="bg-orange-500"
                  textColor="text-white"
                  borderColor="border-l-orange-500"
                  icon={<Clock className="h-3 w-3" />}
                />
                
                <QuadrantSection
                  id="not-urgent-not-important"
                  title="Not Urgent & Not Important"
                  tasks={tasks.filter(task => !task.is_urgent && !task.is_important)}
                  bgColor="bg-gray-500"
                  textColor="text-white"
                  borderColor="border-l-gray-500"
                  icon={<X className="h-3 w-3" />}
                />
              </div>
            ) : (
              // List View
              <div className="space-y-1">
                {sortTasks(taskSortBy === 'completed' ? completedTasks : tasks).length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-4">
                    {taskSortBy === 'completed' ? 'No completed tasks' : 'No tasks for this relationship'}
                  </div>
                ) : (
                  sortTasks(taskSortBy === 'completed' ? completedTasks : tasks).map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      borderColor="border-l-blue-500"
                    />
                  ))
                )}
              </div>
            )}
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
      {editingTask && <TaskEventForm mode="edit" initialData={{ id: editingTask.id, title: editingTask.title, schedulingType: 'task', selectedRoleIds: [relationship.role_id], selectedKeyRelationshipIds: [relationship.id] }} onSubmitSuccess={handleTaskUpdated} onClose={() => setEditingTask(null)} />}
      {delegatingTask && <DelegateTaskModal task={delegatingTask} onClose={() => setDelegatingTask(null)} onTaskUpdated={loadRelationshipData} />}
      {showAddDepositIdeaForm && <TaskEventForm mode="create" initialData={{ schedulingType: 'depositIdea', selectedRoleIds: [relationship.role_id], selectedKeyRelationshipIds: [relationship.id] }} onSubmitSuccess={handleDepositIdeaCreated} onClose={() => setShowAddDepositIdeaForm(false)} />}
      {editingDepositIdea && <TaskEventForm mode="edit" initialData={editingDepositIdea} onSubmitSuccess={handleDepositIdeaUpdated} onClose={() => setEditingDepositIdea(null)} />}
      
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
              selectedRoleIds: roles?.map(r => r.role_id) || [],
              selectedDomainIds: domains?.map(d => d.domain_id) || [],
              selectedKeyRelationshipIds: krs?.map(k => k.key_relationship_id) || [],
              notes: noteLink?.note?.content || ''
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

export default UnifiedKeyRelationshipCard;