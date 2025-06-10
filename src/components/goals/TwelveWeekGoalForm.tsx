import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { X, Check } from 'lucide-react';

interface Role {
  id: string;
  label: string;
  category: string;
}

interface Domain {
  id: string;
  name: string;
}

interface TwelveWeekGoalFormProps {
  onClose: () => void;
  onGoalCreated: () => void;
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

const TwelveWeekGoalForm: React.FC<TwelveWeekGoalFormProps> = ({ onClose, onGoalCreated }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRoles, setActiveRoles] = useState<Role[]>([]);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    selectedDomains: [] as string[],
    selectedRoles: [] as string[],
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleDomain = (domainId: string) => {
    setForm(prev => ({
      ...prev,
      selectedDomains: prev.selectedDomains.includes(domainId)
        ? prev.selectedDomains.filter(id => id !== domainId)
        : [...prev.selectedDomains, domainId]
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

      // Create the main goal
      const { data: goal, error: goalError } = await supabase
        .from('0007-ap-goals_12wk_main')
        .insert([{
          user_id: user.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: 'active',
          progress: 0
        }])
        .select()
        .single();

      if (goalError || !goal) {
        console.error('Error creating goal:', goalError);
        setError('Failed to create goal');
        return;
      }

      // Get domain IDs from the domains table
      const { data: domains, error: domainsError } = await supabase
        .from('0007-ap-domains')
        .select('id, name')
        .in('name', form.selectedDomains);

      if (domainsError) {
        console.error('Error fetching domains:', domainsError);
        setError('Failed to link domains');
        return;
      }

      // Create domain relationships
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
          setError('Failed to link domains to goal');
          return;
        }
      }

      // Create role relationships
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
          setError('Failed to link roles to goal');
          return;
        }
      }

      toast.success('12-Week Goal created successfully!');
      onGoalCreated();

    } catch (err) {
      console.error('Error creating goal:', err);
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto space-y-6 m-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Add 12-Week Goal</h2>
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
            <label className="block text-sm font-medium mb-2">What is your 12-Week Goal? *</label>
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
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              placeholder="Add more details about your goal..."
            />
          </div>

          {/* Wellness Domains */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Which wellness domains does this goal help you improve? *
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
              Does this goal focus on improving any of your active roles? If so, which?
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
              disabled={submitting || !form.title.trim() || form.selectedDomains.length === 0}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TwelveWeekGoalForm;