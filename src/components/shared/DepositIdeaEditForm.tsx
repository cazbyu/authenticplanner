import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { X, Save, Trash2 } from 'lucide-react';

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

interface DepositIdeaEditFormProps {
  idea: DepositIdea;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

const DepositIdeaEditForm: React.FC<DepositIdeaEditFormProps> = ({
  idea,
  onClose,
  onUpdated,
  onDeleted
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [roles, setRoles] = useState<Role[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);

  const [form, setForm] = useState({
    description: idea.description,
    notes: idea.notes || '',
    selectedRoleIds: idea.deposit_idea_roles?.map(r => r.role_id) || [],
    selectedDomainIds: idea.deposit_idea_domains?.map(d => d.domain_id) || [],
    selectedKeyRelationshipId: idea.key_relationship_id || ''
  });

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [rolesRes, domainsRes, relationshipsRes] = await Promise.all([
        supabase
          .from('0007-ap-roles')
          .select('id, label, category')
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('0007-ap-domains')
          .select('id, name'),
        supabase
          .from('0007-ap-key-relationships')
          .select('*')
          .eq('user_id', user.id)
      ]);

      if (rolesRes.data) setRoles(rolesRes.data);
      if (domainsRes.data) setDomains(domainsRes.data);
      if (relationshipsRes.data) setKeyRelationships(relationshipsRes.data);

    } catch (error) {
      console.error('Error fetching form data:', error);
      setError('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const getFilteredKeyRelationships = () => {
    return keyRelationships.filter(kr => 
      form.selectedRoleIds.includes(kr.role_id)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.description.trim()) {
      setError('Description is required');
      return;
    }

    setSubmitting(true);
          idea: formData.description,

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update the deposit idea
      const { error: updateError } = await supabase
        .from('0007-ap-deposit-ideas')
        .update({
          description: form.description.trim(),
          notes: form.notes.trim() || null,
          key_relationship_id: form.selectedKeyRelationshipId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', idea.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating deposit idea:', updateError);
        setError('Failed to update deposit idea');
        return;
      }

      // Update role relationships
      await supabase
        .from('0007-ap-deposit-idea-roles')
        .delete()
        .eq('deposit_idea_id', idea.id);

      if (form.selectedRoleIds.length > 0) {
        const roleInserts = form.selectedRoleIds.map(roleId => ({
          deposit_idea_id: idea.id,
          role_id: roleId
        }));
        
        await supabase
          .from('0007-ap-deposit-idea-roles')
          .insert(roleInserts);
      }

      // Update domain relationships
      await supabase
        .from('0007-ap-deposit-idea-domains')
        .delete()
        .eq('deposit_idea_id', idea.id);

      if (form.selectedDomainIds.length > 0) {
        const domainInserts = form.selectedDomainIds.map(domainId => ({
          deposit_idea_id: idea.id,
          domain_id: domainId
        }));
        
        await supabase
          .from('0007-ap-deposit-idea-domains')
          .insert(domainInserts);
      }

      toast.success('Deposit idea updated successfully!');
      onUpdated();

    } catch (error) {
      console.error('Error updating deposit idea:', error);
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('0007-ap-deposit-ideas')
        .delete()
        .eq('id', idea.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting deposit idea:', error);
        setError('Failed to delete deposit idea');
        return;
      }

      toast.success('Deposit idea deleted successfully!');
      onDeleted();

    } catch (error) {
      console.error('Error deleting deposit idea:', error);
      setError('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
            <span className="ml-2">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto space-y-6 m-4 w-full">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Edit Deposit Idea</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Deposit Idea Title *</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
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
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={2}
                placeholder="Describe your authentic deposit idea..."
              />
            </div>

            {/* Roles */}
            <div>
              <label className="block text-sm font-medium mb-3">Associated Roles</label>
              <div className="grid grid-cols-2 gap-2 border border-gray-200 p-3 rounded-md max-h-40 overflow-y-auto">
                {roles.map(role => (
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
                {domains.map(domain => (
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
                <label className="block text-sm font-medium mb-3">Key Relationship</label>
                <select
                  name="selectedKeyRelationshipId"
                  value={form.selectedKeyRelationshipId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select a key relationship (optional)</option>
                  {getFilteredKeyRelationships().map(kr => (
                    <option key={kr.id} value={kr.id}>{kr.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center px-4 py-2 text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.description.trim()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {submitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Deposit Idea</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this deposit idea: "{idea.description}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DepositIdeaEditForm;