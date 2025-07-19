// DepositIdeaForm.tsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { Users, Heart } from 'lucide-react';

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

interface DepositIdeaFormProps {
  open: boolean;
  onClose: () => void;
  roles: Record<string, Role>;
  domains: Record<string, Domain>;
  keyRelationships: KeyRelationship[];
  onCreated: () => void;
  defaultRoleId?: string; // Optional for context-aware default
  defaultKeyRelationshipId?: string;
}

const DepositIdeaForm: React.FC<DepositIdeaFormProps> = ({
  open,
  onClose,
  roles,
  domains,
  keyRelationships,
  onCreated,
  defaultRoleId,
  defaultKeyRelationshipId
}) => {
  // Add initial selection logic for context
  const [form, setForm] = useState({
    description: '',
    notes: '',
    selectedRoleIds: defaultRoleId ? [defaultRoleId] : [],
    selectedDomainIds: [],
    selectedKeyRelationshipIds: defaultKeyRelationshipId ? [defaultKeyRelationshipId] : [],
  });

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
    return keyRelationships.filter(kr => 
      form.selectedRoleIds.includes(kr.role_id)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert new deposit idea
      const { data: depositIdea, error: ideaError } = await supabase
        .from('0007-ap-deposit-ideas')
        .insert([{
          user_id: user.id,
          description: form.description.trim(),
          notes: form.notes.trim() || null,
          key_relationship_id: form.selectedKeyRelationshipIds.length > 0 ? form.selectedKeyRelationshipIds[0] : null,
          is_active: true
        }])
        .select()
        .single();

      if (ideaError || !depositIdea) {
        console.error('Error creating deposit idea:', ideaError);
        toast.error('Failed to create deposit idea');
        return;
      }

      // Add roles
      if (form.selectedRoleIds.length > 0) {
        const roleInserts = form.selectedRoleIds.map(roleId => ({
          deposit_idea_id: depositIdea.id,
          role_id: roleId
        }));
        await supabase.from('0007-ap-deposit-idea-roles').insert(roleInserts);
      }

      // Add domains
      if (form.selectedDomainIds.length > 0) {
        const domainInserts = form.selectedDomainIds.map(domainId => ({
          deposit_idea_id: depositIdea.id,
          domain_id: domainId
        }));
        await supabase.from('0007-ap-deposit-idea-domains').insert(domainInserts);
      }

      toast.success('Deposit idea created successfully!');
      setForm({
        description: '',
        notes: '',
        selectedRoleIds: defaultRoleId ? [defaultRoleId] : [],
        selectedDomainIds: [],
        selectedKeyRelationshipIds: defaultKeyRelationshipId ? [defaultKeyRelationshipId] : [],
      });
      onCreated();
      onClose();
    } catch (error) {
      console.error('Error creating deposit idea:', error);
      toast.error('Failed to create deposit idea');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto space-y-6 m-4 w-full">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Add Deposit Idea</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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
          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Create Deposit Idea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepositIdeaForm;
