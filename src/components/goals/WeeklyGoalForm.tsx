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
    isUrgent: false,
    isImportant: false,
    isAuthenticDeposit: false,
    isTwelveWeekGoal: false,
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
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
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
          <h2 className="text-xl font-semibold text-gray-900">Add Week {weekNumber} Tasks</h2>
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
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Add Task Title"
              required
            />
          </div>

          {/* Task Priority Checkboxes - 2x2 Grid */}
          <div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isUrgent"
                  checked={form.isUrgent}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                Urgent
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isImportant"
                  checked={form.isImportant}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                Important
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isAuthenticDeposit"
                  checked={form.isAuthenticDeposit}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                Authentic Deposit
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isTwelveWeekGoal"
                  checked={form.isTwelveWeekGoal}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                12-Week Goal
              </label>
            </div>
          </div>

          {/* Roles Section */}
          <div>
            <h3 className="text-sm font-medium mb-2">Roles</h3>
            <div className="grid grid-cols-2 gap-2 border border-gray-200 p-3 rounded-md max-h-32 overflow-y-auto">
              {activeRoles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.selectedRoles.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="h-3 w-3"
                  />
                  <span className="truncate">{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Domains Section */}
          <div>
            <h3 className="text-sm font-medium mb-2">Domains</h3>
            <div className="grid grid-cols-2 gap-2 border border-gray-200 p-3 rounded-md max-h-32 overflow-y-auto">
              {availableDomains.map((domain) => (
                <label key={domain.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.selectedDomains.includes(domain.id)}
                    onChange={() => toggleDomain(domain.id)}
                    className="h-3 w-3"
                  />
                  <span className="truncate">{domain.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes Section - Moved to Bottom */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Add any additional notes here..."
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
              disabled={submitting || !form.title.trim()}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating...' : `Create Week ${weekNumber} Task`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WeeklyGoalForm;