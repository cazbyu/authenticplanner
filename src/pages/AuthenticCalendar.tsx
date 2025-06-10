import React, { useState, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, Menu, Calendar as CalendarIcon, CheckSquare, Users, Target, BookOpen, BarChart3, Briefcase, X, Archive } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import TaskForm from '../components/tasks/TaskForm';
import CalendarView from '../components/calendar/CalendarView';
import TaskQuadrants from '../components/tasks/TaskQuadrants';
import UnscheduledPriorities from '../components/tasks/UnscheduledPriorities';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { FullCalendar } from '@fullcalendar/core';
import logo from '../assets/logo.svg';

// Import drawer content components
import RoleBank from '../components/roles/RoleBank';
import StrategicGoals from '../pages/StrategicGoals';
import Reflections from '../pages/Reflections';
import Scorecard from '../pages/Scorecard';
import Tasks from '../pages/Tasks';

const AuthenticCalendar: React.FC = () => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'>('timeGridDay');
  const [prioritiesCollapsed, setPrioritiesCollapsed] = useState(false);
  const [mainSidebarOpen, setMainSidebarOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'roles' | 'tasks' | 'goals' | 'reflections' | 'scorecard' | null>(null);
  const [activeView, setActiveView] = useState<'calendar' | 'tasks'>('tasks'); // Changed default to 'tasks'
  const [mobileNavExpanded, setMobileNavExpanded] = useState(false);
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
    { name: 'Settings', path: '/settings', icon: 'Settings' },
  ];

  const drawerItems = [
    { 
      id: 'roles',
      title: 'Role Bank',
      description: 'Manage your life roles and authentic deposits',
      icon: Users,
      component: RoleBank
    },
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
    <div className="h-screen flex flex-col bg-white">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {(mainSidebarOpen || activeDrawer) && (
          <motion.div 
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            initial="closed"
            animate="open"
            exit="closed"
            variants={overlayVariants}
            onClick={() => {
              closeMainSidebar();
              setActiveDrawer(null);
              setMobileNavExpanded(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Navigation Sidebar */}
      <motion.aside
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg lg:hidden"
        initial="closed"
        animate={mainSidebarOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <img src={logo} alt="Authentic Planner" className="h-8 w-8" />
              <span className="text-lg font-bold text-primary-600">Authentic Planner</span>
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

      {/* FIXED: Google Calendar Style Floating Navigation Bar - Desktop Only */}
      <div className="fixed top-1/2 right-0 transform -translate-y-1/2 z-30 hidden lg:block">
        <div className="bg-white border-l border-t border-b border-gray-200 rounded-l-lg shadow-lg">
          {/* Navigation Icons - Vertically Stacked */}
          <div className="flex flex-col">
            {drawerItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeDrawer === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleDrawerSelect(item.id as typeof activeDrawer)}
                  className={`
                    group relative p-3 border-b border-gray-100 last:border-b-0 transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-blue-600 border-r-3 border-r-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  title={item.title}
                  aria-label={item.title}
                >
                  <IconComponent className="h-5 w-5" />
                  
                  {/* Tooltip on hover - Only show when not active */}
                  {!isActive && (
                    <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="bg-gray-900 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap shadow-lg">
                        {item.title}
                        {/* Tooltip arrow */}
                        <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FIXED: Mobile Floating Navigation - Expandable Stack with Dresser Icon */}
      <div className="fixed bottom-4 right-4 z-30 lg:hidden">
        {!mobileNavExpanded ? (
          /* Collapsed State - Single Floating Button with Dresser Icon */
          <button
            onClick={() => setMobileNavExpanded(true)}
            className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            aria-label="Open navigation"
          >
            <Archive className="h-6 w-6" />
          </button>
        ) : (
          /* Expanded State - Vertical Stack of All Icons */
          <div className="flex flex-col-reverse space-y-reverse space-y-2">
            {/* Close Button */}
            <button
              onClick={() => setMobileNavExpanded(false)}
              className="flex items-center justify-center w-12 h-12 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* All Navigation Icons */}
            {drawerItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeDrawer === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleDrawerSelect(item.id as typeof activeDrawer)}
                  className={`
                    flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }
                  `}
                  title={item.title}
                  aria-label={item.title}
                >
                  <IconComponent className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Drawer Content */}
      <AnimatePresence>
        {activeDrawer && (
          <motion.div
            className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-xl border-l border-gray-200"
            initial="closed"
            animate="open"
            exit="closed"
            variants={drawerVariants}
          >
            <div className="flex h-full flex-col">
              {/* Drawer Header */}
              <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {drawerItems.find(item => item.id === activeDrawer)?.title}
                </h2>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close drawer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              
              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto">
                {ActiveDrawerComponent && (
                  <div className="p-4">
                    <ActiveDrawerComponent />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

              {/* Current Date Display - Smaller font */}
              <div className="text-lg font-normal text-gray-700">
                {getDateDisplayText()}
              </div>
            </>
          )}
        </div>

        {/* Right Section: View Selector, New Task, Profile */}
        <div className="flex items-center space-x-3">
          {/* View Selector - Only show for calendar view */}
          {activeView === 'calendar' && (
            <select
              value={view}
              onChange={(e) => handleViewChange(e.target.value as typeof view)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="timeGridDay">Day</option>
              <option value="timeGridWeek">Week</option>
              <option value="dayGridMonth">Month</option>
            </select>
          )}

          {/* Circular New Task Button */}
          <button
            onClick={() => setShowTaskForm(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
            title="Add new task"
            aria-label="Add new task"
          >
            <Plus className="h-5 w-5" />
          </button>

          {/* Profile Icon - Hidden on desktop since we have the floating nav */}
          <div className="relative lg:hidden">
            <button
              onClick={() => setActiveDrawer(activeDrawer ? null : 'roles')}
              className="flex items-center space-x-2 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Toggle navigation"
            >
              <div className="h-7 w-7 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-blue-600">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === 'tasks' ? (
          /* Task Priorities View - Now the default */
          <div className="flex-1 overflow-hidden" style={{ marginRight: activeDrawer ? '320px' : '0' }}>
            <TaskQuadrants refreshTrigger={refreshTrigger} />
          </div>
        ) : (
          /* Calendar View - Now secondary */
          <>
            {/* Left Sidebar - Unscheduled Priorities with collapse functionality */}
            <div className={`${prioritiesCollapsed ? 'w-16' : 'w-64'} border-r border-gray-200 bg-white flex flex-col transition-all duration-200 flex-shrink-0`}>
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
                <>
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
                  <div className="flex-1">
                    <UnscheduledPriorities refreshTrigger={refreshTrigger} />
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
                </>
              )}
            </div>

            {/* Calendar Area - Takes up remaining space and expands when priorities collapsed */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ marginRight: activeDrawer ? '320px' : '0' }}>
              <CalendarView
                ref={calendarRef}
                view={view}
                currentDate={currentDate}
                onDateChange={handleDateChange}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </>
        )}
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