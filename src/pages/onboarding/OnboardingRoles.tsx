import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface OnboardingContextType {
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

interface PresetRole {
  id: string;
  label: string;
  category: string;
  icon?: string;
  is_active?: boolean;
}

interface UserRole {
  id: string;
  user_id: string;
  is_active: boolean;
  preset_role_id?: string;
  label: string;
  category: string;
  [key: string]: any;
}

const OnboardingRoles: React.FC = () => {
  const { goToNextStep } = useOutletContext<OnboardingContextType>();
  const [userId, setUserId] = useState<string | null>(null);
  const [presetRoles, setPresetRoles] = useState<PresetRole[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [customRole, setCustomRole] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Auth error:', error);
          setError('Authentication failed. Please try logging in again.');
          setLoading(false);
          return;
        }
        
        if (data?.user?.id) {
          setUserId(data.user.id);
        } else {
          setError('No user found. Please log in.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error getting user:', err);
        setError('Failed to authenticate user.');
        setLoading(false);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchPresetRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('0007-ap-preset-roles')
          .select('*')
          .order('category', { ascending: true })
          .order('sort_order', { ascending: true });
        
        if (error) {
          console.error('Preset roles error:', error);
          setError('Failed to load preset roles.');
          return;
        }
        
        const sortOrder = ['Family', 'Professional', 'Community', 'Recreation'];
        const sortedData = data?.sort((a, b) => {
          const aIndex = sortOrder.indexOf(a.category);
          const bIndex = sortOrder.indexOf(b.category);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
        setPresetRoles(sortedData || []);
      } catch (err) {
        console.error('Error fetching preset roles:', err);
        setError('Failed to load preset roles.');
      }
    };
    fetchPresetRoles();
  }, []);

  const fetchAllRoles = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('0007-ap-roles')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('User roles error:', error);
        setError('Failed to load your roles.');
        return;
      }
      
      setUserRoles(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching user roles:', err);
      setError('Failed to load your roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchAllRoles();
    }
  }, [userId]);

  const presetRolesByCategory: { [cat: string]: PresetRole[] } = {};
  presetRoles.forEach(role => {
    if (!presetRolesByCategory[role.category]) presetRolesByCategory[role.category] = [];
    presetRolesByCategory[role.category].push(role);
  });

  const handleTogglePreset = async (role: PresetRole) => {
    if (!userId) return;
    
    try {
      const match = userRoles.find(r => r.preset_role_id === role.id && r.user_id === userId);

      if (match) {
        setUserRoles(prev =>
          prev.map(r =>
            r.id === match.id ? { ...r, is_active: !r.is_active } : r
          )
        );
        await supabase
          .from('0007-ap-roles')
          .update({ is_active: !match.is_active })
          .eq('id', match.id)
          .eq('user_id', userId);
      } else {
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const newRole = {
          user_id: userId,
          is_active: true,
          preset_role_id: role.id,
          label: role.label,
          category: role.category,
          id: tempId,
        };
        setUserRoles(prev => [...prev, newRole]);
        await supabase
          .from('0007-ap-roles')
          .insert([{
            user_id: userId,
            is_active: true,
            preset_role_id: role.id,
            label: role.label,
            category: role.category,
          }]);
        fetchAllRoles();
      }
    } catch (err) {
      console.error('Error toggling preset role:', err);
      setError('Failed to update role. Please try again.');
    }
  };

  const handleToggleCustomRole = async (role: UserRole) => {
    if (!role.id || !userId) return;
    
    try {
      setUserRoles(prev =>
        prev.map(r =>
          r.id === role.id ? { ...r, is_active: !r.is_active } : r
        )
      );
      await supabase
        .from('0007-ap-roles')
        .update({ is_active: !role.is_active })
        .eq('id', role.id);
    } catch (err) {
      console.error('Error toggling custom role:', err);
      setError('Failed to update role. Please try again.');
    }
  };

  const handleAddCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !customRole.trim()) return;
    
    try {
      const tempId = `temp-custom-${Date.now()}-${Math.random()}`;
      setUserRoles(prev => [
        ...prev,
        {
          user_id: userId,
          is_active: true,
          label: customRole.trim(),
          category: customCategory.trim() || 'Other',
          id: tempId,
        },
      ]);
      await supabase.from('0007-ap-roles').insert([{
        user_id: userId,
        is_active: true,
        label: customRole.trim(),
        category: customCategory.trim() || 'Other',
      }]);
      setCustomRole('');
      setCustomCategory('');
      fetchAllRoles();
    } catch (err) {
      console.error('Error adding custom role:', err);
      setError('Failed to add custom role. Please try again.');
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleContinue = () => {
    const hasActiveRoles = userRoles.some(role => role.is_active);
    if (hasActiveRoles) {
      goToNextStep();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent align-[-0.125em]"></div>
          <p className="mt-2 text-gray-600">Loading roles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  window.location.reload();
                }}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasActiveRoles = userRoles.some(role => role.is_active);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-xl font-bold text-gray-900">Define Your Roles</h2>
      <p className="mt-2 text-sm text-gray-600">
        Select your active roles from these categories or Customize your own. If you ever want to update just go to Settings > Role Dashboard
      </p>

      <div className="mt-6">
        {/* Custom Role Form */}
        <form onSubmit={handleAddCustomRole} className="flex gap-2 mb-6">
          <input
            type="text"
            value={customRole}
            placeholder="Add a custom role..."
            onChange={e => setCustomRole(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <input
            type="text"
            value={customCategory}
            placeholder="Category"
            onChange={e => setCustomCategory(e.target.value)}
            className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={!customRole.trim()}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              customRole.trim()
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Add
          </button>
        </form>

        {/* Preset Roles by Category */}
        <div className="space-y-4">
          {Object.entries(presetRolesByCategory).map(([category, roles]) => (
            <div key={category} className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-900">{category}</span>
                {expandedCategories[category] ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedCategories[category] && (
                <div className="p-4 grid grid-cols-2 gap-4">
                  {roles.map(role => {
                    const userRole = userRoles.find(
                      r => r.preset_role_id === role.id && r.user_id === userId
                    );
                    const checked = userRole ? !!userRole.is_active : false;

                    return (
                      <div key={role.id} className="flex items-center space-x-3">
                        <span className="text-sm text-gray-700 min-w-[120px]">{role.label}</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleTogglePreset(role)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Custom Roles Section */}
        {userRoles.filter(r => !r.preset_role_id && r.is_active).length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium mb-3 text-gray-900">Custom Roles</h3>
            <div className="grid grid-cols-2 gap-4">
              {userRoles
                .filter(r => !r.preset_role_id && r.is_active)
                .map(r => (
                  <div key={r.id} className="flex items-center space-x-3">
                    <span className="text-sm text-gray-700 min-w-[120px]">{r.label}</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={!!r.is_active}
                        onChange={() => handleToggleCustomRole(r)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="mt-8 pt-4">
          <button
            onClick={handleContinue}
            disabled={!hasActiveRoles}
            className={`w-full rounded-md py-3 px-4 text-center text-sm font-medium ${
              hasActiveRoles
                ? 'bg-primary-500 text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
                : 'cursor-not-allowed bg-gray-300 text-gray-500'
            }`}
          >
            Continue
          </button>
          
          {!hasActiveRoles && (
            <p className="mt-2 text-center text-xs text-gray-500">
              Please select at least one role to continue
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default OnboardingRoles;