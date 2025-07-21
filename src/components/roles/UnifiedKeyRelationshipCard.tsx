import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getSignedImageUrl } from '../../utils/imageHelpers';

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
  description?: string;
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

  // State for new note input
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Collapsible
  const [isExpanded, setIsExpanded] = useState(false);

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

      // Fetch deposit ideas
      const { data: depositIdeasData } = await supabase
        .from('0007-ap-deposit-ideas')
        .select('*')
        .eq('key_relationship_id', relationship.id)
        .eq('is_active', true)
        .is('activated_at', null)
        .neq('archived', true);

      setDepositIdeas(depositIdeasData || []);
    } catch (error) {
      console.error('Error loading relationship data:', error);
    }
  };

  // Fetch notes
  const loadNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notesData } = await supabase
        .from('0007-ap-notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('key_relationship_id', relationship.id)
        .order('created_at', { ascending: false });

      setNotes(notesData || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  // Add note
  const addNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('0007-ap-notes')
        .insert([{
          user_id: user.id,
          key_relationship_id: relationship.id,
          content: newNote.trim(),
        }]);
      if (error) {
        toast.error("Failed to add note: " + error.message);
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
            </div>
            {tasks.length === 0 ? (
              <div className="text-gray-400 text-sm">No tasks for this relationship.</div>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 p-2 border rounded">
                    <span>{task.title}</span>
                    {task.is_urgent && <span className="text-xs bg-red-100 text-red-700 rounded px-1 ml-2">Urgent</span>}
                    {task.is_important && <span className="text-xs bg-blue-100 text-blue-700 rounded px-1 ml-2">Important</span>}
                    {task.is_authentic_deposit && <span className="text-xs bg-green-100 text-green-700 rounded px-1 ml-2">Deposit</span>}
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
            </div>
            {depositIdeas.length === 0 ? (
              <div className="text-gray-400 text-sm">No deposit ideas for this relationship.</div>
            ) : (
              <ul className="space-y-2">
                {depositIdeas.map((idea) => (
                  <li key={idea.id} className="flex items-center gap-2 p-2 border rounded">
                    <span>{idea.title || idea.description || "No Title"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* --- Notes Section --- */}
          <div className="mb-4">
            <div className="font-semibold mb-2">Notes</div>
            <div className="flex items-center mb-2">
              <input
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <button
                onClick={addNote}
                disabled={!newNote.trim() || addingNote}
                className="ml-2 px-3 py-1 rounded bg-primary-600 text-white disabled:bg-gray-300"
              >
                {addingNote ? 'Saving...' : <Plus className="w-4 h-4" />}
              </button>
            </div>
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
    </div>
  );
};

export default UnifiedKeyRelationshipCard;
