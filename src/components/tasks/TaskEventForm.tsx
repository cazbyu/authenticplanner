import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

// ----- TYPES -----
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
  authenticDeposit?: boolean;
  twelveWeekGoalChecked?: boolean;
  twelveWeekGoalId?: string;
  schedulingType?: "task" | "event";
}

interface Role { id: string; label: string; }
interface Domain { id: string; name: string; }
interface KeyRelationship { id: string; name: string; role_id: string; }
interface TwelveWeekGoal { id: string; title: string; }

const defaultForm: FormData = {
  title: "",
  dueDate: new Date().toISOString().split("T")[0],
  startTime: "09:00",
  endTime: "10:00",
  isAllDay: false,
  selectedRoleIds: [],
  selectedDomainIds: [],
  selectedKeyRelationshipIds: [],
  notes: "",
  urgent: false,
  important: false,
  authenticDeposit: false,
  twelveWeekGoalChecked: false,
  twelveWeekGoalId: "",
  schedulingType: "task",
};

const TaskEventForm: React.FC<TaskEventFormProps> = ({
  mode,
  initialData,
  onSubmitSuccess,
  onClose,
}) => {
  // ---- STATE ----
  const [form, setForm] = useState<FormData>({
    ...defaultForm,
    ...initialData,
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);
  const [twelveWeekGoals, setTwelveWeekGoals] = useState<TwelveWeekGoal[]>([]);
  const [loading, setLoading] = useState(false);

  // ----- FETCH OPTIONS -----
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Only active roles for user!
      const { data: roleData } = await supabase
        .from("0007-ap-roles")
        .select("id,label")
        .eq("user_id", user.id)
        .eq("is_active", true);

      const { data: domainData } = await supabase
        .from("0007-ap-domains")
        .select("id,name");

      const { data: relationshipData } = await supabase
        .from("0007-ap-key_relationships")
        .select("id,name,role_id")
        .eq("user_id", user.id);

      const { data: goalData } = await supabase
        .from("0007-ap-goals_12wk_main")
        .select("id,title")
        .eq("user_id", user.id)
        .eq("status", "active");

      setRoles(roleData || []);
      setDomains(domainData || []);
      setKeyRelationships(relationshipData || []);
      setTwelveWeekGoals(goalData || []);
    })();
  }, []);

  // ----- FORM CHANGE HANDLERS -----
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleMultiSelect = (field: keyof FormData, id: string) => {
    setForm((prev) => {
      const arr = prev[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(id)
          ? arr.filter((v) => v !== id)
          : [...arr, id],
      };
    });
  };

  // ----- SUBMIT -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Task/event logic
      let record: any = {
        user_id: user.id,
        title: form.title,
        notes: form.notes || null,
        is_urgent: !!form.urgent,
        is_important: !!form.important,
        is_authentic_deposit: !!form.authenticDeposit,
        is_twelve_week_goal: !!form.twelveWeekGoalChecked,
        type: form.schedulingType || "task",
      };

      // Date/time logic
      if (form.schedulingType === "event") {
        // Event logic
        const startDate = new Date(form.dueDate);
        const [sh, sm] = form.startTime.split(":").map(Number);
        startDate.setHours(sh, sm, 0, 0);
        let endDate = new Date(form.dueDate);
        let end_time = null;
        if (!form.isAllDay && form.endTime) {
          const [eh, em] = form.endTime.split(":").map(Number);
          endDate.setHours(eh, em, 0, 0);
          end_time = endDate.toISOString();
        }
        record = {
          ...record,
          start_time: form.isAllDay ? new Date(form.dueDate).toISOString() : startDate.toISOString(),
          end_time: form.isAllDay ? null : end_time,
          is_all_day: form.isAllDay,
          due_date: null,
        };
      } else {
        // Task logic
        record = {
          ...record,
          due_date: form.dueDate,
          start_time: null,
          end_time: null,
          is_all_day: false,
        };
      }

      let taskId = form.id;

      // CREATE or UPDATE
      if (mode === "create") {
        const { data, error } = await supabase
          .from("0007-ap-tasks")
          .insert([record])
          .select()
          .single();
        if (error) throw error;
        taskId = data.id;
      } else if (mode === "edit" && form.id) {
        const { error } = await supabase
          .from("0007-ap-tasks")
          .update(record)
          .eq("id", form.id);
        if (error) throw error;
      }

      // --- Pivot tables (roles, domains, relationships, 12-week goals) ---
      // Roles
      await supabase.from("0007-ap-task_roles").delete().eq("task_id", taskId);
      if (form.selectedRoleIds.length > 0) {
        await supabase.from("0007-ap-task_roles").insert(
          form.selectedRoleIds.map((roleId) => ({
            task_id: taskId,
            role_id: roleId,
          }))
        );
      }
      // Domains
      await supabase.from("0007-ap-task_domains").delete().eq("task_id", taskId);
      if (form.selectedDomainIds.length > 0) {
        await supabase.from("0007-ap-task_domains").insert(
          form.selectedDomainIds.map((domainId) => ({
            task_id: taskId,
            domain_id: domainId,
          }))
        );
      }
      // Key Relationships
      await supabase.from("0007-ap-task_key_relationships").delete().eq("task_id", taskId);
      if (form.selectedKeyRelationshipIds.length > 0) {
        await supabase.from("0007-ap-task_key_relationships").insert(
          form.selectedKeyRelationshipIds.map((krId) => ({
            task_id: taskId,
            key_relationship_id: krId,
          }))
        );
      }
      // 12-week goal link
      await supabase.from("0007-ap-goal_tasks").delete().eq("task_id", taskId);
      if (form.twelveWeekGoalChecked && form.twelveWeekGoalId) {
        await supabase.from("0007-ap-goal_tasks").insert({
          goal_id: form.twelveWeekGoalId,
          task_id: taskId,
        });
      }

      onSubmitSuccess();
      onClose();
    } catch (err) {
      alert("Error saving: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // ----- RENDER -----
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-100 rounded-t-lg">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "edit" ? "Edit" : "Create"}{" "}
            {form.schedulingType === "event" ? "Event" : "Task"}
          </h2>
          {/* Task/Event Selector Tabs */}
<div className="flex gap-2 mb-4">
  {["event", "task"].map(type => (
    <button
      key={type}
      type="button"
      onClick={() => setForm(f => ({ ...f, schedulingType: type as "event" | "task" }))}
      className={`px-3 py-1.5 rounded-full font-medium text-sm transition 
        ${form.schedulingType === type 
          ? "bg-blue-600 text-white shadow" 
          : "bg-gray-100 text-gray-700 hover:bg-blue-100"}`}
    >
      {type === "event" ? "Event" : "Task"}
    </button>
  ))}
</div>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            placeholder={`Enter ${form.schedulingType} title...`}
          />
          {/* Flags */}
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" name="urgent" checked={!!form.urgent} onChange={handleChange} className="h-4 w-4" />
              Urgent
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" name="important" checked={!!form.important} onChange={handleChange} className="h-4 w-4" />
              Important
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" name="authenticDeposit" checked={!!form.authenticDeposit} onChange={handleChange} className="h-4 w-4" />
              Authentic Deposit
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" name="twelveWeekGoalChecked" checked={!!form.twelveWeekGoalChecked} onChange={handleChange} className="h-4 w-4" />
              12-Week Goal
            </label>
          </div>
          {/* 12-Week Goal selection */}
          {form.twelveWeekGoalChecked && (
            <div>
              <label className="block text-sm mb-1">Choose 12-Week Goal</label>
              <select
                name="twelveWeekGoalId"
                value={form.twelveWeekGoalId || ""}
                onChange={handleChange}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="">Select Goal...</option>
                {twelveWeekGoals.map(goal => (
                  <option key={goal.id} value={goal.id}>{goal.title}</option>
                ))}
              </select>
            </div>
          )}
          {/* Date, Time, All Day */}
          <div className="flex items-center gap-2 mb-2">
            <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} className="border rounded px-2 py-1" />
            {form.schedulingType === "event" && (
              <>
                <input type="time" name="startTime" value={form.startTime} onChange={handleChange} disabled={form.isAllDay} className="border rounded px-2 py-1" />
                <input type="time" name="endTime" value={form.endTime} onChange={handleChange} disabled={form.isAllDay} className="border rounded px-2 py-1" />
              </>
            )}
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="isAllDay" checked={form.isAllDay} onChange={handleChange} className="h-4 w-4" />
              All Day
            </label>
          </div>
          {/* Roles */}
          <div>
            <label className="block text-sm mb-1">Roles</label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-2">
              {roles.map(role => (
                <label key={role.id} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={form.selectedRoleIds.includes(role.id)} onChange={() => handleMultiSelect("selectedRoleIds", role.id)} className="h-4 w-4" />
                  <span className="text-xs">{role.label}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Domains */}
          <div>
            <label className="block text-sm mb-1">Domains</label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-2">
              {domains.map(domain => (
                <label key={domain.id} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={form.selectedDomainIds.includes(domain.id)} onChange={() => handleMultiSelect("selectedDomainIds", domain.id)} className="h-4 w-4" />
                  <span className="text-xs">{domain.name}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Key Relationships */}
          {form.selectedRoleIds.length > 0 && (
            <div>
              <label className="block text-sm mb-1">Key Relationships</label>
              <div className="grid grid-cols-2 gap-2 border rounded-md p-2">
                {keyRelationships.filter(kr => form.selectedRoleIds.includes(kr.role_id)).map(kr => (
                  <label key={kr.id} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={form.selectedKeyRelationshipIds.includes(kr.id)} onChange={() => handleMultiSelect("selectedKeyRelationshipIds", kr.id)} className="h-4 w-4" />
                    <span className="text-xs">{kr.name}</span>
                  </label>
                ))}
                {keyRelationships.filter(kr => form.selectedRoleIds.includes(kr.role_id)).length === 0 && (
                  <div className="text-gray-400 text-xs italic px-2 py-2">
                    No Key Relationships selected yet.
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Notes */}
          <div>
            <label className="block text-sm mb-1">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border rounded px-2 py-1" />
          </div>
          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? (mode === "edit" ? "Updating..." : "Creating...") : (mode === "edit" ? "Update" : "Create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskEventForm;
