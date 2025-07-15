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
    notes: ''
  });

  const [roles, setRoles] = useState<Role[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [keyRelationships, setKeyRelationships] = useState<KeyRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  const timeOptions = [
    { value: '00:00', label: '12:00 AM' },
    { value: '00:30', label: '12:30 AM' },
    { value: '01:00', label: '1:00 AM' },
    { value: '01:30', label: '1:30 AM' },
    { value: '02:00', label: '2:00 AM' },
    { value: '02:30', label: '2:30 AM' },
    { value: '03:00', label: '3:00 AM' },
    { value: '03:30', label: '3:30 AM' },
    { value: '04:00', label: '4:00 AM' },
    { value: '04:30', label: '4:30 AM' },
    { value: '05:00', label: '5:00 AM' },
    { value: '05:30', label: '5:30 AM' },
    { value: '06:00', label: '6:00 AM' },
    { value: '06:30', label: '6:30 AM' },
    { value: '07:00', label: '7:00 AM' },
    { value: '07:30', label: '7:30 AM' },
    { value: '08:00', label: '8:00 AM' },
    { value: '08:30', label: '8:30 AM' },
    { value: '09:00', label: '9:00 AM' },
    { value: '09:30', label: '9:30 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '10:30', label: '10:30 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '11:30', label: '11:30 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '12:30', label: '12:30 PM' },
    { value: '13:00', label: '1:00 PM' },
    { value: '13:30', label: '1:30 PM' },
    { value: '14:00', label: '2:00 PM' },
    { value: '14:30', label: '2:30 PM' },
    { value: '15:00', label: '3:00 PM' },
    { value: '15:30', label: '3:30 PM' },
    { value: '16:00', label: '4:00 PM' },
    { value: '16:30', label: '4:30 PM' },
    { value: '17:00', label: '5:00 PM' },
    { value: '17:30', label: '5:30 PM' },
    { value: '18:00', label: '6:00 PM' },
    { value: '18:30', label: '6:30 PM' },
    { value: '19:00', label: '7:00 PM' },
    { value: '19:30', label: '7:30 PM' },
    { value: '20:00', label: '8:00 PM' },
    { value: '20:30', label: '8:30 PM' },
    { value: '21:00', label: '9:00 PM' },
    { value: '21:30', label: '9:30 PM' },
    { value: '22:00', label: '10:00 PM' },
    { value: '22:30', label: '10:30 PM' },
    { value: '23:00', label: '11:00 PM' },
    { value: '23:30', label: '11:30 PM' }
  ];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchData();
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
    return timeOptions.slice(startIndex + 1);
  };

  const formatDateDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let startDateTime = null;
      let endTime = null;

      if (formType === 'event') {
        if (!form.isAllDay) {
          const startDate = new Date(form.dueDate);
          const [startHours, startMinutes] = form.startTime.split(':').map(Number);
          startDate.setHours(startHours, startMinutes, 0, 0);
          startDateTime = startDate.toISOString();
          endTime = form.endTime;
        }
      } else {
        if (!form.isAllDay) {
          const startDate = new Date(form.dueDate);
          const [startHours, startMinutes] = form.startTime.split(':').map(Number);
          startDate.setHours(startHours, startMinutes, 0, 0);
          startDateTime = startDate.toISOString();
        }
      }

      if (formType === 'event') {
        const eventData = {
          user_id: user.id,
          title: form.title,
          start_time: form.isAllDay ? new Date(form.dueDate).toISOString() : startDateTime,
          end_time: form.isAllDay ? null : endTime,
          all_day: form.isAllDay,
          description: form.notes || null
        };

        const { error } = await supabase
          .from('0007-ap-calendar-events')
          .insert([eventData]);

        if (error) throw error;
      } else {
        const taskData = {
          user_id: user.id,
          title: form.title,
          due_date: form.dueDate,
          time: form.isAllDay ? null : form.startTime,
          start_time: startDateTime,
          notes: form.notes || null,
          status: 'pending'
        };

        const { data: taskResponse, error: taskError } = await supabase
          .from('0007-ap-tasks')
          .insert([taskData])
          .select()
          .single();

        if (taskError) throw taskError;

        const taskId = taskResponse.id;

        if (form.selectedRoleIds.length > 0) {
          const roleLinks = form.selectedRoleIds.map(roleId => ({
            task_id: taskId,
            role_id: roleId
          }));

          const { error: roleError } = await supabase
            .from('0007-ap-task_roles')
            .insert(roleLinks);

          if (roleError) throw roleError;
        }

        if (form.selectedDomainIds.length > 0) {
          const domainLinks = form.selectedDomainIds.map(domainId => ({
            task_id: taskId,
            domain_id: domainId
          }));

          const { error: domainError } = await supabase
            .from('0007-ap-task_domains')
            .insert(domainLinks);

          if (domainError) throw domainError;
        }
      }

      onTaskCreated();
      onClose();
    } catch (error) {
      console.error('Error creating task/event:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
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

          {/* Date and Time */}
          <div className="flex gap-2">
            {/* Date Picker */}
            <div className="flex-1 relative" ref={datePickerRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
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
            <div className="flex flex-col gap-1 relative">
              {formType === 'event' ? (
                <div className="flex items-center gap-1 w-full">
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
                    className="w-24 text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
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
                    className="w-36 text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
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