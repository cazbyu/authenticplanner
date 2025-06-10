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

interface TwelveWeekGoal {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number;
  domains: Domain[];
  roles: Role[];
}

interface TwelveWeekGoalEditFormProps {
  goal: TwelveWeekGoal;
  onClose: () => void;
  onGoalUpdated: () => void;
  onGoalDeleted: () => void;
}

const WELLNESS_DOMAINS = [
  { id: 'physical', name: 'Physical' },
  { id: 'emotional', name: 'Emotional' },
  { id: 'intellectual', name: 'Intellectual' },
  { id: 'spiritual', name: 'Spiritual' },
  { id: 'financial', name: 'Financial' },
  { id: 'social', name: 'Social' },
  { id: 'recreational', name: 'Recreational' },
  { id: 'community', name: 'Community' }
];

const TwelveWeekGoalEditForm: React.FC<TwelveWeekGoalEditFormProps> = ({ 
  goal, 
  onClose, 
  onGoalUpdated, 
  onGoalDeleted 
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRoles, setActiveRoles] = useState<Role[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [form, setForm] = useState({
    title: goal.title,
    description: goal.description || '',
    status: goal.status,
    progress: goal.progress,
    selectedDomains: goal.domains.map(d => d.name),
    selectedRoles: goal.roles.map(r => r.id),
  });

  useEffect(() => {
    fetchActiveRoles();
  }, []);

  const fetchActiveRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data: roles, error } = await supabase
        .from('0007-ap-roles')
        .select('id, label, category')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('label', { ascending: true });

      if (error) {
        console.error('Error fetching roles:', error);
        setError('Failed to load roles');
        return;
      }

      setActiveRoles(roles || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? parseInt(value) || 0 : value 
    }));
  };

  const toggleDomain = (domainName: string) => {
    setForm(prev => ({
      ...prev,
      selectedDomains: prev.selectedDomains.includes(domainName)
        ? prev.selectedDomains.filter(name => name !== domainName)
        : [...prev.selectedDomains, domainName]
    }));
  };

  const toggleRole = (roleId: string) => {
    setForm(prev => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(roleId)
        ? prev.selectedRoles.filter(id => id !== roleId)
        : [...prev.selectedRoles, roleId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim()) {
      setError('Goal title is required');
      return;
    }

    if (form.selectedDomains.length === 0) {
      setError('Please select at least one wellness domain');
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

      // Update the main goal
      const { error: goalError } = await supabase
        .from('0007-ap-goals_12wk_main')
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: form.status,
          progress: form.progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', goal.id)
        .eq('user_id', user.id);

      if (goalError) {
        console.error('Error updating goal:', goalError);
        setError('Failed to update goal');
        return;
      }

      // Update domain relationships
      // First, delete existing domain relationships
      await supabase
        .from('0007-ap-goal_domains')
        .delete()
        .eq('goal_id', goal.id);

      // Get domain IDs from the domains table
      const { data: domains, error: domainsError } = await supabase
        .from('0007-ap-domains')
        .select('id, name')
        .in('name', form.selectedDomains);

      if (domainsError) {
        console.error('Error fetching domains:', domainsError);
        setError('Failed to update domains');
        return;
      }

      // Create new domain relationships
      if (domains && domains.length > 0) {
        const domainInserts = domains.map(domain => ({
          goal_id: goal.id,
          domain_id: domain.id
        }));

        const { error: domainLinkError } = await supabase
          .from('0007-ap-goal_domains')
          .insert(domainInserts);

        if (domainLinkError) {
          console.error('Error linking domains:', domainLinkError);
          setError('Failed to update domain links');
          return;
        }
      }

      // Update role relationships
      // First, delete existing role relationships
      await supabase
        .from('0007-ap-goal_roles')
        .delete()
        .eq('goal_id', goal.id);

      // Create new role relationships
      if (form.selectedRoles.length > 0) {
        const roleInserts = form.selectedRoles.map(roleId => ({
          goal_id: goal.id,
          role_id: roleId
        }));

        const { error: roleLinkError } = await supabase
          .from('0007-ap-goal_roles')
          .insert(roleInserts);

        if (roleLinkError) {
          console.error('Error linking roles:', roleLinkError);
          setError('Failed to update role links');
          return;
        }
      }

      toast.success('12-Week Goal updated successfully!');
      onGoalUpdated();

    } catch (err) {
      console.error('Error updating goal:', err);
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
        .from('0007-ap-goals_12wk_main')
        .delete()
        .eq('id', goal.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting goal:', error);
        setError('Failed to delete goal');
        return;
      }

      toast.success('12-Week Goal deleted successfully!');
      onGoalDeleted();

    } catch (err) {
      console.error('Error deleting goal:', err);
      setError('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
            <span className="ml-2">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto space-y-6 m-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Edit 12-Week Goal</h2>
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
              <label className="block text-sm font-medium mb-2">Goal Title *</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Enter your 12-week goal..."
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
                placeholder="Add more details about your goal..."
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
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
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

            {/* Wellness Domains */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Wellness Domains *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {WELLNESS_DOMAINS.map((domain) => (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => toggleDomain(domain.name)}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-md border text-left transition-colors
                      ${form.selectedDomains.includes(domain.name)
                        ? 'bg-primary-50 border-primary-200 text-primary-700'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                      }
                    `}
                  >
                    <span className="font-medium">{domain.name}</span>
                    {form.selectedDomains.includes(domain.name) && (
                      <Check className="h-4 w-4 text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
              {form.selectedDomains.length === 0 && (
                <p className="text-sm text-red-600 mt-1">Please select at least one domain</p>
              )}
            </div>

            {/* Active Roles */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Associated Roles
              </label>
              {activeRoles.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {activeRoles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className={`
                        flex items-center justify-between px-3 py-2 rounded-md border text-left transition-colors
                        ${form.selectedRoles.includes(role.id)
                          ? 'bg-secondary-50 border-secondary-200 text-secondary-700'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                        }
                      `}
                    >
                      <div>
                        <span className="font-medium block">{role.label}</span>
                        <span className="text-xs text-gray-500">{role.category}</span>
                      </div>
                      {form.selectedRoles.includes(role.id) && (
                        <Check className="h-4 w-4 text-secondary-600" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No active roles found. You can add roles in Settings to link them to your goals.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center px-4 py-2 text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Goal
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
                  disabled={submitting || !form.title.trim() || form.selectedDomains.length === 0}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Goal</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete "{goal.title}"? This action cannot be undone and will remove all associated weekly goals and task links.
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

export default TwelveWeekGoalEditForm;