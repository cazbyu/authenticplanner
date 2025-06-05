// src/components/OnboardingRoles.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient"; // Fixed import path

interface PresetRole {
  id: string;
  category: string;
  label: string;
  sort_order: number;
}

interface UserRole {
  id: string;
  user_id: string;
  preset_role_id?: string;
  label: string;
  is_active: boolean;
}

/**
 * OnboardingRoles – Step 3 of 7 ("Define Your Roles")
 *
 *  1. Loads a "preset roles" list (Family, Professional, Community, etc.)
 *  2. Fetches any existing roles for the current user (so they can re‐edit)
 *  3. Allows toggling / adding a custom role
 *  4. Only blocks on the "user roles" fetch, not on presets
 */

export default function OnboardingRoles() {
  // 1) State
  const [userId, setUserId]             = useState<string | null>(null);
  const [presetRoles, setPresetRoles]   = useState<PresetRole[]>([]);
  const [userRoles, setUserRoles]       = useState<UserRole[]>([]);
  const [loadingUserRoles, setLoadingUserRoles] = useState<boolean>(false);
  const [presetLoading, setPresetLoading]       = useState<boolean>(true);
  const [error, setError]               = useState<string | null>(null);

  // 2) Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("getUser error:", error.message);
        setError("Could not fetch user session. Please try logging in again.");
        return;
      }
      setUserId(data.user?.id ?? null);
    };

    getCurrentUser();

    // Also listen for sign‐in / sign‐out events to update userId:
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        setUserId(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 3) Fetch the preset roles (categories) once, on mount
  useEffect(() => {
    const fetchPresetRoles = async () => {
      const { data, error } = await supabase
        .from("0007-ap-preset-roles")
        .select("*")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("fetchPresetRoles error:", error.message);
        setError("Failed to load role categories.");
      } else {
        setPresetRoles(data || []);
      }
      setPresetLoading(false);
    };

    fetchPresetRoles();
  }, []);

  // 4) Once we know userId, fetch the user's existing roles
  useEffect(() => {
    if (!userId) return;

    const fetchUserRoles = async () => {
      setLoadingUserRoles(true);

      const { data, error } = await supabase
        .from("0007-ap-roles")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("fetchUserRoles error:", error.message);
        setError("Failed to load your roles.");
      } else {
        setUserRoles(data || []);
      }
      setLoadingUserRoles(false);
    };

    fetchUserRoles();
  }, [userId]);

  // 5) If either building preset list or fetching user roles is in flight, show Loading
  if (presetLoading || loadingUserRoles) {
    return <div className="p-6">Loading…</div>;
  }
  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }
  if (!userId) {
    // Normally this never happens because you upstream guard via ProtectedRoute,
    // but just in case:
    return <div className="p-6">Please log in to continue.</div>;
  }

  // 6) Now we can render the actual "Define Your Roles" UI
  //    Example: show checkboxes for each preset under its category,
  //    plus a text input to add a custom role.
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Step 3 of 7: Define Your Roles</h1>
      <p className="text-gray-700 mb-6">
        Define the key roles that make up your authentic self. These roles will
        help guide your personal and professional development.
      </p>

      {/* Example: Group by category */}
      {["Family", "Professional", "Community", "Recreation", "Other"].map(
        (category) => {
          // Filter only those presetRoles in this category:
          const presetsInCategory = presetRoles.filter(
            (pr) => pr.category === category
          );
          if (presetsInCategory.length === 0) return null;

          return (
            <div key={category} className="mb-6">
              <h2 className="text-xl font-medium mb-2">{category}</h2>
              <div className="grid grid-cols-2 gap-3">
                {presetsInCategory.map((pr) => {
                  // Check if this preset role is already active for the user
                  const isActive = userRoles.some(
                    (ur) => ur.preset_role_id === pr.id && ur.is_active
                  );

                  // Handler to toggle this preset on/off
                  const togglePreset = async () => {
                    if (isActive) {
                      // If currently active, update is_active = false
                      await supabase
                        .from("0007-ap-roles")
                        .update({ is_active: false })
                        .eq("user_id", userId)
                        .eq("preset_role_id", pr.id);
                      // Remove from userRoles locally
                      setUserRoles((prev) =>
                        prev.filter((ur) => ur.preset_role_id !== pr.id)
                      );
                    } else {
                      // Not active yet → insert a new row
                      const { data, error } = await supabase
                        .from("0007-ap-roles")
                        .insert([
                          {
                            user_id: userId,
                            preset_role_id: pr.id,
                            label: pr.label,
                            is_active: true,
                          },
                        ])
                        .select()
                        .single();

                      if (!error && data) {
                        setUserRoles((prev) => [...prev, data]);
                      }
                    }
                  };

                  return (
                    <label
                      key={pr.id}
                      className={`flex items-center gap-2 p-3 border rounded-lg ${
                        isActive
                          ? "bg-emerald-100 border-emerald-400"
                          : "bg-white border-gray-300"
                      } cursor-pointer`}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={togglePreset}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{pr.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        }
      )}

      {/* 7) Custom "Other Role" input */}
      <div className="mb-8">
        <h2 className="text-xl font-medium mb-2">Add a Custom Role</h2>
        <CustomRoleInput
          userId={userId}
          userRoles={userRoles}
          setUserRoles={setUserRoles}
        />
      </div>

      {/* 8) Continue / Next button: only enabled if userRoles has at least one is_active */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => window.history.back()}
          className="text-gray-600 hover:underline"
        >
          ← Back
        </button>

        <button
          onClick={() => {
            // When the user has at least one role, mark onboardingComplete = true
            // Then navigate to the next step:
            supabase
              .from("users") // or wherever your "onboardingComplete" column lives
              .update({ onboardingComplete: true })
              .eq("id", userId)
              .then(() => {
                window.location.href = "/onboarding/vision";
              });
          }}
          disabled={!userRoles.some((ur) => ur.is_active)}
          className={`px-6 py-2 text-white rounded ${
            userRoles.some((ur) => ur.is_active)
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// 9) Helper component for Custom Role input
function CustomRoleInput({
  userId,
  userRoles,
  setUserRoles,
}: {
  userId: string;
  userRoles: UserRole[];
  setUserRoles: React.Dispatch<React.SetStateAction<UserRole[]>>;
}) {
  const [newLabel, setNewLabel] = useState("");

  const addCustomRole = async () => {
    if (!newLabel.trim()) return;

    // Insert a new "custom" role row (no preset_role_id)
    const { data, error } = await supabase
      .from("0007-ap-roles")
      .insert([
        {
          user_id: userId,
          label: newLabel.trim(),
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Failed to add custom role:", error.message);
      return;
    }
    // Add it locally so the checkbox appears immediately
    setUserRoles((prev) => [...prev, data]);
    setNewLabel("");
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        placeholder='Type a custom role (e.g. "Mentor")'
        value={newLabel}
        onChange={(e) => setNewLabel(e.target.value)}
        className="flex-1 border rounded px-3 py-2"
      />
      <button
        onClick={addCustomRole}
        disabled={!newLabel.trim()}
        className={`px-4 py-2 text-white rounded ${
          newLabel.trim() ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-300"
        }`}
      >
        Add
      </button>
    </div>
  );
}