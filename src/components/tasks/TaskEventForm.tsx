import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { toast } from "sonner";
import "react-datepicker/dist/react-datepicker.css";

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
  schedulingType?: "task" | "event" | "depositIdea";
}

interface Role { id: string; label: string; }
interface Domain { id: string; name: string; }
interface KeyRelationship { id: string; name: string; role_id: string; }
interface TwelveWeekGoal { id: string; title: string; }

const defaultForm: FormData = {
  title: "",
  dueDate: format(new Date(), "yyyy-MM-dd"),
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
  const [showRoleError, setShowRoleError] = useState(false);

// Generates time options for 24 hours in 15-min increments
const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      const label = `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
      options.push({ value, label });
    }
  }
  return options;
};
const timeOptions = generateTimeOptions();

// Builds end time options, showing duration in parentheses
function getEndTimeOptions(startTime: string) {
  if (!startTime) return [];
  const startIdx = timeOptions.findIndex(opt => opt.value === startTime);
  return timeOptions.slice(startIdx + 1).map(opt => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = opt.value.split(':').map(Number);
    const minutes = (eh * 60 + em) - (sh * 60 + sm);
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let dur = '';
    if (hrs > 0) dur += `${hrs} hr${hrs > 1 ? 's' : ''}`;
    if (mins > 0) dur += `${hrs > 0 ? ' ' : ''}${mins} min${mins > 1 ? 's' : ''}`;
    if (!dur) dur = '0 min';
    return {
      value: opt.value,
      label: `${opt.label} (${dur})`,
    };
  });
}

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
        .from("0007-ap-key-relationships")
        .select("id,name,role_id")
        .eq("user_id", user.id);

      const { data: goalData } = await supabase
        .from("0007-ap-goals-12wk-main")
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

  // Hide role error when roles are selected
  useEffect(() => {
    if (form.selectedRoleIds.length > 0) {
      setShowRoleError(false);
    }
  }, [form.selectedRoleIds]);

  // ----- SUBMIT -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Validate deposit idea requirements
      if (form.schedulingType === "depositIdea") {
        if (form.selectedRoleIds.length === 0) {
          setShowRoleError(true);
          setLoading(false);
          return;
        }
        
        // Handle deposit idea creation
        const { data: depositIdea, error: depositError } = await supabase
          .from('0007-ap-deposit-ideas')
          .insert([{
            user_id: user.id,
            title: form.title.trim(),
            notes: form.notes.trim() || null,
            key_relationship_id: form.selectedKeyRelationshipIds[0] || null,
            is_active: true
          }])
          .select()
          .single();

        if (depositError || !depositIdea) {
          throw new Error('Failed to create deposit idea');
        }

        // Create role relationships
        if (form.selectedRoleIds.length > 0) {
          const roleInserts = form.selectedRoleIds.map(roleId => ({
            deposit_idea_id: depositIdea.id, 
            role_id: roleId
          }));
          await supabase.from('0007-ap-deposit-idea-roles').insert(roleInserts);
        }

        // Create domain relationships
        if (form.selectedDomainIds.length > 0) {
          const domainInserts = form.selectedDomainIds.map(domainId => ({
            deposit_idea_id: depositIdea.id, 
            domain_id: domainId
          }));
          await supabase.from('0007-ap-deposit-idea-domains').insert(domainInserts);
        }
        
// Create key relationship links
if (form.selectedKeyRelationshipIds.length > 0) {
  const krInserts = form.selectedKeyRelationshipIds.map(key_relationship_id => ({
    deposit_idea_id: depositIdea.id,
    key_relationship_id
  }));
  await supabase.from('0007-ap-deposit-idea-key-relationships').insert(krInserts);
}
        toast.success('Deposit idea created successfully!');
        onSubmitSuccess();
        onClose();
        return;
      }

      // Handle task/event creation (existing logic)
      let record: any = {
        user_id: user.id,
        title: form.title,
        notes: form.notes || null,
        is_urgent: !!form.urgent,
        is_important: !!form.important,
        is_authentic_deposit: form.isFromDepositIdea ? true : !!form.authenticDeposit,
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
          end_time = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");
        }
        record = {
          ...record,
          start_time: form.isAllDay
  ? form.dueDate + "T00:00:00"
  : format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
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
      await supabase.from("0007-ap-task-roles").delete().eq("task_id", taskId);
      if (form.selectedRoleIds.length > 0) {
        await supabase.from("0007-ap-task-roles").insert(
          form.selectedRoleIds.map((roleId) => ({
            task_id: taskId,
            role_id: roleId,
          }))
        );
      }
      // Domains
      await supabase.from("0007-ap-task-domains").delete().eq("task_id", taskId);
      if (form.selectedDomainIds.length > 0) {
        await supabase.from("0007-ap-task-domains").insert(
          form.selectedDomainIds.map((domainId) => ({
            task_id: taskId,
            domain_id: domainId,
          }))
        );
      }
      // Key Relationships
      await supabase.from("0007-ap-task-key-relationships").delete().eq("task_id", taskId);
      if (form.selectedKeyRelationshipIds.length > 0) {
        await supabase.from("0007-ap-task-key-relationships").insert(
          form.selectedKeyRelationshipIds.map((krId) => ({
            task_id: taskId,
            key_relationship_id: krId,
          }))
        );
      }
      // 12-week goal link
      await supabase.from("0007-ap-goal-tasks").delete().eq("task_id", taskId);
      if (form.twelveWeekGoalChecked && form.twelveWeekGoalId) {
        await supabase.from("0007-ap-goal-tasks").insert({
          goal_id: form.twelveWeekGoalId,
          task_id: taskId,
        });
      }

      onSubmitSuccess();
      onClose();
    } catch (err) {
      toast.error("Error saving: " + (err instanceof Error ? err.message : String(err)));
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
            {form.schedulingType === "event" ? "Event" : form.schedulingType === "depositIdea" ? "Deposit Idea" : "Task"}
          </h2>
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
            placeholder={
              form.schedulingType === "event" ? "Enter event title..." : 
              form.schedulingType === "depositIdea" ? "Enter deposit idea title..." : 
              "Enter task title..."
            }
            className="w-full px-3 py-2 text-base border border-gray-300 rounded-md mt-2 mb-0"
          />

          {/* Toggle Tabs: Left Justified Below Title */}
          <div className="flex justify-start items-center mb-1">
            {["event", "task", "depositIdea"].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setForm(f => ({ ...f, schedulingType: type as "event" | "task" | "depositIdea" }))}
                className={`
                  px-2 py-0.5 rounded-full mx-1 text-xs font-medium transition
                  ${form.schedulingType === type
                    ? "bg-blue-600 text-white shadow"
                    : "bg-gray-100 text-gray-700 hover:bg-blue-200"}
                `}
                style={{ minWidth: "35px" }}
              >
                {type === "event" ? "Event" : type === "depositIdea" ? "Deposit Idea" : "Task"}
              </button>
            ))}
          </div>

          {/* Notes - Show immediately after title for Deposit Ideas */}
          {form.schedulingType === "depositIdea" && (
            <div>
              <label className="block text-sm mb-1">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border rounded px-2 py-1" placeholder="Describe your authentic deposit idea..." />
            </div>
          )}

          {/* Flags - Hide for Deposit Ideas */}
          {form.schedulingType !== "depositIdea" && (
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
          )}

          {/* 12-Week Goal selection - Hide for Deposit Ideas */}
          {form.schedulingType !== "depositIdea" && form.twelveWeekGoalChecked && (
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

          {/* Date, All Day, and Time fields - Hide for Deposit Ideas */}
          {form.schedulingType !== "depositIdea" && (
            <div
              className={
                form.schedulingType === "event" && !form.isAllDay
                  ? "grid grid-cols-3 gap-x-4 mb-2"
                  : !form.isAllDay
                  ? "grid grid-cols-2 gap-x-4 mb-2"
                  : "grid grid-cols-1 mb-2"
              }
            >
              {/* Date + All Day (always visible) */}
              <div>
                <label className="block text-xs mb-1">Date</label>
                <DatePicker
          selected={form.dueDate ? new Date(form.dueDate + "T00:00:00") : null}
          onChange={date =>
            setForm(f => ({
              ...f,
              dueDate: date ? format(date, "yyyy-MM-dd") : "",
            }))
          }
          dateFormat="MMM dd, yyyy"
          className="border rounded px-2 py-1 text-xs w-full"
          placeholderText="Select date"
          calendarClassName="text-xs"
          popperClassName="small-datepicker-popup"
          formatWeekDay={name => name.charAt(0)}
        />
                <div className="mt-1">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      name="isAllDay"
                      checked={form.isAllDay}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    All Day
                  </label>
                </div>
              </div>
              {/* Start Time (shown if not All Day) */}
        {!form.isAllDay && (
          <div>
            <label className="block text-xs mb-1">
              {form.schedulingType === "task" ? "Complete by" : "Start Time"}
            </label>
            <select
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              className="border rounded px-2 py-1 text-xs w-full"
            >
              <option value="">--</option>
              {timeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
        {/* End Time (shown if Event and not All Day) */}
        {form.schedulingType === "event" && !form.isAllDay && (
          <div>
            <label className="block text-xs mb-1">End Time</label>
            <select
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
              className="border rounded px-2 py-1 text-xs w-full"
              disabled={!form.startTime}
            >
              <option value="">--</option>
              {getEndTimeOptions(form.startTime).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
            </div>
          )}

          {/* Roles */}
          <div>
            <label className="block text-sm mb-1">
              Roles {form.schedulingType === "depositIdea" && <span className="text-red-500">*</span>}
            </label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-2">
              {roles.map(role => (
                <label key={role.id} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={form.selectedRoleIds.includes(role.id)} onChange={() => handleMultiSelect("selectedRoleIds", role.id)} className="h-4 w-4" />
                  <span className="text-xs">{role.label}</span>
                </label>
              ))}
            </div>
            {form.schedulingType === "depositIdea" && form.selectedRoleIds.length === 0 && (
              <p className="text-xs text-red-600 mt-1">At least one role must be selected for deposit ideas</p>
            )}
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
              <label className="block text-sm mb-1">Choose Key Relationship</label>
              <div className="grid grid-cols-2 gap-2 border border-gray-200 p-2 rounded-md">
                {keyRelationships.filter(kr => form.selectedRoleIds.includes(kr.role_id)).map(kr => (
                  <label key={kr.id} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.selectedKeyRelationshipIds.includes(kr.id)}
                      onChange={() => handleMultiSelect("selectedKeyRelationshipIds", kr.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-xs">{kr.name}</span>
                  </label>
                ))}
                {keyRelationships.filter(kr => form.selectedRoleIds.includes(kr.role_id)).length === 0 && (
                  <div className="text-gray-400 text-xs italic px-2 py-2">
                    No Key Relationships for selected roles yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes - Show at bottom for Tasks/Events */}
          {form.schedulingType !== "depositIdea" && (
            <div>
              <label className="block text-sm mb-1">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border rounded px-2 py-1" />
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? (mode === "edit" ? "Updating..." : "Creating...") : (mode === "edit" ? "Update" : "Create")}
            </button>
          </div>
        </form>
      </div>

      {/* Role Error Popup */}
      {showRoleError && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Role Required</h3>
            <p className="text-sm text-gray-600 mb-4">
              A Role must be selected for Deposit Ideas
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowRoleError(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskEventForm;