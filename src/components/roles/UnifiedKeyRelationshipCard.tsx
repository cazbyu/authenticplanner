import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getSignedImageUrl } from '../../utils/imageHelpers';
import TaskEventForm from '../tasks/TaskEventForm';

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
  is_urgent: boolean;
  is_important: boolean;
  is_authentic_deposit: boolean;
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
            is_urgent,
            is_important,
            is_authentic_deposit
          )
        `)
        .eq('key_relationship_id', relationship.id);

      const relationshipTasks = taskLinks?.map(link => link.task).filter(Boolean) || [];
      setTasks(relationshipTasks.filter(
        (task: Task) => task.status === 'pending' || task.status === 'in_progress'
      ));

      // Fetch deposit ideas linked directly to this key relationship
      const { data: depositIdeasData } = await supabase
        .from('0007-ap-deposit-ideas')
        .select('*')
        .eq('user_id', user.id)
        .eq('key_relationship_id', relationship.id)
        .eq('is_active', true)
        .is('activated_at', null)
        .or('archived.is.null,archived.eq.false');

      console.log('Deposit ideas for relationship', relationship.id, ':', depositIdeasData);

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

      console.log('Linked deposit ideas for relationship', relationship.id, ':', linkedDepositIdeas);

      // Combine both direct and linked deposit ideas, removing duplicates
      const allDepositIdeas = [
        ...(depositIdeasData || []),
        ...linkedDepositIdeas
      ];
      
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
      if (!user) throw new Error("User not authenticated");

      // First, insert the note
      const { data: noteData, error: noteError } = await supabase
        .from('0007-ap-notes')
        .insert({
          user_id: user.id,
          content: newNote.trim(),
        })
        .select()
        .single();

      if (noteError) {
        toast.error("Failed to add note: " + noteError.message);
        setAddingNote(false);
        return;
      }

      // Then, link the note to the key relationship
      const { error: linkError } = await supabase
        .from('0007-ap-note-key-relationships')
        .insert({
          note_id: noteData.id,
          key_relationship_id: relationship.id,
        });

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

  // Handle task creation
  const handleTaskCreated = () => {
    setShowAddTaskForm(false);
    loadRelationshipData(); // Refresh tasks
  };

  // Handle task editing
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  // Handle task updated
  const handleTaskUpdated = () => {
    setEditingTask(null);
    loadRelationshipData(); // Refresh tasks
  };

  // Handle deposit idea creation
  const handleDepositIdeaCreated = () => {
    setShowAddDepositIdeaForm(false);
    loadRelationshipData(); // Refresh deposit ideas
  };

  // Handle deposit idea editing
  const handleEditDepositIdea = (idea: DepositIdea) => {
    setEditingDepositIdea(idea);
  };

  // Handle deposit idea updated
  const handleDepositIdeaUpdated = () => {
    setEditingDepositIdea(null);
    loadRelationshipData(); // Refresh deposit ideas
  };

  // Handle deposit idea deletion
  const handleDeleteDepositIdea = async () => {
    if (!deletingDepositIdea) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('0007-ap-deposit-ideas')
        .delete()
        .eq('id', deletingDepositIdea.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting deposit idea:', error);
        toast.error('Failed to delete deposit idea');
      } else {
        toast.success('Deposit idea deleted successfully!');
        setDeletingDepositIdea(null);
        loadRelationshipData(); // Refresh deposit ideas
      }
    } catch (error) {
      console.error('Error deleting deposit idea:', error);
      toast.error('Failed to delete deposit idea');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm relative">
      <div className="flex items-center mb-3">
        {imagePreview && (
          <img
            src={imagePreview}
            alt={name}
            className="h-10 w-10 rounded-full object-cover border mr-3"
          />
        )}
        <div>
          <div className="font-bold text-lg text-gray-900">{name}</div>
          <div className="text-sm text-gray-500">{roleName}</div>
        </div>
        <button
          className="ml-auto text-gray-400 hover:text-primary-600 transition"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* COLLAPSIBLE SECTION */}
      {isExpanded && (
        <div>
          {/* --- Tasks --- */}
          <div className="mb-4">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <span>Tasks</span>
              <span className="text-xs bg-gray-100 rounded px-2">{tasks.length}</span>
              <button
                onClick={() => setShowAddTaskForm(true)}
                className="ml-auto text-xs bg-blue-600 text-white rounded px-1 py-0.5 hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            {tasks.length === 0 ? (
              <div className="text-gray-400 text-sm">No tasks for this relationship.</div>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-2 p-2 border rounded">
                    <span>{task.title}</span>
                    <div className="flex items-center gap-1">
                      {task.is_urgent && <span className="text-xs bg-red-100 text-red-700 rounded px-1">Urgent</span>}
                      {task.is_important && <span className="text-xs bg-blue-100 text-blue-700 rounded px-1">Important</span>}
                      {task.is_authentic_deposit && <span className="text-xs bg-green-100 text-green-700 rounded px-1">Deposit</span>}
                      <button
                        onClick={() => handleEditTask(task)}
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors ml-2 px-0.5"
                      >
                        Edit
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* --- Deposit Ideas --- */}
          <div className="mb-4">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <span>Deposit Ideas</span>
              <span className="text-xs bg-gray-100 rounded px-2">{depositIdeas.length}</span>
              <button
                onClick={() => setShowAddDepositIdeaForm(true)}
                className="ml-auto text-xs bg-green-600 text-white rounded px-1 py-0.5 hover:bg-green-700 transition-colors"
              >
                Add
              </button>
            </div>
            {/* Remove duplicates by filtering unique IDs */}
            {depositIdeas.filter((idea, index, self) => 
              index === self.findIndex(i => i.id === idea.id)
            ).length === 0 ? (
              <div className="text-gray-400 text-sm">No deposit ideas for this relationship.</div>
            ) : (
              <ul className="space-y-2">
                {depositIdeas.filter((idea, index, self) => 
                  index === self.findIndex(i => i.id === idea.id)
                ).map((idea) => (
                  <li key={idea.id} className="p-2 border rounded">
                    <div className="flex items-center justify-between">
                      <span className="flex-1">{idea.title || idea.notes || "No Title"}</span>
                    </div>
                    * <div className="flex justify-end items-center gap-2 mt-2 text-xs">
                        <button
                          onClick={() => setActivatingDepositIdea(idea)}
                          className="bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700 transition-colors"
                        >
                          Activate
                        </button>
                        <button
                          onClick={() => handleEditDepositIdea(idea)}
                          className="bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 transition-colors"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => setDeletingDepositIdea(idea)}
                          className="bg-red-600 text-white rounded px-3 py-1 hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                    </div> *
                  </li> 
                ))}
              </ul>
            )}
          </div>

          {/* --- Notes Section --- */}
          <div className="mb-4">
            <div className="font-semibold mb-2">Notes</div>
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add note content..."
              className="w-full border rounded px-2 py-1 text-sm mb-2"
            />
            <button
              onClick={addNote}
              disabled={!newNote.trim() || addingNote}
              className="mb-2 px-1.5 py-0.5 rounded bg-primary-600 text-white disabled:bg-gray-300 text-xs"
            >
              {addingNote ? 'Saving...' : 'Add Note'}
            </button>
            {notes && notes.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {notes.map((note) => (
                  <li key={note.id} className="p-2 bg-gray-50 rounded border text-sm">
                    <span>{note.content}</span>
                    <span className="block text-xs text-gray-400 mt-1">
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-400 mt-2">No notes yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Activate Deposit Idea Modal */}
      {activatingDepositIdea && (
        <ActivationTypeSelector
          depositIdea={activatingDepositIdea}
          selectedRole={{ id: relationship.role_id, label: roleName }}
          onClose={() => setActivatingDepositIdea(null)}
          onActivated={() => {
            setActivatingDepositIdea(null);
            loadRelationshipData();
          }}
        />
      )}

      {/* Add Task Form Modal */}
      {showAddTaskForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl mx-4">
            <TaskEventForm
              mode="create"
              initialData={{
                schedulingType: 'task',
                selectedRoleIds: [relationship.role_id],
                selectedKeyRelationshipIds: [relationship.id]
              }}
              onSubmitSuccess={handleTaskCreated}
              onClose={() => setShowAddTaskForm(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Task Form Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl mx-4">
            <TaskEventForm
              mode="edit"
              initialData={{
                id: editingTask.id,
                title: editingTask.title,
                schedulingType: 'task',
                selectedRoleIds: [relationship.role_id],
                selectedKeyRelationshipIds: [relationship.id],
                // The TaskEventForm will fetch and prefill other data via useEffect
              }}
              onSubmitSuccess={handleTaskUpdated}
              onClose={() => setEditingTask(null)}
            />
          </div>
        </div>
      )}

      {/* Add Deposit Idea Form Modal */}
      {showAddDepositIdeaForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl mx-4">
            <TaskEventForm
              mode="create"
              initialData={{
                schedulingType: 'depositIdea',
                selectedRoleIds: [relationship.role_id],
                selectedKeyRelationshipIds: [relationship.id]
              }}
              onSubmitSuccess={handleDepositIdeaCreated}
              onClose={() => setShowAddDepositIdeaForm(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Deposit Idea Form Modal */}
      {editingDepositIdea && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl mx-4">
            <TaskEventForm
              mode="edit"
              initialData={{
                id: editingDepositIdea.id,
                title: editingDepositIdea.title || editingDepositIdea.notes || '',
                notes: editingDepositIdea.notes || '',
                schedulingType: 'depositIdea',
                selectedRoleIds: [relationship.role_id],
                selectedKeyRelationshipIds: [relationship.id],
                // The TaskEventForm will fetch and prefill roles/domains via useEffect
              }}
              onSubmitSuccess={handleDepositIdeaUpdated}
              onClose={() => setEditingDepositIdea(null)}
            />
          </div>
        </div>
      )}

      {/* Delete Deposit Idea Confirmation Modal */}
      {deletingDepositIdea && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Deposit Idea</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete "{deletingDepositIdea.title || deletingDepositIdea.notes || 'this deposit idea'}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeletingDepositIdea(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDepositIdea}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
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
  selectedRole: { id: string; label: string };
  onClose: () => void;
  onActivated: () => void;
}> = ({ depositIdea, selectedRole, onClose, onActivated }) => {
  const [showTaskEventForm, setShowTaskEventForm] = useState<'task' | 'event' | null>(null);

  if (showTaskEventForm) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-full max-w-2xl mx-4">
          <TaskEventForm
            mode="create"
            initialData={{
              title: depositIdea.title,
              notes: depositIdea.notes || "",
              schedulingType: showTaskEventForm,
              selectedRoleIds: [selectedRole.id],
              authenticDeposit: true,
              isFromDepositIdea: true,
              originalDepositIdeaId: depositIdea.id
            }}
            onSubmitSuccess={onActivated}
            onClose={() => setShowTaskEventForm(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4">
        <h3 className="text-lg font-medium mb-4">Activate "{depositIdea.title}" as:</h3>
        <div className="space-y-3">
          <button onClick={() => setShowTaskEventForm('task')} className="w-full p-3 text-left border rounded-lg hover:bg-gray-50">Task</button>
          <button onClick={() => setShowTaskEventForm('event')} className="w-full p-3 text-left border rounded-lg hover:bg-gray-50">Event</button>
        </div>
        <div className="text-right mt-4"><button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button></div>
      </div>
    </div>
  );
};

export default UnifiedKeyRelationshipCard;