import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';

// ----------- INTERFACES -----------
interface Role {
  id: string;
  label: string;
  category: string;
}

interface Domain {
  id: string;
  name: string;
}

interface KeyRelationship {
  id: string;
  name: string;
  role_id: string;
}

interface DepositIdea {
  id: string;
  title: string;
  notes?: string;
  is_active: boolean;
  deposit_idea_roles?: Array<{ role_id: string }>;
  deposit_idea_domains?: Array<{ domain_id: string }>;
  // Use the junction table for key relationships
  deposit_idea_key_relationships?: Array<{ key_relationship_id: string }>;
}

interface DepositIdeaFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: Record<string, Role>;
  domains: Record<string, Domain>;
  idea?: DepositIdea | null;
  defaultRoleId?: string;
  defaultKeyRelationshipId?: string;
}

// ----------- COMPONENT -----------
const DepositIdeaForm: React.FC<DepositIdeaFormProps> = ({
  open,
  onClose,
  onSuccess,
  roles,
  domains,
  idea,
  defaultRoleId,
  defaultKeyRelationshipId
}) => {
  // ----------- STATE INIT -----------
  const [form, setForm] = useState({
    title: '',
    notes: '',
    selectedRoleIds: [],
    selectedDomainIds: [],
    selectedKeyRelationshipIds: [],
  });
  const [loading, setLoading] = useState(false);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);

  // Fetch active key relationships
  useEffect(() => {
    if (!open) return;
    const fetchKeyRelationships = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: relationshipData } = await supabase
        .from("0007-ap-key-relationships")
        .select("id,name,role_id")
        .eq("user_id", user.id)
        .eq("is_active", true);
      setKeyRelationships(relationshipData || []);
    };
    fetchKeyRelationships();
  }, [open]);

  // Reset form state when the modal opens or the idea changes
  useEffect(() => {
    if (open) {
      setForm({
        title: idea?.title || '',
        notes: idea?.notes || '',
        selectedRoleIds: idea?.deposit_idea_roles?.map(r => r.role_id) || (defaultRoleId ? [defaultRoleId] : []),
        selectedDomainIds: idea?.deposit_idea_domains?.map(d => d.domain_id) || [],
        selectedKeyRelationshipIds: idea?.deposit_idea_key_relationships?.map(kr => kr.key_relationship_id) || (defaultKeyRelationshipId ? [defaultKeyRelationshipId] : []),
      });
    }
  }, [idea, open, defaultRoleId, defaultKeyRelationshipId]);

  // ----------- HANDLERS -----------
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleSelection = (field: keyof typeof form, id: string, singleSelect = false) => {
    setForm(prev => {
      const currentSelection = prev[field as keyof typeof form] as string[];
      const isSelected = currentSelection.includes(id);

      if (singleSelect) {
        return { ...prev, [field]: isSelected ? [] : [id] };
      }
      
      return {
        ...prev,
        [field]: isSelected
          ? currentSelection.filter(item => item !== id)
          : [...currentSelection, id]
      };
    });
  };

  // ----------- SUBMIT (ADD/EDIT) -----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const ideaId = idea?.id;

      if (ideaId) {
        // ---------- EDIT MODE ----------
        // 1. Update main idea
        await supabase.from('0007-ap-deposit-ideas').update({ title: form.title.trim() }).eq('id', ideaId);

        // 2. Update Notes (Delete old links, create new note and link)
        await supabase.from('0007-ap-deposit-idea-notes').delete().eq('deposit_idea_id', ideaId);
        if (form.notes.trim()) {
          const { data: note } = await supabase.from('0007-ap-notes').insert({ user_id: user.id, content: form.notes.trim() }).select().single();
          if (note) {
            await supabase.from('0007-ap-deposit-idea-notes').insert({ deposit_idea_id: ideaId, note_id: note.id });
          }
        }
        
        // 3. Update linked items (Roles, Domains, Key Relationships)
        await supabase.from('0007-ap-roles-deposit-ideas').delete().eq('deposit_idea_id', ideaId);
        if (form.selectedRoleIds.length > 0) {
          await supabase.from('0007-ap-roles-deposit-ideas').insert(form.selectedRoleIds.map(roleId => ({ deposit_idea_id: ideaId, role_id: roleId })));
        }

        await supabase.from('0007-ap-deposit-idea-domains').delete().eq('deposit_idea_id', ideaId);
        if (form.selectedDomainIds.length > 0) {
          await supabase.from('0007-ap-deposit-idea-domains').insert(form.selectedDomainIds.map(domainId => ({ deposit_idea_id: ideaId, domain_id: domainId })));
        }

        await supabase.from('0007-ap-deposit-idea-key-relationships').delete().eq('deposit_idea_id', ideaId);
        if (form.selectedKeyRelationshipIds.length > 0) {
          await supabase.from('0007-ap-deposit-idea-key-relationships').insert(form.selectedKeyRelationshipIds.map(krId => ({ deposit_idea_id: ideaId, key_relationship_id: krId })));
        }

        toast.success('Deposit idea updated!');

      } else {
        // ---------- ADD MODE ----------
        // 1. Create main idea
        const { data: newIdea } = await supabase.from('0007-ap-deposit-ideas').insert({ user_id: user.id, title: form.title.trim(), is_active: true }).select().single();
        if (!newIdea) throw new Error("Failed to create deposit idea.");
        
        // 2. Create and Link Note
        if (form.notes.trim()) {
          const { data: note } = await supabase.from('0007-ap-notes').insert({ user_id: user.id, content: form.notes.trim() }).select().single();
          if (note) {
            await supabase.from('0007-ap-deposit-idea-notes').insert({ deposit_idea_id: newIdea.id, note_id: note.id });
          }
        }
        
        // 3. Link Roles, Domains, and Key Relationships
        if (form.selectedRoleIds.length > 0) {
          await supabase.from('0007-ap-roles-deposit-ideas').insert(form.selectedRoleIds.map(roleId => ({ deposit_idea_id: newIdea.id, role_id: roleId })));
        }
        if (form.selectedDomainIds.length > 0) {
          await supabase.from('0007-ap-deposit-idea-domains').insert(form.selectedDomainIds.map(domainId => ({ deposit_idea_id: newIdea.id, domain_id: domainId })));
        }
        if (form.selectedKeyRelationshipIds.length > 0) {
          await supabase.from('0007-ap-deposit-idea-key-relationships').insert(form.selectedKeyRelationshipIds.map(krId => ({ deposit_idea_id: newIdea.id, key_relationship_id: krId })));
        }

        toast.success('Deposit idea created!');
      }

      onSuccess();
      onClose();

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ----------- RENDER -----------
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto space-y-6 m-4 w-full">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">{idea ? 'Edit Deposit Idea' : 'Add Deposit Idea'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input type="text" name="title" value={form.title} onChange={handleFormChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Enter deposit idea title..." required disabled={loading} />
          </div>
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleFormChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" rows={4} placeholder="Describe your authentic deposit idea..." disabled={loading} />
          </div>
          {/* Roles */}
          <div>
            <label className="block text-sm font-medium mb-3">Associated Roles</label>
            <div className="grid grid-cols-2 gap-2 border border-gray-200 p-3 rounded-md max-h-40 overflow-y-auto">
              {Object.values(roles).map(role => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.selectedRoleIds.includes(role.id)} onChange={() => toggleSelection('selectedRoleIds', role.id)} className="h-4 w-4" disabled={loading} />
                  <span>{role.label}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Domains */}
          <div>
            <label className="block text-sm font-medium mb-3">Associated Domains</label>
            <div className="grid grid-cols-2 gap-2 border border-gray-200 p-3 rounded-md max-h-40 overflow-y-auto">
              {Object.values(domains).map(domain => (
                <label key={domain.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.selectedDomainIds.includes(domain.id)} onChange={() => toggleSelection('selectedDomainIds', domain.id)} className="h-4 w-4" disabled={loading} />
                  <span>{domain.name}</span>
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
                    <input type="checkbox" checked={form.selectedKeyRelationshipIds.includes(kr.id)} onChange={() => toggleSelection('selectedKeyRelationshipIds', kr.id, true)} className="h-4 w-4" disabled={loading} />
                    <span className="text-xs">{kr.name}</span>
                  </label>
                ))}
                {keyRelationships.filter(kr => form.selectedRoleIds.includes(kr.role_id)).length === 0 && (
                  <div className="text-gray-400 text-xs italic px-2 py-2">No Key Relationships selected yet.</div>
                )}
              </div>
            </div>
          )}
          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors" disabled={loading}>Cancel</button>
            <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors" disabled={loading || !form.title.trim()}>
              {loading ? (idea ? 'Updating...' : 'Creating...') : (idea ? 'Update' : 'Create')} Deposit Idea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepositIdeaForm;