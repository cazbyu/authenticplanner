import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "sonner";
import { Calendar, Clock, ChevronDown, ChevronLeft, ChevronRight, X, Check } from "lucide-react";

interface TaskFormProps {
  onClose: () => void;
  onTaskCreated: () => void;
  formType?: 'task' | 'event';
  initialFormData?: {
    selectedRoleIds?: string[];
  };
}

interface Role {
  id: string;
  label: string;
  category: string;
}

interface Domain {
  id: string;
  name: string;
}

interface TwelveWeekGoal {
  id: string;
  title: string;
}

interface KeyRelationship {
  id: string;
  name: string;
  role_id: string;
}

interface TaskFormData {
  title: string;
  isUrgent: boolean;
  isImportant: boolean;
  isAuthenticDeposit: boolean;
  isTwelveWeekGoal: boolean;
  selectedTwelveWeekGoal: string;
  dueDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  selectedRoleIds: string[];
  selectedDomainIds: string[];
  selectedKeyRelationshipIds: string[];
  notes: string;
}

const TaskForm: React.FC<TaskFormProps> = ({
  onClose,
  onTaskCreated,
  formType = 'task',
  initialFormData,
}) => {
  const [form, setForm] = useState<TaskFormData>({
    title: "",
    isUrgent: false,
    isImportant: false,
    isAuthenticDeposit: false,
    isTwelveWeekGoal: false,
    selectedTwelveWeekGoal: "",
    dueDate: new Date().toISOString().split('T')[0],
    startTime: getDefaultTime(),
    endTime: "",
    isAllDay: false,
    selectedRoleIds: initialFormData?.selectedRoleIds || [],
    selectedDomainIds: [],
    selectedKeyRelationshipIds: [],
    notes: "",
  });

  const [roles, setRoles] = useState<Role[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [twelveWeekGoals, setTwelveWeekGoals] = useState<TwelveWeekGoal[]>([]);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  function getDefaultTime(): string {
    const now = new Date();
    // Add 30 minutes and round up to nearest 30-minute slot
    now.setMinutes(now.getMinutes() + 30);
    const minutes = now.getMinutes();
    const roundedMinutes = minutes <= 30 ? 30 : 60;
    now.setMinutes(roundedMinutes);
    if (roundedMinutes === 60) {
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
    }
    return now.toTimeString().slice(0, 5);
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (form.selectedRoleIds.length > 0) {
      fetchKeyRelationships();
    } else {
      setKeyRelationships([]);
    }
  }, [form.selectedRoleIds]);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [rolesResponse, domainsResponse, goalsResponse] = await Promise.all([
        supabase
          .from("0007-ap-roles")
          .select("id, label, category")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order('category', { ascending: true })
          .order('label', { ascending: true }),
        supabase.from("0007-ap-domains").select("id, name").order('name', { ascending: true }),
        supabase
          .from("0007-ap-goals_12wk_main")
          .select("id, title")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order('title', { ascending: true }),
      ]);

      setRoles(rolesResponse.data || []);
      setDomains(domainsResponse.data || []);
      setTwelveWeekGoals(goalsResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const fetchKeyRelationships = async () => {
    try {
      const { data, error } = await supabase
        .from("0007-ap-key_relationships")
        .select("id, name, role_id")
        .in("role_id", form.selectedRoleIds);

      if (error) throw error;
      setKeyRelationships(data || []);
    } catch (error) {
      console.error("Error fetching key relationships:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleArrayField = (
    id: string,
    field: "selectedRoleIds" | "selectedDomainIds" | "selectedKeyRelationshipIds"
  ) => {
    setForm(prev => {
      const exists = prev[field].includes(id);
      const updated = exists
        ? prev[field].filter((item) => item !== id)
        : [...prev[field], id];
      return { ...prev, [field]: updated };
    });
  };

  const handleRoleSelection = (roleId: string) => {
    toggleArrayField(roleId, "selectedRoleIds");
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    try {
      const date = new Date(dateStr);
      return `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

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
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const formattedDay = String(day).padStart(2, '0');
    const formattedMonth = String(month + 1).padStart(2, '0');
    const dateString = `${year}-${formattedMonth}-${formattedDay}`;
    
    setForm(prev => ({ ...prev, dueDate: dateString }));
    setShowDatePicker(false);
  };

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

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    setSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Convert local times to UTC for storage
      const convertToUTC = (dateStr: string, timeStr: string): string | null => {
        if (!dateStr || (!timeStr && !form.isAllDay)) return null;
        const localDateTime = new Date(`${dateStr}T${timeStr || '00:00'}:00`);
        return localDateTime.toISOString();
      };

      const convertToTimeFormat = (timeStr: string): string | null => {
        if (!timeStr || form.isAllDay) return null;
        return timeStr.match(/^\d{2}:\d{2}$/) ? `${timeStr}:00` : timeStr;
      };

      const startTimeUTC = form.isAllDay ? null : convertToUTC(form.dueDate, form.startTime);
      const endTimeFormatted = form.isAllDay ? null : convertToTimeFormat(form.startTime);

      // For events, also handle end time
      const endTimeUTC = (formType === 'event' && !form.isAllDay && form.endTime) 
        ? convertToUTC(form.dueDate, form.endTime) 
        : null;

      const taskData = {
        user_id: userData.user.id,
        title: form.title.trim(),
        is_urgent: form.isUrgent,
        is_important: form.isImportant,
        is_authentic_deposit: form.isAuthenticDeposit,
        is_twelve_week_goal: form.isTwelveWeekGoal,
        due_date: form.dueDate,
        start_time: startTimeUTC,
        end_time: endTimeFormatted,
        end_time: formType === 'event' && form.endTime ? convertToTimeFormat(form.endTime) : endTimeFormatted,
        notes: form.notes.trim() || null,
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

      // Link to 12-week goal if selected
      if (form.isTwelveWeekGoal && form.selectedTwelveWeekGoal) {
        const { error: goalLinkError } = await supabase
          .from("0007-ap-goal_tasks")
          .insert([{
            goal_id: form.selectedTwelveWeekGoal,
            task_id: task.id,
          }]);

        if (goalLinkError) console.error("Error linking to 12-week goal:", goalLinkError);
      }

      toast.success("Task created successfully!");
      onTaskCreated();
      onClose();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
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

  const timeOptions = generateTimeOptions();
  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create New {formType === 'event' ? 'Event' : 'Task'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Title */}
            <div>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter task title..."
              />
            </div>

            {/* Checkboxes Row */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isUrgent"
                  checked={form.isUrgent}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                Urgent
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isImportant"
                  checked={form.isImportant}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                Important
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isAuthenticDeposit"
                  checked={form.isAuthenticDeposit}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                Authentic Deposit
              </label>
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isTwelveWeekGoal"
                  checked={form.isTwelveWeekGoal}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                <select
                  name="selectedTwelveWeekGoal"
              <div>
                <div className="flex gap-2 mb-1">
                  <div className="relative">
                    <select
                      name="startTime"
                      value={form.startTime}
                      onChange={handleChange}
                      disabled={form.isAllDay}
                      className="w-24 text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none pr-8"
                    >
                      {timeOptions.map(time => (
                        <option key={time.value} value={time.value}>{time.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  
                  {formType === 'event' && (
                    <div className="relative">
                      <select
                        name="endTime"
                        value={form.endTime}
                        onChange={handleChange}
                        disabled={form.isAllDay}
                        className="w-24 text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none pr-8"
                      >
                        <option value="">End time</option>
                        {timeOptions.map(time => (
                          <option key={time.value} value={time.value}>{time.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date and Time Section */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date Picker */}
              <div className="relative w-48" ref={datePickerRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowDatePicker(!showDatePicker);
                    if (form.dueDate) {
                      setCalendarDate(new Date(form.dueDate));
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-700 flex-1">{formatDateDisplay(form.dueDate)}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
                
                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2 w-56">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => navigateMonth('prev')}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4 text-gray-600" />
                      </button>
                      
                      <h3 className="text-xs font-medium text-gray-900">
                        {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                      </h3>
                      
                      <button
                        type="button"
                        onClick={() => navigateMonth('next')}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <div key={index} className="text-xs font-medium text-gray-500 text-center py-1">
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
                  </div>
                )}
              </div>

              {/* Time and All Day */}
              <div className="flex flex-col gap-1">
                <div className="relative w-full">
                  <select
                    name="startTime"
                    value={form.startTime}
                    onChange={handleChange}
                    disabled={form.isAllDay}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none pr-8"
                  >
                    {timeOptions.map(time => (
                      <option key={time.value} value={time.value}>{time.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isAllDay"
                    checked={form.isAllDay}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  All Day
                </label>
              </div>
            </div>

            {/* Roles Section */}
            <div>
              <h3 className="text-sm font-medium mb-2">Roles</h3>
              <div className="grid grid-cols-2 gap-2 border border-gray-200 p-3 rounded-md max-h-32 overflow-y-auto">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm">
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

            {/* Key Relationships Section */}
            {keyRelationships.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Key Relationships</h3>
                <div className="grid grid-cols-2 gap-2 border border-gray-200 p-3 rounded-md max-h-24 overflow-y-auto">
                  {keyRelationships.map((rel) => (
                    <label key={rel.id} className="flex items-center gap-2 text-sm">
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
              </div>
            )}

            {/* Domains Section */}
            <div>
              <h3 className="text-sm font-medium mb-2">Domains</h3>
              <div className="grid grid-cols-2 gap-2 border border-gray-200 p-3 rounded-md max-h-32 overflow-y-auto">
                {domains.map((domain) => (
                  <label key={domain.id} className="flex items-center gap-2 text-sm">
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

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Add notes..."
              />
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {submitting ? "Creating..." : "Save Task"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskForm;