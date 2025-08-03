import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { toast } from "sonner";
import "react-datepicker/dist/react-datepicker.css";
import { generateJoinRows } from '../utils/relationshipHelpers';

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

// Helper function to combine date and time into a UTC timestamp
const convertToUTC = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  // Creates a date object in the user's local timezone
  const localDate = new Date(`${date}T${time}:00`);
  // Converts the local time to the equivalent UTC time in ISO format
  return localDate.toISOString();
};

// Helper function to format time
const convertToTimeFormat = (time: string): string | null => {
  if (!time) return null;
  return `${time}:00`;
};

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

console.log("TaskEventForm initialData", initialData);
console.log("TaskEventForm form.schedulingType", form.schedulingType);
  
 useEffect(() => {
  if (initialData) {
    setForm((prev) => ({
      ...prev,
      ...initialData,
    }));
  }
}, [initialData]);
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);
  const [twelveWeekGoals, setTwelveWeekGoals] = useState<TwelveWeekGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRoleError, setShowRoleError] = useState(false);

  
  const fetchTaskData = async (taskId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch task with all relationships
      const { data: task, error } = await supabase
        .from('0007-ap-tasks')
        .select(`
          *,
          task_roles:0007-ap-task-roles(role_id),
          task_domains:0007-ap-task-domains(domain_id),
          task_key_relationships:0007-ap-task-key-relationships(key_relationship_id)
        `)
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single();

      if (error || !task) {
        console.error('Error fetching task data:', error);
        return;
      }

      // Fetch notes for this task
      const { data: taskNotes } = await supabase
        .from('0007-ap-task-notes')
        .select(`
          note:0007-ap-notes(content)
        `)
        .eq('task_id', taskId);

      const noteContent = taskNotes?.[0]?.note?.content || '';

      // Update form with task data
      setForm(prev => ({
        ...prev,
        title: task.title || '',
        dueDate: task.due_date || prev.dueDate,
        startTime: task.start_time ? new Date(task.start_time).toTimeString().slice(0, 5) : prev.startTime,
        endTime: task.end_time ? new Date(task.end_time).toTimeString().slice(0, 5) : prev.endTime,
        isAllDay: task.is_all_day || false,
        urgent: task.is_urgent || false,
        important: task.is_important || false,
        authenticDeposit: task.is_authentic_deposit || false,
        twelveWeekGoalChecked: task.is_twelve_week_goal || false,
        notes: noteContent,
        selectedRoleIds: task.task_roles?.map((tr: any) => tr.role_id) || [],
        selectedDomainIds: task.task_domains?.map((td: any) => td.domain_id) || [],
        selectedKeyRelationshipIds: task.task_key_relationships?.map((tkr: any) => tkr.key_relationship_id) || [],
      }));

    } catch (error) {
      console.error('Error fetching task data:', error);
    }
  };

  const fetchDepositIdeaData = async (depositIdeaId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch deposit idea with ALL relationships: roles, domains, key relationships, and notes
      const { data: depositIdea, error } = await supabase
        .from('0007-ap-deposit-ideas')
        .select('*')
        .eq('id', depositIdeaId)
        .eq('user_id', user.id)
        .single();

      if (error || !depositIdea) {
        console.error('Error fetching deposit idea data:', error);
        return;
      }

      // Fetch roles linked to this deposit idea
      const { data: rolesData } = await supabase
        .from('0007-ap-roles-deposit-ideas')
        .select('role_id')
        .eq('deposit_idea_id', depositIdeaId);

      // Fetch domains linked to this deposit idea
      const { data: domainsData } = await supabase
        .from('0007-ap-deposit-idea-domains')
        .select('domain_id')
        .eq('deposit_idea_id', depositIdeaId);

      // Fetch key relationships linked to this deposit idea
      const { data: keyRelationshipsData } = await supabase
        .from('0007-ap-deposit-idea-key-relationships')
        .select('key_relationship_id')
        .eq('deposit_idea_id', depositIdeaId);

      // Fetch notes linked to this deposit idea
      const { data: notesData } = await supabase
        .from('0007-ap-note-deposit-ideas')
        .select(`
          note:0007-ap-notes(content)
        `)
        .eq('deposit_idea_id', depositIdeaId);

      const noteContent = notesData?.[0]?.note?.content || '';

      // Update form with all existing selections
      setForm(prev => ({
        ...prev,
        title: depositIdea.title || '',
        notes: noteContent,
        selectedRoleIds: rolesData?.map((r: any) => r.role_id) || [],
        selectedDomainIds: domainsData?.map((d: any) => d.domain_id) || [],
        selectedKeyRelationshipIds: keyRelationshipsData?.map((kr: any) => kr.key_relationship_id) || [],
      }));

    } catch (error) {
      console.error('Error fetching deposit idea data:', error);
    }
  };

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

      const { data: roleData } = await supabase.from("0007-ap-roles").select("id,label").eq("user_id", user.id).eq("is_active", true);
      const { data: domainData } = await supabase.from("0007-ap-domains").select("id,name");
      const { data: relationshipData } = await supabase.from("0007-ap-key-relationships").select("id,name,role_id").eq("user_id", user.id);
      const { data: goalData } = await supabase.from("0007-ap-goals-12wk").select("id,title").eq("user_id", user.id).eq("status", "active").order('created_at', { ascending: false });

      setRoles(roleData || []);
      setDomains(domainData || []);
      setKeyRelationships(relationshipData || []);
      setTwelveWeekGoals(goalData || []);
    })();
  }, []);

  // Calculate default due date for 12-week goal tasks
  useEffect(() => {
    if (initialData?.twelveWeekGoalChecked && initialData?.weekNumber && initialData?.cycleStartDate) {
      const cycleStart = new Date(initialData.cycleStartDate + 'T00:00:00Z');
      const weekStart = new Date(cycleStart);
      weekStart.setDate(cycleStart.getDate() + ((initialData.weekNumber - 1) * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      setForm(prev => ({
        ...prev,
        dueDate: weekEnd.toISOString().split('T')[0]
      }));
    }
  }, [initialData?.twelveWeekGoalChecked, initialData?.weekNumber, initialData?.cycleStartDate]);

  // ----- FORM CHANGE HANDLERS -----
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
        [field]: arr.includes(id) ? arr.filter((v) => v !== id) : [...arr, id],
      };
    });
  };

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

      // --- Deposit Idea Logic ---
      if (form.schedulingType === "depositIdea") {
        
        const ideaId = mode === 'edit' ? form.id : null;

        if (ideaId) {
          // ---------- EDIT MODE (CORRECTED) ----------
          const { error: updateError } = await supabase
            .from("0007-ap-deposit-ideas")
            .update({ title: form.title.trim() })
            .eq('id', ideaId);
          if (updateError) throw updateError;
          
          // --- Re-link Notes ---
          // BUG FIX: Added user_id to the delete query to satisfy RLS
          await supabase.from("0007-ap-note-deposit-ideas").delete().eq("user_id", user.id).eq("deposit_idea_id", ideaId);
          if (form.notes.trim()) {
            const { data: noteData } = await supabase.from("0007-ap-notes").insert([{ user_id: user.id, content: form.notes.trim() }]).select().single();
            if (noteData) {
              await supabase.from("0007-ap-note-deposit-ideas").insert([{ deposit_idea_id: ideaId, note_id: noteData.id, user_id: user.id }]);
            }
          }

          // --- Re-link Roles ---
          // BUG FIX: Added user_id to the delete query to satisfy RLS
          await supabase.from("0007-ap-roles-deposit-ideas").delete().eq("user_id", user.id).eq("deposit_idea_id", ideaId);
          if (form.selectedRoleIds.length > 0) {
            const roleInserts = form.selectedRoleIds.map(roleId => ({ deposit_idea_id: ideaId, role_id: roleId, user_id: user.id }));
            await supabase.from("0007-ap-roles-deposit-ideas").insert(roleInserts);
          }

          // --- Re-link Domains ---
          // BUG FIX: Added user_id to the delete query to satisfy RLS
          await supabase.from("0007-ap-deposit-idea-domains").delete().eq("user_id", user.id).eq("deposit_idea_id", ideaId);
          if (form.selectedDomainIds.length > 0) {
            const domainInserts = form.selectedDomainIds.map(domainId => ({ deposit_idea_id: ideaId, domain_id: domainId, user_id: user.id }));
            await supabase.from("0007-ap-deposit-idea-domains").insert(domainInserts);
          }

          // --- Re-link Key Relationships ---
          // BUG FIX: Added user_id to the delete query to satisfy RLS
          await supabase.from("0007-ap-deposit-idea-key-relationships").delete().eq("user_id", user.id).eq("deposit_idea_id", ideaId);
          if (form.selectedKeyRelationshipIds.length > 0) {
            const krInserts = form.selectedKeyRelationshipIds.map(krId => ({ deposit_idea_id: ideaId, key_relationship_id: krId, user_id: user.id }));
            await supabase.from("0007-ap-deposit-idea-key-relationships").insert(krInserts);
          }
          
          toast.success("Deposit idea updated successfully!");

        } else {
          // ---------- CREATE MODE (Already Correct) ----------
          const { data: depositIdea, error: depositIdeaError } = await supabase
            .from("0007-ap-deposit-ideas")
            .insert([{ user_id: user.id, title: form.title.trim(), is_active: true }])
            .select()
            .single();
          if (depositIdeaError || !depositIdea) throw new Error("Failed to create deposit idea: " + (depositIdeaError?.message || "Unknown error"));
          const newIdeaId = depositIdea.id;
          if (form.notes.trim()) {
            const { data: noteData } = await supabase.from("0007-ap-notes").insert([{ user_id: user.id, content: form.notes.trim() }]).select().single();
            if (noteData) await supabase.from("0007-ap-note-deposit-ideas").insert([{ deposit_idea_id: newIdeaId, note_id: noteData.id, user_id: user.id }]);
          }
          if (form.selectedRoleIds.length > 0) {
            const roleInserts = form.selectedRoleIds.map(roleId => ({ deposit_idea_id: newIdeaId, role_id: roleId, user_id: user.id }));
            await supabase.from("0007-ap-roles-deposit-ideas").insert(roleInserts);
          }
          if (form.selectedDomainIds.length > 0) {
            const domainInserts = form.selectedDomainIds.map(domainId => ({ deposit_idea_id: newIdeaId, domain_id: domainId, user_id: user.id }));
            await supabase.from("0007-ap-deposit-idea-domains").insert(domainInserts);
          }
          if (form.selectedKeyRelationshipIds.length > 0) {
             const krInserts = form.selectedKeyRelationshipIds.map(krId => ({ deposit_idea_id: newIdeaId, key_relationship_id: krId, user_id: user.id }));
             await supabase.from("0007-ap-deposit-idea-key-relationships").insert(krInserts);
          }
          toast.success("Deposit idea created successfully!");
        }

        onSubmitSuccess();
        onClose();
        return; // End execution for deposit ideas
      }

      // --- Task/Event Logic ---
      const record: any = {
        user_id: user.id,
        title: form.title,
        due_date: form.dueDate || null,
        start_time: convertToUTC(form.dueDate, form.startTime),
        end_time: convertToUTC(form.dueDate, form.endTime),
        is_all_day: form.isAllDay,
        is_urgent: form.urgent || false,
        is_important: form.important || false,
        is_authentic_deposit: form.authenticDeposit || false,
        is_twelve_week_goal: form.twelveWeekGoalChecked || false,
        status: 'pending',
      };

      *let taskId = form.id;
      if (mode === "create") {
        const { data, error } = await supabase.from("0007-ap-tasks").insert([record]).select().single();
        if (error) throw error;
        if (!data) throw new Error("No data returned from insert.");
        taskId = data.id;
      } else if (mode === "edit" && form.id) {
        const { error } = await supabase.from("0007-ap-tasks").update(record).eq("id", form.id);
        if (error) throw error;
      }

      if (!taskId) {
        throw new Error("Could not create or find task ID to update relations.");
      }*
      
            // --- Link Notes for Tasks ---
      let noteId: string | null = null;
      if (form.notes.trim()) {
        const { data: noteData } = await supabase
          .from("0007-ap-notes")
          .insert([{ user_id: user.id, content: form.notes.trim() }])
          .select()
          .single();
        if (noteData) {
          noteId = noteData.id;
          // Clean up old joins if necessary (optional: only if editing)
          await supabase.from("0007-ap-task-notes").delete().eq("task_id", taskId).eq("user_id", user.id);
          await supabase.from("0007-ap-task-notes").insert([{ task_id: taskId, note_id: noteId, user_id: user.id }]);
        }
      } else {
        // No note content: consider cleaning up any old note joins if needed
        await supabase.from("0007-ap-task-notes").delete().eq("task_id", taskId).eq("user_id", user.id);
      }

      // --- Link Relations for Tasks with the Helper ---
      // Remove old joins
      await supabase.from("0007-ap-task-roles").delete().eq("task_id", taskId).eq("user_id", user.id);
      await supabase.from("0007-ap-task-domains").delete().eq("task_id", taskId).eq("user_id", user.id);
      await supabase.from("0007-ap-task-key-relationships").delete().eq("task_id", taskId).eq("user_id", user.id);
      await supabase.from("0007-ap-task-12wkgoals").delete().eq("task_id", taskId).eq("user_id", user.id);

      // Insert new joins using helper
      const taskRoleRows = generateJoinRows("task-role", taskId, form.selectedRoleIds, user.id);
      if (taskRoleRows.length > 0) await supabase.from("0007-ap-task-roles").insert(taskRoleRows);

      const taskDomainRows = generateJoinRows("task-domain", taskId, form.selectedDomainIds, user.id);
      if (taskDomainRows.length > 0) await supabase.from("0007-ap-task-domains").insert(taskDomainRows);

      const taskKRRows = generateJoinRows("task-key-relationship", taskId, form.selectedKeyRelationshipIds, user.id);
      if (taskKRRows.length > 0) await supabase.from("0007-ap-task-key-relationships").insert(taskKRRows);

      const taskGoalRows = form.twelveWeekGoalChecked && form.twelveWeekGoalId
        ? generateJoinRows("task-12wkgoal", taskId, [form.twelveWeekGoalId], user.id)
        : [];
      if (taskGoalRows.length > 0) await supabase.from("0007-ap-task-12wkgoals").insert(taskGoalRows);

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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
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
                <label className="block text-xs mb-1">Due Date</label>
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