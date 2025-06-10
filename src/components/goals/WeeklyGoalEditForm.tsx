import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { X, Check, Trash2 } from 'lucide-react';

interface Role {
  id: string;
  label: string;
  category: string;
}

interface Domain {
  id: string;
  name: string;
}

interface WeeklyGoal {
  id: string;
  goal_id: string;
  week_number: number;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled';
  progress: number;
}

interface WeeklyGoalEditFormProps {
  weeklyGoal: WeeklyGoal;
  onClose: () => void;
  onGoalUpdated: () => void;
  onGoalDeleted: () => void;
}

const WeeklyGoalEditForm: React.FC<WeeklyGoalEditFormProps> = ({ 
  weeklyGoal, 
  onClose, 
  onGoalUpdated, 
  onGoalDeleted 
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [form, setForm] = useState({
    title: weeklyGoal.title,
    description: weeklyGoal.description || '',
    status: weeklyGoal.status,
    progress: weeklyGoal.progress,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? parseInt(value) || 0 : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim()) {
      setError('Weekly goal title is required');
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

      // Update the weekly goal
      const { error: goalError } = await supabase
        .from('0007-ap-goal_weekly_goals')
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: form.status,
          progress: form.progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', weeklyGoal.id);

      if (goalError) {
        console.error('Error updating weekly goal:', goalError);
        setError('Failed to update weekly goal');
        return;
      }

      toast.success(`Week ${weeklyGoal.week_number} goal updated successfully!`);
      onGoalUpdated();

    } catch (err) {
      console.error('Error updating weekly goal:', err);
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { error } = await supabase
        .from('0007-ap-goal_weekly_goals')
        .delete()
        .eq('id', weeklyGoal.id);

      if (error) {
        console.error('Error deleting weekly goal:', error);
        setError('Failed to delete weekly goal');
        return;
      }

      toast.success(`Week ${weeklyGoal.week_number} goal deleted successfully!`);
      onGoalDeleted();

    } catch (err) {
      console.error('Error deleting weekly goal:', err);
      setError('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto space-y-6 m-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Edit Week {weeklyGoal.week_number} Goal</h2>
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
            {/* Goal Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Week {weeklyGoal.week_number} Goal Title *</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder={`Enter your week ${weeklyGoal.week_number} goal...`}
                required
              />
            </div>

            {/* Goal Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={3}
                placeholder="Add more details about your weekly goal..."
              />
            </div>

            {/* Status and Progress */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Progress (%)</label>
                <input
                  type="number"
                  name="progress"
                  value={form.progress}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center px-4 py-2 text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Weekly Goal
              </button>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.title.trim()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Updating...' : 'Update Goal'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Weekly Goal</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this Week {weeklyGoal.week_number} goal: "{weeklyGoal.title}"? This action cannot be undone and will remove all associated task links.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WeeklyGoalEditForm;