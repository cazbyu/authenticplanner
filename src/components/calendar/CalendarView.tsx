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
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
      start: Date;
      end: Date;
      allDay: boolean;
    } | null>(null);
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
    };

    const handleEventClick = (info: EventClickArg) => {
      // Open edit modal for the clicked task
      setEditingTaskId(info.event.id);
    };

    // Handle date/time selection (drag to create)
    const handleDateSelect = (selectInfo: DateSelectArg) => {
      const { start, end, allDay } = selectInfo;
      
      // Store the selected time slot
      setSelectedTimeSlot({
        start: new Date(start),
        end: new Date(end),
        allDay
      });
      
      // Open the task form
      setShowTaskForm(true);
      
      // Clear the selection visually
      selectInfo.view.calendar.unselect();
    };

    const handleTaskCreated = () => {
      setShowTaskForm(false);
      setSelectedTimeSlot(null);
      // Refresh the calendar by incrementing the refresh trigger
      fetchTasks();
    };

    const handleTaskFormClose = () => {
      setShowTaskForm(false);
      setSelectedTimeSlot(null);
    };

    const handleTaskUpdated = () => {
      setEditingTaskId(null);
      // Refresh the calendar by incrementing the refresh trigger
      fetchTasks();
    };

    // Convert selected time slot to form-compatible format
    const getInitialFormData = () => {
      if (!selectedTimeSlot) return {};

      const { start, end, allDay } = selectedTimeSlot;
      
      if (allDay) {
        // For all-day events (month view), just set the date
        return {
          dueDate: start.toISOString().split('T')[0],
          schedulingType: 'unscheduled' as const,
        };
      } else {
        // For timed events (day/week view), set date and times
        const startTime = start.toTimeString().slice(0, 5); // HH:MM format
        const endTime = end.toTimeString().slice(0, 5); // HH:MM format
        
        return {
          dueDate: start.toISOString().split('T')[0],
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
          }
          .fc-addEvent-button {
            display: none !important;
          }
          .fc-timegrid-slot {
            height: 48px !important;
            border-bottom: 1px solid #f3f4f6 !important;
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
          
          /* Selection styles for drag-to-create */
          .fc-highlight {
            background: rgba(59, 130, 246, 0.3) !important;
            border: 1px solid #3B82F6 !important;
          }
          
          /* Make time slots more interactive */
          .fc-timegrid-slot {
            cursor: crosshair;
          }
          
          .fc-daygrid-day {
            cursor: crosshair;
          }
          
          /* Improve selection feedback */
          .fc-timegrid-slot:hover {
            background-color: rgba(59, 130, 246, 0.1);
          }
          
          .fc-daygrid-day:hover {
            background-color: rgba(59, 130, 246, 0.05);
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
          // Selection configuration
          selectConstraint={{
            start: '00:00',
            end: '24:00',
          }}
          selectOverlap={false}
          selectMinDistance={5} // Minimum pixels to drag before selection starts
          // Allow selection on touch devices
          longPressDelay={300}
          eventLongPressDelay={300}
        />
        
        {/* Task Form Modal for drag-to-create */}
        {showTaskForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl">
              <TaskForm
                onClose={handleTaskFormClose}
                onTaskCreated={handleTaskCreated}
                initialFormData={getInitialFormData()}
              />
            </div>
          </div>
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