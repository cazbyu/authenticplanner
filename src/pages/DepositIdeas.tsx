import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Users, Heart, ChevronDown, ChevronUp, Star, Target, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import TaskEventForm from '../components/tasks/TaskEventForm';
import DepositIdeaCard from '../components/shared/DepositIdeaCard';
import DepositIdeaEditForm from '../components/shared/DepositIdeaEditForm';

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
  image_path?: string;
}

interface DepositIdea {
  id: string;
  description: string;
  notes?: string;
  is_active: boolean;
  key_relationship_id?: string;
  key_relationship?: KeyRelationship;
  created_at: string;
  deposit_idea_roles?: Array<{ role_id: string }>;
  deposit_idea_domains?: Array<{ domain_id: string }>;
}

interface DepositIdeaFormData {
  description: string;
  notes: string;
  selectedRoleIds: string[];
  selectedDomainIds: string[];
  selectedKeyRelationshipIds: string[];
}

const DepositIdeas: React.FC = () => {
  const [depositIdeas, setDepositIdeas] = useState<DepositIdea[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'roles' | 'relationships'>('roles');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedDepositIdea, setSelectedDepositIdea] = useState<DepositIdea | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingDepositIdea, setEditingDepositIdea] = useState<DepositIdea | null>(null);

  // Initialize all sections as expanded by default
  useEffect(() => {
    if (Object.keys(groupDepositIdeas()).length > 0) {
      setExpandedSections(new Set(Object.keys(groupDepositIdeas())));
    }
  }, [depositIdeas, sortBy]);

  const [form, setForm] = useState<DepositIdeaFormData>({
    description: '',
    notes: '',
    selectedRoleIds: [],
    selectedDomainIds: [],
    selectedKeyRelationshipIds: []
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all data in parallel
      const [rolesRes, domainsRes, relationshipsRes, ideasRes] = await Promise.all([
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
          .eq('user_id', user.id),
        supabase
          .from('0007-ap-deposit-ideas')
          .select(`
            *,
            key_relationship:0007-ap-key-relationships(*),
            deposit_idea_roles:0007-ap-deposit-idea-roles(role_id),
            deposit_idea_domains:0007-ap-deposit-idea-domains(domain_id)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      // Process roles
      if (rolesRes.data) {
        const rolesMap = rolesRes.data.reduce((acc, role) => ({ ...acc, [role.id]: role }), {});
        setRoles(rolesMap);
      }

      // Process domains
      if (domainsRes.data) {
        const domainsMap = domainsRes.data.reduce((acc, domain) => ({ ...acc, [domain.id]: domain }), {});
        setDomains(domainsMap);
      }

      // Process key relationships
      if (relationshipsRes.data) {
        setKeyRelationships(relationshipsRes.data);
      }

      // Process deposit ideas
      if (ideasRes.data) {
        setDepositIdeas(ideasRes.data);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load deposit ideas');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create the deposit idea
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

      // Create role relationships
      if (form.selectedRoleIds.length > 0) {
        const roleInserts = form.selectedRoleIds.map(roleId => ({
          deposit_idea_id: depositIdea.id,
          role_id: roleId
        }));
        
        await supabase
          .from('0007-ap-deposit-idea-roles')
          .insert(roleInserts);
      }

      // Create domain relationships
      if (form.selectedDomainIds.length > 0) {
        const domainInserts = form.selectedDomainIds.map(domainId => ({
          deposit_idea_id: depositIdea.id,
          domain_id: domainId
        }));
        
        await supabase
          .from('0007-ap-deposit-idea-domains')
          .insert(domainInserts);
      }

      toast.success('Deposit idea created successfully!');
      setShowAddForm(false);
      setForm({
        description: '',
        notes: '',
        selectedRoleIds: [],
        selectedDomainIds: [],
        selectedKeyRelationshipIds: []
      });
      fetchAllData();

    } catch (error) {
      console.error('Error creating deposit idea:', error);
      toast.error('Failed to create deposit idea');
    }
  };

  const handleActivate = (idea: DepositIdea) => {
    setSelectedDepositIdea(idea);
    setShowTaskForm(true);
  };

  const handleTaskCreated = () => {
    setShowTaskForm(false);
    setSelectedDepositIdea(null);
    toast.success('Task created from deposit idea!');
  };

  const handleEditDepositIdea = (idea: DepositIdea) => {
    setEditingDepositIdea(idea);
  };

  const handleDepositIdeaUpdated = () => {
    setEditingDepositIdea(null);
    fetchAllData();
  };

  const handleDepositIdeaDeleted = () => {
    setEditingDepositIdea(null);
    fetchAllData();
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const getFilteredKeyRelationships = () => {
    return keyRelationships.filter(kr => 
      form.selectedRoleIds.includes(kr.role_id)
    );
  };

  const groupDepositIdeas = () => {
    if (sortBy === 'roles') {
      const grouped: Record<string, DepositIdea[]> = {};
      
      depositIdeas.forEach(idea => {
        const roleIds = idea.deposit_idea_roles?.map(r => r.role_id) || [];
        
        if (roleIds.length === 0) {
          if (!grouped['No Role']) grouped['No Role'] = [];
          grouped['No Role'].push(idea);
        } else {
          roleIds.forEach(roleId => {
            const role = roles[roleId];
            if (role) {
              if (!grouped[role.label]) grouped[role.label] = [];
              grouped[role.label].push(idea);
            }
          });
        }
      });
      
      return grouped;
    } else {
      const grouped: Record<string, DepositIdea[]> = {};
      
      depositIdeas.forEach(idea => {
        if (idea.key_relationship) {
          const relationshipName = idea.key_relationship.name;
          if (!grouped[relationshipName]) grouped[relationshipName] = [];
          grouped[relationshipName].push(idea);
        } else {
          if (!grouped['No Relationship']) grouped['No Relationship'] = [];
          grouped['No Relationship'].push(idea);
        }
      });
      
      return grouped;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  const groupedIdeas = groupDepositIdeas();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 p-6 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Deposit Ideas</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Deposit Ideas
          </button>
        </div>

        {/* Sort Toggle */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSortBy('roles')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                sortBy === 'roles'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="h-4 w-4 inline mr-1" />
              Roles
            </button>
            <button
              onClick={() => setSortBy('relationships')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                sortBy === 'relationships'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Heart className="h-4 w-4 inline mr-1" />
              Key Relationships
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {Object.keys(groupedIdeas).length === 0 ? (
          <div className="text-center py-12">
            <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Deposit Ideas Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first deposit idea to start building authentic relationships.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Add Your First Deposit Idea
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedIdeas).map(([groupName, ideas]) => (
              <div key={groupName} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Collapsible Header */}
                <button
                  onClick={() => toggleSection(groupName)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {sortBy === 'roles' ? (
                      <Users className="h-6 w-6 text-blue-600" />
                    ) : (
                      <Heart className="h-6 w-6 text-pink-600" />
                    )}
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gray-900">{groupName}</h3>
                      <span className="text-sm text-gray-500">{ideas.length} idea{ideas.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  {expandedSections.has(groupName) ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                
                {/* Collapsible Content */}
                {expandedSections.has(groupName) && (
                  <div className="p-4 pt-0 space-y-3">
                    {ideas.map(idea => (
                      <DepositIdeaCard
                        key={idea.id}
                        idea={idea}
                        roles={roles}
                        domains={domains}
                        onEdit={handleEditDepositIdea}
                        onActivate={handleActivate}
                        showEditButton={true}
                        className="text-sm"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Deposit Idea Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto space-y-6 m-4 w-full">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Add Deposit Idea</h2>
              <button
                onClick={() => setShowAddForm(false)}
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

              {/* Key Relationships (only show if roles are selected) */}
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
                  onClick={() => setShowAddForm(false)}
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
      )}

      {/* Task/Event Form Modal */}
      {showTaskForm && selectedDepositIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl mx-4">
            <TaskEventForm
              mode="create"
              initialData={{
                title: selectedDepositIdea.description,
                notes: selectedDepositIdea.notes || '',
                authenticDeposit: true,
                selectedRoleIds: selectedDepositIdea.deposit_idea_roles?.map(r => r.role_id) || [],
                selectedDomainIds: selectedDepositIdea.deposit_idea_domains?.map(d => d.domain_id) || [],
                selectedKeyRelationshipIds: selectedDepositIdea.key_relationship_id ? [selectedDepositIdea.key_relationship_id] : []
              }}
              onSubmitSuccess={handleTaskCreated}
              onClose={() => {
                setShowTaskForm(false);
                setSelectedDepositIdea(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Deposit Idea Form Modal */}
      {editingDepositIdea && (
        <DepositIdeaEditForm
          idea={editingDepositIdea}
          onClose={() => setEditingDepositIdea(null)}
          onUpdated={handleDepositIdeaUpdated}
          onDeleted={handleDepositIdeaDeleted}
        />
      )}
    </div>
  );
};

export default DepositIdeas;
                  {sortBy === 'roles' ? (
                    <Users className="h-6 w-6 text-blue-600" />
                  ) : (
                    <Heart className="h-6 w-6 text-pink-600" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{groupName}</h3>
                    <span className="text-sm text-gray-500">{ideas.length} idea{ideas.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {ideas.map(idea => (
                    <DepositIdeaCard
                      key={idea.id}
                      idea={idea}
                      roles={roles}
                      domains={domains}
                      onEdit={handleEditDepositIdea}
                      onActivate={handleActivate}
                      showEditButton={true}
                      className="text-sm"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Deposit Idea Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto space-y-6 m-4 w-full">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Add Deposit Idea</h2>
              <button
                onClick={() => setShowAddForm(false)}
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
                <label className="block text-sm font-medium mb-3">Desired Roles</label>
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
                <label className="block text-sm font-medium mb-3">Desired Domains</label>
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

              {/* Key Relationships (only show if roles are selected) */}
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
                  onClick={() => setShowAddForm(false)}
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
      )}

      {/* Task/Event Form Modal */}
      {showTaskForm && selectedDepositIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl mx-4">
            <TaskEventForm
              mode="create"
              initialData={{
                title: selectedDepositIdea.description,
                notes: selectedDepositIdea.notes || '',
                authenticDeposit: true,
                selectedRoleIds: selectedDepositIdea.deposit_idea_roles?.map(r => r.role_id) || [],
                selectedDomainIds: selectedDepositIdea.deposit_idea_domains?.map(d => d.domain_id) || [],
                selectedKeyRelationshipIds: selectedDepositIdea.key_relationship_id ? [selectedDepositIdea.key_relationship_id] : []
              }}
              onSubmitSuccess={handleTaskCreated}
              onClose={() => {
                setShowTaskForm(false);
                setSelectedDepositIdea(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Deposit Idea Form Modal */}
      {editingDepositIdea && (
        <DepositIdeaEditForm
          idea={editingDepositIdea}
          onClose={() => setEditingDepositIdea(null)}
          onUpdated={handleDepositIdeaUpdated}
          onDeleted={handleDepositIdeaDeleted}
        />
      )}
    </div>
  );
};

export default DepositIdeas;