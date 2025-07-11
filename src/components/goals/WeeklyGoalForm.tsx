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

interface WeeklyGoalFormProps {
  onClose: () => void;
  onGoalCreated: () => void;
  twelveWeekGoalId: string;
  weekNumber: number;
  prefilledDomains?: Domain[];
  prefilledRoles?: Role[];
}

const WeeklyGoalForm: React.FC<WeeklyGoalFormProps> = ({ 
  onClose, 
  onGoalCreated, 
  twelveWeekGoalId, 
  weekNumber,
  prefilledDomains = [],
  prefilledRoles = []
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRoles, setActiveRoles] = useState<Role[]>([]);
  const [availableDomains, setAvailableDomains] = useState<Domain[]>([]);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    selectedDomains: prefilledDomains.map(d => d.id),
    selectedRoles: prefilledRoles.map(r => r.id),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Fetch active roles
      const { data: roles, error: rolesError } = await supabase
        .from('0007-ap-roles')
        .select('id, label, category')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('label', { ascending: true });

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        setError('Failed to load roles');
        return;
      }

      // Fetch all domains
      const { data: domains, error: domainsError } = await supabase
        .from('0007-ap-domains')
        .select('id, name')
        .order('name', { ascending: true });

      if (domainsError) {
        console.error('Error fetching domains:', domainsError);
        setError('Failed to load domains');
        return;
      }

      setActiveRoles(roles || []);
      setAvailableDomains(domains || []);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load form data');
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

      // Create the weekly goal
      const { data: weeklyGoal, error: goalError } = await supabase
        .from('0007-ap-goal_weekly_goals')
        .insert([{
          goal_id: twelveWeekGoalId,
          week_number: weekNumber,
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: 'pending',
          progress: 0
        }])
        .select()
        .single();

      if (goalError || !weeklyGoal) {
        console.error('Error creating weekly goal:', goalError);
        setError('Failed to create weekly goal');
        return;
      }

      toast.success(`Week ${weekNumber} goal created successfully!`);
      onGoalCreated();

    } catch (err) {
      console.error('Error creating weekly goal:', err);
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getDomainColor = (domainName: string) => {
    const colors: Record<string, string> = {
      'Physical': 'bg-blue-100 text-blue-800 border-blue-200',
      'Emotional': 'bg-pink-100 text-pink-800 border-pink-200',
      'Intellectual': 'bg-purple-100 text-purple-800 border-purple-200',
      'Spiritual': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Financial': 'bg-green-100 text-green-800 border-green-200',
      'Social': 'bg-orange-100 text-orange-800 border-orange-200',
      'Recreational': 'bg-teal-100 text-teal-800 border-teal-200',
      'Community': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[domainName] || 'bg-gray-100 text-gray-800 border-gray-200';
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
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto space-y-6 m-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Add Week {weekNumber} Goal</h2>
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
            <label className="block text-sm font-medium mb-2">What tasks will support this goal this week? *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter tasks that will support this goal..."
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
              placeholder="Add more details about your weekly goal..."
            />
          </div>

          {/* Wellness Domains - Optional Override */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Wellness Domains (Optional - modify from 12-week goal selection)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableDomains.map((domain) => (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => toggleDomain(domain.id)}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-md border text-left transition-colors text-sm
                    ${form.selectedDomains.includes(domain.id)
                      ? `border ${getDomainColor(domain.name)}`
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  <span className="font-medium">{domain.name}</span>
                  {form.selectedDomains.includes(domain.id) && (
                    <Check className="h-4 w-4 text-current" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Active Roles - Optional Override */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Associated Roles (Optional - modify from 12-week goal selection)
            </label>
            {activeRoles.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
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
                      <span className="font-medium block text-sm">{role.label}</span>
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
              disabled={submitting || !form.title.trim()}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating...' : `Create Week ${weekNumber} Goal`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WeeklyGoalForm;