import React, { forwardRef, useState, useEffect } from 'react';
import FullCalendar, { DateSetArg, DateHeaderContentArg } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../../supabaseClient';
import { format } from 'date-fns';
import { toast } from 'sonner';
import './CalendarView.css'; // This line imports the CSS file

// Props interface for the component
interface CalendarViewProps {
  view: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth';
  currentDate: Date;
  onDateChange: (date: Date) => void;
  refreshTrigger: number;
  onTaskUpdated?: () => void;
}

// Interface for a Task object
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

// The main CalendarView component
const CalendarView = forwardRef<FullCalendar, CalendarViewProps>(
  ({ view, currentDate, onDateChange, onTaskUpdated, refreshTrigger }, ref) => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // This hook scrolls the calendar to the current time when it's ready.
    useEffect(() => {
      if (ref && 'current' in ref && ref.current && !loading && (view === 'timeGridWeek' || view === 'timeGridDay')) {
        const calendarApi = ref.current.getApi();
        
        // Scroll to current time with a longer delay to ensure calendar is fully rendered
        setTimeout(() => {
          const now = new Date();
          const currentTime = format(now, 'HH:mm:ss');
          try {
            calendarApi.scrollToTime(currentTime);
          } catch (error) {
            console.warn('Could not scroll to current time:', error);
          }
        }, 300);
      }
    }, [ref, view, refreshTrigger, currentDate, loading]);

    // This hook fetches tasks when the component loads or is refreshed.
    useEffect(() => {
      const fetchTasks = async () => {
        setLoading(true);
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
    }, [refreshTrigger]);

    const handleDrop = async (info: any) => {
      const taskId = info.draggedEl.getAttribute('data-task-id');
      if (!taskId) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const startTimeUTC = info.date.toISOString();
        const endTime = new Date(info.date);
        endTime.setHours(endTime.getHours() + 1);
        const endTimeFormatted = endTime.toTimeString().slice(0, 8);
        const { error } = await supabase
          .from('0007-ap-tasks')
          .update({
            start_time: startTimeUTC,
            end_time: endTimeFormatted,
            due_date: info.date.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId)
          .eq('user_id', user.id);
        if (error) { throw error; }
        toast.success('Task scheduled successfully');
        if (onTaskUpdated) { onTaskUpdated(); }
      } catch (err) {
        console.error('Error scheduling task:', err);
        toast.error('Failed to schedule task');
      }
    };

    const handleEventChange = async (info: any) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const startTimeUTC = info.event.start.toISOString();
        const endTimeFormatted = info.event.end ? info.event.end.toTimeString().slice(0, 8) : null;
        const { error } = await supabase
          .from('0007-ap-tasks')
          .update({
            start_time: startTimeUTC,
            end_time: endTimeFormatted,
            due_date: info.event.start.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', info.event.id)
          .eq('user_id', user.id);
        if (error) { throw error; }
        toast.success('Task time updated');
      } catch (err) {
        console.error('Error updating task time:', err);
        info.revert();
        toast.error('Failed to update task time');
      }
    };

    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        const calendarApi = ref.current.getApi();
        calendarApi.changeView(view);
        calendarApi.gotoDate(currentDate);
      }
    }, [view, currentDate]);

    const handleEventClick = (info: any) => {};
    const handleDatesSet = (arg: DateSetArg) => { onDateChange(arg.view.currentStart); };

    const isToday = (date: Date) => {
      const today = new Date();
      return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    };

    const customDayHeaderContent = (arg: DateHeaderContentArg) => ({
      html: `
        <div class="day-name">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][arg.date.getDay()]}</div>
        <div class="day-number ${isToday(arg.date) ? 'today' : ''}">${arg.date.getDate()}</div>
      `,
    });

    return (
      <div className="h-full">
        <FullCalendar
          key={view}
          ref={ref}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false}
          height="100%"
          events={events}
          editable={true}
          droppable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          eventClick={handleEventClick}
          drop={handleDrop}
          eventDrop={handleEventChange}
          eventResize={handleEventChange}
          dayMinTime="00:00:00"
          dayMaxTime="24:00:00"
          allDaySlot={true}
          nowIndicator={true}
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          expandRows={false}
          stickyHeaderDates={false}
          scrollTime="06:00:00"
          scrollTimeReset={false}
          slotLabelFormat={{ hour: 'numeric', minute: '2-digit', omitZeroMinute: true, meridiem: 'short' }}
          views={{
            dayGridMonth: { firstDay: 0, fixedWeekCount: false, showNonCurrentDates: true },
            timeGridWeek: { 
              firstDay: 0, 
              slotDuration: '00:15:00', 
              slotLabelInterval: '01:00', 
              allDaySlot: true, 
              expandRows: false,
              scrollTime: '06:00:00'
            },
            timeGridDay: { 
              dayCount: 1, 
              firstDay: 0, 
              slotDuration: '00:15:00', 
              slotLabelInterval: '01:00', 
              allDaySlot: true, 
              expandRows: false,
              scrollTime: '06:00:00'
            },
          }}
          datesSet={handleDatesSet}
          initialDate={currentDate}
          dayHeaderContent={view === 'dayGridMonth' ? undefined : customDayHeaderContent}
        />
      </div>
    );
  }
);

export default CalendarView;