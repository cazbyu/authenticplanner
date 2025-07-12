import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "sonner";
import { Calendar, Clock, Repeat, ChevronDown, X, ChevronLeft, ChevronRight, Check } from "lucide-react";

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
  selectedTwelveWeekGoal: string;
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

interface TwelveWeekGoal {
  id: string;
  title: string;
}

interface TaskFormProps {
  onClose?: () => void;
  availableRoles?: Role[];
  availableDomains?: Domain[];
  onTaskCreated?: () => void;
  initialFormData?: Partial<TaskFormValues>;
  // Legacy props for compatibility
  onSave?: (taskData: any) => void;
  onDelete?: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ 
  onClose, 
  availableRoles, 
  availableDomains, 
  onTaskCreated,
  initialFormData = {},
  // Legacy props
  onSave,
  onDelete
}) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [twelveWeekGoals, setTwelveWeekGoals] = useState<TwelveWeekGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomRecurrence, setShowCustomRecurrence] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<TaskFormValues>({
    title: "",
    isAuthenticDeposit: false,
    selectedTwelveWeekGoal: "",
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
    },
    ...initialFormData // Apply initial form data from props
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

        const [roleRes, domainRes, twelveWeekGoalsRes] = await Promise.all([
          supabase
            .from("0007-ap-roles")
            .select("id, label")
            .eq("user_id", userId)
            .eq("is_active", true),
          supabase.from("0007-ap-domains").select("id, name"),
          supabase
            .from("0007-ap-goals_12wk_main")
            .select("id, title")
            .eq("user_id", userId)
            .eq("status", "active")
        ]);

        if (roleRes.error || domainRes.error) {
          setError("Failed to load roles/domains.");
        } else {
          setRoles(roleRes.data || []);
          setDomains(domainRes.data || []);
          setTwelveWeekGoals(twelveWeekGoalsRes.data || []);
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

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  const handleGoalSelection = (goalId: string) => {
    if (!goalId) return;
    
    // Special case for "Lose 5 pounds" - always check Physical domain
    if (goalId && twelveWeekGoals.find(g => g.id === goalId)?.title.toLowerCase().includes('lose 5 pound')) {
      // Find Physical domain ID
      const physicalDomain = domains.find(d => d.name.toLowerCase() === 'physical');
      if (physicalDomain && !form.selectedDomainIds.includes(physicalDomain.id)) {
        setForm(prev => ({
          ...prev,
          selectedDomainIds: [...prev.selectedDomainIds, physicalDomain.id]
        }));
        return;
      }
    }
    
    // Find the selected goal
    const selectedGoal = twelveWeekGoals.find(g => g.id === goalId);
    if (!selectedGoal) return;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    // Special handling for Authentic Deposit checkbox - only show role modal if no roles selected
    if (name === 'isAuthenticDeposit' && type === 'checkbox' && checked) {
      // Only show the role modal if no roles are currently selected
      if (form.selectedRoleIds.length === 0) {
        setShowRoleModal(true);
      }
    }
    
    // Special handling for 12-Week Goal selection
    if (name === 'selectedTwelveWeekGoal' && value) {
      handleGoalSelection(value);
    }
    
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

  const handleRoleSelection = (roleId: string) => {
    // Toggle the role selection (allow multiple selections)
    setForm(prev => ({
      ...prev,
      selectedRoleIds: prev.selectedRoleIds.includes(roleId) 
        ? prev.selectedRoleIds.filter(id => id !== roleId)
        : [...prev.selectedRoleIds, roleId]
    }));
  };

  // Convert time string to PostgreSQL TIME format (HH:MM:SS)
  const convertToTimeFormat = (timeStr: string): string | null => {
    if (!timeStr) return null;
    
    // If it's already in HH:MM format, add seconds
    if (timeStr.match(/^\d{2}:\d{2}$/)) {
      return `${timeStr}:00`;
    }
    
    // If it's in HH:MM:SS format, return as is
    if (timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) {
      return timeStr;
    }
    
    return null;
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

  // Calendar navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateSelect = (day: number) => {
    // Create date with local timezone and ensure we're using the correct day
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    // Create date at noon to avoid any timezone issues
    const selectedDate = new Date(year, month, day, 12, 0, 0);
    
    // Format date as YYYY-MM-DD ensuring we use local date components
    const formattedDay = String(day).padStart(2, '0');
    const formattedMonth = String(month + 1).padStart(2, '0');
    const dateString = `${year}-${formattedMonth}-${formattedDay}`;
    
    console.log('Selected date:', selectedDate, 'Formatted as:', dateString);
    setShowDatePicker(false);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const today = new Date();
    const selectedDate = new Date(form.dueDate);

    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = currentDate.toDateString() === today.toDateString();
      const isSelected = currentDate.toDateString() === selectedDate.toDateString();
      
      days.push({
        date: currentDate.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        fullDate: currentDate
      });
    }

    return days;
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
      // Convert times to PostgreSQL TIME format (HH:MM:SS) instead of full ISO datetime
      const startTimeFormatted = convertToTimeFormat(form.startTime);
      const endTimeFormatted = convertToTimeFormat(form.endTime);
      
      // For start_time, we still need the full datetime for calendar display
      const startTimeUTC = convertToUTC(form.dueDate, form.startTime);

      const { data: taskRow, error: taskErr } = await supabase
        .from("0007-ap-tasks")
        .insert([
          {
            user_id: userId,
            title: form.title.trim(),
            is_authentic_deposit: form.isAuthenticDeposit,
            is_twelve_week_goal: !!form.selectedTwelveWeekGoal,
            is_urgent: form.isUrgent,
            is_important: form.isImportant,
            due_date: form.dueDate || null,
            start_time: startTimeUTC, // Full datetime for calendar
            end_time: endTimeFormatted, // Just time format for PostgreSQL TIME field
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
        selectedTwelveWeekGoal: "",
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

      // Handle both new and legacy callback patterns
      if (onTaskCreated) {
        onTaskCreated();
      } else if (onSave) {
        onSave(taskRow);
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

  // Handle close/cancel action
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onDelete) {
      onDelete();
    }
  };

  if (loading) return <div className="text-sm">Loading…</div>;

  const timeOptions = generateTimeOptions();
  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden" style={{ maxHeight: '450px' }}>
      {/* Compact Header with Close Button */}
      <div className="flex justify-between items-center p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">New Task</h3>
        <button
          type="button"
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close form"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
        <div className="p-3">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2 mb-3">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Task title input - compact */}
            <div>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Add Task Title"
                required
              />
            </div>

            {/* Compact checkboxes in a 2x2 grid */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  name="isUrgent"
                  checked={form.isUrgent}
                  onChange={handleChange}
                  className="h-3 w-3"
                />
                Urgent
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  name="isImportant"
                  checked={form.isImportant}
                  onChange={handleChange}
                  className="h-3 w-3"
                />
                Important
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  name="isAuthenticDeposit"
                  checked={form.isAuthenticDeposit}
                  onChange={handleChange}
                  className="h-3 w-3"
                />
                Authentic Deposit
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  name="selectedTwelveWeekGoal"
                  checked={!!form.selectedTwelveWeekGoal}
                  onChange={handleChange}
                  className="h-3 w-3"
                />
                <select
                  name="selectedTwelveWeekGoal"
                  value={form.selectedTwelveWeekGoal}
                  onChange={handleChange}
                  className="text-xs border-none bg-transparent focus:outline-none"
                  disabled={!form.selectedTwelveWeekGoal && twelveWeekGoals.length === 0}
                >
                  <option value="">12-Week Goal</option>
                  {twelveWeekGoals.map(goal => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Compact Date/Time Section */}
            <div className="flex items-center gap-2 py-1 flex-wrap">
              {/* Compact Date Picker */}
              <div className="relative" ref={datePickerRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowDatePicker(!showDatePicker);
                    if (form.dueDate) {
                      setCalendarDate(new Date(form.dueDate));
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <Calendar className="h-3 w-3 text-gray-500" />
                  <span className="text-gray-700 truncate max-w-20">{formatDateDisplay(form.dueDate).split(',')[0]}</span>
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                </button>
                
                {/* Compact Calendar */}
                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2 w-56">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => navigateMonth('prev')}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <ChevronLeft className="h-3 w-3 text-gray-600" />
                      </button>
                      
                      <h3 className="text-xs font-medium text-gray-900">
                        {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                      </h3>
                      
                      <button
                        type="button"
                        onClick={() => navigateMonth('next')}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <ChevronRight className="h-3 w-3 text-gray-600" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                          {day}
                        </div>
                      ))}
                      
                      {calendarDays.map((day, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleDateSelect(day.date)}
                          className={`
                            text-xs p-1 rounded-full text-center transition-colors
                            ${!day.isCurrentMonth 
                              ? 'text-gray-300 hover:bg-gray-50' 
                              : day.isSelected
                              ? 'bg-blue-600 text-white'
                              : day.isToday
                              ? 'bg-blue-100 text-blue-600 font-medium hover:bg-blue-200'
                              : 'text-gray-700 hover:bg-gray-100'
                            }
                          `}
                        >
                          {day.date}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date();
                          const todayString = today.toISOString().split('T')[0];
                          setForm(prev => ({ ...prev, dueDate: todayString }));
                          setShowDatePicker(false);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Today
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Scheduling Dropdown - Reduced Width */}
              <div className="w-32">
                <select
                  value={form.schedulingType}
                  onChange={(e) => handleSchedulingTypeChange(e.target.value as TaskFormValues['schedulingType'])}
                  className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="unscheduled">Unscheduled</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Inline Time Selection - Only show when scheduled */}
              {form.schedulingType === 'scheduled' && (
                <>
                  <div className="w-24">
                    <select
                      name="startTime"
                      value={form.startTime}
                      onChange={handleChange}
                      className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Start</option>
                      {timeOptions.map(time => (
                        <option key={time.value} value={time.value}>{time.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <select
                      name="endTime"
                      value={form.endTime}
                      onChange={handleChange}
                      className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">End</option>
                      {timeOptions.map(time => (
                        <option key={time.value} value={time.value}>{time.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Keep the separate time section for other scheduling types if needed */}
            {form.schedulingType !== 'scheduled' && form.schedulingType !== 'unscheduled' && (
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
                <div className="bg-white rounded-lg p-3 max-w-xs w-full mx-4">
                  <h3 className="text-sm font-medium mb-2">Custom recurrence</h3>
                  
                  <div className="space-y-2">
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
                        className="w-10 text-xs border border-gray-300 rounded px-1 py-0.5"
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
                        <div className="text-xs mb-1">Repeat on</div>
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
                              className={`w-5 h-5 text-xs rounded-full border ${
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
                  </div>

                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomRecurrence(false);
                        setForm(prev => ({ ...prev, schedulingType: 'unscheduled' }));
                      }}
                      className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomRecurrence(false)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Compact Role Modal */}
            {showRoleModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-3 max-w-xs w-full mx-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      Which Roles?
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowRoleModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Close modal"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleSelection(role.id)}
                        className={`
                          flex items-center justify-between px-2 py-1 rounded-md border text-left transition-colors text-xs
                          ${form.selectedRoleIds.includes(role.id)
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                          }
                        `}
                      >
                        <span className="font-medium truncate pr-1">{role.label}</span>
                        {form.selectedRoleIds.includes(role.id) && (
                          <Check className="h-3 w-3 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {roles.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      No active roles found.
                    </p>
                  )}

                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowRoleModal(false)}
                      className="w-full px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}

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
      </div>
    </div>
  );
};

export default TaskForm;