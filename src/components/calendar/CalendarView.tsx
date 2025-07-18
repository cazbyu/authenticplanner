import React, { forwardRef, useRef, useEffect, useState } from 'react';
import FullCalendar, { DateSetArg, DateHeaderContentArg } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../../supabaseClient';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CalendarViewProps {
  view: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth';
  currentDate: Date;
  onDateChange: (date: Date) => void;
  refreshTrigger: number;
  onTaskUpdated?: () => void;
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
  ({ view, currentDate, onDateChange, onTaskUpdated }, ref) => {
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

    // Handle external task drops
    const handleDrop = async (info: any) => {
      const taskId = info.draggedEl.getAttribute('data-task-id');
      if (!taskId) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Convert drop date/time to UTC for storage
        const startTimeUTC = info.date.toISOString();
        
        // Calculate end time (1 hour later by default)
        const endTime = new Date(info.date);
        endTime.setHours(endTime.getHours() + 1);
        const endTimeFormatted = endTime.toTimeString().slice(0, 8); // HH:MM:SS format

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

        if (error) {
          console.error('Error updating task:', error);
          toast.error('Failed to schedule task');
          return;
        }

        // Add event to calendar immediately
        const newEvent = {
          id: taskId,
          title: info.draggedEl.textContent?.split('\n')[0] || 'Task',
          start: info.date,
          end: endTime,
          allDay: false,
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
        };

        setEvents(prev => [...prev, newEvent]);
        toast.success('Task scheduled successfully');
        
        // Notify parent to refresh unscheduled tasks
        if (onTaskUpdated) {
          onTaskUpdated();
        }
      } catch (err) {
        console.error('Error scheduling task:', err);
        toast.error('Failed to schedule task');
      }
    };

    // Handle event resize/move
    const handleEventChange = async (info: any) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const startTimeUTC = info.event.start.toISOString();
        const endTimeFormatted = info.event.end ? 
          info.event.end.toTimeString().slice(0, 8) : null;

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

        if (error) {
          console.error('Error updating task time:', error);
          info.revert();
          toast.error('Failed to update task time');
        } else {
          toast.success('Task time updated');
        }
      } catch (err) {
        console.error('Error updating task time:', err);
        info.revert();
        toast.error('Failed to update task time');
      }
    };

    // Update calendar view and date
    useEffect(() => {
      if (fullCalendarRef && 'current' in fullCalendarRef && fullCalendarRef.current) {
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
          .fc-view-harness { height: 100% !important; overflow: hidden !important; }
          .fc-view-harness-active { height: 100% !important; overflow: hidden !important; }
          .fc-scrollgrid-sync-inner { padding: 8px 0; }
          .fc-theme-standard td, .fc-theme-standard th { border-color: #e5e7eb; }
          .fc-timegrid-slot { height: 24px !important; border-bottom: 1px solid #f3f4f6 !important; }
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
          .fc-scroller { 
            overflow-y: auto !important; 
            overflow-x: hidden !important;
            height: 100% !important;
            max-height: calc(100vh - 200px) !important;
          }
          .fc-timegrid-body { 
            min-height: 100% !important; 
            overflow: visible !important;
          }
          .fc-timegrid-container {
            height: 100% !important;
            overflow: visible !important;
          }
          .fc-timegrid-slots {
            height: auto !important;
          }
          .fc-scrollgrid-section-body > td {
            overflow: visible !important;
          }
          .fc-scrollgrid-section-body .fc-scroller {
            overflow-y: auto !important;
            height: 100% !important;
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
          
          /* Drag and drop styling */
          .fc-event-dragging {
            opacity: 0.75;
          }
          
          .fc-timegrid-col.fc-day-today {
            background-color: rgba(59, 130, 246, 0.05);
          }
          
          /* External drag styling */
          .fc-unthemed .fc-event {
            border-radius: 4px;
            border: 1px solid;
            font-size: 0.85em;
            padding: 2px 4px;
          }
          `}
        </style>

        <FullCalendar
  key={view}                      // ← ADD THIS LINE! (anywhere in the tag's props)
  ref={calendarRef}
  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
  initialView={view}
          headerToolbar={false} // We handle navigation in parent
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
          scrollTime={format(new Date(), 'HH:mm:ss')}
          nowIndicator={true}
          slotDuration="00:15:00"
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
              firstDay: 0, // Start week on Sunday
              fixedWeekCount: false,
              showNonCurrentDates: true,
            },
            timeGridWeek: {
              firstDay: 0, // Start week on Sunday
              slotDuration: '00:15:00',
              slotLabelInterval: '01:00',
              scrollTime: format(new Date(), 'HH:mm:ss'),
              allDaySlot: true,
              expandRows: true,
            },
            timeGridDay: {
              dayCount: 1,
              firstDay: 0, // Start week on Sunday
              slotDuration: '00:15:00',
              slotLabelInterval: '01:00',
              scrollTime: format(new Date(), 'HH:mm:ss'),
              allDaySlot: true,
              expandRows: true,
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