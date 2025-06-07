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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
        return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd, yyyy')}`;
      case 'dayGridMonth':
        return format(currentDate, 'MMMM yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Google Calendar Style Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        {/* Left Section: Menu, Logo, Date Navigation */}
        <div className="flex items-center space-x-6">
          {/* Hamburger Menu */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
          
          {/* Authentic Planner Logo & Brand */}
          <div className="flex items-center space-x-3">
            <img src={logo} alt="Authentic Planner" className="h-10 w-10" />
            <span className="text-xl font-normal text-gray-700">
              Authentic Planner
            </span>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center space-x-2">
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
          </div>

          {/* Current Date Display */}
          <div className="text-xl font-normal text-gray-700">
            {getDateDisplayText()}
          </div>
        </div>

        {/* Right Section: View Selector, New Task, Profile */}
        <div className="flex items-center space-x-4">
          {/* View Selector */}
          <select
            value={view}
            onChange={(e) => handleViewChange(e.target.value as typeof view)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="timeGridDay">Day</option>
            <option value="timeGridWeek">Week</option>
            <option value="dayGridMonth">Month</option>
          </select>

          {/* New Task Button */}
          <button
            onClick={() => setShowTaskForm(true)}
            className="flex items-center rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </button>

          {/* Profile */}
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
        {/* Left Sidebar - Priorities (like Google's mini calendar area) */}
        {sidebarOpen && (
          <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
            {/* Priorities Section */}
            <div className="p-4 flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Priorities</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900 text-sm">Complete quarterly review</div>
                  <div className="text-gray-500 text-xs mt-1">Due today</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900 text-sm">Team meeting preparation</div>
                  <div className="text-gray-500 text-xs mt-1">Due tomorrow</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900 text-sm">Review project proposals</div>
                  <div className="text-gray-500 text-xs mt-1">Due this week</div>
                </div>
              </div>
            </div>
            
            {/* Notes Section (collapsible/secondary) */}
            <div className="border-t border-gray-200 p-4">
              <details className="group">
                <summary className="text-sm font-medium text-gray-900 cursor-pointer list-none flex items-center justify-between">
                  Notes
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3">
                  <textarea
                    className="w-full h-24 resize-none rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Add your notes here..."
                  />
                </div>
              </details>
            </div>
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