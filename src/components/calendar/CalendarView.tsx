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
      <div className="h-full">
        <style>
          {`
          .fc {
            height: 100% !important;
            font-family: inherit;
          }
          .fc-view-harness {
            height: 100% !important;
          }
          .fc-scrollgrid-sync-inner {
            padding: 8px 0;
          }
          .fc-theme-standard td, .fc-theme-standard th {
            border-color: #e5e7eb;
          }
          .fc-timegrid-slot {
            height: 48px !important;
            border-bottom: 1px solid #f3f4f6 !important;
          }
          .fc-timegrid-slot-label {
            font-size: 0.75rem;
            color: #6B7280;
            padding-right: 1rem;
          }
          .fc-timegrid-axis {
            padding-right: 0.5rem;
          }
          .fc-timegrid-now-indicator-line {
            border-color: #EF4444;
            border-width: 1px;
            left: 0 !important;
            right: 0 !important;
            margin-left: 0 !important;
          }
          .fc-timegrid-now-indicator-arrow {
            display: none !important;
          }
          .fc-col-header-cell {
            padding: 0;
            background: #fff;
          }
          .fc-col-header-cell.fc-day-today {
            background: transparent !important;
          }
          .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion {
            color: #4B5563;
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
          .fc-dayGridMonth-view .fc-col-header-cell {
            text-align: center;
            padding: 8px 0;
          }
          .fc-dayGridMonth-view .fc-daygrid-day-top {
            justify-content: center;
            padding-top: 4px;
          }
          .fc-dayGridMonth-view .fc-daygrid-day-number {
            font-size: 14px;
            padding: 4px 8px;
            color: #4B5563;
          }
          .fc-dayGridMonth-view .fc-day-today .fc-daygrid-day-number {
            background: #3B82F6;
            color: white;
            border-radius: 50%;
          }
          .fc-header-toolbar {
            display: none !important;
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