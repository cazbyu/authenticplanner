import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, ChevronDown, Menu, Calendar as CalendarIcon, CheckSquare, Users, Target, BookOpen, BarChart3, Briefcase, X, Archive } from 'lucide-react';
import { Compass } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import TaskEventForm from '../components/tasks/TaskEventForm';
import CalendarView from '../components/calendar/CalendarView';
import TaskQuadrants from '../components/tasks/TaskQuadrants';
import UnscheduledPriorities from '../components/tasks/UnscheduledPriorities';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { FullCalendar } from '@fullcalendar/core';
import logo from '../assets/logo.svg';
import { supabase } from '../supabaseClient';
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

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
  const [showTaskEventForm, setShowTaskEventForm] = useState(false);
  const [taskType, setTaskType] = useState<'task' | 'event'>('task');
  const [showTaskTypeMenu, setShowTaskTypeMenu] = useState(false);
  const [taskTypeMenuPosition, setTaskTypeMenuPosition] = useState({ top: 0, left: 0 });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'>('timeGridWeek');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isViewChanging, setIsViewChanging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mainSidebarOpen, setMainSidebarOpen] = useState(false);
  const [mobileNavExpanded, setMobileNavExpanded] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'tasks' | 'goals' | 'reflections' | 'scorecard' | null>(null);
  const [activeView, setActiveView] = useState<'calendar' | 'priorities'>('calendar');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [resizing, setResizing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const calendarRef = useRef<FullCalendar | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [miniSelectedDate, setMiniSelectedDate] = useState(new Date());
  const [miniCalendarActiveStartDate, setMiniCalendarActiveStartDate] = useState(new Date());
  const { user, logout } = useAuth();
  
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi && (view === 'timeGridWeek' || view === 'timeGridDay')) {
      // Use a short timeout to ensure the calendar has finished rendering
      setTimeout(() => {
        const now = new Date();
        const currentTime = format(now, 'HH:mm:ss');
        calendarApi.scrollToTime(currentTime);
      }, 100);
    }
  }, [view, refreshTrigger]);

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
    
    try {
      // Fetch tasks, roles, and domains
      const [tasksRes, rolesRes, domainsRes] = await Promise.all([
        supabase
          .from('0007-ap-tasks')
          .select(`
            *,
            task_roles:0007-ap-task-roles!task_id(role_id),
            task_domains:0007-ap-task-domains(domain_id)
           `)
          .eq('user_id', user.id)
          .in('status', ['pending', 'in_progress']),
        supabase
          .from('0007-ap-roles')
          .select('id, label')
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('0007-ap-domains')
          .select('id, name')
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (rolesRes.data) {
        const rolesMap = rolesRes.data.reduce((acc, role) => ({ ...acc, [role.id]: role }), {});
        setRoles(rolesMap);
      }
      if (domainsRes.data) {
        const domainsMap = domainsRes.data.reduce((acc, domain) => ({ ...acc, [domain.id]: domain }), {});
        setDomains(domainsMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (newStart: Date) => {
    // Always update the current date when calendar changes
    setCurrentDate(newStart);
  };

  const handlePrevious = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.prev();
      // Get the new date after navigation and update state
      const newDate = calendarApi.getDate();
      setCurrentDate(newDate);
    }
  };

  const handleNext = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.next();
      // Get the new date after navigation and update state
      const newDate = calendarApi.getDate();
      setCurrentDate(newDate);
    }
  };

  const handleViewChange = (newView: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth') => {
  setView(newView);
  if (newView === 'timeGridDay') {
    setCurrentDate(new Date());
  }
};

  const handleTaskCreated = () => {
    setShowTaskEventForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setResizing(false);
    };

    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

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
        return format(currentDate, 'MMM d, yyyy');
      case 'timeGridWeek': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        const isSameMonth = weekStart.getMonth() === weekEnd.getMonth();

        if (isSameMonth) {
          // Example: "Jul 21 – 27, 2025"
          return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd, yyyy')}`;
        } else {
          // Example: "Jul 27 – Aug 2, 2025"
          return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
        }
        }
      case 'dayGridMonth':
        return format(currentDate, 'MMMM yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  const navItems = [
    { name: 'Authentic Calendar', path: '/', icon: CalendarIcon },
    { name: '12 Week Cycle', path: '/twelve-week-cycle', icon: CheckSquare },
    { name: 'Role Bank', path: '/role-bank', icon: Users },
    { name: 'Domain Dashboard', path: '/domains', icon: Compass },
    { name: 'Settings', path: '/settings', icon: CheckSquare },
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
    <div className="min-h-screen bg-gray-50">
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
              setMainSidebarOpen(false);
              setActiveDrawer(null);
              setMobileNavExpanded(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar */}
      <motion.aside
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg lg:z-10 lg:shadow-none lg:static lg:translate-x-0"
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
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = window.location.pathname === item.path;
                const IconComponent = item.icon;
                
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
                    <IconComponent className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-500'}`} />
                    {item.name}
                  </a>
                );
              })}
            </nav>
          </div>
          
          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center 
rounded-full bg-primary-100 text-primary-600">
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

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleMainSidebar}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors lg:hidden"
              aria-label="Toggle main menu"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('calendar')}
                className={`flex items-center justify-center p-2 rounded-md transition-colors ${
                  activeView === 'calendar'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Calendar View"
              >
                <CalendarIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setActiveView('priorities')}
                className={`flex items-center justify-center p-2 rounded-md transition-colors ${
                  activeView === 'priorities'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Priorities View"
              >
                <CheckSquare className="h-5 w-5" />
              </button>
            </div>

            {/* Calendar Controls - Only show for calendar view */}
            {activeView === 'calendar' && (
              <>
                {/* Date Navigation */}
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
                  {getDateDisplayText()}
                </span>

                {/* Calendar View Dropdown */}
                <div className="relative">
                  <select
                    value={view}
                    onChange={(e) => handleViewChange(e.target.value as 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth')}
                    className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="timeGridDay">Day View</option>
                    <option value="timeGridWeek">Week View</option>
                    <option value="dayGridMonth">Month View</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTaskTypeMenuPosition({ top: rect.bottom, left: rect.left });
                setShowTaskTypeMenu(!showTaskTypeMenu);
              }}
              className="flex items-center justify-center w-10 h-10 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="h-[calc(100vh-73px)] flex">
          {/* Unscheduled Priorities Sidebar */}
          {sidebarOpen && activeView === 'calendar' && (
            <div 
              ref={sidebarRef}
              className="border-r border-gray-200 bg-white flex-shrink-0 relative"
              style={{ width: `${sidebarWidth}px` }}
            >

<div className="h-full flex flex-col">
  {/* Mini-Calendar Section */}
  <div className="p-3 border-b border-gray-200">
  // ✨ PASTE THIS NEW BLOCK
<div className="flex items-center justify-between mb-2">
    <div className="w-5"></div> {/* Spacer to balance the button on the right */}

    {/* Centered Calendar Navigation */}
    <div className="flex items-center space-x-1">
        <button className="p-1 rounded-full hover:bg-gray-200" onClick={() => setMiniCalendarActiveStartDate(d => { const p = new Date(d); p.setMonth(p.getMonth() - 1); return p; })} aria-label="Previous Month">
            <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <span className="font-semibold text-xs text-gray-700 w-24 text-center">
            {miniCalendarActiveStartDate.toLocaleString("default", { month: "long", year: "numeric" })}
        </span>
        <button className="p-1 rounded-full hover:bg-gray-200" onClick={() => setMiniCalendarActiveStartDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })} aria-label="Next Month">
            <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
    </div>

{/* Collapse Button with your custom image icon */}
<button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-500 hover:bg-gray-100 rounded-md" title="Close sidebar">
    <img
        src="https://wyipyiahvjcvnwoxwttd.supabase.co/storage/v1/object/public/calendar-attachments//Hamburger.png"
        alt="Collapse menu"
        className="h-5 w-5"
    />
</button>
</div>
    {/* The Calendar Itself */}
    <Calendar
      value={miniSelectedDate}
      onChange={(value) => {
        const date = value as Date;
        setMiniSelectedDate(date);
        if (calendarRef.current) {
          calendarRef.current.getApi().gotoDate(date);
        }
      }}
      activeStartDate={miniCalendarActiveStartDate}
      onActiveStartDateChange={({ activeStartDate }) => setMiniCalendarActiveStartDate(activeStartDate!)}
      className="react-calendar-borderless"
      formatShortWeekday={(locale, date) => date.toLocaleDateString(locale, { weekday: 'narrow' })}
       showNavigation={false}
    />
  </div>

  {/* Unscheduled Priorities List */}
  <div className="flex-1 overflow-y-auto">
    <UnscheduledPriorities
      tasks={tasks.filter(t => !t.start_time)}
      setTasks={setTasks}
      roles={roles}
      domains={domains}
      loading={loading}
    />
  </div>
</div>
              
              {/* Resize Handle */}
              <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                onMouseDown={handleMouseDown}
                title="Drag to resize"
              />
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Show sidebar toggle when closed */}
            {!sidebarOpen && activeView === 'calendar' && (
              <div className="p-2 border-b border-gray-200 bg-white">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  title="Show unscheduled priorities"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span>Show Unscheduled Priorities</span>
                </button>
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {activeView === 'calendar' ? (
                <CalendarView
                  ref={calendarRef}
                  view={view}
                  currentDate={currentDate}
                  onDateChange={handleDateChange}
                  refreshTrigger={refreshTrigger}
                  onTaskUpdated={() => setRefreshTrigger(prev => prev + 1)}
                />
              ) : (
                <div className="h-full overflow-hidden">
                  <TaskQuadrants
                    tasks={tasks} // This will include ALL tasks (scheduled and unscheduled)
                    setTasks={setTasks}
                    roles={roles}
                    domains={domains}
                    loading={loading}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* GLOBAL FLOATING DRESSER - Desktop Navigation Bar */}
      <div className="fixed top-1/2 right-0 transform -translate-y-1/2 z-30 hidden lg:block">
        <div className="bg-white border-l border-t border-b border-gray-200 rounded-l-lg shadow-lg">
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
                  
                  {!isActive && (
                    <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="bg-gray-900 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap shadow-lg">
                        {item.title}
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

      {/* GLOBAL FLOATING DRESSER - Mobile Expandable Stack */}
      <div className="fixed bottom-4 right-4 z-30 lg:hidden">
        {!mobileNavExpanded ? (
          <button
            onClick={() => setMobileNavExpanded(true)}
            className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            aria-label="Open navigation"
          >
            <Archive className="h-6 w-6" />
          </button>
        ) : (
          <div className="flex flex-col-reverse space-y-reverse space-y-2">
            <button
              onClick={() => setMobileNavExpanded(false)}
              className="flex items-center justify-center w-12 h-12 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            
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
      
      {/* GLOBAL FLOATING DRESSER - Drawer Content */}
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
              <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {drawerItems.find(item => item.id === activeDrawer)?.title}
                </h2>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close drawer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
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

      {/* TaskEventForm Modal */}
      {showTaskTypeMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowTaskTypeMenu(false)}
          />
          <div 
            className="fixed z-50 bg-white rounded-md shadow-lg py-1 border border-gray-200"
            style={{ top: taskTypeMenuPosition.top + 5, left: taskTypeMenuPosition.left }}
          >
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              onClick={() => {
                setTaskType('event');
                setShowTaskTypeMenu(false);
                setShowTaskEventForm(true);
              }}
            >
              Event
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              onClick={() => {
                setTaskType('task');
                setShowTaskTypeMenu(false);
                setShowTaskEventForm(true);
              }}
            >
              Task
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
              onClick={() => {
                setTaskType('depositIdea');
                setShowTaskTypeMenu(false);
                setShowTaskEventForm(true);
              }}
            >
              Deposit Idea
            </button>
          </div>
        </>
      )}

      {/* Task/Event Form Modal */}
      {showTaskEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl">
            <TaskEventForm 
              mode="create"
              initialData={{ schedulingType: taskType as "task" | "event" | "depositIdea" }}
              onSubmitSuccess={handleTaskCreated}
              onClose={() => setShowTaskEventForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthenticCalendar;