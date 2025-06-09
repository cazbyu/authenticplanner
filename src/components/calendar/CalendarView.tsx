import React, { useState, useEffect, useRef, forwardRef } from 'react';
import FullCalendar, { DatesSetArg, DateHeaderContentArg, EventClickArg, DateSelectArg } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { supabase } from '../../supabaseClient';
import TaskEditModal from './TaskEditModal';
import TaskForm from '../tasks/TaskForm';

interface Task {
  id: string;
  title: string;
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
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlotSelection | null>(null);
    const [taskFormPosition, setTaskFormPosition] = useState<{ x: number; y: number } | null>(null);
    const calendarRef = useRef<FullCalendar | null>(null);
    const [calendarReady, setCalendarReady] = useState(false);
    
    // Time slot selection state
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState<{ time: Date; element: HTMLElement } | null>(null);
    const [currentSelection, setCurrentSelection] = useState<TimeSlotSelection | null>(null);
    const [hoveredSlot, setHoveredSlot] = useState<HTMLElement | null>(null);

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
          .select('id, title, start_time, end_time, is_authentic_deposit, is_twelve_week_goal')
          .eq('user_id', user.id)
          .not('start_time', 'is', null); // Only get tasks with start times

        if (error) {
          console.error('Error fetching tasks:', error);
          setLoading(false);
          return;
        }

