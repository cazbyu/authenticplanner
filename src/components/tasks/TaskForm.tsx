import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface TaskFormProps {
  onClose: () => void;
  onTaskCreated: () => void;
  formType: 'task' | 'event';
}

interface FormData {
  title: string;
  dueDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  selectedRoleIds: string[];
  selectedDomainIds: string[];
  selectedKeyRelationshipIds: string[];
  notes: string;
  urgent?: boolean;
  important?: boolean;
  authenticDeposit?: boolean;
  twelveWeekGoalChecked?: boolean;
  twelveWeekGoalId?: string;
}

interface Role {
  id: string;
  label: string;
}

interface Domain {
  id: string;
  name: string;
}

interface KeyRelationship {
  id: string;
  name: string;
  role_id: string;
}

interface TwelveWeekGoal {
  id: string;
  name: string;  // Adjust if your field is 'title' instead
}

function calculateDuration(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  const diff = endMinutes - startMinutes;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  let result = "";
  if (hours) result += `${hours} hr${hours > 1 ? "s" : ""}`;
  if (minutes) result += (result ? " " : "") + `${minutes} min`;
  return result || "0 min";
}

const timeOptions = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  const label = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return {
    value: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    label,
  };
});

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const TaskForm: React.FC<TaskFormProps> = ({ onClose, onTaskCreated, formType }) => {
  const [form, setForm] = useState<FormData>({
    title: '',
    dueDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    isAllDay: false,
    selectedRoleIds: [],
    selectedDomainIds: [],
    selectedKeyRelationshipIds: [],
    notes: '',
    urgent: false,
    important: false,
    authenticDeposit: false,
    twelveWeekGoalChecked: false,
    twelveWeekGoalId: '',
  });

  const [roles, setRoles] = useState<Role[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);
  const [twelveWeekGoals, setTwelveWeekGoals] = useState<TwelveWeekGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    fetchTwelveWeekGoals();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [rolesResponse, domainsResponse, relationshipsResponse] = await Promise.all([
        supabase.from('0007-ap-roles').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('0007-ap-domains').select('*'),
        supabase.from('0007-ap-key_relationships').select('*').eq('user_id', user.id)
      ]);

      if (rolesResponse.data) setRoles(rolesResponse.data);
      if (domainsResponse.data) setDomains(domainsResponse.data);
      if (relationshipsResponse.data) setKeyRelationships(relationshipsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // NEW: Fetch only active 12-Week Goals for dropdown
  const fetchTwelveWeekGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('0007-ap-goals_12wk_main')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');
      if (error) throw error;
      setTwelveWeekGoals(data || []);
    } catch (error) {
      setTwelveWeekGoals([]);
      console.error('Error fetching 12-Week Goals:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMultiSelect = (field: keyof FormData, value: string) => {
    setForm(prev => {
      const currentArray = prev[field] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [field]: newArray };
    });
  };

  const calculateEndTime = (startTime: string): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + 60;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const generateEndTimeOptions = (startTime: string) => {
    const startIndex = timeOptions.findIndex(option => option.value === startTime);
    return timeOptions.slice(startIndex + 1).map(option => ({
      ...option,
      duration: calculateDuration(startTime, option.value)
    }));
  };

  const formatDateDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calendar helpers...
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(calendarDate);
    const firstDay = getFirstDayOfMonth(calendarDate);
    const days = [];

    const prevMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: daysInPrevMonth - i,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false
      });
    }

    const today = new Date();
    const selectedDate = new Date(form.dueDate);

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
      days.push({
        date: day,
        isCurrentMonth: true,
        isSelected: currentDate.toDateString() === selectedDate.toDateString(),
        isToday: currentDate.toDateString() === today.toDateString()
      });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: day,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false
      });
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    const dateString = selectedDate.toISOString().split('T')[0];
    setForm(prev => ({ ...prev, dueDate: dateString }));
    setShowDatePicker(false);
  };

  const calendarDays = generateCalendarDays();

 const handleSubmit = async (e) => {
  e.preventDefault();
  if (!form.title.trim()) return;
  setLoading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let record = {
      user_id: user.id,
      title: form.title,
      notes: form.notes || null,
      is_urgent: form.urgent,
      is_important: form.important,
      is_authentic_deposit: form.authenticDeposit,
      is_twelve_week_goal: form.twelveWeekGoalChecked,
      type: formType, // <--- The key change!
    };

    if (formType === 'event') {
      // Set event fields
      const startDate = new Date(form.dueDate);
      const [startHours, startMinutes] = form.startTime.split(':').map(Number);
      startDate.setHours(startHours, startMinutes, 0, 0);
      const startDateTime = startDate.toISOString();

      let endDateTime = null;
      if (!form.isAllDay && form.endTime) {
        const endDate = new Date(form.dueDate);
        const [endHours, endMinutes] = form.endTime.split(':').map(Number);
        endDate.setHours(endHours, endMinutes, 0, 0);
        endDateTime = endDate.toISOString();
      }

      record = {
        ...record,
        start_time: form.isAllDay ? new Date(form.dueDate).toISOString() : startDateTime,
        end_time: form.isAllDay ? null : endDateTime,
        is_all_day: form.isAllDay,
        due_date: null // Or: new Date(form.dueDate).toISOString().split('T')[0]
      };
    } else {
      // Set task fields
      record = {
        ...record,
        due_date: form.dueDate,
        time: form.isAllDay ? null : form.startTime,
        start_time: null,
        end_time: null,
        is_all_day: false
      };
    }

    // Insert to tasks table
    const { data: response, error } = await supabase
      .from('0007-ap-tasks')
      .insert([record])
      .select()
      .single();

    if (error) throw error;
    const taskId = response.id;

    // (roles/domains/keyRelationships logic as before...)

    onTaskCreated();
    onClose();
  } catch (error) {
    console.error('Error creating task/event:', error);
  } finally {
    setLoading(false);
  }
};

function handle12WeekGoalToggle() {
  setForm(prev => ({
    ...prev,
    twelveWeekGoalChecked: !prev.twelveWeekGoalChecked,
  }));
}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-50 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-100 rounded-t-lg">
          <h2 className="text-lg font-semibold text-gray-900">
            Create {formType === 'event' ? 'Event' : 'Task'}
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
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={`Enter ${formType} title...`}
            />
          </div>
          {/* Checkboxes row */}
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                name="urgent"
                checked={form.urgent || false}
                onChange={handleChange}
                className="h-4 w-4"
              />
              Urgent
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                name="important"
                checked={form.important || false}
                onChange={handleChange}
                className="h-4 w-4"
              />
              Important
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                name="authenticDeposit"
                checked={form.authenticDeposit || false}
                onChange={handleChange}
                className="h-4 w-4"
              />
              Authentic Deposit
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                name="twelveWeekGoalChecked"
                checked={form.twelveWeekGoalChecked}
                onChange={handle12WeekGoalToggle}
                className="h-4 w-4"
              />
              12-Week Goal
            </label>
          </div>
          {/* 12-Week Goal Section */}
          {form.twelveWeekGoalChecked && (
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Choose 12-Week Goal</label>
              <select
                name="twelveWeekGoalId"
                value={form.twelveWeekGoalId || ''}
                onChange={handleChange}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="">Select Goal...</option>
                {twelveWeekGoals.length === 0 && (
                  <option value="" disabled>No active goals found</option>
                )}
                {twelveWeekGoals.map(goal => (
                  <option key={goal.id} value={goal.id}>{goal.title}</option>
                ))}
              </select>
            </div>
          )}
          {/* Date/Time Row */}
          <div className="flex items-center gap-2 mb-2">
            {/* Date Picker */}
            <div className="w-48 relative" ref={datePickerRef}>
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700 flex-1">{formatDateDisplay(form.dueDate)}</span>
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </button>
              {showDatePicker && (
                <div className="absolute z-10 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => navigateMonth('prev')}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-medium text-gray-700">
                      {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigateMonth('next')}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 mb-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                      <span key={day} className="text-center">{day}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`
                          p-1 rounded-full transition-colors
                          ${day.isCurrentMonth
                          ? day.isSelected
                            ? 'bg-blue-600 text-white'
                            : day.isToday
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-white text-gray-800 hover:bg-gray-100'
                          : 'text-gray-300'}
                        `}
                        onClick={() => day.isCurrentMonth && handleDateSelect(day.date)}
                        disabled={!day.isCurrentMonth}
                      >
                        {day.date}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Time Picker */}
            {formType === 'event' ? (
              <div className="flex items-center gap-1">
                {/* Start Time */}
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
                  className="w-24 text-xs border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
                >
                  {timeOptions.map(time => (
                    <option key={time.value} value={time.value}>{time.label}</option>
                  ))}
                </select>
                <span className="text-gray-500 px-1">–</span>
                {/* End Time */}
                <select
                  name="endTime"
                  value={form.endTime}
                  onChange={handleChange}
                  disabled={form.isAllDay}
                  className="w-24 text-xs border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
                >
                  {generateEndTimeOptions(form.startTime).map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} {option.duration ? `(${option.duration})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <select
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  disabled={form.isAllDay}
                  className="w-24 text-xs border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
                >
                  {timeOptions.map(time => (
                    <option key={time.value} value={time.value}>{time.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {/* All Day Row */}
          <div className="mb-2">
            <label className="flex items-center gap-2 text-xs">
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
          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
              <div className="grid grid-cols-3 gap-x-4 gap-y-0.5">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center text-sm py-0.5 min-h-[28px]">
                    <input
                      type="checkbox"
                      checked={form.selectedRoleIds.includes(role.id)}
                      onChange={() => handleMultiSelect('selectedRoleIds', role.id)}
                      className="h-4 w-4 mr-1"
                      style={{ flexShrink: 0 }}
                    />
                    <span className={
                      "text-xs" +
                      (role.label.length > 15 ? " hanging-indent" : "")
                    }
                      style={
                        role.label.length > 15
                          ? { display: 'block', paddingLeft: '12px', textIndent: '-12px', whiteSpace: 'normal', overflowWrap: 'break-word' }
                          : { display: 'block', whiteSpace: 'normal', overflowWrap: 'break-word' }
                      }
                    > {role.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {/* Domains */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Domains</label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
              <div className="grid grid-cols-3 gap-2">
                {domains.map(domain => (
                  <label key={domain.id} className="flex items-center gap-2 text-sm py-1">
                    <input
                      type="checkbox"
                      checked={form.selectedDomainIds.includes(domain.id)}
                      onChange={() => handleMultiSelect('selectedDomainIds', domain.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-xs">{domain.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {/* Key Relationships */}
          {form.selectedRoleIds.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Key Relationships</label>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                {keyRelationships.filter(relationship => form.selectedRoleIds.includes(relationship.role_id)).length === 0 ? (
                  <div className="text-gray-400 text-xs italic px-2 py-2">
                    No Key Relationships have been selected yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {keyRelationships
                      .filter(relationship => form.selectedRoleIds.includes(relationship.role_id))
                      .map(relationship => (
                        <label key={relationship.id} className="flex items-center gap-2 text-sm py-1">
                          <input
                            type="checkbox"
                            checked={form.selectedKeyRelationshipIds.includes(relationship.id)}
                            onChange={() => handleMultiSelect('selectedKeyRelationshipIds', relationship.id)}
                            className="h-4 w-4"
                          />
                          <span className="text-xs">{relationship.name}</span>
                        </label>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
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