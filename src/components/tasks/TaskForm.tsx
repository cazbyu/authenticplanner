import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

interface TaskFormProps {
  onClose: () => void;
  onTaskCreated: () => void;
  availableRoles?: any[];
  availableDomains?: any[];
  availableKeyRelationships?: any[];
}

interface TaskFormData {
  title: string;
  due_date: string;
  time: string;
  priority: number;
  notes: string;
  selectedRoleIds: string[];
  selectedDomainIds: string[];
  selectedKeyRelationshipIds: string[];
}

const TaskForm: React.FC<TaskFormProps> = ({
  onClose,
  onTaskCreated,
  availableRoles,
  availableDomains,
  availableKeyRelationships,
}) => {
  const [form, setForm] = useState<TaskFormData>({
    title: "",
    due_date: "",
    time: "",
    priority: 5,
    notes: "",
    selectedRoleIds: [],
    selectedDomainIds: [],
    selectedKeyRelationshipIds: [],
  });

  const [roles, setRoles] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [keyRelationships, setKeyRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    setLoading(true);

    try {
      if (availableRoles && availableDomains) {
        setRoles(availableRoles);
        setDomains(availableDomains);
        
        // Fetch key relationships separately
        try {
          const { data: keyRelData, error } = await supabase
            .from("0007-ap-key_relationships")
            .select("id, name, role_id");
          
          setKeyRelationships(keyRelData || []);
        } catch (err) {
          console.error('Could not load key relationships:', err);
          setKeyRelationships([]);
        }
        
        setLoading(false);
        return;
      }

      const [rolesResponse, domainsResponse, keyRelResponse] = await Promise.all([
        supabase.from("0007-ap-roles").select("id, label").eq("is_active", true),
        supabase.from("0007-ap-domains").select("id, name"),
        supabase.from("0007-ap-key_relationships").select("id, name, role_id"),
      ]);

      setRoles(rolesResponse.data || []);
      setDomains(domainsResponse.data || []);
      setKeyRelationships(keyRelResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleArrayField = (id: string, field: keyof Pick<TaskFormData, 'selectedRoleIds' | 'selectedDomainIds' | 'selectedKeyRelationshipIds'>) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter(item => item !== id)
        : [...prev[field], id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const taskData = {
        user_id: userData.user.id,
        title: form.title,
        due_date: form.due_date || null,
        time: form.time || null,
        priority: form.priority,
        notes: form.notes || null,
        status: "pending" as const,
      };

      const { data: task, error: taskError } = await supabase
        .from("0007-ap-tasks")
        .insert([taskData])
        .select()
        .single();

      if (taskError) throw taskError;

      // Insert role associations
      if (form.selectedRoleIds.length > 0) {
        const roleAssociations = form.selectedRoleIds.map(roleId => ({
          task_id: task.id,
          role_id: roleId,
        }));

        const { error: roleError } = await supabase
          .from("0007-ap-task_roles")
          .insert(roleAssociations);

        if (roleError) throw roleError;
      }

      // Insert domain associations
      if (form.selectedDomainIds.length > 0) {
        const domainAssociations = form.selectedDomainIds.map(domainId => ({
          task_id: task.id,
          domain_id: domainId,
        }));

        const { error: domainError } = await supabase
          .from("0007-ap-task_domains")
          .insert(domainAssociations);

        if (domainError) throw domainError;
      }

      onTaskCreated();
      onClose();
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Compact Title */}
            <div>
              <label className="block text-xs font-medium mb-1">Task Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter task title..."
              />
            </div>

            {/* Compact Date and Time */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  value={form.due_date}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Time</label>
                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Compact Priority */}
            <div>
              <label className="block text-xs font-medium mb-1">Priority (1-9)</label>
              <input
                type="number"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                min="1"
                max="9"
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Compact Roles Section */}
            <div>
              <h3 className="text-xs font-medium mb-1">Roles</h3>
              <div className="grid grid-cols-2 gap-1 border border-gray-200 p-2 rounded-md max-h-24 overflow-y-auto">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={form.selectedRoleIds.includes(role.id)}
                      onChange={() => toggleArrayField(role.id, "selectedRoleIds")}
                      className="h-3 w-3"
                    />
                    <span className="truncate">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Key Relationships Section - Only show when roles are selected */}
                <div className="border border-gray-200 p-2 rounded-md max-h-24 overflow-y-auto">
                  {(() => {
                    const filteredRelationships = keyRelationships.filter(rel => 
                      form.selectedRoleIds.includes(rel.role_id)
                    );
                    
                    if (filteredRelationships.length > 0) {
                      return (
                        <div className="grid grid-cols-2 gap-1">
                          {filteredRelationships.map((rel) => (
                            <label key={rel.id} className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={form.selectedKeyRelationshipIds.includes(rel.id)}
                                onChange={() => toggleArrayField(rel.id, "selectedKeyRelationshipIds")}
                                className="h-3 w-3"
                              />
                              <span className="truncate">{rel.name}</span>
                            </label>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-xs text-gray-500 text-center py-1">
                          No key relationships for selected roles
                        </p>
                      );
                    }
                  })()}
                </div>
              </div>
            )}

            {/* Compact Domains Section */}
            <div>
              <h3 className="text-xs font-medium mb-1">Domains</h3>
              <div className="grid grid-cols-2 gap-1 border border-gray-200 p-2 rounded-md max-h-24 overflow-y-auto">
                {domains.map((domain) => (
                  <label key={domain.id} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={form.selectedDomainIds.includes(domain.id)}
                      onChange={() => toggleArrayField(domain.id, "selectedDomainIds")}
                      className="h-3 w-3"
                    />
                    <span className="truncate">{domain.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Compact Notes */}
            <div>
              <label className="block text-xs font-medium mb-1">Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs min-h-[50px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Add notes..."
              />
            </div>

            {/* Compact Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {submitting ? "Creating..." : "Create Task"}
            </button>
          </form>
        </div>