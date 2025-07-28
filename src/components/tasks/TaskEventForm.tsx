import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { toast } from "sonner";
import "react-datepicker/dist/react-datepicker.css";

// --- TYPE DEFINITIONS ---
interface TaskEventFormProps {
  mode: "create" | "edit";
  initialData?: Partial<FormData>;
  onSubmitSuccess: () => void;
  onClose: () => void;
}

interface FormData {
  id?: string;
  title: string;
  notes: string;
  schedulingType: "task" | "event" | "depositIdea";
  
  // Task/Event Specific
  dueDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  urgent: boolean;
  important: boolean;
  authenticDeposit: boolean;
  
  // Relational IDs
  selectedRoleIds: string[];
  selectedDomainIds: string[];
  selectedKeyRelationshipIds: string[];

  // 12 Week Goal Specific
  twelveWeekGoalChecked: boolean;
  twelveWeekGoalId?: string;
  weekNumber?: number;
  cycleStartDate?: string;

  // Deposit Idea Activation Specific
  isFromDepositIdea?: boolean;
  originalDepositIdeaId?: string;
}

interface DropdownData {
  roles: { id: string; label: string }[];
  domains: { id: string; name: string }[];
  keyRelationships: { id: string; name: string; role_id: string }[];
  twelveWeekGoals: { id: string; title: string }[];
}

// --- HELPER FUNCTIONS ---

// Combines a date and time string into a full UTC ISO string for Supabase
const toUTCString = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  try {
    const localDate = new Date(`${date}T${time}:00`);
    if (isNaN(localDate.getTime())) return null;
    return localDate.toISOString();
  } catch (e) {
    return null;
  }
};

// --- COMPONENT ---

const TaskEventForm: React.FC<TaskEventFormProps> = ({
  mode,
  initialData = {},
  onSubmitSuccess,
  onClose,
}) => {
  // --- STATE MANAGEMENT ---
  const [form, setForm] = useState<FormData>({
    title: "",
    notes: "",
    schedulingType: "task",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "10:00",
    isAllDay: false,
    urgent: false,
    important: false,
    authenticDeposit: false,
    selectedRoleIds: [],
    selectedDomainIds: [],
    selectedKeyRelationshipIds: [],
    twelveWeekGoalChecked: false,
    ...initialData,
  });
  
  const [dropdownData, setDropdownData] = useState<DropdownData>({
    roles: [],
    domains: [],
    keyRelationships: [],
    twelveWeekGoals: [],
  });
  
  const [loading, setLoading] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be logged in.");
          return;
        }

        const [rolesRes, domainsRes, relationshipsRes, goalsRes] = await Promise.all([
          supabase.from("0007-ap-roles").select("id, label").eq("user_id", user.id).eq("is_active", true),
          supabase.from("0007-ap-domains").select("id, name"),
          supabase.from("0007-ap-key-relationships").select("id, name, role_id").eq("user_id", user.id),
          supabase.from("0007-ap-goals-12wk").select("id, title").eq("user_id", user.id).eq("status", "active")
        ]);

        setDropdownData({
          roles: rolesRes.data || [],
          domains: domainsRes.data || [],
          keyRelationships: relationshipsRes.data || [],
          twelveWeekGoals: goalsRes.data || [],
        });

      } catch (error) {
        console.error("Error fetching form data:", error);
        toast.error("Failed to load necessary data.");
      }
    };
    fetchData();
  }, []);

  // --- MEMOIZED VALUES FOR PERFORMANCE ---
  const timeOptions = useMemo(() => {
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
  }, []);

  const filteredKeyRelationships = useMemo(() => {
    if (form.selectedRoleIds.length === 0) return [];
    return dropdownData.keyRelationships.filter(kr => form.selectedRoleIds.includes(kr.role_id));
  }, [form.selectedRoleIds, dropdownData.keyRelationships]);

  // --- FORM HANDLERS ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleMultiSelect = (field: 'selectedRoleIds' | 'selectedDomainIds' | 'selectedKeyRelationshipIds', id: string) => {
    setForm(prev => {
      const currentSelection = prev[field] as string[];
      const newSelection = currentSelection.includes(id)
        ? currentSelection.filter(itemId => itemId !== id)
        : [...currentSelection, id];
      return { ...prev, [field]: newSelection };
    });
  };

  // --- SUBMISSION LOGIC ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.schedulingType === 'depositIdea' && form.selectedRoleIds.length === 0) {
      toast.error("A Deposit Idea must be linked to at least one role.");
      return;
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated.");

      if (form.schedulingType === 'depositIdea') {
        await handleSaveDepositIdea(user.id);
      } else {
        await handleSaveTaskOrEvent(user.id);
      }

      toast.success(`${form.schedulingType.charAt(0).toUpperCase() + form.schedulingType.slice(1)} ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      onSubmitSuccess();
      onClose();

    } catch (error: any) {
      console.error("Error during form submission:", error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDepositIdea = async (userId: string) => {
    // 1. Prepare the main deposit idea record
    const depositIdeaRecord = {
      user_id: userId,
      title: form.title,
      notes: form.notes || null,
      is_active: true,
      key_relationship_id: form.selectedKeyRelationshipIds[0] || null, // Optional primary KR
    };

    // 2. Upsert (Create or Edit) the deposit idea
    const { data: savedIdea, error: ideaError } = await supabase
      .from('0007-ap-deposit-ideas')
      .upsert(mode === 'edit' && form.id ? { id: form.id, ...depositIdeaRecord } : depositIdeaRecord)
      .select()
      .single();
    
    if (ideaError || !savedIdea) throw new Error(ideaError?.message || "Failed to save deposit idea.");

    // 3. Handle junction tables (Roles, Domains, Key Relationships)
    // This function handles deleting old links and inserting new ones.
    const linkPromises = [
      updateJunctionTable('0007-ap-roles-deposit-ideas', 'deposit_idea_id', savedIdea.id, 'role_id', form.selectedRoleIds),
      updateJunctionTable('0007-ap-deposit-idea-domains', 'deposit_idea_id', savedIdea.id, 'domain_id', form.selectedDomainIds),
      updateJunctionTable('0007-ap-deposit-idea-key-relationships', 'deposit_idea_id', savedIdea.id, 'key_relationship_id', form.selectedKeyRelationshipIds),
    ];

    await Promise.all(linkPromises);
  };

  const handleSaveTaskOrEvent = async (userId: string) => {
    // 1. Prepare the main task/event record
    const taskRecord = {
      user_id: userId,
      title: form.title,
      notes: form.notes || null,
      due_date: form.dueDate,
      start_time: form.isAllDay ? null : toUTCString(form.dueDate, form.startTime),
      end_time: form.isAllDay || form.schedulingType === 'task' ? null : toUTCString(form.dueDate, form.endTime),
      is_all_day: form.isAllDay,
      is_urgent: form.urgent,
      is_important: form.important,
      is_authentic_deposit: form.authenticDeposit,
      is_twelve_week_goal: form.twelveWeekGoalChecked,
      status: 'pending',
    };

    // 2. Upsert the task/event
    const { data: savedTask, error: taskError } = await supabase
      .from('0007-ap-tasks')
      .upsert(mode === 'edit' && form.id ? { id: form.id, ...taskRecord } : taskRecord)
      .select()
      .single();

    if (taskError || !savedTask) throw new Error(taskError?.message || "Failed to save task/event.");

    // 3. Handle junction tables
    const linkPromises = [
      updateJunctionTable('0007-ap-task-roles', 'task_id', savedTask.id, 'role_id', form.selectedRoleIds),
      updateJunctionTable('0007-ap-task-domains', 'task_id', savedTask.id, 'domain_id', form.selectedDomainIds),
      updateJunctionTable('0007-ap-task-key-relationships', 'task_id', savedTask.id, 'key_relationship_id', form.selectedKeyRelationshipIds),
      updateJunctionTable('0007-ap-task-12wkgoals', 'task_id', savedTask.id, 'goal_id', form.twelveWeekGoalChecked && form.twelveWeekGoalId ? [form.twelveWeekGoalId] : []),
      // If this task was created from a deposit idea, link them
      form.isFromDepositIdea && form.originalDepositIdeaId 
        ? updateJunctionTable('0007-ap-deposit-idea-tasks', 'task_id', savedTask.id, 'deposit_idea_id', [form.originalDepositIdeaId])
        : Promise.resolve()
    ];

    await Promise.all(linkPromises);
  };

  // Generic function to update a junction table
  const updateJunctionTable = async (table: string, primaryKey: string, primaryId: string, foreignKey: string, foreignIds: string[]) => {
    // First, delete all existing links for this primary ID
    const { error: deleteError } = await supabase.from(table).delete().eq(primaryKey, primaryId);
    if (deleteError) throw new Error(`Failed to update links in ${table}: ${deleteError.message}`);

    // If there are new IDs to link, insert them
    if (foreignIds.length > 0) {
      const inserts = foreignIds.map(id => ({ [primaryKey]: primaryId, [foreignKey]: id }));
      const { error: insertError } = await supabase.from(table).insert(inserts);
      if (insertError) throw new Error(`Failed to insert new links in ${table}: ${insertError.message}`);
    }
  };


  // --- RENDER ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {mode === "edit" ? "Edit" : "Create"} {form.schedulingType.charAt(0).toUpperCase() + form.schedulingType.slice(1)}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Title Input */}
          <input
            type="text" name="title" value={form.title} onChange={handleChange}
            placeholder="Title..." required
            className="w-full px-3 py-2 border rounded"
          />

          {/* Type Selector */}
          <div className="flex gap-2">
            {(["task", "event", "depositIdea"] as const).map(type => (
              <button
                key={type} type="button"
                onClick={() => setForm(f => ({ ...f, schedulingType: type }))}
                className={`px-3 py-1 text-sm rounded-full ${form.schedulingType === type ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Date & Time Fields (for Task/Event) */}
          {form.schedulingType !== 'depositIdea' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Date</label>
                <DatePicker
                  selected={form.dueDate ? new Date(form.dueDate + "T00:00:00") : new Date()}
                  onChange={date => setForm(f => ({ ...f, dueDate: format(date || new Date(), "yyyy-MM-dd") }))}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="isAllDay" checked={form.isAllDay} onChange={handleChange} />
                  All Day
                </label>
              </div>
              {!form.isAllDay && (
                <>
                  <div>
                    <label className="text-sm">{form.schedulingType === 'event' ? 'Start' : 'Time'}</label>
                    <select name="startTime" value={form.startTime} onChange={handleChange} className="w-full border rounded px-2 py-1">
                      {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  {form.schedulingType === 'event' && (
                    <div>
                      <label className="text-sm">End</label>
                      <select name="endTime" value={form.endTime} onChange={handleChange} className="w-full border rounded px-2 py-1">
                         {timeOptions.filter(t => t.value > form.startTime).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Flags (for Task/Event) */}
          {form.schedulingType !== 'depositIdea' && (
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" name="urgent" checked={form.urgent} onChange={handleChange} /> Urgent</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="important" checked={form.important} onChange={handleChange} /> Important</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="authenticDeposit" checked={form.authenticDeposit} onChange={handleChange} /> Authentic Deposit</label>
            </div>
          )}

          {/* Roles */}
          <div>
            <label className="text-sm font-medium">Roles *</label>
            <div className="grid grid-cols-2 gap-2 p-2 border rounded max-h-32 overflow-y-auto">
              {dropdownData.roles.map(role => (
                <label key={role.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={form.selectedRoleIds.includes(role.id)} onChange={() => handleMultiSelect('selectedRoleIds', role.id)} />
                  {role.label}
                </label>
              ))}
            </div>
          </div>

          {/* Domains & Key Relationships (optional sections) */}
          <div>
            <label className="text-sm font-medium">Domains</label>
            <div className="grid grid-cols-2 gap-2 p-2 border rounded max-h-32 overflow-y-auto">
              {dropdownData.domains.map(domain => (
                <label key={domain.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={form.selectedDomainIds.includes(domain.id)} onChange={() => handleMultiSelect('selectedDomainIds', domain.id)} />
                  {domain.name}
                </label>
              ))}
            </div>
          </div>
          
          {filteredKeyRelationships.length > 0 && (
            <div>
              <label className="text-sm font-medium">Key Relationships</label>
              <div className="grid grid-cols-2 gap-2 p-2 border rounded max-h-32 overflow-y-auto">
                {filteredKeyRelationships.map(kr => (
                  <label key={kr.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={form.selectedKeyRelationshipIds.includes(kr.id)} onChange={() => handleMultiSelect('selectedKeyRelationshipIds', kr.id)} />
                    {kr.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="w-full border rounded p-2" />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskEventForm;
