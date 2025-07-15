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
  
  function calculateEndTime(startTime: string): string {
    // Add 1 hour to start time
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);
    date.setHours(date.getHours() + 1);
    return date.toTimeString().slice(0, 5);
  }

  const [form, setForm] = useState<TaskFormData>({
    title: "",
    isUrgent: false,
    isImportant: false,
    isAuthenticDeposit: false,
    isTwelveWeekGoal: false,
    selectedTwelveWeekGoal: "",
    dueDate: new Date().toISOString().split('T')[0],
    startTime: getDefaultTime(),
    endTime: calculateEndTime(getDefaultTime()),
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

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

  const generateEndTimeOptions = (startTime: string) => {
    if (!startTime) return [];
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(startHour, startMinute, 0, 0);
    
    const times = [];
    const endDate = new Date(startDate);
    
    // Start 15 minutes after start time
    endDate.setMinutes(endDate.getMinutes() + 15);
    
    // Generate options for the next 12 hours
    for (let i = 0; i < 48; i++) { // 48 x 15min = 12 hours
      const hour = endDate.getHours();
      const minute = endDate.getMinutes();
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Calculate duration
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationMinutes = Math.floor(durationMs / 60000);
      let durationText;
      
      if (durationMinutes < 60) {
        durationText = `(${durationMinutes} min${durationMinutes !== 1 ? 's' : ''})`;
      } else {
        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        durationText = mins === 0 ? `(${hours} hr${hours > 1 ? 's' : ''})` : `(${hours}.${mins === 30 ? '5' : mins === 15 ? '25' : '75'} hrs)`;
      }
      
      const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      times.push({ 
        value: timeString, 
        label: `${displayTime} ${durationText}` 
      });
      
      // Increment by 15 minutes
      endDate.setMinutes(endDate.getMinutes() + 15);
    }
    
    return times;
  };

  const timeOptions = generateTimeOptions();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('0007-ap-roles')
        .select('id, label, category')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('label');

      // Fetch domains
      const { data: domainsData } = await supabase
        .from('0007-ap-domains')
        .select('id, name')
        .order('name');

      // Fetch 12-week goals
      const { data: goalsData } = await supabase
        .from('0007-ap-goals_12wk_main')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('title');

      // Fetch key relationships
      const { data: relationshipsData } = await supabase
        .from('0007-ap-key_relationships')
        .select('id, name, role_id')
        .eq('user_id', user.id)
        .order('name');

      setRoles(rolesData || []);
      setDomains(domainsData || []);
      setTwelveWeekGoals(goalsData || []);
      setKeyRelationships(relationshipsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load form data');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMultiSelect = (name: string, value: string) => {
    setForm(prev => {
      const currentValues = prev[name as keyof TaskFormData] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [name]: newValues };
    });
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return 'Select date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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

  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const today = new Date();
    const selectedDate = form.dueDate ? new Date(form.dueDate) : null;

    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      days.push({
        date: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === today.toDateString(),
        isSelected: selectedDate && currentDate.toDateString() === selectedDate.toDateString(),
        fullDate: currentDate
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const handleDateSelect = (date: number) => {
    const selectedDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), date);
    const dateString = selectedDate.toISOString().split('T')[0];
    setForm(prev => ({ ...prev, dueDate: dateString }));
    setShowDatePicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create task
      const taskData = {
        user_id: user.id,
        title: form.title,
        due_date: form.dueDate || null,
        start_time: form.isAllDay ? null : `${form.dueDate}T${form.startTime}:00`,
        end_time: formType === 'event' && !form.isAllDay ? `${form.dueDate}T${form.endTime}:00` : null,
        is_urgent: form.isUrgent,
        is_important: form.isImportant,
        is_authentic_deposit: form.isAuthenticDeposit,
        is_twelve_week_goal: form.isTwelveWeekGoal,
        notes: form.notes || null,
        status: 'pending'
      };

      const { data: task, error: taskError } = await supabase
        .from('0007-ap-tasks')
        .insert(taskData)
        .select()
        .single();

      if (taskError) throw taskError;

      // Link to roles
      if (form.selectedRoleIds.length > 0) {
        const roleLinks = form.selectedRoleIds.map(roleId => ({
          task_id: task.id,
          role_id: roleId
        }));

        const { error: roleError } = await supabase
          .from('0007-ap-task_roles')
          .insert(roleLinks);

        if (roleError) throw roleError;
      }

      // Link to domains
      if (form.selectedDomainIds.length > 0) {
        const domainLinks = form.selectedDomainIds.map(domainId => ({
          task_id: task.id,
          domain_id: domainId
        }));

        const { error: domainError } = await supabase
          .from('0007-ap-task_domains')
          .insert(domainLinks);

        if (domainError) throw domainError;
      }

      // Link to 12-week goal if selected
      if (form.isTwelveWeekGoal && form.selectedTwelveWeekGoal) {
        const { error: goalError } = await supabase
          .from('0007-ap-task_12wkgoals')
          .insert({
            task_id: task.id,
            goal_id: form.selectedTwelveWeekGoal
          });

        if (goalError) throw goalError;
      }

      toast.success(`${formType === 'event' ? 'Event' : 'Task'} created successfully!`);
      onTaskCreated();
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error(`Failed to create ${formType === 'event' ? 'event' : 'task'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Create New {formType === 'event' ? 'Event' : 'Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {/* Priority Checkboxes */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Additional Options */}
          <div className="grid grid-cols-2 gap-4">
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isTwelveWeekGoal"
                checked={form.isTwelveWeekGoal}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <select
                name="selectedTwelveWeekGoal"
                value={form.selectedTwelveWeekGoal}
                onChange={handleChange}
                disabled={!form.isTwelveWeekGoal}
                className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">12-Week Goal</option>
                {twelveWeekGoals.map(goal => (
                  <option key={goal.id} value={goal.id}>{goal.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date and Time Section */}
          <div className="grid grid-cols-2 gap-2">
            {/* Date Picker */}
            <div className="relative" ref={datePickerRef}>
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
                  <div className="flex items-center gap-2">
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
                      className="w-32 text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
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
                      className="w-44 text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
              )}
            </div>

            {/* Time and All Day */}
            <div className="flex flex-col gap-1 relative">
              {formType === 'event' ? (
                <div className="flex items-center gap-2 w-full">
                  <select
                    name="startTime"
                    value={form.startTime}
                    onChange={(e) => {
                      const newStartTime = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        startTime: newStartTime,
                        endTime: calculateEndTime(newStartTime)
                      }));
                    }}
                    disabled={form.isAllDay}
                    className="w-32 text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
                  >
                    {timeOptions.map(time => (
                      <option key={time.value} value={time.value}>{time.label}</option>
                    ))}
                  </select>
                  <span className="text-gray-500 px-1">–</span>
                  <select
                    name="endTime"
                    value={form.endTime}
                    onChange={handleChange}
                    disabled={form.isAllDay}
                    className="w-40 text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
                  >
                    {generateEndTimeOptions(form.startTime).map(time => (
                      <option key={time.value} value={time.value}>{time.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <select
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  disabled={form.isAllDay}
                  className="w-24 text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
                >
                  {timeOptions.map(time => (
                    <option key={time.value} value={time.value}>{time.label}</option>
                  ))}
                </select>
              )}
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

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
              {roles.map(role => (
                <label key={role.id} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={form.selectedRoleIds.includes(role.id)}
                    onChange={() => handleMultiSelect('selectedRoleIds', role.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                    {role.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Domains */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Domains</label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
              {domains.map(domain => (
                <label key={domain.id} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={form.selectedDomainIds.includes(domain.id)}
                    onChange={() => handleMultiSelect('selectedDomainIds', domain.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-xs px-2 py-1 bg-blue-100 rounded-full">
                    {domain.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Key Relationships */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Key Relationships</label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
              {keyRelationships.map(relationship => (
                <label key={relationship.id} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={form.selectedKeyRelationshipIds.includes(relationship.id)}
                    onChange={() => handleMultiSelect('selectedKeyRelationshipIds', relationship.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-xs px-2 py-1 bg-green-100 rounded-full">
                    {relationship.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : `Create ${formType === 'event' ? 'Event' : 'Task'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;