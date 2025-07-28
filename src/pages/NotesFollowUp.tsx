import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, FileText, Clock, User, Tag, X, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  key_relationship_id?: string;
  key_relationship?: {
    name: string;
    role_id: string;
  };
  needs_follow_up?: boolean;
  follow_up_date?: string;
  tags?: string[];
}

interface KeyRelationship {
  id: string;
  name: string;
  role_id: string;
}

const NotesFollowUp: React.FC = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'follow-up' | 'recent'>('all');
  
  const [newNote, setNewNote] = useState({
    content: '',
    key_relationship_id: '',
    needs_follow_up: false,
    follow_up_date: '',
    tags: [] as string[]
  });

  useEffect(() => {
    if (user) {
      fetchNotes();
      fetchKeyRelationships();
    }
  }, [user]);

  const fetchNotes = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: noteLinks, error } = await supabase
        .from('0007-ap-note-key-relationships')
        .select(`
          note:0007-ap-notes(
            id,
            content,
            created_at,
            updated_at,
            user_id
          ),
          key_relationship:0007-ap-key-relationships(
            id,
            name,
            role_id
          )
        `);

      if (error) {
        console.error('Error fetching notes:', error);
        toast.error('Failed to load notes');
        return;
      }

      // Transform the data to match the expected Note interface
      const transformedNotes = noteLinks?.map(link => ({
        ...link.note,
        key_relationship_id: link.key_relationship?.id,
        key_relationship: link.key_relationship
      })).filter(note => note.user_id === authUser.id) || [];

      // Sort by created_at descending
      transformedNotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotes(transformedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchKeyRelationships = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: relationshipsData, error } = await supabase
        .from('0007-ap-key-relationships')
        .select('id, name, role_id')
        .eq('user_id', authUser.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching key relationships:', error);
        return;
      }

      setKeyRelationships(relationshipsData || []);
    } catch (error) {
      console.error('Error fetching key relationships:', error);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newNote.content.trim()) {
      toast.error('Note content is required');
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // First, insert the note
      const { data: noteData, error: noteError } = await supabase
        .from('0007-ap-notes')
        .insert({
          user_id: authUser.id,
          content: newNote.content.trim(),
        })
        .select()
        .single();

      if (noteError) {
        console.error('Error adding note:', noteError);
        toast.error('Failed to add note');
        return;
      }

      // If a key relationship is selected, link the note to it
      if (newNote.key_relationship_id) {
        const { error: linkError } = await supabase
          .from('0007-ap-note-key-relationships')
          .insert({
            note_id: noteData.id,
            key_relationship_id: newNote.key_relationship_id,
          });

        if (linkError) {
          console.error('Error linking note:', linkError);
          toast.error('Failed to link note to relationship');
          return;
        }
      }

      toast.success('Note added successfully!');
      setNewNote({
        content: '',
        key_relationship_id: '',
        needs_follow_up: false,
        follow_up_date: '',
        tags: []
      });
      setShowAddForm(false);
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase
        .from('0007-ap-notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', authUser.id);

      if (error) {
        console.error('Error deleting note:', error);
        toast.error('Failed to delete note');
        return;
      }

      toast.success('Note deleted successfully!');
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.key_relationship?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (filterBy) {
      case 'follow-up':
        return note.needs_follow_up;
      case 'recent':
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return new Date(note.created_at) > threeDaysAgo;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Notes & Follow Up</h1>
              <p className="text-lg text-gray-600">
                Capture insights and track follow-up actions
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Note
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as 'all' | 'follow-up' | 'recent')}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Notes</option>
                <option value="follow-up">Needs Follow-up</option>
                <option value="recent">Recent (3 days)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm || filterBy !== 'all' ? 'No notes found' : 'No notes yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filterBy !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start capturing your thoughts and insights'
                }
              </p>
              {!searchTerm && filterBy === 'all' && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add Your First Note
                </button>
              )}
            </div>
          ) : (
            filteredNotes.map(note => (
              <div key={note.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-gray-900 leading-relaxed mb-3">{note.content}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      
                      {note.key_relationship && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{note.key_relationship.name}</span>
                        </div>
                      )}
                      
                      {note.needs_follow_up && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-4 w-4 text-orange-500" />
                          <span className="text-orange-600">Follow-up needed</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setEditingNote(note)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit note"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Note Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add New Note</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddNote} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note Content *
                  </label>
                  <textarea
                    value={newNote.content}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={4}
                    placeholder="Write your note here..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Related to (Optional)
                  </label>
                  <select
                    value={newNote.key_relationship_id}
                    onChange={(e) => setNewNote(prev => ({ ...prev, key_relationship_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a person...</option>
                    {keyRelationships.map(relationship => (
                      <option key={relationship.id} value={relationship.id}>
                        {relationship.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                  >
                    Add Note
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesFollowUp;