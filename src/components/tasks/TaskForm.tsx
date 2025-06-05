import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

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
}

const TaskForm: React.FC<TaskFormProps> = ({ onClose }) => {
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

      setLoading(false);
    };

    fetchLists();
  }, [userId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    // Create start_time timestamp if date and start time are provided
    const startTime = form.dueDate && form.startTime
      ? new Date(`${form.dueDate}T${form.startTime}:00Z`).toISOString()
      : null;

    // Only include end_time if provided
    const endTime = form.endTime || null;

    const { data: taskRow, error: taskErr } = await supabase
      .from("0007-ap-tasks")
      .insert(
        [
          {
            user_id: userId,
            title: form.title.trim(),
            is_authentic_deposit: form.isAuthenticDeposit,
            is_twelve_week_goal: form.isTwelveWeekGoal,
            is_urgent: form.isUrgent,
            is_important: form.isImportant,
            due_date: form.dueDate || null,
            start_time: startTime,
            end_time: endTime,
            notes: form.notes.trim() || null,
            percent_complete: 0,
          },
        ],
        { returning: "representation" }
      )
      .single();

    if (taskErr || !taskRow) {
      setError("Failed to create task.");
      setSubmitting(false);
      return;
    }

    const linkPromises: Promise<unknown>[] = [];

    if (form.selectedRoleIds.length) {
      linkPromises.push(
        supabase
          .from("0007-ap-task_roles")
          .insert(
            form.selectedRoleIds.map((rid) => ({
              task_id: taskRow.id,
              role_id: rid,
            }))
          )
      );
    }

    if (form.selectedDomainIds.length) {
      linkPromises.push(
        supabase
          .from("0007-ap-task_domains")
          .insert(
            form.selectedDomainIds.map((did) => ({
              task_id: taskRow.id,
              domain_id: did,
            }))
          )
      );
    }

    await Promise.all(linkPromises);

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
    setSubmitting(false);

    if (onClose) {
      onClose();
    }
  };

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[85vh] overflow-y-auto space-y-6">
      <div className="flex justify-end">
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
          <label className="block text-sm font-medium mb-1">Time (optional)</label>
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
          {submitting ? "Saving…" : "Save Task"}
        </button>
      </form>
    </div>
  );
};

export default TaskForm;