import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface Role {
  id: string;
  label: string;
}

interface Domain {
  id: string;
  name: string;
}

interface TaskEditModalProps {
  taskId: string;
  onClose: () => void;
  onTaskUpdated: () => void;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({ taskId, onClose, onTaskUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  
  const [form, setForm] = useState({
    title: '',
    isAuthenticDeposit: false,
    isTwelveWeekGoal: false,
    isUrgent: false,
    isImportant: false,
    dueDate: '',
    startTime: '',
    endTime: '',
    notes: '',
    selectedRoleIds: [] as string[],
    selectedDomainIds: [] as string[],
  });

  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('User not authenticated');
          return;
        }

        // Fetch task details with relationships
        const { data: task, error: taskError } = await supabase
          .from('0007-ap-tasks')
          .select(`
            *,
            task_roles:0007-ap-task_roles(role_id),
            task_domains:0007-ap-task_domains(domain_id)
          `)
          .eq('id', taskId)
          .eq('user_id', user.id)
          .single();

        if (taskError || !task) {
          setError('Task not found or access denied');
          return;
        }

        // Fetch available roles and domains
        const [rolesRes, domainsRes] = await Promise.all([
          supabase
            .from('0007-ap-roles')
            .select('id, label')
            .eq('user_id', user.id)
            .eq('is_active', true),
          supabase
            .from('0007-ap-domains')
            .select('id, name')
        ]);

        if (rolesRes.error || domainsRes.error) {
          setError('Failed to load roles/domains');
          return;
        }

        setRoles(rolesRes.data || []);
        setDomains(domainsRes.data || []);

        // Convert UTC times back to local for editing
        const convertUTCToLocal = (utcString: string | null): { date: string; time: string } => {
          if (!utcString) return { date: '', time: '' };
          
          const localDate = new Date(utcString);
          const date = localDate.toISOString().split('T')[0];
          const time = localDate.toTimeString().slice(0, 5);
          
          return { date, time };
        };

        const startDateTime = convertUTCToLocal(task.start_time);
        const endTime = task.end_time ? new Date(task.end_time).toTimeString().slice(0, 5) : '';

        // Populate form with task data
        setForm({
          title: task.title || '',
          isAuthenticDeposit: task.is_authentic_deposit || false,
          isTwelveWeekGoal: task.is_twelve_week_goal || false,
          isUrgent: task.is_urgent || false,
          isImportant: task.is_important || false,
          dueDate: task.due_date || startDateTime.date,
          startTime: startDateTime.time,
          endTime: endTime,
          notes: task.notes || '',
          selectedRoleIds: task.task_roles?.map((tr: any) => tr.role_id) || [],
          selectedDomainIds: task.task_domains?.map((td: any) => td.domain_id) || [],
        });

      } catch (err) {
        console.error('Error fetching task data:', err);
        setError('Failed to load task data');
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();
  }, [taskId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const toggleArrayField = (id: string, field: 'selectedRoleIds' | 'selectedDomainIds') => {
    setForm(prev => {
      const exists = prev[field].includes(id);
      const updated = exists
        ? prev[field].filter(rid => rid !== id)
        : [...prev[field], id];
      return { ...prev, [field]: updated };
    });
  };

  const convertToUTC = (dateStr: string, timeStr: string): string | null => {
    if (!dateStr || !timeStr) return null;
    const localDateTime = new Date(`${dateStr}T${timeStr}:00`);
    return localDateTime.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
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

      // Convert local times to UTC
      const startTimeUTC = convertToUTC(form.dueDate, form.startTime);
      const endTimeUTC = form.endTime ? convertToUTC(form.dueDate, form.endTime) : null;

      // Update the task
      const { error: updateError } = await supabase
        .from('0007-ap-tasks')
        .update({
          title: form.title.trim(),
          is_authentic_deposit: form.isAuthenticDeposit,
          is_twelve_week_goal: form.isTwelveWeekGoal,
          is_urgent: form.isUrgent,
          is_important: form.isImportant,
          due_date: form.dueDate || null,
          start_time: startTimeUTC,
          end_time: endTimeUTC,
          notes: form.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (updateError) {
        setError(`Failed to update task: ${updateError.message}`);
        return;
      }

      // Update role relationships
      await supabase.from('0007-ap-task_roles').delete().eq('task_id', taskId);
      if (form.selectedRoleIds.length > 0) {
        const roleInserts = form.selectedRoleIds.map(roleId => ({
          task_id: taskId,
          role_id: roleId,
        }));
        await supabase.from('0007-ap-task_roles').insert(roleInserts);
      }

      // Update domain relationships
      await supabase.from('0007-ap-task_domains').delete().eq('task_id', taskId);
      if (form.selectedDomainIds.length > 0) {
        const domainInserts = form.selectedDomainIds.map(domainId => ({
          task_id: taskId,
          domain_id: domainId,
        }));
        await supabase.from('0007-ap-task_domains').insert(domainInserts);
      }

      toast.success('Task updated successfully!');
      onTaskUpdated();

    } catch (err) {
      console.error('Error updating task:', err);
      setError('An unexpected error occurred while updating the task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('0007-ap-tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) {
        setError(`Failed to delete task: ${error.message}`);
        return;
      }

      toast.success('Task deleted successfully!');
      onTaskUpdated();
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task');
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
            <span className="ml-2">Loading task...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[85vh] overflow-y-auto space-y-6 m-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Edit Task</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Task Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              ['isAuthenticDeposit', 'Authentic Deposit'],
              ['isTwelveWeekGoal', '12-Week Goal'],
              ['isUrgent', 'Urgent'],
              ['isImportant', 'Important'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={key}
                  checked={(form as any)[key]}
                  onChange={handleChange}
                />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Time (local time)</label>
            <div className="grid grid-cols-2 gap-4">
              <input
                name="startTime"
                type="time"
                value={form.startTime}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                placeholder="Start time"
              />
              <input
                name="endTime"
                type="time"
                value={form.endTime}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                placeholder="End time"
              />
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Roles</h3>
            <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
              {roles.map(role => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.selectedRoleIds.includes(role.id)}
                    onChange={() => toggleArrayField(role.id, 'selectedRoleIds')}
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Domains</h3>
            <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
              {domains.map(domain => (
                <label key={domain.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.selectedDomainIds.includes(domain.id)}
                    onChange={() => toggleArrayField(domain.id, 'selectedDomainIds')}
                  />
                  {domain.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 min-h-[80px]"
              placeholder="Add any additional notes here..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Update Task'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskEditModal;