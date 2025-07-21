import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Check, 
  X, 
  UserPlus, 
  Heart, 
  CheckCircle, 
  Edit3,
  Save,
  Upload
} from 'lucide-react';
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
  status: 'pending' | 'completed' | 'cancelled';
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
  onRelationshipDeleted
}) => {
  // State for relationship data
  const [name, setName] = useState(relationship.name);
  const [notes, setNotes] = useState(relationship.notes || '');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  
  // State for tasks and deposit ideas
  const [tasks, setTasks] = useState<Task[]>([]);
  const [depositIdeas, setDepositIdeas] = useState<DepositIdea[]>([]);
  
  // State for adding new items
  const [newTask, setNewTask] = useState('');
  const [newDepositIdea, setNewDepositIdea] = useState('');
  
  // State for editing modes
  const [editingName, setEditingName] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  
  // Loading states
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Load initial data
  useEffect(() => {
    loadRelationshipData();
    loadImage();
  }, [relationship]);

  const loadImage = async () => {
    if (relationship.image_path) {
      const signedUrl = await getSignedImageUrl(relationship.image_path);
      if (signedUrl) {
        setImagePreview(signedUrl);
      }
    }
  };

  const loadRelationshipData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch tasks linked to this relationship
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
      setTasks(relationshipTasks.filter(task => task.status === 'pending' || task.status === 'in_progress'));

      // Fetch deposit ideas linked to this relationship
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;
    
    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `user-${user.id}/${Date.now()}-${selectedImage.name}`;
      
      const { error } = await supabase.storage
        .from('0007-key-relationship-images')
        .upload(fileName, selectedImage);
      
      if (error) throw error;
      
      return fileName;
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const saveRelationshipDetails = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let imagePath = relationship.image_path;
      if (selectedImage) {
        const uploadedPath = await uploadImage();
        if (uploadedPath) {
          imagePath = uploadedPath;
        }
      }

      const { error } = await supabase
        .from('0007-ap-key-relationships')
        .update({
          name: name.trim(),
          notes: notes.trim() || null,
          image_path: imagePath || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', relationship.id);

      if (error) throw error;

      toast.success('Relationship updated successfully');
      setEditingName(false);
      setEditingNotes(false);
      setSelectedImage(null);
      onRelationshipUpdated();
    } catch (error) {
      console.error('Error saving relationship:', error);
      toast.error('Failed to save relationship');
    } finally {
      setSaving(false);
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: task, error: taskError } = await supabase
        .from('0007-ap-tasks')
        .insert([{
          user_id: user.id,
          title: newTask.trim(),
          status: 'pending',
          notes: `Related to ${name} (${roleName})`
        }])
        .select()
        .single();

      if (taskError || !task) throw taskError;

      // Link task to this relationship
      const { error: linkError } = await supabase
        .from('0007-ap-task-key-relationships')
        .insert([{
          task_id: task.id,
          key_relationship_id: relationship.id
        }]);

      if (linkError) throw linkError;

      // Link task to role
      const { error: roleError } = await supabase
        .from('0007-ap-task-roles')
        .insert([{
          task_id: task.id,
          role_id: relationship.role_id
        }]);

      if (roleError) throw roleError;

      setTasks(prev => [...prev, task]);
      setNewTask('');
      toast.success('Task added successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    }
  };

  const toggleTaskStatus = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      const updates: any = { status: newStatus };
      
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('0007-ap-tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      if (newStatus === 'completed') {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, status: newStatus } : t
        ));
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const removeTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('0007-ap-tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task removed');
    } catch (error) {
      console.error('Error removing task:', error);
      toast.error('Failed to remove task');
    }
  };

  const addDepositIdea = async () => {
    if (!newDepositIdea.trim()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: idea, error } = await supabase
        .from('0007-ap-deposit-ideas')
        .insert([{
          user_id: user.id,
          title: newDepositIdea.trim(),
          key_relationship_id: relationship.id,
          is_active: true
        }])
        .select()
        .single();

      if (error || !idea) throw error;

      setDepositIdeas(prev => [...prev, idea]);
      setNewDepositIdea('');
      toast.success('Deposit idea added successfully');
    } catch (error) {
      console.error('Error adding deposit idea:', error);
      toast.error('Failed to add deposit idea');
    }
  };

  const toggleDepositIdeaStatus = async (ideaId: string) => {
    try {
      const idea = depositIdeas.find(d => d.id === ideaId);
      if (!idea) return;

      const { error } = await supabase
        .from('0007-ap-deposit-ideas')
        .update({ is_active: !idea.is_active })
        .eq('id', ideaId);

      if (error) throw error;

      setDepositIdeas(prev => prev.map(d => 
        d.id === ideaId ? { ...d, is_active: !d.is_active } : d
      ));
    } catch (error) {
      console.error('Error updating deposit idea:', error);
      toast.error('Failed to update deposit idea');
    }
  };

  const removeDepositIdea = async (ideaId: string) => {
    try {
      const { error } = await supabase
        .from('0007-ap-deposit-ideas')
        .delete()
        .eq('id', ideaId);

      if (error) throw error;

      setDepositIdeas(prev => prev.filter(d => d.id !== ideaId));
      toast.success('Deposit idea removed');
    } catch (error) {
      console.error('Error removing deposit idea:', error);
      toast.error('Failed to remove deposit idea');
    }
  };

  const deleteRelationship = async () => {
    if (!confirm(`Are you sure you want to delete the relationship with ${name}?`)) return;
    
    try {
      const { error } = await supabase
        .from('0007-ap-key-relationships')
        .delete()
        .eq('id', relationship.id);

      if (error) throw error;

      toast.success('Relationship deleted successfully');
      onRelationshipDeleted();
    } catch (error) {
      console.error('Error deleting relationship:', error);
      toast.error('Failed to delete relationship');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header Section */}
      <div className="flex items-start gap-4 mb-6">
        {/* Image Section */}
        <div className="flex-shrink-0">
          <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 relative group">
            {imagePreview ? (
              <img 
                src={imagePreview} 
                alt={name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <UserPlus className="h-8 w-8 text-gray-400" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        {/* Name and Details */}
        <div className="flex-1 min-w-0">
          {/* Name Field */}
          <div className="mb-3">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 text-lg font-semibold border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && saveRelationshipDetails()}
                />
                <button
                  onClick={saveRelationshipDetails}
                  disabled={saving}
                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setName(relationship.name);
                    setEditingName(false);
                  }}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-600">Key Relationship</p>
          </div>

          {/* Notes Field */}
          <div className="mb-4">
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  rows={3}
                  placeholder="Add notes about this relationship..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveRelationshipDetails}
                    disabled={saving}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setNotes(relationship.notes || '');
                      setEditingNotes(false);
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setEditingNotes(true)}
                className="cursor-pointer group"
              >
                {notes ? (
                  <div className="bg-gray-50 rounded-md p-3 group-hover:bg-gray-100 transition-colors">
                    <p className="text-xs font-medium text-gray-700 mb-1">Notes:</p>
                    <p className="text-sm text-gray-600">{notes}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-md p-3 group-hover:bg-gray-100 transition-colors border-dashed border border-gray-300">
                    <p className="text-sm text-gray-400 italic">Click to add notes...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0">
          <button
            onClick={deleteRelationship}
            className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors"
            title="Delete relationship"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            Current Tasks ({tasks.length})
          </h4>
        </div>
        
        <div className="space-y-2 mb-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex items-center space-x-3 flex-1">
                <button
                  onClick={() => toggleTaskStatus(task.id)}
                  className="p-1 rounded-full hover:bg-blue-200 transition-colors"
                >
                  <Check className="h-3 w-3 text-blue-600" />
                </button>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">{task.title}</span>
                  {task.due_date && (
                    <div className="text-xs text-gray-600">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex gap-1 mt-1">
                    {task.is_urgent && (
                      <span className="inline-block w-2 h-2 bg-red-400 rounded-full" title="Urgent" />
                    )}
                    {task.is_important && (
                      <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full" title="Important" />
                    )}
                    {task.is_authentic_deposit && (
                      <span className="inline-block w-2 h-2 bg-green-400 rounded-full" title="Authentic Deposit" />
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeTask(task.id)}
                className="p-1 text-red-500 hover:bg-red-100 rounded"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Add a task..."
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
          />
          <button
            onClick={addTask}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Deposit Ideas Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Heart className="h-4 w-4 text-purple-600" />
            Deposit Ideas ({depositIdeas.length})
          </h4>
        </div>
        
        <div className="space-y-2 mb-3">
          {depositIdeas.map((idea) => (
            <div key={idea.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-md border border-purple-200">
              <div className="flex items-center space-x-3 flex-1">
                <button
                  onClick={() => toggleDepositIdeaStatus(idea.id)}
                  className={`p-1 rounded-full transition-colors ${
                    idea.is_active
                      ? 'bg-purple-200 text-purple-600'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <Check className="h-3 w-3" />
                </button>
                <span className={`text-sm flex-1 ${
                  idea.is_active ? 'text-gray-900' : 'text-gray-500 line-through'
                }`}>
                  {idea.title || idea.description}
                </span>
              </div>
              <button
                onClick={() => removeDepositIdea(idea.id)}
                className="p-1 text-red-500 hover:bg-red-100 rounded"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={newDepositIdea}
            onChange={(e) => setNewDepositIdea(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            placeholder="Add a deposit idea..."
            onKeyPress={(e) => e.key === 'Enter' && addDepositIdea()}
          />
          <button
            onClick={addDepositIdea}
            className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedKeyRelationshipCard;