import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Users, Heart, ChevronDown, ChevronUp, Star, Target, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import TaskEventForm from '../components/tasks/TaskEventForm';

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
  selectedKeyRelationshipId: string;
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

  const [form, setForm] = useState<DepositIdeaFormData>({
    description: '',
    notes: '',
    selectedRoleIds: [],
    selectedDomainIds: [],
    selectedKeyRelationshipId: ''
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
          .from('0007-ap-key_relationships')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('0007-ap-deposit_ideas')
          .select(`
            *,
            key_relationship:0007-ap-key_relationships(*),
            deposit_idea_roles:0007-ap-deposit_idea_roles(role_id),
            deposit_idea_domains:0007-ap-deposit_idea_domains(domain_id)
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
        .from('0007-ap-deposit_ideas')
        .insert([{
          user_id: user.id,
          description: form.description.trim(),
          notes: form.notes.trim() || null,
          key_relationship_id: form.selectedKeyRelationshipId || null,
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
          .from('0007-ap-deposit_idea_roles')
          .insert(roleInserts);
      }

      // Create domain relationships
      if (form.selectedDomainIds.length > 0) {
        const domainInserts = form.selectedDomainIds.map(domainId => ({
          deposit_idea_id: depositIdea.id,
          domain_id: domainId
        }));
        
        await supabase
          .from('0007-ap-deposit_idea_domains')
          .insert(domainInserts);
      }

      toast.success('Deposit idea created successfully!');
      setShowAddForm(false);
      setForm({
        description: '',
        notes: '',
        selectedRoleIds: [],
        selectedDomainIds: [],
        selectedKeyRelationshipId: ''
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
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
      <div className="flex-1 overflow-y-auto p-6">
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
          <div className="space-y-6">
            {Object.entries(groupedIdeas).map(([groupName, ideas]) => (
              <div key={groupName} className="bg-white rounded-lg border border-gray-200">
                <button
                  onClick={() => toggleSection(groupName)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {sortBy === 'roles' ? (
                      <Users className="h-5 w-5 text-gray-600" />
                    ) : (
                      <Heart className="h-5 w-5 text-gray-600" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">{groupName}</h3>
                    <span className="text-sm text-gray-500">({ideas.length})</span>
                  </div>
                  {expandedSections.has(groupName) ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {expandedSections.has(groupName) && (
                  <div className="border-t border-gray-200 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {ideas.map(idea => (
                        <div key={idea.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="mb-3">
                            <p className="text-gray-900 font-medium mb-2">{idea.description}</p>
                            {idea.notes && (
                              <p className="text-sm text-gray-600 mb-2">{idea.notes}</p>
                            )}
                            
                            {/* Show associated roles and domains */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {idea.deposit_idea_roles?.map(({ role_id }) => (
                                roles[role_id] && (
                                  <span key={role_id} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                    {roles[role_id].label}
                                  </span>
                                )
                              ))}
                              {idea.deposit_idea_domains?.map(({ domain_id }) => (
                                domains[domain_id] && (
                                  <span key={domain_id} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                    {domains[domain_id].name}
                                  </span>
                                )
                              ))}
                            </div>

                            {idea.key_relationship && (
                              <div className="flex items-center gap-2 mb-3">
                                <Heart className="h-4 w-4 text-pink-500" />
                                <span className="text-sm text-gray-600">
                                  For: {idea.key_relationship.name}
                                </span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleActivate(idea)}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Target className="h-4 w-4" />
                            Activate
                          </button>
                        </div>
                      ))}
                    </div>
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
                  <label className="block text-sm font-medium mb-3">Key Relationship (Optional)</label>
                  <select
                    value={form.selectedKeyRelationshipId}
                    onChange={(e) => setForm(prev => ({ ...prev, selectedKeyRelationshipId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Select a key relationship...</option>
                    {getFilteredKeyRelationships().map(kr => (
                      <option key={kr.id} value={kr.id}>
                        {kr.name} ({roles[kr.role_id]?.label})
                      </option>
                    ))}
                  </select>
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
    </div>
  );
};

export default DepositIdeas;