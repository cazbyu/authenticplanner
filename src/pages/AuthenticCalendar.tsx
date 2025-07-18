import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Menu, Calendar as CalendarIcon, CheckSquare, Users, Target, BookOpen, BarChart3, Briefcase, X, Archive } from 'lucide-react';
import { Compass } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import TaskForm from '../components/tasks/TaskForm';
import CalendarView from '../components/calendar/CalendarView';
import { DragDropContext } from 'react-beautiful-dnd';
import TaskQuadrants from '../components/tasks/TaskQuadrants';
import UnscheduledPriorities from '../components/tasks/UnscheduledPriorities';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { FullCalendar } from '@fullcalendar/core';
import logo from '../assets/logo.svg';
import { supabase } from '../supabaseClient';

// Import drawer content components
import RoleBank from '../components/roles/RoleBank';
import StrategicGoals from '../pages/StrategicGoals';
import Reflections from '../pages/Reflections';
import Scorecard from '../pages/Scorecard';
import Tasks from '../pages/Tasks';

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_urgent: boolean;
  is_important: boolean;
  is_authentic_deposit: boolean;
  is_twelve_week_goal: boolean;
  status: string;
  notes: string | null;
  task_roles: { role_id: string }[];
  task_domains: { domain_id: string }[];
  priority?: number;
}

interface Role {
  id: string;
  label: string;
}

interface Domain {
  id: string;
  name: string;
}

const AuthenticCalendar: React.FC = () => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'>('timeGridDay');
  const calendarRef = useRef<FullCalendar | null>(null);
  const { user, logout } = useAuth();

  // State for resizing
  const [resizing, setResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default width (64 * 4)
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  
  // Fetch all task data
  useEffect(() => {
    fetchAllTaskData();
  }, [refreshTrigger]);

  const fetchAllTaskData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user found when fetching tasks');
      setLoading(false);
      return;
    }

    setLoading(true);

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
    
    // Force calendar to update view immediately
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.changeView(newView);
      api.gotoDate(currentDate);
    }
    setIsViewChanging(false);
  };

  const handleTaskCreated = () => {
    setShowTaskForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const toggleMainSidebar = () => setMainSidebarOpen(!mainSidebarOpen);
  const closeMainSidebar = () => setMainSidebarOpen(false);

  const handleDrawerSelect = (drawer: typeof activeDrawer) => {
    if (activeDrawer === drawer) {
      // If clicking the same drawer, close it
      setActiveDrawer(null);
    } else {
      // Open the selected drawer
      setActiveDrawer(drawer);
    }
    // Close mobile nav when selecting a drawer
    setMobileNavExpanded(false);
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

  const navItems = [
    { name: 'Authentic Calendar', path: '/', icon: 'Calendar' },
    { name: '12 Week Cycle', path: '/twelve-week-cycle', icon: 'Clock' },
    { name: 'Role Bank', path: '/role-bank', icon: 'Users' },
    { name: 'Domain Dashboard', path: '/domains', icon: 'Compass' },
    { name: 'Settings', path: '/settings', icon: 'Settings' },
  ];

  const drawerItems = [
    {
      id: 'tasks',
      title: 'Tasks',
      description: 'View and manage your tasks',
      icon: Briefcase,
      component: Tasks
    },
    {
      id: 'goals',
      title: 'Strategic Goals',
      description: 'Review your mission, vision, and goals',
      icon: Target,
      component: StrategicGoals
    },
    {
      id: 'reflections',
      title: 'Reflections',
      description: 'View your task-related notes and reflections',
      icon: BookOpen,
      component: Reflections
    },
    {
      id: 'scorecard',
      title: 'Scorecard',
      description: 'Track your balance and progress',
      icon: BarChart3,
      component: Scorecard
    }
  ];

  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };
  
  const drawerVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };
  
  const overlayVariants = {
    open: { opacity: 1, transition: { duration: 0.3 } },
    closed: { opacity: 0, transition: { duration: 0.3 } },
  };

  const ActiveDrawerComponent = activeDrawer 
    ? drawerItems.find(item => item.id === activeDrawer)?.component 
    : null;

  return (
    <div className="calendar-container">
      {/* Main content */}
      <div className="h-full grid grid-cols-4 gap-6">
        {/* Left Column */}
        <div className="flex flex-col space-y-6 overflow-auto">
          <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Priorities</h2>
            </div>
            <div className="space-y-2">
              {/* Priority cards */}
            </div>
            <button 
              onClick={closeMainSidebar}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.path === '/calendar' || (item.path === '/' && window.location.pathname === '/');
                
                return (
                  <a
                    key={item.path}
                    href={item.path}
                    className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={closeMainSidebar}
                  >
                    <span className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-500'}`}>
                      📅
                    </span>
                    {item.name}
                  </a>
                );
              })}
            </nav>
          </div>
          
          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Demo User'}</p>
                <p className="truncate text-xs text-gray-500">{user?.email || 'demo@example.com'}</p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="mt-4 flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <span className="mr-3 h-5 w-5">🚪</span>
              Sign out
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Google Calendar Style Header - Compact and minimal */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white min-h-[56px]">
        {/* Left Section: Menu, Logo, Toggle */}
        <div className="flex items-center space-x-4">
          {/* Hamburger Menu - Opens main navigation sidebar */}
          <button
            onClick={toggleMainSidebar}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors lg:hidden"
            aria-label="Toggle main menu"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          
          {/* Authentic Planner Logo & Brand - Stacked and smaller */}
          <div className="flex items-center space-x-2">
            <img src={logo} alt="Authentic Planner" className="h-8 w-8" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-gray-700">Authentic</span>
              <span className="text-sm font-medium text-gray-700">Planner</span>
            </div>
          </div>

          {/* Tasks/Calendar Toggle - Updated labels and default */}
          <div className="flex items-center bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setActiveView('tasks')}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                activeView === 'tasks'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Task Priorities View"
            >
              <CheckSquare className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                activeView === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Calendar View"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Date Navigation - Only show for calendar view */}
          {activeView === 'calendar' && (
            <>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handlePrevious}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              <span className="text-lg font-medium">
                {view === 'dayGridMonth'
                  ? format(currentDate, 'MMMM yyyy')
                  : `${format(currentDate, 'd')} – ${format(
                      addDays(currentDate, 6),
                      'd MMM, yyyy'
                    )}`}
              </span>
            </div>
        ) : (
          /* Calendar View - Now secondary */
          <>
            {/* Left Sidebar - Unscheduled Priorities with collapse functionality */}
            <div 
              className={`${prioritiesCollapsed ? 'w-16' : ''} border-r border-gray-200 bg-white flex flex-col transition-all duration-200 flex-shrink-0 relative`} 
              style={{
                minWidth: prioritiesCollapsed ? '4rem' : '16rem',
                width: prioritiesCollapsed ? '4rem' : `${sidebarWidth}px`,
                maxWidth: prioritiesCollapsed ? '4rem' : '600px'
              }}
              ref={sidebarRef}
              id="unscheduled-priorities-container"
            >
              {prioritiesCollapsed ? (
                /* Collapsed Sidebar - Improved readability with proper case */
                <div className="h-full flex flex-col items-center py-4">
                  <button
                    onClick={() => setPrioritiesCollapsed(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors mb-6"
                    title="Expand Unscheduled Priorities"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  </button>
                  
                  {/* Vertical Text - Much more readable with proper case */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="transform -rotate-90 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-600 tracking-wider">
                        Unscheduled Priorities
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Expanded Sidebar */
                  <div className="flex flex-col h-full">
                    {/* Unscheduled Priorities Header with Collapse Button */}
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Unscheduled Priorities</h3>
                        <button
                          onClick={() => setPrioritiesCollapsed(true)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Collapse Unscheduled Priorities"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Unscheduled Priorities Content - FIXED: Removed overflow-hidden */}
                    <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 120px)' }}>
                      <UnscheduledPriorities 
                        tasks={tasks}
                        setTasks={setTasks}
                        roles={roles}
                        domains={domains}
                        loading={loading}
                      />
                    </div>
                    
                    {/* Resizer handle */}
                    {!prioritiesCollapsed && (
                      <div 
                        className="absolute top-0 right-0 bottom-0 w-4 cursor-col-resize hover:bg-blue-200 hover:opacity-50 z-50"
                        onMouseDown={handleResizeStart}
                        style={{ 
                          cursor: 'col-resize',
                          width: '16px',
                          right: '-8px',
                          zIndex: 100
                        }}
                      >
                        <div 
                          className="absolute top-0 right-0 bottom-0 w-1 bg-gray-200 hover:bg-blue-500"
                          style={{
                            right: '8px',
                            width: '4px'
                          }}
                        />
                      </div>
                    )}
                  </div>
              )}
            </div>

          <div className="flex-1 min-h-0">
            <CalendarView
              ref={calendarRef}
              view={view}
              currentDate={currentDate}
              onDateChange={handleDateChange}
            />
          </div>
        </div>
      </DragDropContext>

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