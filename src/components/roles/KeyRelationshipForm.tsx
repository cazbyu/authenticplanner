import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { getSignedImageUrl } from '../../utils/imageHelpers';

interface Role {
  id: string;
  label: string;
}

interface KeyRelationshipFormProps {
  roleId: string;
  roleName: string;
  existingRelationship?: KeyRelationship | null;
  onClose: () => void;
  onRelationshipCreated: () => void;
}

interface DepositIdea {
  id: string;
  description: string;
  is_active: boolean;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'cancelled';
  due_date?: string;
}

interface KeyRelationship {
  id: string;
  role_id: string;
  name: string;
  notes?: string;
  image_url?: string;
}

const KeyRelationshipForm: React.FC<KeyRelationshipFormProps> = ({ 
  roleId, 
  roleName, 
  existingRelationship,
  onClose, 
  onRelationshipCreated 
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: existingRelationship?.name || '',
    notes: existingRelationship?.notes || '',
    imagePath: existingRelationship?.image_path || ''
  });

  const [depositIdeas, setDepositIdeas] = useState<DepositIdea[]>([]);
  const [newDepositIdea, setNewDepositIdea] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Load signed URL for existing image
  useEffect(() => {
    const loadImage = async () => {
      if (existingRelationship?.image_path) {
        const signedUrl = await getSignedImageUrl(existingRelationship.image_path);
        if (signedUrl) {
          setImagePreview(signedUrl);
        }
      }
    }
    loadImage();
  }, [existingRelationship]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;
    
    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Create unique filename
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `user-${user.id}/${Date.now()}-${selectedImage.name}`;
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('0007-key-relationship-images')
        .upload(fileName, selectedImage);
      
      if (error) {
        console.error('Upload error:', error);
        throw error;
      }
      
      return fileName;
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setForm(prev => ({ ...prev, imagePath: '' }));
  };

  const addDepositIdea = () => {
    if (newDepositIdea.trim()) {
      const newIdea: DepositIdea = {
        id: `temp-${Date.now()}`,
        description: newDepositIdea.trim(),
        is_active: true
      };
      setDepositIdeas(prev => [...prev, newIdea]);
      setNewDepositIdea('');
    }
  };

  const removeDepositIdea = (id: string) => {
    setDepositIdeas(prev => prev.filter(idea => idea.id !== id));
  };

  const toggleDepositIdea = (id: string) => {
    setDepositIdeas(prev => 
      prev.map(idea => 
        idea.id === id ? { ...idea, is_active: !idea.is_active } : idea
      )
    );
  };

  const addTask = () => {
    if (newTask.trim()) {
      const task: Task = {
        id: `temp-${Date.now()}`,
        title: newTask.trim(),
        status: 'pending'
      };
      setTasks(prev => [...prev, task]);
      setNewTask('');
    }
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const toggleTaskStatus = (id: string) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === id 
          ? { ...task, status: task.status === 'completed' ? 'pending' : 'completed' as const }
          : task
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      setError('Relationship name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Upload image if selected
      let imagePath = form.imagePath;
      if (selectedImage) {
        const uploadedPath = await uploadImage();
        if (uploadedPath) {
          imagePath = uploadedPath;
        } else {
          // If image upload fails, don't proceed
          return;
        }
      }

      let relationship;
      
      if (existingRelationship) {
        // Update existing relationship
        const { data: updatedRelationship, error: relationshipError } = await supabase
          .from('0007-ap-key-relationships')
          .update({
            name: form.name.trim(),
            image_path: imagePath || null
          })
          .eq('id', existingRelationship.id)
          .select()
          .single();

        if (relationshipError || !updatedRelationship) {
          console.error('Error updating relationship:', relationshipError);
          setError('Failed to update relationship');
          return;
        }
        relationship = updatedRelationship;
      } else {
        // Create new relationship
        const { data: newRelationship, error: relationshipError } = await supabase
          .from('0007-ap-key-relationships')
          .insert([{
            role_id: roleId,
            name: form.name.trim(),
            image_path: imagePath || null
          }])
          .select()
          .single();

        if (relationshipError || !newRelationship) {
          console.error('Error creating relationship:', relationshipError);
          setError('Failed to create relationship');
          return;
        }
        relationship = newRelationship;
      }

      // Only create deposit ideas and tasks for new relationships
      if (!existingRelationship) {
        // Create deposit ideas
        if (depositIdeas.length > 0) {
          const depositInserts = depositIdeas.map(idea => ({
            key_relationship_id: relationship.id,
            description: idea.description,
            is_active: idea.is_active
          }));

          const { error: depositError } = await supabase
            .from('0007-ap-deposit-ideas')
            .insert(depositInserts);

          if (depositError) {
            console.error('Error creating deposit ideas:', depositError);
            // Don't fail the whole operation for this
          }
        }

        // Create tasks
        if (tasks.length > 0) {
          const taskInserts = tasks.map(task => ({
            user_id: user.id,
            title: task.title,
            status: task.status,
            notes: `Related to ${form.name} (${roleName})`,
            // Link to role instead of relationship for now
            task_roles: [{ role_id: roleId }]
          }));

          // Create tasks first
          const { data: createdTasks, error: taskError } = await supabase
            .from('0007-ap-tasks')
            .insert(taskInserts.map(t => ({
              user_id: t.user_id,
              title: t.title,
              status: t.status,
              notes: t.notes
            })))
            .select();

          if (taskError) {
            console.error('Error creating tasks:', taskError);
            // Don't fail the whole operation for this
          } else if (createdTasks) {
            // Link tasks to role
            const roleLinks = createdTasks.map(task => ({
              task_id: task.id,
              role_id: roleId
            }));
            
            await supabase
              .from('0007-ap-task-roles')
              .insert(roleLinks);
          }
        }
      }

      toast.success(existingRelationship ? 'Key relationship updated successfully!' : 'Key relationship created successfully!');
      onRelationshipCreated();

    } catch (err) {
      console.error('Error saving relationship:', err);
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = !!existingRelationship;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto space-y-6 m-4 w-full">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit' : 'Add'} Key Relationship for {roleName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter the person's name..."
              required
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-3">Photo</label>
            <div className="flex items-start space-x-4">
              {/* Image Preview/Placeholder */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-xs text-gray-500">Photo</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Upload Controls */}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <div className="space-y-2">
                  <label
                    htmlFor="image-upload"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    Choose Photo
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="block text-sm text-red-600 hover:text-red-700"
                    >
                      Remove Photo
                    </button>
                  )}
                  <p className="text-xs text-gray-500">
                    JPG, PNG up to 5MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Current Tasks */}
          <div>
            <label className="block text-sm font-medium mb-3">Current Tasks</label>
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task.id)}
                      className={`p-1 rounded-full transition-colors ${
                        task.status === 'completed'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <span className={`text-sm ${
                      task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                    }`}>
                      {task.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTask(task.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Add a task..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                />
                <button
                  type="button"
                  onClick={addTask}
                  className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Deposit Ideas */}
          <div>
            <label className="block text-sm font-medium mb-3">Deposit Ideas</label>
            <div className="space-y-2">
              {depositIdeas.map((idea) => (
                <div key={idea.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => toggleDepositIdea(idea.id)}
                      className={`p-1 rounded-full transition-colors ${
                        idea.is_active
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <span className={`text-sm ${
                      idea.is_active ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {idea.description}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDepositIdea(idea.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newDepositIdea}
                  onChange={(e) => setNewDepositIdea(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Add a deposit idea..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDepositIdea())}
                />
                <button
                  type="button"
                  onClick={addDepositIdea}
                  className="px-3 py-2 bg-secondary-600 text-white rounded-md hover:bg-secondary-700 transition-colors text-sm"
                >
                  Add Deposit Idea
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={4}
              placeholder="Add any notes about this relationship..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage || !form.name.trim()}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (isEditing ? 'Updating...' : 'Creating...') : uploadingImage ? 'Uploading...' : (isEditing ? 'Update Relationship' : 'Create Relationship')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KeyRelationshipForm;