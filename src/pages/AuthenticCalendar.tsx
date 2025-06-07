import React, { useState, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, Menu, User } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import TaskForm from '../components/tasks/TaskForm';
import CalendarView from '../components/calendar/CalendarView';
import { useAuth } from '../contexts/AuthContext';
import type { FullCalendar } from '@fullcalendar/core';
import logo from '../assets/logo.svg';

const AuthenticCalendar: React.FC = () => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'>('timeGridDay');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPriorities, setShowPriorities] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const calendarRef = useRef<FullCalendar | null>(null);
  const [isViewChanging, setIsViewChanging] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user, logout } = useAuth();

  // Called whenever FullCalendar's visible date range changes
  const handleDateChange = (newStart: Date) => {
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

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    if (calendarRef.current) {
      calendarRef.current.getApi().gotoDate(today);
    }
  };

  const handleViewChange = (newView: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth') => {
    setIsViewChanging(true);
    setView(newView);
    
    setTimeout(() => {
      if (calendarRef.current) {
        calendarRef.current.getApi().gotoDate(currentDate);
      }
      setIsViewChanging(false);
    }, 100);
  };

  const handleTaskCreated = () => {
    setShowTaskForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const getDateDisplayText = () => {
    switch (view) {
      case 'timeGridDay':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'timeGridWeek':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(weekStart, 'd')} – ${format(weekEnd, 'd MMM, yyyy')}`;
      case 'dayGridMonth':
        return format(currentDate, 'MMMM yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Unified Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        {/* Left Section: Menu, Logo, Date Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          
          <div className="flex items-center space-x-3">
            <img src={logo} alt="Authentic Planner" className="h-8 w-8" />
            <span className="text-xl font-semibold text-gray-900 hidden sm:block">
              Authentic Calendar
            </span>
          </div>

          <div className="flex items-center space-x-2 ml-8">
            <button
              onClick={handlePrevious}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Today
            </button>
          </div>

          <div className="text-lg font-medium text-gray-900 ml-4">
            {getDateDisplayText()}
          </div>
        </div>

        {/* Right Section: View Selector, New Task, Profile */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPriorities(!showPriorities)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                showPriorities ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Priorities
            </button>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                showNotes ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Notes
            </button>
          </div>

          <select
            value={view}
            onChange={(e) => handleViewChange(e.target.value as typeof view)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="timeGridDay">Day</option>
            <option value="timeGridWeek">Week</option>
            <option value="dayGridMonth">Month</option>
          </select>

          <button
            onClick={() => setShowTaskForm(true)}
            className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>

          <div className="relative">
            <button
              onClick={() => {/* Add profile dropdown logic */}}
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-full"
            >
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar Panels */}
        {(showPriorities || showNotes) && (
          <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
            {showPriorities && (
              <div className="flex-1 p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Priorities</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-lg border border-gray-200 text-sm">
                    <div className="font-medium text-gray-900">Complete quarterly review</div>
                    <div className="text-gray-500 text-xs mt-1">Due today</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-200 text-sm">
                    <div className="font-medium text-gray-900">Team meeting preparation</div>
                    <div className="text-gray-500 text-xs mt-1">Due tomorrow</div>
                  </div>
                </div>
              </div>
            )}
            
            {showNotes && (
              <div className="flex-1 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
                <textarea
                  className="w-full h-32 resize-none rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Add your notes here..."
                />
              </div>
            )}
          </div>
        )}

        {/* Calendar Area - Takes up remaining space */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CalendarView
            ref={calendarRef}
            view={view}
            currentDate={currentDate}
            onDateChange={handleDateChange}
            refreshTrigger={refreshTrigger}
          />
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