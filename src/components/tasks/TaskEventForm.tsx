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
const toUTCString = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  try {
    const localDate = new Date(`${date}T${time}:00`);
    return isNaN(localDate.getTime()) ? null : localDate.toISOString();
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

  // --- MEMOIZED VALUES & FORM HANDLERS ---
  const timeOptions = useMemo(() => {
    return Array.from({ length: 96 }, (_, i) => {
      const h = Math.floor(i / 4);
      const m = (i % 4) * 15;
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      return { value, label: `${hour12}:${m.toString().padStart(2, '0')} ${ampm}` };
    });
  }, []);

  const filteredKeyRelationships = useMemo(() => {
    if (form.selectedRoleIds.length === 0) return [];
    return dropdownData.keyRelationships.filter(kr => form.selectedRoleIds.includes(kr.role_id));
  }, [form.selectedRoleIds, dropdownData.keyRelationships]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleMultiSelect = (field: 'selectedRoleIds' | 'selectedDomainIds' | 'selectedKeyRelationshipIds', id: string) => {
    setForm(prev => {
      const current = prev[field] as string[];
      const newSelection = current.includes(id) ? current.filter(itemId => itemId !== id) : [...current, id];
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
    const record = {
      user_id: userId,
      title: form.title,
      notes: form.notes || null,
      is_active: true,
      key_relationship_id: form.selectedKeyRelationshipIds[0] || null,
    };

    const { data: savedIdea, error } = await supabase
      .from('0007-ap-deposit-ideas')
      .upsert(mode === 'edit' && form.id ? { id: form.id, ...record } : record)
      .select().single();
    
    if (error || !savedIdea) throw new Error(error?.message || "Failed to save deposit idea.");

    await Promise.all([
      updateJunctionTable('0007-ap-roles-deposit-ideas', 'deposit_idea_id', savedIdea.id, 'role_id', form.selectedRoleIds),
      updateJunctionTable('0007-ap-deposit-idea-domains', 'deposit_idea_id', savedIdea.id, 'domain_id', form.selectedDomainIds),
      updateJunctionTable('0007-ap-deposit-idea-key-relationships', 'deposit_idea_id', savedIdea.id, 'key_relationship_id', form.selectedKeyRelationshipIds),
    ]);
  };

  const handleSaveTaskOrEvent = async (userId: string) => {
    const record = {
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

    const { data: savedTask, error } = await supabase
      .from('0007-ap-tasks')
      .upsert(mode === 'edit' && form.id ? { id: form.id, ...record } : record)
      .select().single();

    if (error || !savedTask) throw new Error(error?.message || "Failed to save task/event.");

    const goalIds = form.twelveWeekGoalChecked && form.twelveWeekGoalId ? [form.twelveWeekGoalId] : [];
    const originalIdeaIds = form.isFromDepositIdea && form.originalDepositIdeaId ? [form.originalDepositIdeaId] : [];

    await Promise.all([
      updateJunctionTable('0007-ap-task-roles', 'task_id', savedTask.id, 'role_id', form.selectedRoleIds),
      updateJunctionTable('0007-ap-task-domains', 'task_id', savedTask.id, 'domain_id', form.selectedDomainIds),
      updateJunctionTable('0007-ap-task-key-relationships', 'task_id', savedTask.id, 'key_relationship_id', form.selectedKeyRelationshipIds),
      updateJunctionTable('0007-ap-task-12wkgoals', 'task_id', savedTask.id, 'goal_id', goalIds),
      updateJunctionTable('0007-ap-deposit-idea-tasks', 'task_id', savedTask.id, 'deposit_idea_id', originalIdeaIds),
    ]);
  };

  // Generic function to update a junction table safely
  const updateJunctionTable = async (table: string, primaryKey: string, primaryId: string, foreignKey: string, foreignIds: string[]) => {
    const { error: deleteError } = await supabase.from(table).delete().eq(primaryKey, primaryId);
    if (deleteError) throw new Error(`Failed to clear old links in ${table}: ${deleteError.message}`);

    if (foreignIds.length > 0) {
      const inserts = foreignIds.map(id => ({ [primaryKey]: primaryId, [foreignKey]: id }));
      const { error: insertError } = await supabase.from(table).insert(inserts);
      if (insertError) throw new Error(`Failed to insert new links in ${table}: ${insertError.message}`);
    }
  };

  // --- RENDER ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {mode === "edit" ? "Edit" : "Create"} {form.schedulingType.charAt(0).toUpperCase() + form.schedulingType.slice(1)}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>
        
        <form id="task-event-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* --- Main Details --- */}
          <section>
            <input
              type="text" name="title" value={form.title} onChange={handleChange}
              placeholder="Title..." required
              className="w-full text-lg px-3 py-2 border-b-2 border-gray-200 focus:border-blue-500 outline-none transition"
            />
            <div className="flex gap-2 mt-4">
              {(["task", "event", "depositIdea"] as const).map(type => (
                <button key={type} type="button" onClick={() => setForm(f => ({ ...f, schedulingType: type }))}
                  className={`px-3 py-1 text-sm rounded-full transition ${form.schedulingType === type ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </section>

          {/* --- Scheduling --- */}
          {form.schedulingType !== 'depositIdea' && (
            <fieldset className="border-t pt-4">
              <legend className="text-sm font-semibold text-gray-600 -mt-7 bg-white px-2">Scheduling</legend>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="text-sm block mb-1">Date</label>
                  <DatePicker
                    selected={form.dueDate ? new Date(form.dueDate + "T00:00:00") : new Date()}
                    onChange={date => setForm(f => ({ ...f, dueDate: format(date || new Date(), "yyyy-MM-dd") }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <label className="flex items-center gap-2 pb-2">
                  <input type="checkbox" name="isAllDay" checked={form.isAllDay} onChange={handleChange} className="h-4 w-4"/>
                  All Day
                </label>
                {!form.isAllDay && (
                  <>
                    <div>
                      <label className="text-sm block mb-1">{form.schedulingType === 'event' ? 'Start' : 'Time'}</label>
                      <select name="startTime" value={form.startTime} onChange={handleChange} className="w-full border rounded px-3 py-2">
                        {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    {form.schedulingType === 'event' && (
                      <div>
                        <label className="text-sm block mb-1">End</label>
                        <select name="endTime" value={form.endTime} onChange={handleChange} className="w-full border rounded px-3 py-2">
                           {timeOptions.filter(t => t.value > form.startTime).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
            </fieldset>
          )}

          {/* --- Details & Flags --- */}
          {form.schedulingType !== 'depositIdea' && (
             <fieldset className="border-t pt-4">
              <legend className="text-sm font-semibold text-gray-600 -mt-7 bg-white px-2">Details</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <label className="flex items-center gap-2"><input type="checkbox" name="urgent" checked={form.urgent} onChange={handleChange} /> Urgent</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="important" checked={form.important} onChange={handleChange} /> Important</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="authenticDeposit" checked={form.authenticDeposit} onChange={handleChange} /> Authentic Deposit</label>
              </div>
            </fieldset>
          )}

          {/* --- Links --- */}
          <fieldset className="border-t pt-4">
            <legend className="text-sm font-semibold text-gray-600 -mt-7 bg-white px-2">Links</legend>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Roles <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 border rounded mt-1 max-h-32 overflow-y-auto">
                  {dropdownData.roles.map(role => (
                    <label key={role.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.selectedRoleIds.includes(role.id)} onChange={() => handleMultiSelect('selectedRoleIds', role.id)} />{role.label}</label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Domains</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 border rounded mt-1 max-h-32 overflow-y-auto">
                  {dropdownData.domains.map(domain => (
                    <label key={domain.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.selectedDomainIds.includes(domain.id)} onChange={() => handleMultiSelect('selectedDomainIds', domain.id)} />{domain.name}</label>
                  ))}
                </div>
              </div>
              {filteredKeyRelationships.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Key Relationships</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 border rounded mt-1 max-h-32 overflow-y-auto">
                    {filteredKeyRelationships.map(kr => (
                      <label key={kr.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.selectedKeyRelationshipIds.includes(kr.id)} onChange={() => handleMultiSelect('selectedKeyRelationshipIds', kr.id)} />{kr.name}</label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </fieldset>
          
          {/* --- Notes --- */}
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} className="w-full border rounded p-2 mt-1" />
          </div>
        </form>

        {/* --- Footer --- */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
          <button type="submit" form="task-event-form" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskEventForm;
