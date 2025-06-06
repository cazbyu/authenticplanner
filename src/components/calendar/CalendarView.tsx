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
      <div className="h-full flex flex-col">
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
            meridiem: 'short'
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