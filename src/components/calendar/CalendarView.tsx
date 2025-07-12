import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../../supabaseClient';
import { format } from 'date-fns';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import TaskEditModal from './TaskEditModal';

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

const CalendarView = forwardRef<any, CalendarViewProps>(({ view, currentDate, onDateChange, refreshTrigger }, ref) => {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getApi: () => calendarRef.current?.getApi(),
  }));

  // Fetch events from database
  const fetchEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tasks } = await supabase
        .from('0007-ap-tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .not('start_time', 'is', null);

      if (tasks) {
        const getTaskColor = (task: Task) => {
          // Priority-based colors matching the quadrant system
          if (task.is_urgent && task.is_important) {
            return { bg: '#ef4444', border: '#dc2626' }; // Red - Urgent & Important
          } else if (!task.is_urgent && task.is_important) {
            return { bg: '#10b981', border: '#059669' }; // Green - Not Urgent & Important
          } else if (task.is_urgent && !task.is_important) {
            return { bg: '#f59e0b', border: '#d97706' }; // Orange - Urgent & Not Important
          } else {
            return { bg: '#6b7280', border: '#4b5563' }; // Gray - Not Urgent & Not Important
          }
        };

        const calendarEvents = tasks.map((task: Task) => ({
          id: task.id,
          title: task.title,
          start: task.start_time,
          end: task.end_time ? new Date(new Date(task.start_time!).toDateString() + ' ' + task.end_time).toISOString() : undefined,
          backgroundColor: (() => {
            const colors = getTaskColor(task);
            // Override with special color for authentic deposits
            return task.is_authentic_deposit ? '#8b5cf6' : colors.bg; // Purple for authentic deposits
          })(),
          borderColor: (() => {
            const colors = getTaskColor(task);
            return task.is_authentic_deposit ? '#7c3aed' : colors.border;
          })(),
          extendedProps: {
            task: task
          }
        }));
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [refreshTrigger]);

  // Handle event click
  const handleEventClick = (clickInfo: any) => {
    setEditingTaskId(clickInfo.event.id);
  };

  // Handle date select for creating new events
  const handleDateSelect = (selectInfo: any) => {
    // This could be used to create new events
    console.log('Date selected:', selectInfo);
  };

  // Handle external drop (from unscheduled priorities)
  const handleDrop = async (dropInfo: any) => {
    const taskId = dropInfo.draggedEl.getAttribute('data-task-id');
    if (!taskId) return;

    const dropDate = dropInfo.date;
    const dateStr = format(dropDate, 'yyyy-MM-dd');
    const timeStr = format(dropDate, 'HH:mm');

    try {
      const { error } = await supabase
        .from('0007-ap-tasks')
        .update({
          due_date: dateStr,
          start_time: dropDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (!error) {
        // Refresh events
        fetchEvents();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // Handle event resize
  const handleEventResize = async (resizeInfo: any) => {
    const taskId = resizeInfo.event.id;
    const newStart = resizeInfo.event.start;
    const newEnd = resizeInfo.event.end;

    if (newStart && newEnd) {
      const startTimeStr = newStart.toISOString();
      const endTimeStr = format(newEnd, 'HH:mm:ss');
      const dateStr = format(newStart, 'yyyy-MM-dd');
      
      try {
        const { error } = await supabase
          .from('0007-ap-tasks')
          .update({
            due_date: dateStr,
            start_time: startTimeStr,
            end_time: endTimeStr,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId);

        if (error) {
          console.error('Error updating task:', error);
          resizeInfo.revert();
        } else {
          // Refresh events to show updated data
          fetchEvents();
        }
      } catch (error) {
        console.error('Error updating task end time:', error);
        resizeInfo.revert();
      }
    } else {
      resizeInfo.revert();
    }
  };

  // Handle event drop (moving events within calendar)
  const handleEventDrop = async (dropInfo: any) => {
    const taskId = dropInfo.event.id;
    const newStart = dropInfo.event.start;
    const newEnd = dropInfo.event.end;

    const dateStr = format(newStart, 'yyyy-MM-dd');
    const startTimeStr = newStart.toISOString();
    const endTimeStr = newEnd ? format(newEnd, 'HH:mm:ss') : null;

    try {
      const { error } = await supabase
        .from('0007-ap-tasks')
        .update({
          due_date: dateStr,
          start_time: startTimeStr,
          end_time: endTimeStr,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        dropInfo.revert();
      }
    } catch (error) {
      console.error('Error updating task time:', error);
      dropInfo.revert();
    }
  };

  // Generate droppable time slots for the current view
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 0;
    const endHour = 24;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const slotId = `calendar-${dateStr}-${hour.toString().padStart(2, '0')}-${minute.toString().padStart(2, '0')}`;
        
        slots.push({
          id: slotId,
          time: timeStr,
          date: dateStr
        });
      }
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Calendar container with droppable time slots */}
      <div className="flex-1 relative overflow-auto">
        {/* Invisible droppable zones overlaid on calendar */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {timeSlots.map((slot) => (
            <Droppable key={slot.id} droppableId={slot.id} type="TASK">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`absolute pointer-events-auto ${
                    snapshot.isDraggingOver ? 'bg-blue-200 bg-opacity-50' : ''
                  }`}
                  style={{
                    left: view === 'timeGridWeek' ? '60px' : '60px', // Account for time labels
                    right: '0',
                    top: `${(parseInt(slot.time.split(':')[0]) * 60 + parseInt(slot.time.split(':')[1])) / 30 * 24}px`, // 24px per 30min slot
                    height: '24px', // 30 minute slot height
                    zIndex: snapshot.isDraggingOver ? 20 : 10
                  }}
                >
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>

        {/* FullCalendar component */}
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
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          slotDuration="00:15:00"
          slotLabelInterval="01:00:00"
          snapDuration="00:15:00"
          allDaySlot={false}
          nowIndicator={true}
          eventResizableFromStart={true}
          eventClick={handleEventClick}
          select={handleDateSelect}
          drop={handleDrop}
          eventResize={handleEventResize}
          eventDrop={handleEventDrop}
          datesSet={(dateInfo) => {
            onDateChange(dateInfo.start);
          }}
          eventContent={(eventInfo) => (
            <div className="p-1 text-xs">
              <div className="font-medium truncate">{eventInfo.event.title}</div>
              {eventInfo.event.extendedProps.task?.is_authentic_deposit && (
                <div className="text-xs opacity-75">Authentic Deposit</div>
              )}
            </div>
          )}
        />
      </div>

      {/* Task Edit Modal */}
      {editingTaskId && (
        <TaskEditModal
          taskId={editingTaskId}
          onClose={() => setEditingTaskId(null)}
          onTaskUpdated={() => {
            setEditingTaskId(null);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
});

CalendarView.displayName = 'CalendarView';

export default CalendarView;