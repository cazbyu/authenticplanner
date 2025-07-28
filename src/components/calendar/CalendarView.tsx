import React, { forwardRef, useState, useEffect } from 'react';
import FullCalendar, { DateSetArg, DateHeaderContentArg } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../../supabaseClient';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

    useEffect(() => {
      if (ref && 'current' in ref && ref.current && (view === 'timeGridWeek' || view === 'timeGridDay') && !loading) {
        const calendarApi = ref.current.getApi();
        const now = new Date();
        const currentTime = format(now, 'HH:mm:ss');
        try {
          calendarApi.scrollToTime(currentTime);
        } catch (error) {
          console.warn('Could not scroll to current time:', error);
        }
      }
    }, [ref, view, loading]);

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
      const taskId = info.draggedEl?.getAttribute('data-task-id') || info.draggedEl?.dataset?.taskId;
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
        let endTimeFormatted = null;
        if (info.event.end) {
          endTimeFormatted = info.event.end.toTimeString().slice(0, 8);
        } else if (info.event.start) {
          const defaultEnd = new Date(info.event.start);
          defaultEnd.setHours(defaultEnd.getHours() + 1);
          endTimeFormatted = defaultEnd.toTimeString().slice(0, 8);
        }
        
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
        
        if (info.oldEvent && info.event.start.getTime() !== info.oldEvent.start.getTime()) {
          toast.success('Event moved successfully');
        } else {
          toast.success('Event duration updated');
        }
      } catch (err) {
        console.error('Error updating task time:', err);
        info.revert();
        toast.error('Failed to update event');
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
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .fc { font-family: inherit; }
              .fc-scrollgrid-sync-inner { padding: 8px 0; }
              .fc-theme-standard td, .fc-theme-standard th { border-color: #e5e7eb; }
              .fc-timegrid-slot { height: 24px !important; border-bottom: 1px solid #f3f4f6 !important; }
              .fc-timegrid-slot-label { font-size: 0.75rem; color: #6B7280; padding-right: 1rem; }
              .fc-timegrid-axis { padding-right: 0.5rem; }
              .fc-timegrid-now-indicator-line { 
                border-top: 3px solid #EF4444 !important; 
                left: 0 !important; 
                right: 0 !important; 
                margin-left: 0 !important;
                box-shadow: 0 0 8px rgba(239, 68, 68, 0.8) !important;
                z-index: 1000 !important;
              }
              .fc-timegrid-now-indicator-arrow { 
                border-color: #EF4444 !important;
                border-width: 8px 0 8px 10px !important;
                margin-top: -8px !important;
                z-index: 1000 !important;
              }
              .fc-scroller { 
                overflow-y: auto !important;
                overflow-x: hidden !important;
                height: 100% !important;
                max-height: calc(100vh - 200px) !important;
              }
              .fc-timegrid-body {
                overflow-y: auto !important;
                max-height: calc(100vh - 200px) !important;
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
              .fc-event-dragging { opacity: 0.75; }
              .fc-timegrid-col.fc-day-today { background-color: rgba(59, 130, 246, 0.05); }
              .fc-unthemed .fc-event { border-radius: 4px; border: 1px solid; font-size: 0.85em; padding: 2px 4px; }
            `,
          }}
        />

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
          expandRows={true}
          stickyHeaderDates={true}
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
              showNonCurrentDates: true,
            },
            timeGridWeek: {
              firstDay: 0,
              slotDuration: '00:15:00',
              slotLabelInterval: '01:00',
              allDaySlot: true,
              expandRows: true,
            },
            timeGridDay: {
              dayCount: 1,
              firstDay: 0,
              slotDuration: '00:15:00',
              slotLabelInterval: '01:00',
              allDaySlot: true,
              expandRows: true,
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