import React, { useState, useEffect, useRef, forwardRef } from 'react';
import FullCalendar, { DatesSetArg, DateHeaderContentArg, EventClickArg, DateSelectArg, DateClickArg } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { supabase } from '../../supabaseClient';
import TaskEditModal from './TaskEditModal';
import TaskForm from '../tasks/TaskForm';
import { Task } from '../../types';

interface CalendarTask extends Task {
  start_time: string;
  end_time: string | null;
  is_authentic_deposit: boolean;
  is_twelve_week_goal: boolean;
}

interface CalendarViewProps {
  view: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth';
  currentDate: Date;
  onDateChange: (date: Date) => void;
  refreshTrigger?: number;
}

interface TimeSlotSelection {
  start: Date;
  end: Date;
  element: HTMLElement;
  allDay?: boolean;
}

interface TemporaryEvent {
  id: string;
  start: Date;
  end: Date;
  title: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  editable: boolean;
  startEditable: boolean;
  durationEditable: boolean;
}

const weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// This custom header ONLY for week/day, not month!
const customDayHeaderContent = (arg: DateHeaderContentArg) => {
  const today = new Date();
  const isToday = arg.date.toDateString() === today.toDateString();
  
  return {
    html: `
      <div class="day-name">${weekdayShort[arg.date.getDay()]}</div>
      <div class="day-number ${isToday ? 'is-today' : ''}">${arg.date.getDate()}</div>
    `,
  };
};

