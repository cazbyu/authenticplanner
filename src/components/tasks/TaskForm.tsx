import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient"; // Adjust as needed

// ------------- TYPES -------------
interface TaskEventFormProps {
  mode: "create" | "edit";
  initialData?: Partial<FormData>;
  onSubmitSuccess: () => void;
  onClose: () => void;
}

interface FormData {
  id?: string;
  title: string;
  dueDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  selectedRoleIds: string[];
  selectedDomainIds: string[];
  selectedKeyRelationshipIds: string[];
  notes: string;
  urgent?: boolean;
  important?: boolean;
  isAuthenticDeposit?: boolean;
  isTwelveWeekGoal?: boolean;
  selectedGoalId?: string;
  schedulingType?: "unscheduled" | "scheduled";
}

// ------------- DEFAULT STATE -------------
const defaultForm: FormData = {
  title: "",
  dueDate: "",
  startTime: "",
  endTime: "",
  isAllDay: false,
  selectedRoleIds: [],
  selectedDomainIds: [],
  selectedKeyRelationshipIds: [],
  notes: "",
  urgent: false,
  important: false,
  isAuthenticDeposit: false,
  isTwelveWeekGoal: false,
  selectedGoalId: "",
  schedulingType: "unscheduled",
};

const TaskEventForm: React.FC<TaskEventFormProps> = ({
  mode,
  initialData,
  onSubmitSuccess,
  onClose,
}) => {
  // ----- STATE -----
  const [form, setForm] = useState<FormData>({ ...defaultForm, ...initialData });
  const [loading, setLoading] = useState(false);

  // Example: Options could be fetched or passed as props
  const [roles, setRoles] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);

  // ----- FETCH OPTIONS ON MOUNT -----
  useEffect(() => {
    async function fetchOptions() {
      const [roleRes, domainRes, goalRes] = await Promise.all([
        supabase.from("0007-ap-roles").select("id,label"),
        supabase.from("0007-ap-domains").select("id,label"),
        supabase.from("0007-ap-goals").select("id,title"),
      ]);
      setRoles(roleRes.data || []);
      setDomains(domainRes.data || []);
      setGoals(goalRes.data || []);
    }
    fetchOptions();
  }, []);

  // ----- INPUT HANDLERS -----
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMultiSelect = (field: keyof FormData, value: string) => {
    setForm((prev) => {
      const arr = prev[field] as string[];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter((v) => v !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  };

  // ----- SUBMIT -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Compose start/end times
      let start_time = null,
        end_time = null;
      if (form.schedulingType === "scheduled" && !form.isAllDay) {
        start_time = new Date(`${form.dueDate}T${form.startTime}:00`).toISOString();
        end_time = form.endTime
          ? new Date(`${form.dueDate}T${form.endTime}:00`).toISOString()
          : null;
      } else if (form.schedulingType === "scheduled" && form.isAllDay) {
        start_time = new Date(form.dueDate).toISOString();
        end_time = null;
      }

      // 2. Prepare payload for main task table
      const payload: any = {
        title: form.title,
        notes: form.notes,
        due_date: form.schedulingType === "unscheduled" ? form.dueDate : null,
        start_time,
        end_time,
        is_all_day: form.isAllDay,
        is_urgent: !!form.urgent,
        is_important: !!form.important,
        is_authentic_deposit: !!form.isAuthenticDeposit,
        is_twelve_week_goal: !!form.isTwelveWeekGoal,
        updated_at: new Date().toISOString(),
      };

      let taskId = form.id;

      // 3. INSERT or UPDATE main task
      if (mode === "create") {
        const { data, error } = await supabase
          .from("0007-ap-tasks")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        taskId = data.id;
      } else if (mode === "edit" && form.id) {
        const { error } = await supabase
          .from("0007-ap-tasks")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      }

      // 4. PIVOT TABLES: Remove all previous pivots, then insert current selections

      // ROLES
      await supabase.from("0007-ap-task_roles").delete().eq("task_id", taskId);
      if (form.selectedRoleIds.length > 0) {
        await Promise.all(
          form.selectedRoleIds.map((roleId) =>
            supabase.from("0007-ap-task_roles").insert({ task_id: taskId, role_id: roleId })
          )
        );
      }

      // DOMAINS
      await supabase.from("0007-ap-task_domains").delete().eq("task_id", taskId);
      if (form.selectedDomainIds.length > 0) {
        await Promise.all(
          form.selectedDomainIds.map((domainId) =>
            supabase.from("0007-ap-task_domains").insert({ task_id: taskId, domain_id: domainId })
          )
        );
      }

      // KEY RELATIONSHIPS (implement your join table if not already)
      // await supabase.from("0007-ap-task_key_relationships").delete().eq("task_id", taskId);
      // if (form.selectedKeyRelationshipIds.length > 0) {
      //   await Promise.all(
      //     form.selectedKeyRelationshipIds.map((relId) =>
      //       supabase.from("0007-ap-task_key_relationships").insert({ task_id: taskId, key_relationship_id: relId })
      //     )
      //   );
      // }

      // 12 WEEK GOAL LINK
      await supabase.from("0007-ap-goal_tasks").delete().eq("task_id", taskId);
      if (form.isTwelveWeekGoal && form.selectedGoalId) {
        await supabase
          .from("0007-ap-goal_tasks")
          .insert({ goal_id: form.selectedGoalId, task_id: taskId });
      }

      onSubmitSuccess();
      onClose();
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // ----- RENDER -----
  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-2">
        {mode === "edit" ? "Edit Task/Event" : "New Task/Event"}
      </h2>

      <div className="mb-2">
        <label>Title *</label>
        <input
          className="border rounded w-full p-2"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
        />
      </div>

      {/* Scheduling section */}
      <div className="mb-2">
        <label>
          <input
            type="radio"
            name="schedulingType"
            value="unscheduled"
            checked={form.schedulingType === "unscheduled"}
            onChange={handleChange}
          />{" "}
          Unscheduled Task
        </label>
        <label className="ml-4">
          <input
            type="radio"
            name="schedulingType"
            value="scheduled"
            checked={form.schedulingType === "scheduled"}
            onChange={handleChange}
          />{" "}
          Scheduled (Event)
        </label>
      </div>
      <div className="mb-2 flex space-x-2">
        <input
          type="date"
          name="dueDate"
          value={form.dueDate}
          onChange={handleChange}
          required
        />
        {form.schedulingType === "scheduled" && (
          <>
            <input
              type="time"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              disabled={form.isAllDay}
              required={!form.isAllDay}
            />
            <input
              type="time"
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
              disabled={form.isAllDay}
            />
            <label className="ml-2">
              <input
                type="checkbox"
                name="isAllDay"
                checked={form.isAllDay}
                onChange={handleChange}
              />{" "}
              All Day
            </label>
          </>
        )}
      </div>

      {/* Flags */}
      <div className="mb-2 flex flex-wrap gap-4">
        <label>
          <input
            type="checkbox"
            name="urgent"
            checked={!!form.urgent}
            onChange={handleChange}
          />{" "}
          Urgent
        </label>
        <label>
          <input
            type="checkbox"
            name="important"
            checked={!!form.important}
            onChange={handleChange}
          />{" "}
          Important
        </label>
        <label>
          <input
            type="checkbox"
            name="isAuthenticDeposit"
            checked={!!form.isAuthenticDeposit}
            onChange={handleChange}
          />{" "}
          Authentic Deposit
        </label>
        <label>
          <input
            type="checkbox"
            name="isTwelveWeekGoal"
            checked={!!form.isTwelveWeekGoal}
            onChange={handleChange}
          />{" "}
          12-Week Goal
        </label>
        {form.isTwelveWeekGoal && (
          <select
            name="selectedGoalId"
            value={form.selectedGoalId}
            onChange={handleChange}
            className="border ml-2"
          >
            <option value="">Select Goal</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Roles Section */}
<div className="mb-4">
  <label className="font-semibold block mb-1">Roles</label>
  <div className="border rounded px-4 py-2">
    <div className="grid grid-cols-2 gap-y-1 gap-x-4">
      {roles.map((role) => (
        <label key={role.id} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={form.selectedRoleIds.includes(role.id)}
            onChange={() => handleMultiSelect("selectedRoleIds", role.id)}
          />
          <span>{role.label}</span>
        </label>
      ))}
    </div>
  </div>
</div>


{/* --- DOMAINS --- */}
<div className="mb-4">
  <label className="font-semibold block mb-1">Domains</label>
  <div className="grid grid-cols-3 gap-2">
    {domains.map((domain) => (
      <label key={domain.id} className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={form.selectedDomainIds.includes(domain.id)}
          onChange={() => handleMultiSelect("selectedDomainIds", domain.id)}
        />
        <span>{domain.label}</span>
      </label>
    ))}
  </div>
</div>


      {/* Notes */}
      <div className="mb-2">
        <label>Notes</label>
        <textarea
          className="border rounded w-full p-2"
          name="notes"
          value={form.notes}
          onChange={handleChange}
        />
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border rounded bg-gray-200"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border rounded bg-blue-600 text-white"
          disabled={loading}
        >
          {loading ? "Saving..." : mode === "edit" ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
};

export default TaskEventForm;
