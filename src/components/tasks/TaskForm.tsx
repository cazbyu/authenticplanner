import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "sonner";
import { Calendar, Clock, Repeat, ChevronDown, X } from "lucide-react";

interface Role {
  id: string;
  label: string;
}

interface Domain {
  id: string;
  name: string;
}

interface TaskFormValues {
  title: string;
  isAuthenticDeposit: boolean;
  isTwelveWeekGoal: boolean;
  isUrgent: boolean;
  isImportant: boolean;
  dueDate: string;
  startTime: string;
  endTime: string;
  notes: string;
  selectedRoleIds: string[];
  selectedDomainIds: string[];
  schedulingType: 'unscheduled' | 'scheduled' | 'daily' | 'weekly' | 'custom';
  customRecurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[];
    endType: 'never' | 'on' | 'after';
    endDate?: string;
    occurrences?: number;
  };
}

interface TaskFormProps {
  onClose?: () => void;
  availableRoles?: Role[];
  availableDomains?: Domain[];
  onTaskCreated?: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onClose, availableRoles, availableDomains, onTaskCreated }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomRecurrence, setShowCustomRecurrence] = useState(false);

  const [form, setForm] = useState<TaskFormValues>({
    title: "",
    isAuthenticDeposit: false,
    isTwelveWeekGoal: false,
    isUrgent: false,
    isImportant: false,
    dueDate: new Date().toISOString().split('T')[0],
    startTime: "",
    endTime: "",
    notes: "",
    selectedRoleIds: [],
    selectedDomainIds: [],
    schedulingType: 'unscheduled',
    customRecurrence: {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [],
      endType: 'never',
      endDate: '',
      occurrences: 10
    }
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchLists = async () => {
      setLoading(true);

      try {
        if (availableRoles && availableDomains) {
          setRoles(availableRoles);
          setDomains(availableDomains);
          setLoading(false);
          return;
        }

        const [roleRes, domainRes] = await Promise.all([
          supabase
            .from("0007-ap-roles")
            .select("id, label")
            .eq("user_id", userId)
            .eq("is_active", true),
          supabase.from("0007-ap-domains").select("id, name"),
        ]);

        if (roleRes.error || domainRes.error) {
          setError("Failed to load roles/domains.");
        } else {
          setRoles(roleRes.data || []);
          setDomains(domainRes.data || []);
        }
      } catch (err) {
        console.error('Error fetching roles/domains:', err);
        setError("Failed to load roles/domains.");
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, [userId, availableRoles, availableDomains]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleArrayField = (
    id: string,
    field: "selectedRoleIds" | "selectedDomainIds"
  ) => {
    setForm((prev) => {
      const exists = prev[field].includes(id);
      const updated = exists
        ? prev[field].filter((rid) => rid !== id)
        : [...prev[field], id];
      return { ...prev, [field]: updated };
    });
  };

  const convertToUTC = (dateStr: string, timeStr: string): string | null => {
    if (!dateStr || !timeStr) return null;
    const localDateTime = new Date(`${dateStr}T${timeStr}:00`);
    return localDateTime.toISOString();
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        times.push({ value: timeString, label: displayTime });
      }
    }
    return times;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSchedulingTypeChange = (type: TaskFormValues['schedulingType']) => {
    setForm(prev => ({
      ...prev,
      schedulingType: type,
      startTime: type === 'unscheduled' ? '' : prev.startTime,
      endTime: type === 'unscheduled' ? '' : prev.endTime
    }));

    if (type === 'custom') {
      setShowCustomRecurrence(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const startTimeUTC = convertToUTC(form.dueDate, form.startTime);
      const endTimeUTC = form.endTime ? convertToUTC(form.dueDate, form.endTime) : null;

      const { data: taskRow, error: taskErr } = await supabase
        .from("0007-ap-tasks")
        .insert([
          {
            user_id: userId,
            title: form.title.trim(),
            is_authentic_deposit: form.isAuthenticDeposit,
            is_twelve_week_goal: form.isTwelveWeekGoal,
            is_urgent: form.isUrgent,
            is_important: form.isImportant,
            due_date: form.dueDate || null,
            start_time: startTimeUTC,
            end_time: endTimeUTC,
            notes: form.notes.trim() || null,
            percent_complete: 0,
            status: 'pending'
          },
        ])
        .select()
        .single();

      if (taskErr) {
        console.error('Task creation error:', taskErr);
        setError(`Failed to create task: ${taskErr.message}`);
        return;
      }

      if (!taskRow) {
        setError("Failed to create task: No data returned");
        return;
      }

      const linkPromises: Promise<any>[] = [];

      if (form.selectedRoleIds.length) {
        const roleInserts = form.selectedRoleIds.map((rid) => ({
          task_id: taskRow.id,
          role_id: rid,
        }));
        
        linkPromises.push(
          supabase
            .from("0007-ap-task_roles")
            .insert(roleInserts)
            .select()
        );
      }

      if (form.selectedDomainIds.length) {
        const domainInserts = form.selectedDomainIds.map((did) => ({
          task_id: taskRow.id,
          domain_id: did,
        }));
        
        linkPromises.push(
          supabase
            .from("0007-ap-task_domains")
            .insert(domainInserts)
            .select()
        );
      }

      const results = await Promise.all(linkPromises);
      const hasErrors = results.some(result => result.error);
      if (hasErrors) {
        console.warn('Some relationship inserts failed, but task was created');
      }

      setForm({
        title: "",
        isAuthenticDeposit: false,
        isTwelveWeekGoal: false,
        isUrgent: false,
        isImportant: false,
        dueDate: new Date().toISOString().split('T')[0],
        startTime: "",
        endTime: "",
        notes: "",
        selectedRoleIds: [],
        selectedDomainIds: [],
        schedulingType: 'unscheduled',
        customRecurrence: {
          frequency: 'weekly',
          interval: 1,
          daysOfWeek: [],
          endType: 'never',
          endDate: '',
          occurrences: 10
        }
      });

      toast.success("Task created successfully!");

      if (onTaskCreated) {
        onTaskCreated();
      } else if (onClose) {
        onClose();
      }

    } catch (err) {
      console.error('Unexpected error creating task:', err);
      setError("An unexpected error occurred while creating the task.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-sm">Loading…</div>;

  const timeOptions = generateTimeOptions();

  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg shadow-xl p-5 max-h-[90vh] overflow-y-auto">
      {/* Close button only */}
      <div className="flex justify-end mb-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close form"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-2 mb-3">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Task title input - no label, just placeholder */}
        <div>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Add Task Title"
            required
          />
        </div>

        {/* Urgent and Important checkboxes immediately below title */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="isUrgent"
              checked={form.isUrgent}
              onChange={handleChange}
              className="h-3 w-3"
            />
            Urgent
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="isImportant"
              checked={form.isImportant}
              onChange={handleChange}
              className="h-3 w-3"
            />
            Important
          </label>
        </div>

        {/* Date/Time Section - Inline and compact */}
        <div className="flex items-center gap-2 py-2">
          {/* Date Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <Calendar className="h-3 w-3 text-gray-500" />
              <span className="text-gray-700">{formatDateDisplay(form.dueDate)}</span>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>
            
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-2">
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => {
                    setForm(prev => ({ ...prev, dueDate: e.target.value }));
                    setShowDatePicker(false);
                  }}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                />
              </div>
            )}
          </div>

          {/* Scheduling Dropdown */}
          <div className="flex-1">
            <select
              value={form.schedulingType}
              onChange={(e) => handleSchedulingTypeChange(e.target.value as TaskFormValues['schedulingType'])}
              className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="unscheduled">Task only – track as unscheduled priority</option>
              <option value="scheduled">Schedule at specific time</option>
              <option value="daily">Repeat Daily</option>
              <option value="weekly">Repeat same day each week</option>
              <option value="custom">Custom Repeat…</option>
            </select>
          </div>
        </div>

        {/* Time Selection - Only show when scheduled */}
        {form.schedulingType === 'scheduled' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">Start time</label>
              <select
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select time</option>
                {timeOptions.map(time => (
                  <option key={time.value} value={time.value}>{time.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">End time</label>
              <select
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select time</option>
                {timeOptions.map(time => (
                  <option key={time.value} value={time.value}>{time.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Custom Recurrence Modal */}
        {showCustomRecurrence && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 max-w-sm w-full mx-4">
              <h3 className="text-sm font-medium mb-3">Custom recurrence</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs">Repeat every</span>
                  <input
                    type="number"
                    min="1"
                    value={form.customRecurrence?.interval || 1}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      customRecurrence: {
                        ...prev.customRecurrence!,
                        interval: parseInt(e.target.value)
                      }
                    }))}
                    className="w-12 text-xs border border-gray-300 rounded px-1 py-0.5"
                  />
                  <select
                    value={form.customRecurrence?.frequency || 'week'}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      customRecurrence: {
                        ...prev.customRecurrence!,
                        frequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                      }
                    }))}
                    className="text-xs border border-gray-300 rounded px-2 py-0.5"
                  >
                    <option value="daily">day</option>
                    <option value="weekly">week</option>
                    <option value="monthly">month</option>
                  </select>
                </div>

                {form.customRecurrence?.frequency === 'weekly' && (
                  <div>
                    <div className="text-xs mb-2">Repeat on</div>
                    <div className="flex gap-1">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            const daysOfWeek = form.customRecurrence?.daysOfWeek || [];
                            const newDays = daysOfWeek.includes(index)
                              ? daysOfWeek.filter(d => d !== index)
                              : [...daysOfWeek, index];
                            setForm(prev => ({
                              ...prev,
                              customRecurrence: {
                                ...prev.customRecurrence!,
                                daysOfWeek: newDays
                              }
                            }));
                          }}
                          className={`w-6 h-6 text-xs rounded-full border ${
                            form.customRecurrence?.daysOfWeek?.includes(index)
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs mb-2">Ends</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="radio"
                        name="endType"
                        value="never"
                        checked={form.customRecurrence?.endType === 'never'}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          customRecurrence: {
                            ...prev.customRecurrence!,
                            endType: 'never'
                          }
                        }))}
                        className="h-3 w-3"
                      />
                      Never
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="radio"
                        name="endType"
                        value="on"
                        checked={form.customRecurrence?.endType === 'on'}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          customRecurrence: {
                            ...prev.customRecurrence!,
                            endType: 'on'
                          }
                        }))}
                        className="h-3 w-3"
                      />
                      On
                      <input
                        type="date"
                        value={form.customRecurrence?.endDate || ''}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          customRecurrence: {
                            ...prev.customRecurrence!,
                            endDate: e.target.value
                          }
                        }))}
                        className="text-xs border border-gray-300 rounded px-1 py-0.5 ml-1"
                        disabled={form.customRecurrence?.endType !== 'on'}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="radio"
                        name="endType"
                        value="after"
                        checked={form.customRecurrence?.endType === 'after'}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          customRecurrence: {
                            ...prev.customRecurrence!,
                            endType: 'after'
                          }
                        }))}
                        className="h-3 w-3"
                      />
                      After
                      <input
                        type="number"
                        min="1"
                        value={form.customRecurrence?.occurrences || 10}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          customRecurrence: {
                            ...prev.customRecurrence!,
                            occurrences: parseInt(e.target.value)
                          }
                        }))}
                        className="w-12 text-xs border border-gray-300 rounded px-1 py-0.5 ml-1"
                        disabled={form.customRecurrence?.endType !== 'after'}
                      />
                      occurrences
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomRecurrence(false);
                    setForm(prev => ({ ...prev, schedulingType: 'unscheduled' }));
                  }}
                  className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomRecurrence(false)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rest of the form fields - reduced spacing and font sizes */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="isAuthenticDeposit"
              checked={form.isAuthenticDeposit}
              onChange={handleChange}
              className="h-3 w-3"
            />
            Authentic Deposit
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="isTwelveWeekGoal"
              checked={form.isTwelveWeekGoal}
              onChange={handleChange}
              className="h-3 w-3"
            />
            12-Week Goal
          </label>
        </div>

        <div>
          <h3 className="text-xs font-medium mb-2">Roles</h3>
          <div className="grid grid-cols-2 gap-1 border border-gray-200 p-2 rounded-md max-h-32 overflow-y-auto">
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

        <div>
          <h3 className="text-xs font-medium mb-2">Domains</h3>
          <div className="grid grid-cols-2 gap-1 border border-gray-200 p-2 rounded-md max-h-32 overflow-y-auto">
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

        <div>
          <label className="block text-xs font-medium mb-1">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs min-h-[60px] focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Add any additional notes here..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {submitting ? "Creating Task..." : "Create Task"}
        </button>
      </form>
    </div>
  );
};

export default TaskForm;