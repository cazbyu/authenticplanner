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
    notes: '',
    isUrgent: false,
    isImportant: false,
    isAuthenticDeposit: false,
    isTwelveWeekGoal: true, // Auto-selected since this is within 12-week cycle
    dueDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
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
      setError('Task title is required');
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

      // Convert local times to UTC for database storage
      const convertToUTC = (dateStr: string, timeStr: string): string | null => {
        if (!dateStr || !timeStr) return null;
        const localDateTime = new Date(`${dateStr}T${timeStr}:00`);
        return localDateTime.toISOString();
      };

      // Convert time string to PostgreSQL TIME format (HH:MM:SS)
      const convertToTimeFormat = (timeStr: string): string | null => {
        if (!timeStr) return null;
        return timeStr.match(/^\d{2}:\d{2}$/) ? `${timeStr}:00` : timeStr;
      };

      // Prepare time data
      const startTimeUTC = convertToUTC(form.dueDate, form.startTime);
      const endTimeFormatted = convertToTimeFormat(form.endTime);

      // Create the actual task in the tasks table
      const { data: task, error: taskError } = await supabase
        .from('0007-ap-tasks')
        .insert([{
          user_id: user.id,
          title: form.title.trim(),
          is_urgent: form.isUrgent,
          is_important: form.isImportant,
          is_authentic_deposit: form.isAuthenticDeposit,
          is_twelve_week_goal: form.isTwelveWeekGoal,
          due_date: form.dueDate || null,
          start_time: startTimeUTC, // Full datetime for calendar
          end_time: endTimeFormatted, // Just time format for PostgreSQL TIME field
          notes: form.notes.trim() || null,
          percent_complete: 0,
          status: 'pending',
          priority: null // Could be calculated based on urgent/important
        }])
        .select()
        .single();

      if (taskError || !task) {
        console.error('Error creating task:', taskError);
        setError('Failed to create task');
        return;
      }

      // Link task to the 12-week goal
      const { error: goalLinkError } = await supabase
        .from('0007-ap-goal_tasks')
        .insert([{
          goal_id: twelveWeekGoalId,
          task_id: task.id,
          weekly_goal_id: null // We're not creating weekly goals anymore, just tasks
        }]);

      if (goalLinkError) {
        console.error('Error linking task to goal:', goalLinkError);
        // Don't fail the whole operation for this
      }

      // Create role relationships
      if (form.selectedRoles.length > 0) {
        const roleInserts = form.selectedRoles.map(roleId => ({
          task_id: task.id,
          role_id: roleId,
        }));
        
        const { error: roleError } = await supabase
          .from('0007-ap-task_roles')
          .insert(roleInserts);

        if (roleError) {
          console.error('Error linking roles:', roleError);
          // Don't fail the whole operation for this
        }
      }

      // Create domain relationships
      if (form.selectedDomains.length > 0) {
        const domainInserts = form.selectedDomains.map(domainId => ({
          task_id: task.id,
          domain_id: domainId,
        }));
        
        const { error: domainError } = await supabase
          .from('0007-ap-task_domains')
          .insert(domainInserts);

        if (domainError) {
          console.error('Error linking domains:', domainError);
          // Don't fail the whole operation for this
        }
      }

      toast.success(`Week ${weekNumber} task created successfully!`);
      onGoalCreated();

    } catch (err) {
      console.error('Error creating task:', err);
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

          {/* Date and Time Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Time Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Time (Optional)</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                <input
                  name="startTime"
                  type="time"
                  value={form.startTime}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Time</label>
                <input
                  name="endTime"
                  type="time"
                  value={form.endTime}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
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
              name="notes"
              value={form.notes}
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
              {submitting ? 'Creating Task...' : `Create Week ${weekNumber} Task`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WeeklyGoalForm;