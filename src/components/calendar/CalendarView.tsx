// src/components/calendar/CalendarView.tsx

import React, { useState, useEffect, useRef, forwardRef } from 'react';
import FullCalendar, { DatesSetArg, DateHeaderContentArg } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { supabase } from '../../supabaseClient';

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
  ({ view, currentDate, onDateChange }, ref) => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const calendarRef = useRef<FullCalendar | null>(null);
    const [calendarReady, setCalendarReady] = useState(false);

    // Keep both legacy and new ref for compatibility
    const fullCalendarRef = (ref as any) || calendarRef;

    useEffect(() => {
      const fetchTasks = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const { data: tasks } = await supabase
          .from('0007-ap-tasks')
          .select('id, title, start_time, end_time, is_authentic_deposit, is_twelve_week_goal')
          .eq('user_id', user.id);

        if (tasks) {
          const calendarEvents = tasks.map((task: Task) => ({
            id: task.id,
            title: task.title,
            start: task.start_time,
            end: task.end_time || undefined,
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
        setLoading(false);
      };
      fetchTasks();
    }, []);

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

    const handleEventClick = (info: any) => {
      console.log('Event clicked:', info.event);
    };

    if (loading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      );
    }

    // Use a fixed height instead of 100% to prevent bouncing
    const calendarHeight = 'calc(100vh - 200px)';

    return (
      <div className="h-full min-h-0 flex flex-col flex-1">
        <style>
          {`
          .fc {
            height: ${calendarHeight} !important;
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
          .fc-daygrid-day-frame {
            min-height: 100px;
          }
          .fc-daygrid-day-top {
            justify-content: center;
            padding: 0;
            flex-direction: row;
          }
          .fc-daygrid-day-number {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            padding: 0 !important;
            font-size: 1.125rem;
            font-weight: 600;
            color: #374151;
            border-radius: 50%;
          }
          .fc-day-today .fc-daygrid-day-number {
            background: #3B82F6;
            color: white;
          }
          .fc-timegrid-col-frame {
            background: white;
          }
          .fc-direction-ltr .fc-timegrid-now-indicator-arrow {
            border-width: 5px 0 5px 6px;
            border-top-color: transparent;
            border-bottom-color: transparent;
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
          height={calendarHeight}
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
        />
      </div>
    );
  }
);

export default CalendarView;