        if (tasks) {
          const calendarEvents = tasks.map((task: Task) => ({
            id: task.id,
            title: task.title,
            // FullCalendar automatically converts UTC times to local time for display
            start: task.start_time, // This is stored as UTC in database
            end: task.end_time || undefined, // This is also UTC
            backgroundColor: task.is_authentic_deposit
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
        
        // Immediately set scroll to 8am without animation for day/week views
        if (view === 'timeGridDay' || view === 'timeGridWeek') {
          // Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            const scrollerEl = calendarApi.el.querySelector('.fc-scroller');
            if (scrollerEl) {
              // Calculate 8am position (8 hours * 48px per hour slot)
              const scrollTop = 8 * 48;
              scrollerEl.scrollTop = scrollTop;
            }
          });
        }
        setCalendarReady(true);
        
        // Set up time slot interaction after calendar is ready
        setTimeout(() => setupTimeSlotInteraction(), 100);
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
              const scrollTop = 8 * 48; // 8am position
              scrollerEl.scrollTop = scrollTop;
            }
          });
        }
        
        // Re-setup interaction when view changes
        setTimeout(() => setupTimeSlotInteraction(), 100);
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
              const scrollTop = 8 * 48; // 8am position
              scrollerEl.scrollTop = scrollTop;
            }
          }
        }, 10);
      }
      
      // Re-setup interaction when dates change
      setTimeout(() => setupTimeSlotInteraction(), 100);
    };

    // Setup time slot interaction for Google Calendar-like behavior
    const setupTimeSlotInteraction = () => {
      if (!fullCalendarRef || !('current' in fullCalendarRef) || !fullCalendarRef.current) return;
      
      const calendarEl = fullCalendarRef.current.el;
      if (!calendarEl) return;

      // Only apply to time grid views (day/week)
      if (view !== 'timeGridDay' && view !== 'timeGridWeek') return;

      // Remove existing listeners by cloning nodes
      const existingSlots = calendarEl.querySelectorAll('.fc-timegrid-slot[data-time]');
      existingSlots.forEach(slot => {
        const newSlot = slot.cloneNode(true);
        slot.parentNode?.replaceChild(newSlot, slot);
      });

      // Add interaction to time slots
      const timeSlots = calendarEl.querySelectorAll('.fc-timegrid-slot[data-time]');
      
      timeSlots.forEach((slot: Element) => {
        const slotEl = slot as HTMLElement;
        
        // Add hover effects
        slotEl.addEventListener('mouseenter', handleSlotHover);
        slotEl.addEventListener('mouseleave', handleSlotLeave);
        
        // Add click/drag interaction
        slotEl.addEventListener('mousedown', handleSlotMouseDown);
      });

      // Remove old global handlers to prevent duplicates
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);

      // Add global mouse events for dragging
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    };

    const handleSlotHover = (e: Event) => {
      const slot = e.target as HTMLElement;
      if (!slot.classList.contains('fc-timegrid-slot')) return;
      
      // Clear previous hover
      if (hoveredSlot && hoveredSlot !== slot) {
        hoveredSlot.style.cursor = '';
        hoveredSlot.style.backgroundColor = '';
      }
      
      // Set hover styles
      slot.style.cursor = 'crosshair';
      slot.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      setHoveredSlot(slot);
    };

    const handleSlotLeave = (e: Event) => {
      const slot = e.target as HTMLElement;
      if (!slot.classList.contains('fc-timegrid-slot')) return;
      
      // Remove hover styles if not selected
      if (!currentSelection || !isElementInSelection(slot, currentSelection)) {
        slot.style.cursor = '';
        slot.style.backgroundColor = '';
      }
      
      if (hoveredSlot === slot) {
        setHoveredSlot(null);
      }
    };

    const handleSlotMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const slot = e.target as HTMLElement;
      if (!slot.classList.contains('fc-timegrid-slot')) return;

      const timeStr = slot.getAttribute('data-time');
      if (!timeStr) return;

      // Parse the time from the slot
      const slotTime = parseSlotTime(slot);
      if (!slotTime) return;

      setIsSelecting(true);
      setSelectionStart({ time: slotTime, element: slot });
      
      // Create initial 1-hour selection
      const endTime = new Date(slotTime.getTime() + 60 * 60 * 1000); // 1 hour later
      const selection: TimeSlotSelection = {
        start: slotTime,
        end: endTime,
        element: slot
      };
      
      setCurrentSelection(selection);
      highlightSelection(selection);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isSelecting || !selectionStart) return;

      const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
      if (!elementUnderMouse || !elementUnderMouse.classList.contains('fc-timegrid-slot')) return;

      const currentSlot = elementUnderMouse as HTMLElement;
      const currentTime = parseSlotTime(currentSlot);
      if (!currentTime) return;

      // Update selection based on drag direction
      const startTime = selectionStart.time;
      let newStart: Date, newEnd: Date;

      if (currentTime >= startTime) {
        // Dragging down
        newStart = startTime;
        newEnd = new Date(currentTime.getTime() + 15 * 60 * 1000); // Add 15 minutes to include the slot
      } else {
        // Dragging up
        newStart = currentTime;
        newEnd = new Date(startTime.getTime() + 15 * 60 * 1000);
      }

      const selection: TimeSlotSelection = {
        start: newStart,
        end: newEnd,
        element: selectionStart.element
      };

      setCurrentSelection(selection);
      highlightSelection(selection);
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (!isSelecting || !currentSelection) return;

      setIsSelecting(false);
      setSelectionStart(null);

      // Open task form with the selection
      openTaskFormForSelection(currentSelection, e);
    };

    const parseSlotTime = (slot: HTMLElement): Date | null => {
      const timeStr = slot.getAttribute('data-time');
      if (!timeStr) return null;

      // Get the date from the column
      const dayEl = slot.closest('.fc-day');
      const dateStr = dayEl?.getAttribute('data-date');
      if (!dateStr) return null;

      // Parse time (format: "08:00:00")
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(dateStr);
      date.setHours(hours, minutes, 0, 0);
      
      return date;
    };

    const highlightSelection = (selection: TimeSlotSelection) => {
      if (!fullCalendarRef || !('current' in fullCalendarRef) || !fullCalendarRef.current) return;

      const calendarEl = fullCalendarRef.current.el;
      
      // Clear previous highlights
      const previousHighlights = calendarEl.querySelectorAll('.fc-timegrid-slot.time-slot-selected');
      previousHighlights.forEach(slot => {
        (slot as HTMLElement).classList.remove('time-slot-selected');
        (slot as HTMLElement).style.backgroundColor = '';
        (slot as HTMLElement).style.borderLeft = '';
      });

      // Highlight selected slots
      const timeSlots = calendarEl.querySelectorAll('.fc-timegrid-slot[data-time]');
      timeSlots.forEach((slot: Element) => {
        const slotEl = slot as HTMLElement;
        const slotTime = parseSlotTime(slotEl);
        if (!slotTime) return;

        if (slotTime >= selection.start && slotTime < selection.end) {
          slotEl.classList.add('time-slot-selected');
          slotEl.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
          slotEl.style.borderLeft = '3px solid #3B82F6';
        }
      });
    };

    const isElementInSelection = (element: HTMLElement, selection: TimeSlotSelection): boolean => {
      const slotTime = parseSlotTime(element);
      if (!slotTime) return false;
      return slotTime >= selection.start && slotTime < selection.end;
    };

    const openTaskFormForSelection = (selection: TimeSlotSelection, mouseEvent: MouseEvent) => {
      // Calculate form position near the selection
      const rect = selection.element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const formWidth = 500;
      const formHeight = 600;

      let x = rect.right + 10; // Default to right of selection
      let y = Math.max(rect.top, 100);

      // If form would go off right edge, position to left
      if (x + formWidth > viewportWidth - 20) {
        x = rect.left - formWidth - 10;
      }

      // If still off screen, center horizontally
      if (x < 20) {
        x = (viewportWidth - formWidth) / 2;
      }

      // Ensure form doesn't go off bottom
      if (y + formHeight > viewportHeight - 20) {
        y = viewportHeight - formHeight - 20;
      }

      // Ensure form doesn't go off top
      y = Math.max(y, 20);

      setTaskFormPosition({ x, y });
      setSelectedTimeSlot(selection);
      setShowTaskForm(true);

      // Clear visual selection after a brief delay
      setTimeout(() => {
        setCurrentSelection(null);
        if (fullCalendarRef && 'current' in fullCalendarRef && fullCalendarRef.current) {
          const calendarEl = fullCalendarRef.current.el;
          const highlights = calendarEl.querySelectorAll('.fc-timegrid-slot.time-slot-selected');
          highlights.forEach(slot => {
            (slot as HTMLElement).classList.remove('time-slot-selected');
            (slot as HTMLElement).style.backgroundColor = '';
            (slot as HTMLElement).style.borderLeft = '';
          });
        }
      }, 100);
    };

    // Handle date/time selection (drag to create) - fallback for FullCalendar's built-in selection
    const handleDateSelect = (selectInfo: DateSelectArg) => {
      const { start, end, allDay, jsEvent } = selectInfo;
      
      // Store the selected time slot
      setSelectedTimeSlot({
        start: new Date(start),
        end: new Date(end),
        element: jsEvent?.target as HTMLElement || document.body
      });

      // Calculate position for the task form (anchor to selection)
      if (jsEvent && !allDay) {
        // For time grid views, position the form near the selection
        const rect = (jsEvent.target as HTMLElement).getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const formWidth = 500;
        
        // Position to the right if there's space, otherwise to the left
        const x = rect.right + formWidth < viewportWidth ? rect.right + 10 : rect.left - formWidth - 10;
        const y = Math.max(rect.top, 100);
        
        setTaskFormPosition({ x, y });
      } else {
        // For month view or when positioning fails, center the form
        setTaskFormPosition(null);
      }
      
      // Open the task form
      setShowTaskForm(true);
      
      // Clear the selection visually
      selectInfo.view.calendar.unselect();
    };

    const handleEventClick = (info: EventClickArg) => {
      // Open edit modal for the clicked task
      setEditingTaskId(info.event.id);
    };

    const handleTaskCreated = () => {
      setShowTaskForm(false);
      setSelectedTimeSlot(null);
      setTaskFormPosition(null);
      setCurrentSelection(null);
      // Refresh the calendar by incrementing the refresh trigger
      fetchTasks();
    };

    const handleTaskFormClose = () => {
      setShowTaskForm(false);
      setSelectedTimeSlot(null);
      setTaskFormPosition(null);
      setCurrentSelection(null);
      
      // Clear any remaining highlights
      if (fullCalendarRef && 'current' in fullCalendarRef && fullCalendarRef.current) {
        const calendarEl = fullCalendarRef.current.el;
        const highlights = calendarEl.querySelectorAll('.fc-timegrid-slot.time-slot-selected');
        highlights.forEach(slot => {
          (slot as HTMLElement).classList.remove('time-slot-selected');
          (slot as HTMLElement).style.backgroundColor = '';
          (slot as HTMLElement).style.borderLeft = '';
        });
      }
    };

    const handleTaskUpdated = () => {
      setEditingTaskId(null);
      // Refresh the calendar by incrementing the refresh trigger
      fetchTasks();
    };

    // Convert selected time slot to form-compatible format
    const getInitialFormData = () => {
      if (!selectedTimeSlot) return {};

      const { start, end } = selectedTimeSlot;
      
      // For timed events, set date and times
      const startTime = start.toTimeString().slice(0, 5); // HH:MM format
      const endTime = end.toTimeString().slice(0, 5); // HH:MM format
      
      return {
        dueDate: start.toISOString().split('T')[0],
        startTime,
        endTime,
        schedulingType: 'scheduled' as const,
      };
    };

    // Cleanup event listeners on unmount
    useEffect(() => {
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }, []);

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
          }
          .fc-addEvent-button {
            display: none !important;
          }
          .fc-timegrid-slot {
            height: 48px !important;
            border-bottom: 1px solid #f3f4f6 !important;
            position: relative;
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
          
          /* Month View Specific Styles - EXTREMELY Small Fonts Like Google Calendar */
          .fc-daygrid-view .fc-daygrid-day-frame {
            min-height: 100px;
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
          }
          .fc-daygrid-view .fc-day-today .fc-daygrid-day-number {
            background: #3B82F6;
            color: white;
            font-weight: 600 !important;
          }
          
          /* NUCLEAR OPTION - Force tiny text on ALL month view events */
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
          
          /* Force event containers to be tiny */
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
          
          /* Month View Day Cell Content */
          .fc-daygrid-view .fc-daygrid-day-events {
            margin-top: 1px;
            min-height: 8px;
          }
          
          /* Month View "More" Link - Make it tiny */
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
          
          /* Month View Header - Make smaller */
          .fc-daygrid-view .fc-col-header-cell-cushion {
            padding: 2px 0 !important;
            font-size: 0.3125rem !important;
            font-weight: 500 !important;
            color: #6B7280 !important;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            line-height: 1.0 !important;
          }
          
          /* Override FullCalendar's inline styles with maximum specificity */
          .fc-daygrid-view .fc-event[style],
          .fc-daygrid-view .fc-daygrid-event[style],
          .fc-daygrid-view .fc-event-main[style],
          .fc-daygrid-view .fc-event-title[style],
          .fc-daygrid-view .fc-event-time[style] {
            font-size: 0.3125rem !important;
            height: 8px !important;
            line-height: 0.8 !important;
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
          
          /* Google Calendar-style selection and hover effects */
          .fc-highlight {
            background: rgba(59, 130, 246, 0.2) !important;
            border: 1px solid #3B82F6 !important;
          }
          
          /* Time slot hover effects - only for time grid views */
          .fc-timegrid-view .fc-timegrid-slot[data-time] {
            transition: background-color 0.1s ease;
          }
          
          /* Selected time slot styling */
          .fc-timegrid-slot.time-slot-selected {
            background-color: rgba(59, 130, 246, 0.2) !important;
            border-left: 3px solid #3B82F6 !important;
          }
          
          /* Day grid hover effects - only for month view */
          .fc-daygrid-view .fc-daygrid-day {
            cursor: crosshair;
            transition: background-color 0.1s ease;
          }
          
          .fc-daygrid-view .fc-daygrid-day:hover {
            background-color: rgba(59, 130, 246, 0.05) !important;
          }
          
          /* Selection feedback improvements */
          .fc-timegrid-view .fc-timegrid-slot.fc-highlight {
            background-color: rgba(59, 130, 246, 0.15) !important;
            border-left: 3px solid #3B82F6 !important;
          }
          
          .fc-daygrid-view .fc-daygrid-day.fc-highlight {
            background-color: rgba(59, 130, 246, 0.1) !important;
            border: 2px solid #3B82F6 !important;
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
          weekends={true}
          events={events}
          eventClick={handleEventClick}
          select={handleDateSelect}
          height="100%"
          dayMinTime="00:00:00"
          dayMaxTime="24:00:00"
          allDaySlot={false}
          scrollTime="08:00:00"
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
          // Only show custom header in week/day view; let month use default
          dayHeaderContent={view === 'dayGridMonth' ? undefined : customDayHeaderContent}
          // Selection configuration for Google Calendar-like behavior
          selectConstraint={{
            start: '00:00',
            end: '24:00',
          }}
          selectOverlap={false}
          selectMinDistance={5} // Minimum pixels to drag before selection starts
          // Allow selection on touch devices
          longPressDelay={300}
          eventLongPressDelay={300}
          // Snap to 15-minute intervals
          slotDuration="00:15:00"
          snapDuration="00:15:00"
        />
        
        {/* Task Form Modal for drag-to-create - Positioned or centered */}
        {showTaskForm && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40 bg-black bg-opacity-25"
              onClick={handleTaskFormClose}
            />
            
            {/* Task Form - Positioned near selection or centered */}
            <div 
              className={`fixed z-50 ${taskFormPosition ? '' : 'inset-0 flex items-center justify-center'}`}
              style={taskFormPosition ? {
                left: `${taskFormPosition.x}px`,
                top: `${taskFormPosition.y}px`,
              } : undefined}
            >
              <div className={`${taskFormPosition ? 'w-[500px]' : 'w-full max-w-2xl mx-4'} bg-white rounded-lg shadow-xl`}>
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
      </div>
    );
  }
);

export default CalendarView;