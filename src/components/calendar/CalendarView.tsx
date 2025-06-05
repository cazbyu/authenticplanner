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
const customDayHeaderContent = (arg: DateHeaderContentArg) => ({
  html: `
    <div class="day-name">${weekdayShort[arg.date.getDay()]}</div>
    <div class="day-number ${isToday(arg.date) ? 'today' : ''}">${arg.date.getDate()}</div>
  `,
});

const isToday = (date: Date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

const CalendarView = forwardRef<FullCalendar, CalendarViewProps>(
  ({ view, currentDate, onDateChange }, ref) => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const calendarRef = useRef<FullCalendar | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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

    // Scroll to business hours on initial load
    useEffect(() => {
      if (view !== 'dayGridMonth' && fullCalendarRef?.current) {
        const scrollContainer = fullCalendarRef.current.getApi().el.querySelector('.fc-timegrid-body');
        if (scrollContainer) {
          const scrollTo = (7 * 48); // 7am (48px per hour)
          scrollContainer.scrollTop = scrollTo;
        }
      }
    }, [view, fullCalendarRef]);

    // Respond to prop changes
    useEffect(() => {
      if (fullCalendarRef && 'current' in fullCalendarRef && fullCalendarRef.current) {
        const calendarApi = fullCalendarRef.current.getApi();
        calendarApi.changeView(view);
        calendarApi.gotoDate(currentDate);
      }
    }, [view, currentDate, fullCalendarRef]);

    const handleDatesSet = (arg: DatesSetArg) => {
      onDateChange(arg.view.currentStart);
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

    return (
      <div className="h-full min-h-0 flex flex-col flex-1" ref={scrollContainerRef}>
        <style>
          {`
          .fc {
            height: 100% !important;
            font-family: inherit;
          }
          .fc-scroller, .fc-scroller.fc-scroller-liquid {
            overflow-y: auto !important;
            overscroll-behavior: contain !important;
            scroll-behavior: smooth !important;
          }
          .fc-timegrid .fc-scroller-liquid {
            overflow-y: auto !important;
            overscroll-behavior: contain !important;
            scroll-behavior: smooth !important;
          }
          .fc-theme-standard td, .fc-theme-standard th {
            border-color: #e5e7eb;
          }
          .fc-theme-standard th {
            padding: 0;
            position: sticky;
            top: 0;
            z-index: 2;
            background: white;
          }
          .fc-timegrid-axis {
            position: sticky;
            left: 0;
            z-index: 3;
            background: white;
          }
          .fc-timegrid-slot {
            height: 48px !important;
            border-bottom: 1px solid #f3f4f6 !important;
          }
          .fc-timegrid-slot-label {
            font-size: 0.75rem;
            color: #6B7280;
            padding-right: 1rem;
            position: sticky;
            left: 0;
            background: white;
            z-index: 1;
          }
          .fc-timegrid-now-indicator-line {
            border-color: #EF4444;
            z-index: 4;
          }
          .fc-timegrid-now-indicator-arrow {
            border-color: #EF4444;
            z-index: 4;
          }
          .fc-col-header-cell {
            padding: 0;
            background: #fff;
          }
          .fc-col-header-cell.fc-day-today {
            background: transparent !important;
          }
          .fc-col-header-cell-cushion {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 0;
            color: #4B5563;
            font-weight: 500;
          }
          .fc-col-header-cell-cushion .day-name {
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .fc-col-header-cell-cushion .day-number {
            font-size: 20px;
            font-weight: 400;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }
          .fc-col-header-cell-cushion .day-number.today {
            background: #3B82F6;
            color: white;
          }
          .fc-daygrid-day-frame {
            min-height: 100px;
          }
          .fc-daygrid-day-top {
            justify-content: center;
            padding-top: 4px;
          }
          .fc-daygrid-day-number {
            padding: 4px 8px !important;
            color: #4B5563;
          }
          .fc-day-today .fc-daygrid-day-number {
            background: #3B82F6;
            color: white;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
          }
          .fc-timegrid-col-frame {
            background: white;
          }
          .fc-timegrid-event {
            border-radius: 4px;
          }
          .fc-event-main {
            padding: 2px 4px;
          }
          .fc-event-time {
            font-size: 12px;
          }
          .fc-event-title {
            font-size: 13px;
          }
          .fc-timegrid-event-harness {
            z-index: 1;
          }
          .fc-timegrid-col-events {
            z-index: 1;
          }
          .fc-timegrid-now-indicator-container {
            z-index: 4;
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
          height="100%"
          dayMinTime="00:00:00"
          dayMaxTime="24:00:00"
          allDaySlot={false}
          scrollTime="07:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            omitZeroMinute: true,
            meridiem: 'short',
          }}
          views={{
            dayGridMonth: { 
              firstDay: 0,
              fixedWeekCount: false,
              showNonCurrentDates: true
            },
            timeGridWeek: { 
              firstDay: 0,
              slotDuration: '00:30:00',
              slotLabelInterval: '01:00'
            },
            timeGridDay: { 
              firstDay: 0,
              slotDuration: '00:30:00',
              slotLabelInterval: '01:00'
            }
          }}
          datesSet={handleDatesSet}
          dayHeaderContent={view === 'dayGridMonth' ? undefined : customDayHeaderContent}
        />
      </div>
    );
  }
);

export default CalendarView;