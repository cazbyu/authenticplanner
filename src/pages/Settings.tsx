import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

const Settings: React.FC = () => {
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
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchPresetRoles = async () => {
      const { data, error } = await supabase
        .from('0007-ap-preset-roles')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) {
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
    };
    fetchPresetRoles();
  }, []);

  const fetchAllRoles = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('0007-ap-roles')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      setError('Failed to load your roles.');
      setLoading(false);
      return;
    }
    // is_active is now always boolean
    setUserRoles(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) fetchAllRoles();
  }, [userId]);

  const presetRolesByCategory: { [cat: string]: PresetRole[] } = {};
  presetRoles.forEach(role => {
    if (!presetRolesByCategory[role.category]) presetRolesByCategory[role.category] = [];
    presetRolesByCategory[role.category].push(role);
  });

  // OPTIMISTIC toggle for preset roles
  const handleTogglePreset = async (role: PresetRole) => {
    if (!userId) return;
    const match = userRoles.find(r => r.preset_role_id === role.id && r.user_id === userId);

    if (match) {
      // Optimistically update
      setUserRoles(prev =>
        prev.map(r =>
          r.id === match.id ? { ...r, is_active: !r.is_active } : r
        )
      );
      // Update Supabase in background
      await supabase
        .from('0007-ap-roles')
        .update({ is_active: !match.is_active })
        .eq('id', match.id)
        .eq('user_id', userId);
      // Optionally re-fetch here if you want 100% server sync: await fetchAllRoles();
    } else {
      // Optimistically add new role
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
      // Add to Supabase, then re-fetch to sync true IDs
      await supabase
        .from('0007-ap-roles')
        .insert([{
          user_id: userId,
          is_active: true,
          preset_role_id: role.id,
          label: role.label,
          category: role.category,
        }]);
      fetchAllRoles(); // Replace temp with real
    }
  };

  // OPTIMISTIC toggle for custom roles
  const handleToggleCustomRole = async (role: UserRole) => {
    if (!role.id || !userId) return;
    // Optimistically update
    setUserRoles(prev =>
      prev.map(r =>
        r.id === role.id ? { ...r, is_active: !r.is_active } : r
      )
    );
    await supabase
      .from('0007-ap-roles')
      .update({ is_active: false })
      .eq('id', role.id);
    // Optionally re-fetch: await fetchAllRoles();
  };

  const handleAddCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !customRole.trim()) return;
    // Optimistically add
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
    // Insert in Supabase, then sync
    await supabase.from('0007-ap-roles').insert([{
      user_id: userId,
      is_active: true,
      label: customRole.trim(),
      category: customCategory.trim() || 'Other',
    }]);
    setCustomRole('');
    setCustomCategory('');
    fetchAllRoles();
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-gray-600 mb-6">Manage your application preferences and role settings.</p>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Role Dashboard</h2>

        <form onSubmit={handleAddCustomRole} className="flex gap-2 mb-6">
          <input
            type="text"
            value={customRole}
            placeholder="Add a custom role..."
            onChange={e => setCustomRole(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2"
          />
          <input
            type="text"
            value={customCategory}
            placeholder="Category"
            onChange={e => setCustomCategory(e.target.value)}
            className="w-32 rounded-md border border-gray-300 px-3 py-2"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Add
          </button>
        </form>

        <div className="space-y-4">
          {Object.entries(presetRolesByCategory).map(([category, roles]) => (
            <div key={category} className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100"
              >
                <span className="font-medium">{category}</span>
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

        {userRoles.filter(r => !r.preset_role_id && r.is_active).length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium mb-3">Custom Roles</h3>
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
      </div>
    </div>
  );
};

export default Settings;
