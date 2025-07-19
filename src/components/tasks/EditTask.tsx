import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "sonner";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X, Check } from "lucide-react";

// ----- Types -----
interface Role { id: string; label: string; }
interface Domain { id: string; name: string; }
interface TwelveWeekGoal { id: string; title: string; }
interface EditTaskProps {
  task: any;
  onTaskUpdated?: () => void;
  onCancel: () => void;
}
interface TaskEventFormValues {
  title: string;
  isAuthenticDeposit: boolean;
  selectedTwelveWeekGoal: string;
  isUrgent: boolean;
  isImportant: boolean;
  dueDate: string;
  startTime: string;
  endTime: string;
  notes: string;
  selectedRoleIds: string[];
  selectedDomainIds: string[];
  schedulingType: 'unscheduled' | 'scheduled' | 'daily' | 'weekly' | 'custom';
  customRecurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[];
    endType: 'never' | 'on' | 'after';
    endDate?: string;
    occurrences?: number;
  };
}

const EditTask: React.FC<EditTaskProps> = ({ task, onTaskUpdated, onCancel }) => {
  // ----- State -----
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [twelveWeekGoals, setTwelveWeekGoals] = useState<TwelveWeekGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomRecurrence, setShowCustomRecurrence] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<TaskEventFormValues>({
    title: "",
    isAuthenticDeposit: false,
    selectedTwelveWeekGoal: "",
    isUrgent: false,
    isImportant: false,
    dueDate: new Date().toISOString().split('T')[0],
    startTime: "",
    endTime: "",
    notes: "",
    selectedRoleIds: [],
    selectedDomainIds: [],
    schedulingType: 'unscheduled',
    customRecurrence: {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [],
      endType: 'never',
      endDate: '',
      occurrences: 10,
    },
  });

  // ----- Fetch user and task data -----
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId || !task) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch task and related roles/domains
        const { data: taskData, error: taskError } = await supabase
          .from('0007-ap-tasks')
          .select(`
            *,
            task_roles:0007-ap-task-roles!fk_task(role_id),
            task_domains:0007-ap-task-domains(domain_id)
          `)
          .eq('id', task.id)
          .eq('user_id', userId)
          .single();
        if (taskError || !taskData) {
          setError('Task not found or access denied');
          return;
        }

        const [roleRes, domainRes, goalRes] = await Promise.all([
          supabase.from("0007-ap-roles").select("id, label").eq("user_id", userId).eq("is_active", true),
          supabase.from("0007-ap-domains").select("id, name"),
          supabase.from("0007-ap-goals-12wk-main").select("id, title").eq("user_id", userId).eq("status", "active")
        ]);

        setRoles(roleRes.data || []);
        setDomains(domainRes.data || []);
        setTwelveWeekGoals(goalRes.data || []);

        // Time conversion helpers
        const convertUTCToLocal = (utcString: string | null) => {
          if (!utcString) return { date: '', time: '' };
          const local = new Date(utcString);
          return {
            date: local.toISOString().split('T')[0],
            time: local.toTimeString().slice(0, 5)
          };
        };
        const startDateTime = convertUTCToLocal(taskData.start_time);
        let endTime = '';
        if (taskData.end_time && typeof taskData.end_time === 'string') {
          endTime = taskData.end_time.slice(0, 5);
        }
        let schedulingType: TaskEventFormValues['schedulingType'] = taskData.start_time ? 'scheduled' : 'unscheduled';

        setForm({
          title: taskData.title || '',
          isAuthenticDeposit: taskData.is_authentic_deposit || false,
          selectedTwelveWeekGoal: taskData.is_twelve_week_goal ? (taskData.goal_tasks?.[0]?.goal_id || '') : '',
          isUrgent: taskData.is_urgent || false,
          isImportant: taskData.is_important || false,
          dueDate: taskData.due_date || startDateTime.date || new Date().toISOString().split('T')[0],
          startTime: startDateTime.time,
          endTime: endTime,
          notes: taskData.notes || '',
          selectedRoleIds: taskData.task_roles?.map((tr: any) => tr.role_id) || [],
          selectedDomainIds: taskData.task_domains?.map((td: any) => td.domain_id) || [],
          schedulingType,
          customRecurrence: {
            frequency: 'weekly',
            interval: 1,
            daysOfWeek: [],
            endType: 'never',
            endDate: '',
            occurrences: 10
          }
        });

      } catch (err) {
        setError("Failed to load task data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, task]);

  // ----- Handlers -----
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const toggleArrayField = (id: string, field: "selectedRoleIds" | "selectedDomainIds") => {
    setForm((prev) => {
      const exists = prev[field].includes(id);
      const updated = exists
        ? prev[field].filter((rid) => rid !== id)
        : [...prev[field], id];
      return { ...prev, [field]: updated };
    });
  };
  // Convert time to PG TIME format
  const convertToTimeFormat = (timeStr: string): string | null =>
    timeStr ? (timeStr.match(/^\d{2}:\d{2}$/) ? `${timeStr}:00` : timeStr) : null;
  const convertToUTC = (dateStr: string, timeStr: string): string | null =>
    dateStr && timeStr ? new Date(`${dateStr}T${timeStr}:00`).toISOString() : null;

  // ----- Submit -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const startTimeFormatted = convertToTimeFormat(form.startTime);
      const endTimeFormatted = convertToTimeFormat(form.endTime);
      const startTimeUTC = convertToUTC(form.dueDate, form.startTime);

      const { error: taskErr } = await supabase
        .from("0007-ap-tasks")
        .update({
          title: form.title.trim(),
          is_authentic_deposit: form.isAuthenticDeposit,
          is_twelve_week_goal: !!form.selectedTwelveWeekGoal,
          is_urgent: form.isUrgent,
          is_important: form.isImportant,
          due_date: form.dueDate || null,
          start_time: startTimeUTC,
          end_time: endTimeFormatted,
          notes: form.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)
        .eq('user_id', userId);

      if (taskErr) {
        setError(`Failed to update task: ${taskErr.message}`);
        return;
      }

      // Update roles/domains
      await supabase.from('0007-ap-task-roles').delete().eq('task_id', task.id);
      if (form.selectedRoleIds.length > 0) {
        await supabase.from('0007-ap-task-roles').insert(form.selectedRoleIds.map(roleId => ({
          task_id: task.id, role_id: roleId,
        })));
      }
      await supabase.from('0007-ap-task-domains').delete().eq('task_id', task.id);
      if (form.selectedDomainIds.length > 0) {
        await supabase.from('0007-ap-task-domains').insert(form.selectedDomainIds.map(domainId => ({
          task_id: task.id, domain_id: domainId,
        })));
      }

      toast.success("Task updated successfully!");
      onTaskUpdated && onTaskUpdated();

    } catch (err) {
      setError("An unexpected error occurred while updating the task.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Delete -----
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('0007-ap-tasks')
        .delete()
        .eq('id', task.id)
        .eq('user_id', userId);
      if (error) {
        setError(`Failed to delete task: ${error.message}`);
        return;
      }
      toast.success('Task deleted successfully!');
      onTaskUpdated && onTaskUpdated();
    } catch (err) {
      setError('Failed to delete task');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-sm">Loading…</div>;

  // ----- Render -----
  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg shadow-xl p-5 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 p-1"
          aria-label="Close form"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-2 mb-3">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="Add Task Title"
            required
          />
        </div>
        {/* Checkboxes */}
        <div className="grid grid-cols-4 gap-2">
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              name="isUrgent"
              checked={form.isUrgent}
              onChange={handleChange}
              className="h-3 w-3"
            /> Urgent
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              name="isImportant"
              checked={form.isImportant}
              onChange={handleChange}
              className="h-3 w-3"
            /> Important
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              name="isAuthenticDeposit"
              checked={form.isAuthenticDeposit}
              onChange={handleChange}
              className="h-3 w-3"
            /> Authentic Deposit
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              name="selectedTwelveWeekGoal"
              checked={!!form.selectedTwelveWeekGoal}
              onChange={handleChange}
              className="h-3 w-3"
            />
            <select
              name="selectedTwelveWeekGoal"
              value={form.selectedTwelveWeekGoal}
              onChange={handleChange}
              className="text-xs border-none bg-transparent focus:outline-none"
              disabled={!form.selectedTwelveWeekGoal && twelveWeekGoals.length === 0}
            >
              <option value="">12-Week Goal</option>
              {twelveWeekGoals.map(goal => (
                <option key={goal.id} value={goal.id}>{goal.title}</option>
              ))}
            </select>
          </label>
        </div>
        {/* Date and time */}
        <div className="flex gap-2">
          <input
            type="date"
            name="dueDate"
            value={form.dueDate}
            onChange={handleChange}
            className="border rounded p-2 text-xs"
          />
          <input
            type="time"
            name="startTime"
            value={form.startTime}
            onChange={handleChange}
            className="border rounded p-2 text-xs"
          />
          <input
            type="time"
            name="endTime"
            value={form.endTime}
            onChange={handleChange}
            className="border rounded p-2 text-xs"
          />
        </div>
        {/* Roles */}
        <div>
          <h3 className="text-xs font-medium mb-2">Roles</h3>
          <div className="grid grid-cols-2 gap-1 border border-gray-200 p-2 rounded-md">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={form.selectedRoleIds.includes(role.id)}
                  onChange={() => toggleArrayField(role.id, "selectedRoleIds")}
                  className="h-3 w-3"
                />
                <span>{role.label}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Domains */}
        <div>
          <h3 className="text-xs font-medium mb-2">Domains</h3>
          <div className="grid grid-cols-2 gap-1 border border-gray-200 p-2 rounded-md">
            {domains.map((domain) => (
              <label key={domain.id} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={form.selectedDomainIds.includes(domain.id)}
                  onChange={() => toggleArrayField(domain.id, "selectedDomainIds")}
                  className="h-3 w-3"
                />
                <span>{domain.name}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Notes */}
        <div>
          <label className="block text-xs font-medium mb-1">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs min-h-[60px]"
            placeholder="Add any additional notes here..."
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Updating..." : "Update"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTask;
