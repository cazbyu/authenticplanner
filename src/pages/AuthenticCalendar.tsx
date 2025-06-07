import React, { useState, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import TaskForm from '../components/tasks/TaskForm';
import CalendarView from '../components/calendar/CalendarView';
import type { FullCalendar } from '@fullcalendar/core';

const AuthenticCalendar: React.FC = () => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date()); // Now defaults to today
  const [view, setView] = useState<'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'>(
    'timeGridDay' // Changed default to Day view to showcase today's date
  );
  const calendarRef = useRef<FullCalendar | null>(null);
  const [isViewChanging, setIsViewChanging] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Called whenever FullCalendar's visible date range changes
  const handleDateChange = (newStart: Date) => {
    // Only update currentDate if we're not in the middle of a view change
    if (!isViewChanging) {
      setCurrentDate(newStart);
    }
  };

  const handlePrevious = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().prev();
    }
  };

  const handleNext = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().next();
    }
  };

  const handleViewChange = (newView: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth') => {
    setIsViewChanging(true);
    setView(newView);
    
    // Use a longer timeout to ensure the view change completes
    setTimeout(() => {
      if (calendarRef.current) {
        calendarRef.current.getApi().gotoDate(currentDate);
      }
      setIsViewChanging(false);
    }, 100);
  };

  const handleTaskCreated = () => {
    setShowTaskForm(false);
    // Trigger calendar refresh by incrementing the refresh trigger
    setRefreshTrigger(prev => prev + 1);
  };

  const getDateDisplayText = () => {
    switch (view) {
      case 'timeGridDay':
        return format(currentDate, 'EEEE, MMMM d, yyyy'); // e.g. "Monday, January 6, 2025"
      case 'timeGridWeek':
        // Calculate the actual start and end of the week containing currentDate
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday = 0
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(weekStart, 'd')} – ${format(weekEnd, 'd MMM, yyyy')}`; // e.g. "1 – 7 Jun, 2025"
      case 'dayGridMonth':
        return format(currentDate, 'MMMM yyyy'); // e.g. "January 2025"
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Main content */}
      <div className="flex-1 grid grid-cols-4 gap-6 min-h-0 px-4">
        {/* Left Column */}
        <div className="flex flex-col space-y-6 overflow-auto">
          <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Priorities</h2>
            </div>
            <div className="space-y-2">
              {/* Priority cards */}
            </div>
          </div>
          <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Notes</h2>
            <textarea
              className="h-[calc(100%-2rem)] w-full resize-none rounded-md border border-gray-200 p-3 text-sm"
              placeholder="Add your notes here..."
            />
          </div>
        </div>

        {/* Right Column: Calendar */}
        <div className="col-span-3 flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
          {/* Calendar Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevious}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              <span className="text-lg font-medium">
                {getDateDisplayText()}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={view}
                onChange={(e) => handleViewChange(e.target.value as typeof view)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700"
              >
                <option value="timeGridDay">Day</option>
                <option value="timeGridWeek">Week</option>
                <option value="dayGridMonth">Month</option>
              </select>

              <button
                onClick={() => setShowTaskForm(true)}
                className="flex items-center rounded-md bg-teal-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-600"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New Task
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <CalendarView
              ref={calendarRef}
              view={view}
              currentDate={currentDate}
              onDateChange={handleDateChange}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      </div>

      {/* TaskForm Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl">
            <TaskForm 
              onClose={() => setShowTaskForm(false)}
              onTaskCreated={handleTaskCreated}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthenticCalendar;