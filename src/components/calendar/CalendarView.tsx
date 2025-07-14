import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import FullCalendar, { DateSetArg, DateHeaderContentArg } from '@fullcalendar/react';
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

export default CalendarView;