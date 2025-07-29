import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { toast } from "sonner";
import "react-datepicker/dist/react-datepicker.css";

// ----- TYPES -----
interface TaskEventFormProps { mode: "create" | "edit"; initialData?: Partial<FormData>; onSubmitSuccess: () => void; onClose: () => void; }
interface FormData { id?: string; title: string; dueDate: string; startTime: string; endTime: string; isAllDay: boolean; selectedRoleIds: string[]; selectedDomainIds: string[]; selectedKeyRelationshipIds: string[]; notes: string; urgent?: boolean; important?: boolean; authenticDeposit?: boolean; twelveWeekGoalChecked?: boolean; twelveWeekGoalId?: string; schedulingType?: "task" | "event" | "depositIdea"; }
interface Role { id: string; label: string; }
interface Domain { id: string; name: string; }
interface KeyRelationship { id: string; name: string; role_id: string; }
interface TwelveWeekGoal { id: string; title: string; }

// Helper functions (convertToUTC, etc.)
const convertToUTC = (date: string, time: string): string | null => { /* ... */ };
const defaultForm: FormData = { title: "", dueDate: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "10:00", isAllDay: false, selectedRoleIds: [], selectedDomainIds: [], selectedKeyRelationshipIds: [], notes: "", urgent: false, important: false, authenticDeposit: false, twelveWeekGoalChecked: false, twelveWeekGoalId: "", schedulingType: "task" };

const TaskEventForm: React.FC<TaskEventFormProps> = ({ mode, initialData, onSubmitSuccess, onClose }) => {
  const [form, setForm] = useState<FormData>({ ...defaultForm, ...initialData });
  const [roles, setRoles] = useState<Role[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);
  const [twelveWeekGoals, setTwelveWeekGoals] = useState<TwelveWeekGoal[]>([]);
  const [loading, setLoading] = useState(false);

  // THIS EFFECT SYNCS THE FORM'S STATE WITH THE DATA PASSED FROM THE PARENT
  useEffect(() => {
    if (initialData) {
      setForm(prevForm => ({ ...prevForm, ...initialData }));
    }
  }, [initialData]);
  
  // This effect fetches dropdown options (Roles, Domains, etc.)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roleData } = await supabase.from("0007-ap-roles").select("id,label").eq("user_id", user.id).eq("is_active", true);
      const { data: domainData } = await supabase.from("0007-ap-domains").select("id,name");
      const { data: relationshipData } = await supabase.from("0007-ap-key-relationships").select("id,name,role_id").eq("user_id", user.id);
      setRoles(roleData || []);
      setDomains(domainData || []);
      setKeyRelationships(relationshipData || []);
    })();
  }, []);

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
      return { ...prev, [field]: arr.includes(id) ? arr.filter((v) => v !== id) : [...arr, id] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      if (form.schedulingType === "depositIdea") {
        const ideaId = mode === 'edit' ? form.id : null;
        if (ideaId) {
          // ---------- EDIT MODE ----------
          await supabase.from("0007-ap-deposit-ideas").update({ title: form.title.trim() }).eq('id', ideaId);
          await supabase.from("0007-ap-note-deposit-ideas").delete().eq("deposit_idea_id", ideaId);
          if (form.notes.trim()) {
            const { data: noteData } = await supabase.from("0007-ap-notes").insert([{ user_id: user.id, content: form.notes.trim() }]).select().single();
            if (noteData) { await supabase.from("0007-ap-note-deposit-ideas").insert([{ deposit_idea_id: ideaId, note_id: noteData.id }]); }
          }
          // Re-link roles, domains, and key relationships
          await supabase.from("0007-ap-roles-deposit-ideas").delete().eq("deposit_idea_id", ideaId);
          if (form.selectedRoleIds.length > 0) { await supabase.from("0007-ap-roles-deposit-ideas").insert(form.selectedRoleIds.map(roleId => ({ deposit_idea_id: ideaId, role_id: roleId }))); }
          await supabase.from("0007-ap-deposit-idea-domains").delete().eq("deposit_idea_id", ideaId);
          if (form.selectedDomainIds.length > 0) { await supabase.from("0007-ap-deposit-idea-domains").insert(form.selectedDomainIds.map(domainId => ({ deposit_idea_id: ideaId, domain_id: domainId }))); }
          await supabase.from("0007-ap-deposit-idea-key-relationships").delete().eq("deposit_idea_id", ideaId);
          if (form.selectedKeyRelationshipIds.length > 0) { await supabase.from("0007-ap-deposit-idea-key-relationships").insert(form.selectedKeyRelationshipIds.map(krId => ({ deposit_idea_id: ideaId, key_relationship_id: krId }))); }
          toast.success("Deposit idea updated successfully!");
        } else {
          // ---------- CREATE MODE ----------
          const { data: depositIdea } = await supabase.from("0007-ap-deposit-ideas").insert([{ user_id: user.id, title: form.title.trim(), is_active: true }]).select().single();
          if (!depositIdea) throw new Error("Failed to create deposit idea");
          const newIdeaId = depositIdea.id;
          if (form.notes.trim()) {
            const { data: noteData } = await supabase.from("0007-ap-notes").insert([{ user_id: user.id, content: form.notes.trim() }]).select().single();
            if (noteData) { await supabase.from("0007-ap-note-deposit-ideas").insert([{ deposit_idea_id: newIdeaId, note_id: noteData.id }]); }
          }
          // Link roles, domains, key relationships
          if (form.selectedRoleIds.length > 0) { await supabase.from("0007-ap-roles-deposit-ideas").insert(form.selectedRoleIds.map(roleId => ({ deposit_idea_id: newIdeaId, role_id: roleId }))); }
          if (form.selectedDomainIds.length > 0) { await supabase.from("0007-ap-deposit-idea-domains").insert(form.selectedDomainIds.map(domainId => ({ deposit_idea_id: newIdeaId, domain_id: domainId }))); }
          if (form.selectedKeyRelationshipIds.length > 0) { await supabase.from("0007-ap-deposit-idea-key-relationships").insert(form.selectedKeyRelationshipIds.map(krId => ({ deposit_idea_id: newIdeaId, key_relationship_id: krId }))); }
          toast.success("Deposit idea created successfully!");
        }
        onSubmitSuccess();
        onClose();
        return;
      }
      
      // --- Task/Event Logic ---
      // ... (This logic remains the same)
      
    } catch (err) {
      toast.error("Error saving: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* The form JSX remains the same */}
      </div>
    </div>
  );
};

export default TaskEventForm;