import React, { forwardRef, useEffect, useState, useMemo } from 'react';
import FullCalendar, { DateSetArg, EventDropArg, EventInput } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DropArg } from '@fullcalendar/interaction';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';

// --- Type Definitions (aligned with 0004-ap- schema) ---
interface Task {
  id: string;
  title: string;
  'start-time': string | null;
  'end-time': string | null;
  'due-date': string | null;
  'is-urgent': boolean;
  'is-important': boolean;
  'is-authentic-deposit': boolean;
}

interface CalendarViewProps {
  tasks: Task[]; // Receive tasks from the parent component
  view: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth';
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onTaskUpdated: () => void; // To trigger a refresh in the parent
}

/**
 * CalendarView is a "dumb" component responsible for rendering the FullCalendar grid.
 * It receives all task data and configuration as props from its parent (AuthenticCalendar.tsx).
 * It handles user interactions like dragging and dropping events and communicates these
 * changes back to the database and the parent component.
 */
const CalendarView = forwardRef<FullCalendar, CalendarViewProps>(
  ({ tasks, view, currentDate, onDateChange, onTaskUpdated }, ref) => {

    // useMemo will only re-calculate the events array when the tasks prop changes.
    const events = useMemo(() => {
      return tasks
        .filter(task => task['start-time'] || task['due-date']) // Only map scheduled tasks
        .map((task): EventInput => ({
          id: task.id,
          title: task.title,
          start: task['start-time'] || task['due-date'],
          end: task['end-time'],
          allDay: !task['start-time'],
          backgroundColor: task['is-urgent'] ? '#ef4444' : task['is-important'] ? '#f59e0b' : '#3b82f6',
          borderColor: task['is-urgent'] ? '#dc2626' : task['is-important'] ? '#d97706' : '#2563eb',
        }));
    }, [tasks]);

    /**
     * Handles dropping an external task (from UnscheduledPriorities) onto the calendar.
     */
    const handleDrop = async (info: DropArg) => {
      const taskId = info.draggedEl.getAttribute('data-task-id');
      if (!taskId) return;

      try {
        const { error } = await supabase
          .from('0004-ap-tasks')
          .update({
            'start-time': info.date.toISOString(),
            'due-date': info.date.toISOString().split('T')[0],
            // Note: end-time is not set on drop, user can resize.
          })
          .eq('id', taskId);

        if (error) throw error;

        toast.success('Task scheduled successfully');
        onTaskUpdated(); // Trigger a full data refresh in the parent
      } catch (err: any) {
        toast.error(`Failed to schedule task: ${err.message}`);
      }
    };

    /**
     * Handles moving or resizing an existing event on the calendar.
     */
    const handleEventChange = async (arg: EventDropArg) => {
      try {
        const { error } = await supabase
          .from('0004-ap-tasks')
          .update({
            'start-time': arg.event.start?.toISOString(),
            'end-time': arg.event.end?.toISOString(),
            'due-date': arg.event.start?.toISOString().split('T')[0],
          })
          .eq('id', arg.event.id);

        if (error) throw error;
        
        toast.success('Task time updated');
        onTaskUpdated();
      } catch (err: any) {
        toast.error(`Failed to update task: ${err.message}`);
        arg.revert(); // Revert the change on the calendar if the DB update fails
      }
    };

    // Synchronize the calendar's internal view and date with props from the parent.
    useEffect(() => {
      const calendarApi = ref && 'current' in ref && ref.current ? ref.current.getApi() : null;
      if (calendarApi) {
        if (calendarApi.view.type !== view) {
            calendarApi.changeView(view);
        }
        calendarApi.gotoDate(currentDate);
      }
    }, [view, currentDate, ref]);

    return (
      <div className="h-full p-4">
        <FullCalendar
          ref={ref}
          key={view} // Force re-render when view changes
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false}
          height="100%"
          events={events}
          editable={true}
          droppable={true}
          eventClick={(info) => {
            // Placeholder for opening an edit modal
            console.log('Event clicked:', info.event);
          }}
          drop={handleDrop}
          eventDrop={handleEventChange}
          eventResize={handleEventChange}
          datesSet={(arg: DateSetArg) => onDateChange(arg.view.currentStart)}
          // Add other FullCalendar options as needed
        />
      </div>
    );
  }
);

export default CalendarView;
