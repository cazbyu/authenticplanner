import React, { useState, useEffect } from 'react';
import { Users, Star, X, Plus, ChevronRight, UserPlus, Lightbulb, Heart } from 'lucide-react';
import TaskForm from '../tasks/TaskForm';
import KeyRelationshipForm from './KeyRelationshipForm';
import { supabase } from '../../supabaseClient';
import { Task } from '../../types';

interface Role {
  id: string;
  label: string;
  category: string;
  icon?: string;
  domains?: string[];
}

interface RoleBankTask extends Task {
  role_id: string;
  is_deposit: boolean;
  due_date?: string;
  notes?: string;
}

interface DepositIdea {
  id: string;
  role_id: string;
  description: string;
  is_active: boolean;
}

interface Relationship {
  id: string;
  role_id: string;
  name: string;
}

interface KeyRelationship {
  id: string;
  role_id: string;
  name: string;
  notes?: string;
  image_url?: string;
}

type MainView = 'menu' | 'active-roles' | 'deposit-ideas' | 'key-relationships';

const RoleBank: React.FC = () => {
  const [activeRoles, setActiveRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [tasks, setTasks] = useState<RoleBankTask[]>([]);
  const [depositIdeas, setDepositIdeas] = useState<DepositIdea[]>([]);
  const [relationships, setRelationships] = useState<KeyRelationship[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);
  const [selectedDepositIdea, setSelectedDepositIdea] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<MainView>('menu');
  const [depositIdeasData, setDepositIdeasData] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'role' | 'relationship'>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [depositLoading, setDepositLoading] = useState(true);

  // Sorting function - moved to top level
  const sortedData = React.useMemo(() => {
    const sorted = [...depositIdeasData].sort((a, b) => {
      let aValue = '';
      let bValue = '';
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'role':
          aValue = a.role.toLowerCase();
          bValue = b.role.toLowerCase();
          break;
        case 'relationship':
          aValue = a.keyRelationship.toLowerCase();
          bValue = b.keyRelationship.toLowerCase();
          break;
      }
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
    
    return sorted;
  }, [depositIdeasData, sortBy, sortDirection]);

  // Pagination - moved to top level
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (column: 'title' | 'role' | 'relationship') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const SortIcon = ({ column }: { column: 'title' | 'role' | 'relationship' }) => {
    if (sortBy !== column) {
      return <span className="text-gray-400">↕</span>;
    }
    return sortDirection === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
  };

  useEffect(() => {
    const fetchActiveRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('0007-ap-roles')
        .select(`
          id,
          label,
          category,
          icon,
          preset_role_id,
          custom_role_id
        `)
        .eq('user_id', user.id)
        .eq('is_active', true); // Only fetch active roles

      setActiveRoles(roles || []);
      setLoading(false);
    };

    fetchActiveRoles();
  }, []);

  useEffect(() => {
    if (currentView === 'deposit-ideas') {
      const fetchDepositIdeas = async () => {
        setDepositLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Fetch deposit ideas with related role and relationship data
          const { data: ideas, error } = await supabase
            .from('0007-ap-deposit_ideas')
            .select(`
              id,
              description,
              is_active,
              created_at,
              relationship:0007-ap-key_relationships(
                id,
                name,
                role:0007-ap-roles(
                  id,
                  label,
                  category
                )
              )
            `)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching deposit ideas:', error);
            return;
          }

          // Transform data for table display
          const transformedData = ideas?.map(idea => ({
            id: idea.id,
            title: idea.description,
            role: idea.relationship?.role?.label || 'No Role',
            keyRelationship: idea.relationship?.name || 'No Relationship',
            isActive: idea.is_active,
            createdAt: idea.created_at
          })) || [];

          setDepositIdeasData(transformedData);
        } catch (error) {
          console.error('Error fetching deposit ideas:', error);
        } finally {
          setDepositLoading(false);
        }
      };

      fetchDepositIdeas();
    }
  }, [currentView]);

  useEffect(() => {
    if (!selectedRole) return;

    const fetchRoleData = async () => {
      const { data: taskData } = await supabase
        .from('0007-ap-tasks')
        .select('*')
        .eq('role_id', selectedRole.id)
        .gte('due_date', new Date().toISOString().split('T')[0]);
      
      setTasks(taskData || []);

      // Fetch key relationships
      const { data: relationshipData } = await supabase
        .from('0007-ap-key_relationships')
        .select('*')
        .eq('role_id', selectedRole.id);
      
      setRelationships(relationshipData || []);

      // For now, we'll keep deposit ideas empty since they're managed per relationship
      setDepositIdeas([]);
    };

    fetchRoleData();
  }, [selectedRole]);

  const handleTaskSave = async (taskData: any) => {
    setShowTaskForm(false);
    setSelectedDepositIdea(null);
  };

  const handleRelationshipCreated = () => {
    setShowRelationshipForm(false);
    // Refresh role data to show new relationship
    if (selectedRole) {
      fetchRoleData();
    }
  };

  const fetchRoleData = async () => {
    if (!selectedRole) return;

    const { data: taskData } = await supabase
      .from('0007-ap-tasks')
      .select('*')
      .eq('role_id', selectedRole.id)
      .gte('due_date', new Date().toISOString().split('T')[0]);
    
    setTasks(taskData || []);

    // Fetch key relationships
    const { data: relationshipData } = await supabase
      .from('0007-ap-key_relationships')
      .select('*')
      .eq('role_id', selectedRole.id);
    
    setRelationships(relationshipData || []);
  };

  const handleDepositToggle = async (idea: DepositIdea) => {
    if (idea.is_active) {
      setSelectedDepositIdea(idea.id);
      setShowTaskForm(true);
    }
  };

  const getRoleStats = (roleId: string) => {
    const roleTasks = tasks.filter(t => t.role_id === roleId);
    return {
      deposits: roleTasks.filter(t => t.is_deposit).length,
      tasks: roleTasks.filter(t => !t.is_deposit).length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Main menu view
  if (currentView === 'menu') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Roles */}
          <button
            onClick={() => setCurrentView('active-roles')}
            className="group bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Roles</h3>
              <p className="text-sm text-gray-600 mb-4">
                View and manage your current life roles
              </p>
              <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                <span className="text-sm font-medium">View Roles</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </button>

          {/* Deposit Ideas */}
          <button
            onClick={() => setCurrentView('deposit-ideas')}
            className="group bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-green-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <Lightbulb className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Deposit Ideas</h3>
              <p className="text-sm text-gray-600 mb-4">
                Brainstorm ways to invest in your roles
              </p>
              <div className="flex items-center text-green-600 group-hover:text-green-700">
                <span className="text-sm font-medium">View Ideas</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </button>

          {/* Key Relationships */}
          <button
            onClick={() => setCurrentView('key-relationships')}
            className="group bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                <Heart className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Key Relationships</h3>
              <p className="text-sm text-gray-600 mb-4">
                Manage important people in your life
              </p>
              <div className="flex items-center text-purple-600 group-hover:text-purple-700">
                <span className="text-sm font-medium">View Relationships</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Active Roles view
  if (currentView === 'active-roles') {
    if (selectedRole) {
      // Individual role detail view (existing functionality)
      return (
        <div className="fixed inset-0 bg-gray-100 z-50 overflow-auto">
          <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedRole.label}</h2>
                <button
                  onClick={() => setSelectedRole(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Current Tasks */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Current Tasks</h3>
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span>{task.title}</span>
                        <span className="text-sm text-gray-500">
                          {task.due_date && new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deposit Ideas */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Deposit Ideas</h3>
                  <div className="space-y-2">
                    {depositIdeas.map(idea => (
                      <div key={idea.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span>{idea.description}</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={idea.is_active}
                            onChange={() => handleDepositToggle(idea)}
                            className="rounded border-gray-300 text-primary-600 mr-2"
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    ))}
                    <button className="flex items-center text-primary-600 hover:text-primary-700 mt-2">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Deposit Idea
                    </button>
                  </div>
                </div>

                {/* Key Relationships */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Key Relationships</h3>
                    <button
                      onClick={() => setShowRelationshipForm(true)}
                      className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Add Key Relationship</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {relationships.map(rel => (
                      <div key={rel.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-3">
                          {/* Profile Image */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                              {rel.image_url ? (
                                <img 
                                  src={rel.image_url} 
                                  alt={rel.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )}
                            </div>
                          </div>
                          
                          {/* Name and Notes */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{rel.name}</div>
                            {rel.notes && (
                              <div className="text-sm text-gray-600 mt-1 line-clamp-2">{rel.notes}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {relationships.length === 0 && (
                      <div className="col-span-full text-center py-6 text-gray-500">
                        <UserPlus className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-sm">No key relationships yet.</p>
                        <button
                          onClick={() => setShowRelationshipForm(true)}
                          className="text-sm text-primary-600 hover:text-primary-700 mt-1"
                        >
                          Add your first relationship
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Task Notes */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Task Notes</h3>
                  <div className="space-y-3">
                    {tasks.filter(t => t.notes).map(task => (
                      <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium mb-1">{task.title}</div>
                        <div className="text-sm text-gray-600">{task.notes}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showTaskForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white rounded-lg w-full max-w-2xl p-6">
                <TaskForm
                  onSave={handleTaskSave}
                  onCancel={() => {
                    setShowTaskForm(false);
                    setSelectedDepositIdea(null);
                  }}
                  initialRole={selectedRole}
                  initialTask={selectedDepositIdea ? {
                    title: depositIdeas.find(i => i.id === selectedDepositIdea)?.description
                  } : undefined}
                />
              </div>
            </div>
          )}

          {showRelationshipForm && selectedRole && (
            <KeyRelationshipForm
              roleId={selectedRole.id}
              roleName={selectedRole.label}
              onClose={() => setShowRelationshipForm(false)}
              onRelationshipCreated={handleRelationshipCreated}
            />
          )}
        </div>
      );
    }

    // Active roles grid view
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentView('menu')}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Active Roles</h2>
          </div>
        </div>

        {activeRoles.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Roles</h3>
            <p className="text-gray-600">You haven't set up any active roles yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {activeRoles.map(role => {
              const stats = getRoleStats(role.id);
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1 truncate">{role.label}</h3>
                    <p className="text-sm text-gray-500 mb-3">{role.category}</p>
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                      <span>{stats.deposits} Deposits</span>
                      <span>{stats.tasks} Tasks</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Placeholder views for other sections
  if (currentView === 'deposit-ideas') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentView('menu')}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Deposit Ideas</h2>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
        </div>

        {depositLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : depositIdeasData.length === 0 ? (
          <div className="text-center py-12">
            <Lightbulb className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Deposit Ideas Yet</h3>
            <p className="text-gray-600">Deposit ideas will appear here when you add them to your key relationships.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Title</span>
                        <SortIcon column="title" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Role</span>
                        <SortIcon column="role" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('relationship')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Key Relationship</span>
                        <SortIcon column="relationship" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((idea) => (
                    <tr key={idea.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{idea.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{idea.role}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{idea.keyRelationship}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          idea.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {idea.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(startIndex + itemsPerPage, sortedData.length)}</span> of{' '}
                      <span className="font-medium">{sortedData.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (currentView === 'key-relationships') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentView('menu')}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Key Relationships</h2>
          </div>
        </div>
        <div className="text-center py-12">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Key Relationships</h3>
          <p className="text-gray-600">This section will be implemented soon.</p>
        </div>
      </div>
    );
  }

  return null;
};

export default RoleBank;