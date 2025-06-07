import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "sonner";

interface Role {
  id: string;
  label: string;
}

interface Domain {
  id: string;
  name: string;
}

interface TaskFormValues {
  title: string;
  isAuthenticDeposit: boolean;
  isTwelveWeekGoal: boolean;
  isUrgent: boolean;
  isImportant: boolean;
  dueDate: string;
  startTime: string;
  endTime: string;
  notes: string;
  selectedRoleIds: string[];
  selectedDomainIds: string[];
}

interface TaskFormProps {
  onClose?: () => void;
  availableRoles?: Role[];
  availableDomains?: Domain[];
  onTaskCreated?: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onClose, availableRoles, availableDomains, onTaskCreated }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<TaskFormValues>({
    title: "",
    isAuthenticDeposit: false,
    isTwelveWeekGoal: false,
    isUrgent: false,
    isImportant: false,
    dueDate: "",
    startTime: "",
    endTime: "",
    notes: "",
    selectedRoleIds: [],
    selectedDomainIds: [],
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchLists = async () => {
      setLoading(true);

      try {
        // Use provided roles/domains if available, otherwise fetch from database
        if (availableRoles && availableDomains) {
          setRoles(availableRoles);
          setDomains(availableDomains);
          setLoading(false);
          return;
        }

        const [roleRes, domainRes] = await Promise.all([
          supabase
            .from("0007-ap-roles")
            .select("id, label")
            .eq("user_id", userId)
            .eq("is_active", true),
          supabase.from("0007-ap-domains").select("id, name"),
        ]);

        if (roleRes.error || domainRes.error) {
          setError("Failed to load roles/domains.");
        } else {
          setRoles(roleRes.data || []);
          setDomains(domainRes.data || []);
        }
      } catch (err) {
        console.error('Error fetching roles/domains:', err);
        setError("Failed to load roles/domains.");
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, [userId, availableRoles, availableDomains]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleArrayField = (
    id: string,
    field: "selectedRoleIds" | "selectedDomainIds"
  ) => {
    setForm((prev) => {
      const exists = prev[field].includes(id);
      const updated = exists
        ? prev[field].filter((rid) => rid !== id)
        : [...prev[field], id];
      return { ...prev, [field]: updated };
    });
  };

  // Helper function to convert local datetime to UTC ISO string
  const convertToUTC = (dateStr: string, timeStr: string): string | null => {
    if (!dateStr || !timeStr) return null;
    
    // Create a local date object from the date and time inputs
    const localDateTime = new Date(`${dateStr}T${timeStr}:00`);
    
    // Convert to UTC ISO string
    return localDateTime.toISOString();
  };

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
      // Convert local times to UTC for storage
      const startTimeUTC = convertToUTC(form.dueDate, form.startTime);
      const endTimeUTC = form.endTime ? convertToUTC(form.dueDate, form.endTime) : null;

      // Insert task with .select() to get the inserted row back
      const { data: taskRow, error: taskErr } = await supabase
        .from("0007-ap-tasks")
        .insert([
          {
            user_id: userId,
            title: form.title.trim(),
            is_authentic_deposit: form.isAuthenticDeposit,
            is_twelve_week_goal: form.isTwelveWeekGoal,
            is_urgent: form.isUrgent,
            is_important: form.isImportant,
            due_date: form.dueDate || null,
            start_time: startTimeUTC,
            end_time: endTimeUTC,
            notes: form.notes.trim() || null,
            percent_complete: 0,
            status: 'pending'
          },
        ])
        .select() // This ensures we get the inserted row back
        .single();

      if (taskErr) {
        console.error('Task creation error:', taskErr);
        setError(`Failed to create task: ${taskErr.message}`);
        return;
      }

      if (!taskRow) {
        setError("Failed to create task: No data returned");
        return;
      }

      // Create role and domain relationships
      const linkPromises: Promise<any>[] = [];

      if (form.selectedRoleIds.length) {
        const roleInserts = form.selectedRoleIds.map((rid) => ({
          task_id: taskRow.id,
          role_id: rid,
        }));
        
        linkPromises.push(
          supabase
            .from("0007-ap-task_roles")
            .insert(roleInserts)
            .select()
        );
      }

      if (form.selectedDomainIds.length) {
        const domainInserts = form.selectedDomainIds.map((did) => ({
          task_id: taskRow.id,
          domain_id: did,
        }));
        
        linkPromises.push(
          supabase
            .from("0007-ap-task_domains")
            .insert(domainInserts)
            .select()
        );
      }

      // Wait for all relationship inserts to complete
      const results = await Promise.all(linkPromises);
      
      // Check if any relationship inserts failed
      const hasErrors = results.some(result => result.error);
      if (hasErrors) {
        console.warn('Some relationship inserts failed, but task was created');
      }

      // Reset form
      setForm({
        title: "",
        isAuthenticDeposit: false,
        isTwelveWeekGoal: false,
        isUrgent: false,
        isImportant: false,
        dueDate: "",
        startTime: "",
        endTime: "",
        notes: "",
        selectedRoleIds: [],
        selectedDomainIds: [],
      });

      toast.success("Task created successfully!");

      // Call the callback to refresh the calendar
      if (onTaskCreated) {
        onTaskCreated();
      } else if (onClose) {
        onClose();
      }

    } catch (err) {
      console.error('Unexpected error creating task:', err);
      setError("An unexpected error occurred while creating the task.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[85vh] overflow-y-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
            aria-label="Close form"
          >
            ✕
          </button>
        )}
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
            ["isAuthenticDeposit", "Authentic Deposit"],
            ["isTwelveWeekGoal", "12-Week Goal"],
            ["isUrgent", "Urgent"],
            ["isImportant", "Important"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={key as string}
                checked={(form as any)[key as string]}
                onChange={handleChange}
              />
              {label as string}
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
          <p className="text-xs text-gray-500 mt-1">
            Times will be converted to UTC for storage
          </p>
        </div>

        <div>
          <h3 className="font-medium mb-2">Roles</h3>
          <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.selectedRoleIds.includes(role.id)}
                  onChange={() => toggleArrayField(role.id, "selectedRoleIds")}
                />
                {role.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Domains</h3>
          <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
            {domains.map((domain) => (
              <label key={domain.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.selectedDomainIds.includes(domain.id)}
                  onChange={() => toggleArrayField(domain.id, "selectedDomainIds")}
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creating Task..." : "Create Task"}
        </button>
      </form>
    </div>
  );
};

export default TaskForm;