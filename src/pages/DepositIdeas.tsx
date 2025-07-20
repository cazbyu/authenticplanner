import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Users, Heart, ChevronDown, ChevronUp, Star, Target, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import DepositIdeaCard from '../components/shared/DepositIdeaCard';
import DepositIdeaForm from '../components/shared/DepositIdeaForm';
import TaskEventForm from '../components/tasks/TaskEventForm';

// ----- INTERFACES (reuse these or your project's types) -----
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
  title: string;
  notes?: string;
  is_active: boolean;
  key_relationship_id?: string;
  key_relationship?: KeyRelationship;
  created_at: string;
  deposit_idea_roles?: Array<{ role_id: string }>;
  deposit_idea_domains?: Array<{ domain_id: string }>;
}

// ----- COMPONENT -----
const DepositIdeas: React.FC = () => {
  // --- STATE ---
  const [depositIdeas, setDepositIdeas] = useState<DepositIdea[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'roles' | 'relationships' | 'archived'>('roles');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Modal state for add/edit form
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDepositIdea, setEditingDepositIdea] = useState<DepositIdea | null>(null);
  const [activatingDepositIdea, setActivatingDepositIdea] = useState<DepositIdea | null>(null);

  // Add delete confirmation state
  const [deletingDepositIdea, setDeletingDepositIdea] = useState<DepositIdea | null>(null);

  // --- FETCH ALL DATA ---
  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line
  }, []);

  const handleActivateDepositIdea = (idea: DepositIdea) => {
    setActivatingDepositIdea(idea);
  };

  const handleDepositIdeaActivated = () => {
    setActivatingDepositIdea(null);
    // Mark the deposit idea as activated
    if (activatingDepositIdea) {
      markDepositIdeaAsActivated(activatingDepositIdea.id);
    }
  };

  const markDepositIdeaAsActivated = async (depositIdeaId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('0007-ap-deposit-ideas')
        .update({
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', depositIdeaId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking deposit idea as activated:', error);
        toast.error('Failed to mark deposit idea as activated');
      } else {
        toast.success('Deposit idea activated successfully!');
        fetchAllData(); // Refresh the data
      }
    } catch (error) {
      console.error('Error marking deposit idea as activated:', error);
      toast.error('Failed to mark deposit idea as activated');
    }
  };

  const handleDeleteDepositIdea = async (depositIdea: DepositIdea) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('0007-ap-deposit-ideas')
        .delete()
        .eq('id', depositIdea.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting deposit idea:', error);
        toast.error('Failed to delete deposit idea');
      } else {
        toast.success('Deposit idea deleted successfully!');
        setDeletingDepositIdea(null);
        fetchAllData(); // Refresh the data
      }
    } catch (error) {
      console.error('Error deleting deposit idea:', error);
      toast.error('Failed to delete deposit idea');
    }
  };

  // Fetch archived deposit ideas
  const fetchArchivedDepositIdeas = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: archivedIdeas, error } = await supabase
        .from('0007-ap-deposit-ideas')
        .select(`
          *,
          key_relationship:0007-ap-key-relationships(*),
          deposit_idea_roles:0007-ap-deposit-idea-roles(role_id),
          deposit_idea_domains:0007-ap-deposit-idea-domains(domain_id)
        `)
        .eq('user_id', user.id)
        .eq('archived', true)
        .is('activated_at', null) // Only show non-activated deposit ideas
        .eq('archived', false), // Only show non-archived deposit ideas

      if (error) {
        console.error('Error fetching archived deposit ideas:', error);
        toast.error('Failed to load archived deposit ideas');
      } else {
        setDepositIdeas(archivedIdeas || []);
      }
    } catch (error) {
      console.error('Error fetching archived deposit ideas:', error);
      toast.error('Failed to load archived deposit ideas');
    } finally {
      setLoading(false);
    }
  };

  // Handle sort change
  useEffect(() => {
    if (sortBy === 'archived') {
      fetchArchivedDepositIdeas();
    } else {
      fetchAllData();
    }
  }, [sortBy]);
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch all in parallel
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
          .is('activated_at', null), // Only show non-activated deposit ideas
      ]);

      // Build maps/arrays
      setRoles(
        rolesRes.data
          ? rolesRes.data.reduce((acc: any, role: Role) => ({ ...acc, [role.id]: role }), {})
          : {}
      );
      setDomains(
        domainsRes.data
          ? domainsRes.data.reduce((acc: any, domain: Domain) => ({ ...acc, [domain.id]: domain }), {})
          : {}
      );
      setKeyRelationships(relationshipsRes.data || []);
      setDepositIdeas(ideasRes.data || []);
    } catch (error) {
      toast.error('Failed to load deposit ideas');
    } finally {
      setLoading(false);
    }
  };

  // --- GROUPING LOGIC ---
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

  // Expand/collapse sections for grouped display
  useEffect(() => {
    if (Object.keys(groupDepositIdeas()).length > 0) {
      setExpandedSections(new Set(Object.keys(groupDepositIdeas())));
    }
    // eslint-disable-next-line
  }, [depositIdeas, sortBy]);

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

  // --- RENDER ---
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  const groupedIdeas = groupDepositIdeas();

  return (
    <div className="h-screen overflow-y-auto bg-gray-50">
      {/* Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Deposit Ideas</h1>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Deposit Idea
          </button>
        </div>
        {/* Sort Toggle */}
        <div className="flex items-center gap-4 mb-6">
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
            <button
              onClick={() => setSortBy('archived')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                sortBy === 'archived'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📁 Archived
            </button>
          </div>
        </div>

        {sortBy === 'archived' ? (
          /* Archived View - Simple List */
          depositIdeas.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Archived Deposit Ideas</h3>
              <p className="text-gray-600">
                Completed deposit ideas will appear here when archived.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Archived Deposit Ideas</h2>
              {depositIdeas.map(idea => (
                <div key={idea.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-2">{idea.title}</h3>
                      {idea.notes && (
                        <p className="text-sm text-gray-600 mb-2">{idea.notes}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {idea.deposit_idea_roles?.map(({ role_id }) => (
                          roles[role_id] && (
                            <span key={role_id} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              <Users className="h-3 w-3 mr-1" />
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
                        <div className="flex items-center gap-2 mb-2">
                          <Heart className="h-4 w-4 text-pink-500" />
                          <span className="text-sm text-gray-600">
                            For: {idea.key_relationship.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Created: {new Date(idea.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : Object.keys(groupedIdeas).length === 0 ? (
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
                        onEdit={(idea) => setEditingDepositIdea(idea)}
                        onActivate={handleActivateDepositIdea}
                        onDelete={(idea) => setDeletingDepositIdea(idea)}
                        showEditButton={true}
                        showActivateButton={true}
                        showDeleteButton={true}
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

      {/* Add Deposit Idea Modal */}
      <DepositIdeaForm
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={fetchAllData}
        roles={roles}
        domains={domains}
        keyRelationships={keyRelationships}
      />

      {/* Edit Deposit Idea Modal */}
      <DepositIdeaForm
        open={!!editingDepositIdea}
        onClose={() => setEditingDepositIdea(null)}
        onSuccess={fetchAllData}
        roles={roles}
        domains={domains}
        keyRelationships={keyRelationships}
        idea={editingDepositIdea || undefined}
      />

      {/* Activate Deposit Idea Form Modal */}
      {activatingDepositIdea && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl mx-4">
            <TaskEventForm
              mode="create"
              initialData={{
                title: activatingDepositIdea.title,
                notes: activatingDepositIdea.notes || '',
                authenticDeposit: true,
                schedulingType: 'task',
                selectedRoleIds: activatingDepositIdea.deposit_idea_roles?.map(r => r.role_id) || [],
                selectedDomainIds: activatingDepositIdea.deposit_idea_domains?.map(d => d.domain_id) || [],
                selectedKeyRelationshipIds: activatingDepositIdea.key_relationship_id ? [activatingDepositIdea.key_relationship_id] : [],
                isFromDepositIdea: true
              }}
              onSubmitSuccess={handleDepositIdeaActivated}
              onClose={() => setActivatingDepositIdea(null)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDepositIdea && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Deposit Idea</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete "{deletingDepositIdea.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeletingDepositIdea(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDepositIdea(deletingDepositIdea)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositIdeas;