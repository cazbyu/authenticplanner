// src/components/calendar/CalendarView.tsx

import React, { useState, useEffect, useRef } from 'react';
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
    <div class="day-number">${arg.date.getDate()}</div>
  `,
});

const CalendarView: React.FC<CalendarViewProps> = ({
  view, currentDate, onDateChange
}) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef<FullCalendar | null>(null);

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

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(view);
      calendarApi.gotoDate(currentDate);
    }
  }, [view, currentDate]);

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
    <div className="h-full min-h-0 flex flex-col flex-1">
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
        .fc-theme-standard th { padding: 0; }
        .fc-addEvent-button { display: none !important; }
        .fc-timegrid-slot {
          height: 48px !important;
          border-bottom: 1px solid #f3f4f6 !important;
        }
        .fc-timegrid-slot-label {
          font-size: 0.75rem;
          color: #6B7280;
          padding-right: 1rem;
        }
        .fc-timegrid-axis { padding-right: 0.5rem; }
        .fc-timegrid-now-indicator-line { border-color: #EF4444; }
        .fc-timegrid-now-indicator-arrow { border-color: #EF4444; }
        .fc-col-header-cell { padding: 0; background: #fff; }
        .fc-col-header-cell.fc-day-today { background: #3B82F6 !important; }
        .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion { color: white; }
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
        .fc-daygrid-day-frame { min-height: 100px; }
        .fc-daygrid-day-top { justify-content: center; padding: 0; flex-direction: row; }
        .fc-daygrid-day-number {
          width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
          margin: 0 auto; padding: 0 !important; font-size: 0.875rem; color: #374151;
        }
        .fc-day-today .fc-daygrid-day-number {
          background: #3B82F6; color: white; border-radius: 9999px;
        }
        .fc-timegrid-col-frame { background: white; }
        .fc-direction-ltr .fc-timegrid-now-indicator-arrow {
          border-width: 5px 0 5px 6px; border-top-color: transparent; border-bottom-color: transparent;
        }
      `}
      </style>
      <FullCalendar
        ref={calendarRef}
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
        dayHeaderContent={view === 'dayGridMonth' ? undefined : customDayHeaderContent}
      />
    </div>
  );
};

export default CalendarView;
