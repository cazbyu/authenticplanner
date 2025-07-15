import React, { forwardRef, useRef, useEffect, useState } from 'react';
import FullCalendar, { DateSetArg, DateHeaderContentArg } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../../supabaseClient';
import { format } from 'date-fns';

interface CalendarViewProps {
  view: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth';
  currentDate: Date;
  onDateChange: (date: Date) => void;
  refreshTrigger: number;
}

interface Task {
  id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  due_date: string | null;
  is_urgent: boolean;
  is_important: boolean;
  is_authentic_deposit: boolean;
  status: string;
  notes: string | null;
}

const CalendarView = forwardRef<FullCalendar, CalendarViewProps>(
  ({ view, currentDate, onDateChange }, ref) => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const calendarRef = useRef<FullCalendar | null>(null);

    const fullCalendarRef = (ref as any) || calendarRef;

    // Fetch tasks on mount
    useEffect(() => {
      const fetchTasks = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const { data: tasks } = await supabase
          .from('0007-ap-tasks')
          .select('*')
          .eq('user_id', user.id);

        if (tasks) {
          const calendarEvents = tasks.map(task => ({
            id: task.id,
            title: task.title,
            start: task.start_time || task.due_date,
            end: task.end_time,
            allDay: !task.start_time,
            backgroundColor: task.is_urgent ? '#ef4444' : task.is_important ? '#f59e0b' : '#3b82f6',
            borderColor: task.is_urgent ? '#dc2626' : task.is_important ? '#d97706' : '#2563eb',
          }));
          setEvents(calendarEvents);
        }
        setLoading(false);
      };
      fetchTasks();
    }, []);

    // Update calendar view and date
    useEffect(() => {
      if (
        fullCalendarRef &&
        'current' in fullCalendarRef &&
        fullCalendarRef.current
      ) {
        const calendarApi = fullCalendarRef.current.getApi();
        calendarApi.changeView(view);
        calendarApi.gotoDate(currentDate);
      }
    }, [view, currentDate]);

    // Example event handler (implement as needed)
    const handleEventClick = (info: any) => {
      // Implement your logic here, e.g. open edit modal
      // info.event contains event data
    };

    // Example: handle FullCalendar datesSet callback
    const handleDatesSet = (arg: DateSetArg) => {
      // Optionally update parent component, fetch data, etc.
      onDateChange(arg.start); // update to first day in new view
    };

    // Custom day header for week view
    const customDayHeaderContent = (arg: DateHeaderContentArg) => ({
      html: `
        <div class="day-name">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][arg.date.getDay()]}</div>
        <div class="day-number ${isToday(arg.date) ? 'today' : ''}">${arg.date.getDate()}</div>
      `,
    });

    const isToday = (date: Date) => {
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    };

    return (
      <div className="h-full">
        <style>
          {`
          .fc { height: 100% !important; font-family: inherit; }
          .fc-view-harness { height: 100% !important; }
          .fc-scrollgrid-sync-inner { padding: 8px 0; }
          .fc-theme-standard td, .fc-theme-standard th { border-color: #e5e7eb; }
          .fc-timegrid-slot { height: 48px !important; border-bottom: 1px solid #f3f4f6 !important; }
          .fc-timegrid-slot-label { font-size: 0.75rem; color: #6B7280; padding-right: 1rem; }
          .fc-timegrid-axis { padding-right: 0.5rem; }
          .fc-timegrid-now-indicator-line { 
            border-color: #EF4444; 
            border-width: 2px; 
            left: 0 !important; 
            right: 0 !important; 
            margin-left: 0 !important;
            box-shadow: 0 0 4px rgba(239, 68, 68, 0.3);
          }
          .fc-timegrid-now-indicator-arrow { 
            border-color: #EF4444;
            border-width: 6px 0 6px 8px;
            margin-top: -6px;
          }
          .fc-col-header-cell { padding: 0; background: #fff; }
          .fc-col-header-cell.fc-day-today { background: transparent !important; }
          .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion { color: #4B5563; }
          .fc-col-header-cell-cushion { display: flex; flex-direction: column; align-items: center; padding: 8px 0; color: #4B5563; font-weight: 500; }
          .fc-col-header-cell-cushion .day-name { font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
          .fc-col-header-cell-cushion .day-number { font-size: 20px; font-weight: 400; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
          .fc-col-header-cell-cushion .day-number.today { background: #3B82F6; color: white; }
          .fc-dayGridMonth-view .fc-col-header-cell { text-align: center; padding: 8px 0; }
          .fc-dayGridMonth-view .fc-daygrid-day-top { justify-content: center; padding-top: 4px; }
          .fc-dayGridMonth-view .fc-daygrid-day-number { font-size: 14px; padding: 4px 8px; color: #4B5563; }
          .fc-dayGridMonth-view .fc-day-today .fc-daygrid-day-number { background: #3B82F6; color: white; border-radius: 50%; }
          .fc-header-toolbar { display: none !important; }
          `}
        </style>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false} // We handle navigation in parent
          height="auto"
          events={events}
          editable={true}
          droppable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          eventClick={handleEventClick}
          height="100%"
          dayMinTime="00:00:00"
          dayMaxTime="24:00:00"
          allDaySlot={false}
          scrollTime={format(new Date(), 'HH:mm:ss')}
          nowIndicator={true}
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
              firstDay: 0, // Start week on Sunday
              fixedWeekCount: false,
              showNonCurrentDates: true,
            },
            timeGridWeek: {
              firstDay: 0, // Start week on Sunday
              slotDuration: '00:30:00',
              slotLabelInterval: '01:00',
            },
            timeGridDay: {
              dayCount: 1,
              firstDay: 0, // Start week on Sunday
              slotDuration: '00:30:00',
              slotLabelInterval: '01:00',
            },
          }}
          datesSet={handleDatesSet}
          dayHeaderContent={view === 'dayGridMonth' ? undefined : customDayHeaderContent}
        />
      </div>
    );
  }
);

export default CalendarView;
