import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { Users, Heart } from 'lucide-react';

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
  description: string;
  notes?: string;
  is_active: boolean;
  key_relationship_id?: string;
  key_relationship?: KeyRelationship;
  deposit_idea_roles?: Array<{ role_id: string }>;
  deposit_idea_domains?: Array<{ domain_id: string }>;
}

interface DepositIdeaFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: Record<string, Role>;
  domains: Record<string, Domain>;
  keyRelationships: KeyRelationship[];
  idea?: DepositIdea | null; // If provided, triggers "edit" mode
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
  keyRelationships,
  idea,
  defaultRoleId,
  defaultKeyRelationshipId
}) => {
  // ----------- STATE INIT -----------
  const [form, setForm] = useState({
    description: idea?.description || '',
    notes: idea?.notes || '',
    selectedRoleIds: idea?.deposit_idea_roles?.map(r => r.role_id)
      || (defaultRoleId ? [defaultRoleId] : []),
    selectedDomainIds: idea?.deposit_idea_domains?.map(d => d.domain_id) || [],
    selectedKeyRelationshipIds: idea?.key_relationship_id
      ? [idea.key_relationship_id]
      : (defaultKeyRelationshipId ? [defaultKeyRelationshipId] : []),
  });
  const [loading, setLoading] = useState(false);

  // Reset state on open or when editing a different idea
  useEffect(() => {
    setForm({
      description: idea?.description || '',
      notes: idea?.notes || '',
      selectedRoleIds: idea?.deposit_idea_roles?.map(r => r.role_id)
        || (defaultRoleId ? [defaultRoleId] : []),
      selectedDomainIds: idea?.deposit_idea_domains?.map(d => d.domain_id) || [],
      selectedKeyRelationshipIds: idea?.key_relationship_id
        ? [idea.key_relationship_id]
        : (defaultKeyRelationshipId ? [defaultKeyRelationshipId] : []),
    });
  }, [idea, open, defaultRoleId, defaultKeyRelationshipId]);

  // ----------- HANDLERS -----------
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleRole = (roleId: string) => {
    setForm(prev => ({
      ...prev,
      selectedRoleIds: prev.selectedRoleIds.includes(roleId)
        ? prev.selectedRoleIds.filter(id => id !== roleId)
        : [...prev.selectedRoleIds, roleId]
    }));
  };

  const toggleDomain = (domainId: string) => {
    setForm(prev => ({
      ...prev,
      selectedDomainIds: prev.selectedDomainIds.includes(domainId)
        ? prev.selectedDomainIds.filter(id => id !== domainId)
        : [...prev.selectedDomainIds, domainId]
    }));
  };

  const toggleKeyRelationship = (relationshipId: string) => {
    setForm(prev => ({
      ...prev,
      selectedKeyRelationshipIds: prev.selectedKeyRelationshipIds.includes(relationshipId)
        ? prev.selectedKeyRelationshipIds.filter(id => id !== relationshipId)
        : [...prev.selectedKeyRelationshipIds, relationshipId]
    }));
  };

  const getFilteredKeyRelationships = () => {
    return keyRelationships.filter(kr => form.selectedRoleIds.includes(kr.role_id));
  };

  // ----------- SUBMIT (ADD/EDIT) -----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      if (!idea) {
        // ---------- ADD MODE ----------
        const { data: depositIdea, error: ideaError } = await supabase
          .from('0007-ap-deposit-ideas')
          .insert([{
            user_id: user.id,
            description: form.description.trim(),
            notes: form.notes.trim() || null,
            key_relationship_id: form.selectedKeyRelationshipIds[0] || null,
            is_active: true
          }])
          .select()
          .single();

        if (ideaError || !depositIdea) {
          toast.error('Failed to create deposit idea');
          setLoading(false);
          return;
        }

        // Roles
        if (form.selectedRoleIds.length > 0) {
          const roleInserts = form.selectedRoleIds.map(roleId => ({
            deposit_idea_id: depositIdea.id, role_id: roleId
          }));
          await supabase.from('0007-ap-deposit-idea-roles').insert(roleInserts);
        }
        // Domains
        if (form.selectedDomainIds.length > 0) {
          const domainInserts = form.selectedDomainIds.map(domainId => ({
            deposit_idea_id: depositIdea.id, domain_id: domainId
          }));
          await supabase.from('0007-ap-deposit-idea-domains').insert(domainInserts);
        }

        toast.success('Deposit idea created!');
      } else {
        // ---------- EDIT MODE ----------
        // 1. Update idea
        const { error: updateError } = await supabase
          .from('0007-ap-deposit-ideas')
          .update({
            description: form.description.trim(),
            notes: form.notes.trim() || null,
            key_relationship_id: form.selectedKeyRelationshipIds[0] || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', idea.id)
          .eq('user_id', user.id);

        if (updateError) {
          toast.error('Failed to update deposit idea');
          setLoading(false);
          return;
        }

        // 2. Replace roles
        await supabase.from('0007-ap-deposit-idea-roles').delete().eq('deposit_idea_id', idea.id);
        if (form.selectedRoleIds.length > 0) {
          await supabase.from('0007-ap-deposit-idea-roles')
            .insert(form.selectedRoleIds.map(roleId => ({
              deposit_idea_id: idea.id, role_id: roleId
            })));
        }
        // 3. Replace domains
        await supabase.from('0007-ap-deposit-idea-domains').delete().eq('deposit_idea_id', idea.id);
        if (form.selectedDomainIds.length > 0) {
          await supabase.from('0007-ap-deposit-idea-domains')
            .insert(form.selectedDomainIds.map(domainId => ({
              deposit_idea_id: idea.id, domain_id: domainId
            })));
        }

        toast.success('Deposit idea updated!');
      }

      setForm({
        description: '',
        notes: '',
        selectedRoleIds: defaultRoleId ? [defaultRoleId] : [],
        selectedDomainIds: [],
        selectedKeyRelationshipIds: defaultKeyRelationshipId ? [defaultKeyRelationshipId] : [],
      });
      onSuccess();
      onClose();

    } catch (error) {
      toast.error('Something went wrong');
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
          <h2 className="text-xl font-semibold text-gray-900">
            {idea ? 'Edit Deposit Idea' : 'Add Deposit Idea'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Deposit Idea Title *</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleFormChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              placeholder="Enter deposit idea title..."
              required
              disabled={loading}
            />
          </div>
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleFormChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={2}
              placeholder="Describe your authentic deposit idea..."
              disabled={loading}
            />
          </div>
          {/* Roles */}
          <div>
            <label className="block text-sm font-medium mb-3">Associated Roles</label>
            <div className="grid grid-cols-2 gap-2 border border-gray-200 p-3 rounded-md max-h-40 overflow-y-auto">
              {Object.values(roles).map(role => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.selectedRoleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="h-4 w-4"
                    disabled={loading}
                  />
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
                  <input
                    type="checkbox"
                    checked={form.selectedDomainIds.includes(domain.id)}
                    onChange={() => toggleDomain(domain.id)}
                    className="h-4 w-4"
                    disabled={loading}
                  />
                  <span>{domain.name}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Key Relationships */}
          {form.selectedRoleIds.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-3">Key Relationships</label>
              <div className="grid grid-cols-2 gap-2 border border-gray-200 p-3 rounded-md max-h-40 overflow-y-auto">
                {getFilteredKeyRelationships().length > 0 ? (
                  getFilteredKeyRelationships().map(kr => (
                    <label key={kr.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.selectedKeyRelationshipIds.includes(kr.id)}
                        onChange={() => toggleKeyRelationship(kr.id)}
                        className="h-4 w-4"
                        disabled={loading}
                      />
                      <span>{kr.name}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-gray-400 text-xs italic px-2 py-2 col-span-2">
                    No Key Relationships for selected roles yet.
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              disabled={loading}
            >
              {loading ? (idea ? 'Updating...' : 'Creating...') : (idea ? 'Update' : 'Create')} Deposit Idea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepositIdeaForm;