const CalendarView = forwardRef<FullCalendar, CalendarViewProps>(
  ({ view, currentDate, onDateChange, refreshTrigger = 0 }, ref) => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [delegatingTaskId, setDelegatingTaskId] = useState<string | null>(null);
    const [delegateForm, setDelegateForm] = useState({
      name: '',
      email: '',
      phone: '',
      notes: ''
    });
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlotSelection | null>(null);
    const [taskFormPosition, setTaskFormPosition] = useState<{ x: number; y: number } | null>(null);
    const [temporaryEvent, setTemporaryEvent] = useState<TemporaryEvent | null>(null);
    const calendarRef = useRef<FullCalendar | null>(null);
    const [calendarReady, setCalendarReady] = useState(false);

    // Keep both legacy and new ref for compatibility
    const fullCalendarRef = (ref as any) || calendarRef;

    const fetchTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data: tasks, error } = await supabase
          .from('0007-ap-tasks')
          .select(`
            id,
            title,
            start_time,
            end_time,
            is_authentic_deposit,
            is_twelve_week_goal,
            is_urgent,
            is_important,
            status,
            task_roles:0007-ap-task_roles(
              role:0007-ap-roles(id, label)
            ),
            task_domains:0007-ap-task_domains(
              domain:0007-ap-domains(id, name)
            )
          `)
          .eq('user_id', user.id)
          .not('start_time', 'is', null); // Only get tasks with start times

        if (error) {
          console.error('Error fetching tasks:', error);
          setLoading(false);
          return;
        }

        if (tasks) {
          const calendarEvents = tasks.map((task: CalendarTask) => ({
            id: task.id,
            title: task.title, // We'll format this in the eventContent render
            // FullCalendar automatically converts UTC times to local time for display
            start: task.start_time, // This is stored as UTC in database
            end: task.end_time || undefined, // This is also UTC
            extendedProps: {
              isUrgent: task.is_urgent,
              isImportant: task.is_important,
              isAuthenticDeposit: task.is_authentic_deposit,
              isTwelveWeekGoal: task.is_twelve_week_goal,
              status: task.status,
              roles: task.task_roles?.map((tr: any) => tr.role?.label).filter(Boolean) || [],
              domains: task.task_domains?.map((td: any) => td.domain?.name).filter(Boolean) || []
            },
            backgroundColor: task.status === 'completed' 
              ? '#10B981' // Green for completed tasks
              : task.status === 'delegated'
              ? '#9CA3AF' // Gray for delegated tasks
              : task.is_authentic_deposit
              ? '#10B981'
              : task.is_twelve_week_goal
              ? '#6366F1'
              : '#3B82F6',
            borderColor: 'transparent',
            textColor: 'white',
          }));
          setEvents(calendarEvents);
        }
      } catch (err) {
        console.error('Unexpected error fetching tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchTasks();
    }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

    // Handle calendar ready state and set initial scroll
    const handleCalendarReady = () => {
      if (fullCalendarRef && 'current' in fullCalendarRef && fullCalendarRef.current) {
        const calendarApi = fullCalendarRef.current.getApi();
        
        // Set scroll to current time for day/week views
        if (view === 'timeGridDay' || view === 'timeGridWeek') {
          // Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            const scrollerEl = calendarApi.el.querySelector('.fc-scroller');
            if (scrollerEl) {
              // Calculate current time position
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinute = now.getMinutes();
              
              // Calculate position based on current time (48px per hour, proportional for minutes)
              const scrollTop = (currentHour + currentMinute / 60) * 48;
              scrollerEl.scrollTop = scrollTop;
            }
          });
        }
        setCalendarReady(true);
      }
    };

    // Respond to prop changes
    useEffect(() => {
      if (fullCalendarRef && 'current' in fullCalendarRef && fullCalendarRef.current && calendarReady) {
        const calendarApi = fullCalendarRef.current.getApi();
        calendarApi.changeView(view);
        calendarApi.gotoDate(currentDate);
        
        // Set scroll position immediately for day/week views without animation
        if (view === 'timeGridDay' || view === 'timeGridWeek') {
          requestAnimationFrame(() => {
            const scrollerEl = calendarApi.el.querySelector('.fc-scroller');
            if (scrollerEl) {
              // Calculate current time position
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinute = now.getMinutes();
              
              // Calculate position based on current time (48px per hour, proportional for minutes)
              const scrollTop = (currentHour + currentMinute / 60) * 48;
              scrollerEl.scrollTop = scrollTop;
            }
          });
        }
      }
    }, [view, currentDate, fullCalendarRef, calendarReady]);

    const handleDatesSet = (arg: DatesSetArg) => {
      onDateChange(arg.view.currentStart);
      
      // Set scroll position after date change
      if ((view === 'timeGridDay' || view === 'timeGridWeek') && calendarReady) {
        setTimeout(() => {
          if (fullCalendarRef && 'current' in fullCalendarRef && fullCalendarRef.current) {
            const calendarApi = fullCalendarRef.current.getApi();
            const scrollerEl = calendarApi.el.querySelector('.fc-scroller');
            if (scrollerEl) {
              // Calculate current time position
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinute = now.getMinutes();
              
              // Calculate position based on current time (48px per hour, proportional for minutes)
              const scrollTop = (currentHour + currentMinute / 60) * 48;
              scrollerEl.scrollTop = scrollTop;
            }
          }
        }, 10);
      }
    };

    // Create temporary event block on calendar
    const createTemporaryEvent = (start: Date, end: Date) => {
      const tempEvent: TemporaryEvent = {
        id: 'temp-event',
        start,
        end,
        title: '(No title)',
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3B82F6',
        textColor: 'white',
        editable: true,
        startEditable: false, // Don't allow moving the start time
        durationEditable: true, // Allow resizing
      };
      
      setTemporaryEvent(tempEvent);
      
      // Add to calendar events temporarily
      if (fullCalendarRef && 'current' in fullCalendarRef && fullCalendarRef.current) {
        const calendarApi = fullCalendarRef.current.getApi();
        calendarApi.addEvent(tempEvent);
      }
    };

    // Remove temporary event from calendar
    const removeTemporaryEvent = () => {
      if (fullCalendarRef && 'current' in fullCalendarRef && fullCalendarRef.current && temporaryEvent) {
        const calendarApi = fullCalendarRef.current.getApi();
        const event = calendarApi.getEventById('temp-event');
        if (event) {
          event.remove();
        }
      }
      setTemporaryEvent(null);
    };

    // Smart form positioning - always next to the time block, never covering it
    const calculateSmartFormPosition = (clickRect: DOMRect, timeBlockRect?: DOMRect) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Compact form size (75% of original)
      const formWidth = 375; // 75% of 500px
      const formHeight = 450; // 75% of 600px
      
      // Use time block position if available, otherwise click position
      const targetRect = timeBlockRect || clickRect;
      
      let x = targetRect.right + 15; // Start to the right with some padding
      let y = targetRect.top;
      
      // Check if form fits to the right
      if (x + formWidth > viewportWidth - 20) {
        // Try to the left
        x = targetRect.left - formWidth - 15;
        
        // If still doesn't fit, center it but offset vertically
        if (x < 20) {
          x = Math.max(20, (viewportWidth - formWidth) / 2);
          y = targetRect.bottom + 10; // Position below the target
        }
      }
      
      // Ensure form doesn't go off bottom
      if (y + formHeight > viewportHeight - 20) {
        y = Math.max(20, viewportHeight - formHeight - 20);
      }
      
      // Ensure form doesn't go off top
      y = Math.max(20, y);
      
      return { x, y };
    };

    // Get the visual rectangle of the temporary event block
    const getTemporaryEventRect = (): DOMRect | null => {
      if (!fullCalendarRef || !('current' in fullCalendarRef) || !fullCalendarRef.current) return null;
      
      const calendarApi = fullCalendarRef.current.getApi();
      const calendarEl = calendarApi.el;
      const tempEventEl = calendarEl.querySelector('[data-event-id="temp-event"]');
      
      if (tempEventEl) {
        return tempEventEl.getBoundingClientRect();
      }
      
      return null;
    };

    // FIXED: Parse the exact date and time from the clicked slot with proper timezone handling
    const parseClickedDateTime = (dateClickInfo: DateClickArg): { start: Date; end: Date } => {
      const { date, allDay } = dateClickInfo;
      // Use the exact date from the click, but set hours to noon to avoid timezone issues
      const localDate = new Date(date);
      
      if (allDay || view === 'dayGridMonth') {
        // For month view or all-day clicks, use the exact date at start of day
        const start = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 0, 0, 0, 0);
        const end = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 23, 59, 59, 999);
        return { start, end };
      } else {
        // For time grid views, preserve the exact clicked time in local timezone
        const start = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 
                              localDate.getHours(), localDate.getMinutes(), 0, 0);
        const end = new Date(start.getTime() + (60 * 60 * 1000)); // Add 1 hour
        return { start, end };
      }
    };

    // Handle single date clicks (Google Calendar style)
    const handleDateClick = (dateClickInfo: DateClickArg) => {
      console.log('Date clicked:', dateClickInfo);
      
      const { jsEvent } = dateClickInfo;
      
      // Remove any existing temporary event
      removeTemporaryEvent();
      
      // FIXED: Parse the exact clicked date/time with proper timezone handling
      const { start, end } = parseClickedDateTime(dateClickInfo);
      
      if (dateClickInfo.allDay || view === 'dayGridMonth') {
        // For month view, create an all-day task
        setSelectedTimeSlot({
          start,
          end,
          element: jsEvent?.target as HTMLElement || document.body,
          allDay: true
        });
        
        // Position form for month view
        if (jsEvent) {
          const clickRect = (jsEvent.target as HTMLElement).getBoundingClientRect();
          const position = calculateSmartFormPosition(clickRect);
          setTaskFormPosition(position);
        } else {
          setTaskFormPosition(null);
        }
      } else {
        // For time grid views, create a timed slot
        // Create temporary event block on calendar
        createTemporaryEvent(start, end);
        
        setSelectedTimeSlot({
          start,
          end,
          element: jsEvent?.target as HTMLElement || document.body,
          allDay: false
        });
        
        // Wait for temporary event to render, then position form next to it
        setTimeout(() => {
          const clickRect = jsEvent ? (jsEvent.target as HTMLElement).getBoundingClientRect() : new DOMRect();
          const tempEventRect = getTemporaryEventRect();
          const position = calculateSmartFormPosition(clickRect, tempEventRect || undefined);
          setTaskFormPosition(position);
        }, 50);
      }
      
      setShowTaskForm(true);
    };

    // Handle drag selection (for creating longer events)
    const handleDateSelect = (selectInfo: DateSelectArg) => {
      console.log('Date range selected:', selectInfo);
      
      const { start, end, allDay, jsEvent } = selectInfo;
      
      // Remove any existing temporary event
      removeTemporaryEvent();
      
      // FIXED: Use the exact selected dates with proper timezone handling
      const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes(), 0, 0);
      const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes(), 0, 0);
      
      console.log('Selection parsed:', {
        originalStart: start.toLocaleString(),
        originalEnd: end.toLocaleString(),
        parsedStart: startDate.toLocaleString(),
        parsedEnd: endDate.toLocaleString(),
        allDay
      });
      
      setSelectedTimeSlot({
        start: startDate,
        end: endDate,
        element: jsEvent?.target as HTMLElement || document.body,
        allDay
      });

      // Create temporary event block for time grid views
      if (!allDay && (view === 'timeGridDay' || view === 'timeGridWeek')) {
        createTemporaryEvent(startDate, endDate);
        
        // Wait for temporary event to render, then position form next to it
        setTimeout(() => {
          const clickRect = jsEvent ? (jsEvent.target as HTMLElement).getBoundingClientRect() : new DOMRect();
          const tempEventRect = getTemporaryEventRect();
          const position = calculateSmartFormPosition(clickRect, tempEventRect || undefined);
          setTaskFormPosition(position);
        }, 50);
      } else {
        // Position form for month view or all-day events
        if (jsEvent) {
          const clickRect = (jsEvent.target as HTMLElement).getBoundingClientRect();
          const position = calculateSmartFormPosition(clickRect);
          setTaskFormPosition(position);
        } else {
          setTaskFormPosition(null);
        }
      }
      
      setShowTaskForm(true);
      
      // Clear the selection visually
      selectInfo.view.calendar.unselect();
    };

    // Handle event resizing (for temporary events) - REAL-TIME SYNC WITH FORM
    const handleEventResize = (resizeInfo: any) => {
      if (resizeInfo.event.id === 'temp-event' && temporaryEvent) {
        const newEnd = new Date(resizeInfo.event.end);
        
        // Snap to 15-minute intervals
        const minutes = newEnd.getMinutes();
        const snappedMinutes = Math.round(minutes / 15) * 15;
        newEnd.setMinutes(snappedMinutes, 0, 0);
        
        // Update the temporary event state
        setTemporaryEvent(prev => prev ? { ...prev, end: newEnd } : null);
        
        // Update the selected time slot - THIS WILL SYNC WITH THE FORM
        setSelectedTimeSlot(prev => prev ? { ...prev, end: newEnd } : null);
        
        console.log('Event resized to:', resizeInfo.event.start, '->', newEnd);
        
        // Update the actual event on the calendar to reflect the snapped time
        resizeInfo.event.setEnd(newEnd);
      }
    };

    const handleEventClick = (info: EventClickArg) => {
      // Don't edit temporary events
      if (info.event.id === 'temp-event') {
        return;
      }
      
      // Check if the click was on an action button
      const target = info.jsEvent.target as HTMLElement;
      if (target.classList.contains('event-action-complete')) {
        info.jsEvent.stopPropagation();
        handleTaskAction(info.event.id, 'complete');
        return;
      }
      
      if (target.classList.contains('event-action-delegate')) {
        info.jsEvent.stopPropagation();
        handleTaskAction(info.event.id, 'delegate');
        return;
      }
      
      if (target.classList.contains('event-action-cancel')) {
        info.jsEvent.stopPropagation();
        handleTaskAction(info.event.id, 'cancel');
        return;
      }
      
      // Prevent event bubbling to avoid triggering date click
      info.jsEvent.stopPropagation();
      // Open edit modal for the clicked task
      setEditingTaskId(info.event.id);
    };

    // Handle task actions (complete, delegate, cancel)
    const handleTaskAction = async (taskId: string, action: 'complete' | 'delegate' | 'cancel') => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        if (action === 'delegate') {
          // Show delegation form instead of immediate update
          setDelegatingTaskId(taskId);
        } else {
          const { error } = await supabase
            .from('0007-ap-tasks')
            .update({
              status: action === 'complete' ? 'completed' : action === 'delegate' ? 'delegated' : 'cancelled',
              cancelled: action === 'cancel' ? true : undefined,
              completed_at: action === 'complete' ? new Date().toISOString() : undefined,
            })
            .eq('id', taskId)
            .eq('user_id', user.id);
          
          if (error) {
            console.error(`Error ${action}ing task:`, error);
            return;
          }
          
          // Remove the event from the calendar
          if (fullCalendarRef && 'current' in fullCalendarRef && fullCalendarRef.current) {
            const calendarApi = fullCalendarRef.current.getApi();
            const event = calendarApi.getEventById(taskId);
            if (event) {
              if (action === 'complete') {
                // Change color to green instead of removing
                event.setProp('backgroundColor', '#10B981');
                event.setExtendedProp('status', 'completed');
              } else if (action === 'delegate') {
                // Change color to gray instead of removing
                event.setProp('backgroundColor', '#9CA3AF');
                event.setExtendedProp('status', 'delegated');
              } else {
                // Remove cancelled events
                event.remove();
              }
            }
          }
          
          // Refresh the tasks list
          fetchTasks();
        }
      } catch (err) {
        console.error(`Error ${action}ing task:`, err);
      }
    };

    const handleTaskCreated = () => {
      removeTemporaryEvent();
      setShowTaskForm(false);
      setSelectedTimeSlot(null);
      setTaskFormPosition(null);
      // Refresh the calendar
      fetchTasks();
    };

    const handleTaskFormClose = () => {
      removeTemporaryEvent();
      setShowTaskForm(false);
      setSelectedTimeSlot(null);
      setTaskFormPosition(null);
    };

    const handleTaskUpdated = () => {
      setEditingTaskId(null);
      // Refresh the calendar
      fetchTasks();
    };
    
    const handleDelegateSubmit = async () => {
      if (!delegatingTaskId || !delegateForm.name.trim()) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // First, create or find the delegate in the delegates table
        const { data: delegate, error: delegateError } = await supabase
          .from('0007-ap-delegates')
          .upsert({
            user_id: user.id,
            name: delegateForm.name.trim(),
            email: delegateForm.email.trim() || null,
            phone: delegateForm.phone.trim() || null,
            notes: delegateForm.notes.trim() || null
          }, { onConflict: 'user_id, name' })
          .select('id')
          .single();
        
        if (delegateError) {
          console.error('Error creating delegate:', delegateError);
          return;
        }
        
        // Update the task with delegation info
        const { error: taskError } = await supabase
          .from('0007-ap-tasks')
          .update({
            status: 'delegated',
            delegated_to_name: delegateForm.name.trim(),
            delegated_to_email: delegateForm.email.trim() || null,
            delegated_to_contact_id: delegate?.id || null
          })
          .eq('id', delegatingTaskId)
          .eq('user_id', user.id);
        
        if (taskError) {
          console.error('Error updating task with delegation:', taskError);
          return;
        }
        
        // Remove the event from the calendar
        if (fullCalendarRef && 'current' in fullCalendarRef && fullCalendarRef.current) {
          const calendarApi = fullCalendarRef.current.getApi();
          const event = calendarApi.getEventById(delegatingTaskId);
          if (event) {
            event.remove();
          }
        }
        
        // Reset form and close
        setDelegateForm({
          name: '',
          email: '',
          phone: '',
          notes: ''
        });
        setDelegatingTaskId(null);
        
        // Refresh tasks
        fetchTasks();
        
      } catch (err) {
        console.error('Error delegating task:', err);
      }
    };

    // FIXED: Convert selected time slot to form-compatible format with correct date/time handling
    const getInitialFormData = () => {
      if (!selectedTimeSlot) return {};

      const { start, end, allDay } = selectedTimeSlot;
      
      console.log('Converting to form data:', {
        start: start.toLocaleString(),
        end: end.toLocaleString(),
        allDay,
        startISO: start.toISOString(),
        endISO: end.toISOString()
      });
      
      if (allDay) {
        // For all-day events (month view), just set the date using local date components
        const year = start.getFullYear();
        const month = (start.getMonth() + 1).toString().padStart(2, '0');
        const day = start.getDate().toString().padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        console.log('All-day form data:', { dueDate: dateString });
        
        return {
          dueDate: dateString,
          schedulingType: 'unscheduled' as const,
        };
      } else {
        // For timed events, use local date/time components to avoid timezone issues
        const year = start.getFullYear();
        const month = (start.getMonth() + 1).toString().padStart(2, '0');
        const day = start.getDate().toString().padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        const startHours = start.getHours().toString().padStart(2, '0');
        const startMinutes = start.getMinutes().toString().padStart(2, '0');
        const startTime = `${startHours}:${startMinutes}`;
        
        const endHours = end.getHours().toString().padStart(2, '0');
        const endMinutes = end.getMinutes().toString().padStart(2, '0');
        const endTime = `${endHours}:${endMinutes}`;
        
        console.log('Timed form data:', {
          dueDate: dateString,
          startTime,
          endTime,
          schedulingType: 'scheduled'
        });
        
        return {
          dueDate: dateString,
          startTime,
          endTime,
          schedulingType: 'scheduled' as const,
        };
      }
    };

    if (loading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <style>
          {`
          .fc {
            height: 100% !important;
            font-family: inherit;
          }
          .fc-scroller, .fc-scroller.fc-scroller-liquid {
            overflow-y: auto !important;
            overscroll-behavior: contain !important;
            scroll-behavior: auto !important;
          }
          .fc-timegrid .fc-scroller-liquid {
            overflow-y: auto !important;
            overscroll-behavior: contain !important;
            scroll-behavior: auto !important;
          }
          .fc-theme-standard td, .fc-theme-standard th {
            border-color: #e5e7eb;
          }
          .fc-theme-standard th {
            padding: 0;
            border-right: none !important;
            border-bottom: none !important;
          }
          .fc-col-header-cell.fc-day {
            position: relative;
          }
          .fc-col-header-cell.fc-day:not(:last-child)::after {
            content: '';
            position: absolute;
            bottom: 0;
            right: 0;
            width: 1px;
            height: 6px;
            background-color: #e5e7eb;
          }
          .fc-col-header-cell-cushion {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 0;
            color: #4B5563;
            font-weight: 500;
            text-transform: uppercase;
            font-size: 0.75rem;
          }
          .fc-addEvent-button {
            display: none !important;
          }
          
          /* CRITICAL: Remove all hover effects - Google Calendar doesn't highlight on hover */
          .fc-timegrid-slot {
            height: 48px !important;
            border-bottom: 1px solid #f3f4f6 !important;
            position: relative;
            cursor: pointer !important;
            /* NO HOVER EFFECTS */
          }
          
          .fc-timegrid-slot:hover {
            /* REMOVED: No background change on hover */
          }
          
          .fc-timegrid-slot-label {
            font-size: 0.625rem !important;
            color: #9CA3AF !important;
            padding-right: 1rem;
            font-weight: 400 !important;
          }
          .fc-timegrid-axis {
            padding-right: 0.5rem;
          }
          .fc-timegrid-now-indicator-line {
            border-color: #EF4444;
          }
          .fc-timegrid-now-indicator-arrow {
            border-color: #EF4444;
          }
          .fc-col-header-cell {
            padding: 0;
            background: #fff;
          }
          .day-name {
            font-size: 0.625rem !important;
            font-weight: 400 !important;
            text-transform: uppercase;
            color: #9CA3AF !important;
            margin-bottom: 4px;
            letter-spacing: 0.05em;
          }
          .day-number {
            font-size: 1.125rem;
            font-weight: 600;
            color: #374151;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }
          .day-number.is-today {
            background-color: #3B82F6;
            color: white;
          }
          
          /* Month View Specific Styles */
          .fc-daygrid-view .fc-daygrid-day-frame {
            min-height: 100px;
            cursor: pointer !important;
          }
          
          /* CRITICAL: Remove month view hover effects too */
          .fc-daygrid-view .fc-daygrid-day-frame:hover {
            /* REMOVED: No background change on hover */
          }
          
          .fc-daygrid-view .fc-daygrid-day-top {
            justify-content: center;
            padding: 2px 0 1px 0;
            flex-direction: row;
          }
          .fc-daygrid-view .fc-daygrid-day-number {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            padding: 0 !important;
            font-size: 0.6875rem !important;
            font-weight: 500 !important;
            color: #374151;
            border-radius: 50%;
            cursor: pointer !important;
          }
          .fc-daygrid-view .fc-day-today .fc-daygrid-day-number {
            background: #3B82F6;
            color: white;
            font-weight: 600 !important;
          }
          
          /* Month view events - tiny like Google Calendar */
          .fc-daygrid-view .fc-event,
          .fc-daygrid-view .fc-event *,
          .fc-daygrid-view .fc-daygrid-event,
          .fc-daygrid-view .fc-daygrid-event *,
          .fc-daygrid-view .fc-event-main,
          .fc-daygrid-view .fc-event-main *,
          .fc-daygrid-view .fc-event-title,
          .fc-daygrid-view .fc-event-time {
            font-size: 0.3125rem !important;
            font-weight: 400 !important;
            line-height: 0.8 !important;
            padding: 0px !important;
            margin: 0px !important;
            height: auto !important;
            min-height: 8px !important;
            max-height: 8px !important;
            overflow: hidden !important;
            white-space: nowrap !important;
            text-overflow: ellipsis !important;
          }
          
          .fc-daygrid-view .fc-event,
          .fc-daygrid-view .fc-daygrid-event {
            height: 8px !important;
            min-height: 8px !important;
            max-height: 8px !important;
            border-radius: 1px !important;
            margin: 0px !important;
            padding: 0px 1px !important;
            cursor: pointer;
          }
          
          .fc-daygrid-view .fc-daygrid-day-events {
            margin-top: 1px;
            min-height: 8px;
          }
          
          .fc-daygrid-view .fc-daygrid-more-link,
          .fc-daygrid-view .fc-more-link {
            font-size: 0.25rem !important;
            color: #6B7280 !important;
            padding: 0px !important;
            margin: 0px !important;
            line-height: 0.8 !important;
            height: 8px !important;
            min-height: 8px !important;
            max-height: 8px !important;
          }
          
          .fc-daygrid-view .fc-col-header-cell-cushion {
            padding: 2px 0 !important;
            font-size: 0.3125rem !important;
            font-weight: 500 !important;
            color: #6B7280 !important;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            line-height: 1.0 !important;
          }
          
          .fc-timegrid-col-frame {
            background: white;
          }
          .fc-direction-ltr .fc-timegrid-now-indicator-arrow {
            border-width: 5px 0 5px 6px;
            border-top-color: transparent;
            border-bottom-color: transparent;
          }
          .fc-event {
            cursor: pointer;
          }
          .fc-event:hover {
            opacity: 0.8;
          }
          
          /* Selection feedback - only when actually selecting */
          .fc-highlight {
            background: rgba(59, 130, 246, 0.2) !important;
            border: 1px solid #3B82F6 !important;
          }
          
          /* Ensure clickable areas are properly defined */
          .fc-timegrid-col {
            cursor: pointer !important;
          }
          
          .fc-daygrid-day {
            cursor: pointer !important;
          }
          
          .fc-timegrid-slot-lane {
            cursor: pointer !important;
          }
          
          /* Temporary event styling - Enhanced for better visibility */
          .fc-event[data-event-id="temp-event"] {
            opacity: 0.9 !important;
            border: 2px solid #3B82F6 !important;
            background: rgba(59, 130, 246, 0.8) !important;
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3) !important;
          }
          
          /* Enhanced resize handle styling for temporary events */
          .fc-event[data-event-id="temp-event"] .fc-event-resizer {
            background: #3B82F6 !important;
            border: none !important;
            width: 100% !important;
            height: 6px !important;
            bottom: -3px !important;
            cursor: ns-resize !important;
            border-radius: 0 0 4px 4px !important;
            opacity: 0.8 !important;
          }
          
          .fc-event[data-event-id="temp-event"] .fc-event-resizer:hover {
            opacity: 1 !important;
            height: 8px !important;
            bottom: -4px !important;
          }
          
          /* Remove any row-wide highlighting */
          .fc-timegrid-slot-lane:hover,
          .fc-timegrid-col:hover {
            /* REMOVED: No background changes */
          }
          
          /* Ensure temporary events are easily resizable */
          .fc-event[data-event-id="temp-event"]:hover .fc-event-resizer {
            opacity: 1 !important;
          }
          
          /* Custom event styling */
          .fc-event-title {
            font-size: 14px !important;
            font-weight: 500 !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .fc-event-time {
            display: none !important; /* Hide the default time display */
          }
          
          .fc-event-details {
            display: flex;
            flex-wrap: wrap;
            gap: 2px;
            margin-top: 2px;
          }
          
          .event-role, .event-domain {
            font-size: 10px;
            padding: 1px 4px;
            border-radius: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 80px;
          }
          
          .event-role {
            background: #f3f4f6;
            color: #4b5563;
          }
          
          .event-domain {
            background: #e0f2fe;
            color: #0369a1;
          }
          
          .fc-event-actions {
            display: flex;
            gap: 4px;
            margin-top: 4px;
          }
          
          .event-action-complete,
          .event-action-delegate,
          .event-action-cancel {
            border: none;
            border-radius: 4px;
            padding: 2px 4px;
            font-size: 10px;
            cursor: pointer;
          }
          
          .event-action-complete {
            background: #10b981;
            color: white;
          }
          
          .event-action-delegate {
            background: #6366f1;
            color: white;
          }
          
          .event-action-cancel {
            background: #ef4444;
            color: white;
          }
        `}
        </style>
        <FullCalendar
          ref={fullCalendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={view}
          initialDate={currentDate}
          headerToolbar={false}
          nowIndicator={true}
          firstDay={0}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          eventContent={renderEventContent}
          weekends={true}
          events={events}
          eventClick={handleEventClick}
          select={handleDateSelect}
          dateClick={handleDateClick}
          eventResize={handleEventResize}
          height="100%"
          dayMinTime="00:00:00"
          dayMaxTime="24:00:00"
          allDaySlot={false}
          scrollTime={`${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}:00`}
          scrollTimeReset={false}
          slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            omitZeroMinute: true,
            meridiem: 'short',
          }}
          views={{
            dayGridMonth: { firstDay: 0, fixedWeekCount: false, showNonCurrentDates: true },
            timeGridWeek: { firstDay: 0 },
            timeGridDay: { firstDay: 0 },
          }}
          datesSet={handleDatesSet}
          viewDidMount={handleCalendarReady}
          dayHeaderContent={view === 'dayGridMonth' ? undefined : customDayHeaderContent}
          selectConstraint={{
            start: '00:00',
            end: '24:00',
          }}
          selectOverlap={false}
          selectMinDistance={5}
          longPressDelay={300}
          eventLongPressDelay={300}
          slotDuration="00:15:00"
          snapDuration="00:15:00"
          eventResizableFromStart={false}
        />
        
        {/* Compact Task Form Modal - 75% size with smart positioning */}
        {showTaskForm && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black bg-opacity-25"
              onClick={handleTaskFormClose}
            />
            
            <div 
              className="fixed z-50"
              style={taskFormPosition ? {
                left: `${taskFormPosition.x}px`,
                top: `${taskFormPosition.y}px`,
                width: '375px', // 75% of 500px
                maxHeight: '450px', // 75% of 600px
              } : {
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '375px',
                maxHeight: '450px',
              }}
            >
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <TaskForm
                  onClose={handleTaskFormClose}
                  onTaskCreated={handleTaskCreated}
                  initialFormData={getInitialFormData()}
                />
              </div>
            </div>
          </>
        )}
        
        {/* Edit Modal */}
        {editingTaskId && (
          <TaskEditModal
            taskId={editingTaskId}
            onClose={() => setEditingTaskId(null)}
            onTaskUpdated={handleTaskUpdated}
          />
        )}
        
        {/* Delegate Task Modal */}
        {delegatingTaskId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Delegate Task</h3>
                <button
                  onClick={() => setDelegatingTaskId(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={delegateForm.name}
                    onChange={(e) => setDelegateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Who are you delegating to?"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={delegateForm.email}
                    onChange={(e) => setDelegateForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Email address (optional)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={delegateForm.phone}
                    onChange={(e) => setDelegateForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Phone number (optional)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={delegateForm.notes}
                    onChange={(e) => setDelegateForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Any additional notes"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setDelegatingTaskId(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelegateSubmit}
                  disabled={!delegateForm.name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Custom event rendering function to show more details
const renderEventContent = (eventInfo: any) => {
  const { event } = eventInfo;
  const { extendedProps } = event;
  
  // Get roles and domains
  const roles = extendedProps?.roles || [];
  const domains = extendedProps?.domains || [];
  const status = extendedProps?.status || '';
  
  // Determine if we should show action buttons (only in day/week view)
  const isTimeGridView = eventInfo.view.type.includes('timeGrid');
  
  // Don't show action buttons for completed or delegated tasks
  const showActions = isTimeGridView && status !== 'completed' && status !== 'delegated';
  
  return {
    html: `
      <div class="fc-event-main-wrapper">
        <div class="fc-event-title-container">
          <div class="fc-event-title fc-sticky" style="font-size: 14px; font-weight: 500; margin-bottom: 2px;">
            ${event.title}
            ${status === 'completed' ? ' ✓' : status === 'delegated' ? ' →' : ''}
          </div>
          
          ${showActions ? `<div class="fc-event-actions" style="position: absolute; top: 2px; right: 2px; display: flex; gap: 2px;">
            <button class="event-action-complete" title="Complete" style="background: #10b981; color: white; border: none; border-radius: 4px; padding: 1px 3px; font-size: 10px; cursor: pointer;">✓</button>
            <button class="event-action-delegate" title="Delegate" style="background: #6366f1; color: white; border: none; border-radius: 4px; padding: 1px 3px; font-size: 10px; cursor: pointer;">→</button>
            <button class="event-action-cancel" title="Cancel" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 1px 3px; font-size: 10px; cursor: pointer;">✕</button>
          </div>` : ''}
          
          ${isTimeGridView ? `
            <div class="fc-event-details" style="display: flex; flex-wrap: wrap; gap: 2px; margin-top: 2px;">
              ${roles.length > 0 ? roles.map((role: string) => 
                `<span class="event-role" style="font-size: 10px; background: #f3f4f6; color: #4b5563; padding: 1px 4px; border-radius: 4px;">${role}</span>`
              ).join('') : ''}
              
              ${domains.length > 0 ? domains.map((domain: string) => 
                `<span class="event-domain" style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 1px 4px; border-radius: 4px;">${domain}</span>`
              ).join('') : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `
  };
};

export default CalendarView;