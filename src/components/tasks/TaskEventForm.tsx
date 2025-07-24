import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { toast } from "sonner";
import "react-datepicker/dist/react-datepicker.css";

// ============================================================================
// TYPE DEFINITIONS (Aligned with 0004-ap- schema)
// ============================================================================

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
  
  // Task/Event specific fields
  'due-date': string;
  'start-time': string;
  'end-time': string;
  'is-all-day': boolean;
  'is-urgent'?: boolean;
  'is-important'?: boolean;
  'is-authentic-deposit'?: boolean;
  
  // Relational IDs
  'goal-id'?: string;
  selectedRoleIds: string[];
  selectedDomainIds: string[];
  selectedKeyRelationshipIds: string[];
}

// Data for select/multi-select options
interface SelectOption { id: string; label: string; }
interface KeyRelationshipOption { id: string; name: string; 'role-id': string; }
interface GoalOption { id: string; title: string; }

// ============================================================================
// UNIVERSAL TASK/EVENT/DEPOSIT IDEA FORM COMPONENT
// ============================================================================

const TaskEventForm: React.FC<TaskEventFormProps> = ({ mode, initialData, onSubmitSuccess, onClose }) => {
  
  // --- STATE MANAGEMENT ---

  const [form, setForm] = useState<FormData>({
    title: "",
    notes: "",
    schedulingType: "task",
    'due-date': format(new Date(), "yyyy-MM-dd"),
    'start-time': "09:00",
    'end-time': "10:00",
    'is-all-day': false,
    'is-urgent': false,
    'is-important': false,
    'is-authentic-deposit': false,
    'goal-id': "",
    selectedRoleIds: [],
    selectedDomainIds: [],
    selectedKeyRelationshipIds: [],
    ...initialData,
  });

  // State for dropdown/multi-select options
  const [roles, setRoles] = useState<SelectOption[]>([]);
  const [domains, setDomains] = useState<SelectOption[]>([]);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationshipOption[]>([]);
  const [twelveWeekGoals, setTwelveWeekGoals] = useState<GoalOption[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- DATA FETCHING ---

  const fetchDataForForm = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const [rolesRes, domainsRes, relationshipsRes, goalsRes] = await Promise.all([
        supabase.from("0004-ap-roles").select("id, label").eq("user-id", user.id).eq("is-active", true),
        supabase.from("0004-ap-domains").select("id, name"),
        supabase.from("0004-ap-key-relationships").select("id, name, role-id").eq("user-id", user.id),
        supabase.from("0004-ap-goals").select("id, title").eq("user-id", user.id).eq('type', 'twelve_week')
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (domainsRes.error) throw domainsRes.error;
      if (relationshipsRes.error) throw relationshipsRes.error;
      if (goalsRes.error) throw goalsRes.error;

      setRoles(rolesRes.data || []);
      setDomains((domainsRes.data || []).map(d => ({ id: d.id, label: d.name })));
      setKeyRelationships(relationshipsRes.data || []);
      setTwelveWeekGoals(goalsRes.data || []);

    } catch (err: any) {
      setError("Failed to load form data.");
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchDataForForm();
  }, [fetchDataForForm]);
  
  // --- FORM HANDLERS ---

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setForm(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
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

  /**
   * Handles saving a Deposit Idea (create or update).
   */
  const handleSaveDepositIdea = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const ideaData = {
        'user-id': user.id,
        title: form.title,
        notes: form.notes || null,
    };

    if (mode === 'create') {
        const { data: newIdea, error } = await supabase.from('0004-ap-deposit-ideas').insert(ideaData).select().single();
        if (error) throw error;
        await updateJunctionTables('deposit-idea-id', newIdea.id);
        toast.success("Deposit Idea created!");
    } else {
        const { error } = await supabase.from('0004-ap-deposit-ideas').update(ideaData).eq('id', form.id!);
        if (error) throw error;
        await updateJunctionTables('deposit-idea-id', form.id!);
        toast.success("Deposit Idea updated!");
    }
  };

  /**
   * Handles saving a Task or Event (create or update).
   */
  const handleSaveTask = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const taskData = {
        'user-id': user.id,
        title: form.title,
        notes: form.notes || null,
        type: form.schedulingType,
        'is-urgent': !!form['is-urgent'],
        'is-important': !!form['is-important'],
        'is-authentic-deposit': !!form['is-authentic-deposit'],
        'goal-id': form['goal-id'] || null,
        'due-date': form.schedulingType === 'task' ? form['due-date'] : null,
        'start-time': form.schedulingType === 'event' && !form['is-all-day'] ? new Date(`${form['due-date']}T${form['start-time']}`).toISOString() : null,
        'end-time': form.schedulingType === 'event' && !form['is-all-day'] ? new Date(`${form['due-date']}T${form['end-time']}`).toISOString() : null,
        'is-all-day': form.schedulingType === 'event' ? form['is-all-day'] : false,
    };

    if (mode === 'create') {
        const { data: newTask, error } = await supabase.from('0004-ap-tasks').insert(taskData).select().single();
        if (error) throw error;
        await updateJunctionTables('task-id', newTask.id);
        toast.success("Task created!");
    } else {
        const { error } = await supabase.from('0004-ap-tasks').update(taskData).eq('id', form.id!);
        if (error) throw error;
        await updateJunctionTables('task-id', form.id!);
        toast.success("Task updated!");
    }
  };

  /**
   * A helper function to update all related junction tables after a save.
   */
  const updateJunctionTables = async (idField: 'task-id' | 'deposit-idea-id', id: string) => {
    const tablePrefix = idField === 'task-id' ? 'task' : 'deposit-idea';

    // Update Roles
    await supabase.from(`0004-ap-${tablePrefix}-roles`).delete().eq(idField, id);
    if (form.selectedRoleIds.length > 0) {
      const roleInserts = form.selectedRoleIds.map(roleId => ({ [idField]: id, 'role-id': roleId }));
      await supabase.from(`0004-ap-${tablePrefix}-roles`).insert(roleInserts);
    }

    // Update Domains
    await supabase.from(`0004-ap-${tablePrefix}-domains`).delete().eq(idField, id);
    if (form.selectedDomainIds.length > 0) {
      const domainInserts = form.selectedDomainIds.map(domainId => ({ [idField]: id, 'domain-id': domainId }));
      await supabase.from(`0004-ap-${tablePrefix}-domains`).insert(domainInserts);
    }
    
    // Update Key Relationships (only for tasks for now)
    if (tablePrefix === 'task') {
        await supabase.from(`0004-ap-task-key-relationships`).delete().eq('task-id', id);
        if (form.selectedKeyRelationshipIds.length > 0) {
            const krInserts = form.selectedKeyRelationshipIds.map(krId => ({ 'task-id': id, 'key-relationship-id': krId }));
            await supabase.from(`0004-ap-task-key-relationships`).insert(krInserts);
        }
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (form.schedulingType === 'depositIdea') {
        await handleSaveDepositIdea();
      } else {
        await handleSaveTask();
      }
      onSubmitSuccess();
    } catch (err: any) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // --- RENDER ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {mode === 'edit' ? 'Edit' : 'Create'} {form.schedulingType}
          </h2>
          <button onClick={onClose}>&times;</button>
        </header>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* ... Form fields (input, textarea, selects, checkboxes) go here ... */}
          {/* This part is highly dependent on your chosen UI library (e.g., TailwindCSS) */}
          {/* Example for title: */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              required
            />
          </div>
          {/* ... other fields ... */}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-md border bg-primary-600 text-white">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskEventForm;
