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
  const [prioritiesCollapsed, setPrioritiesCollapsed] = useState(false);
  const [mainSidebarOpen, setMainSidebarOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'roles' | 'tasks' | 'goals' | 'reflections' | 'scorecard' | null>(null);
  const [activeView, setActiveView] = useState<'calendar' | 'tasks'>('tasks'); // Changed default to 'tasks'
  const [mobileNavExpanded, setMobileNavExpanded] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isViewChanging, setIsViewChanging] = useState(false);
  
  // Lifted state for tasks, roles, and domains
  const [tasks, setTasks] = useState<Task[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const [loading, setLoading] = useState(true);
  
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

    try {
      // Fetch roles
      const { data: rolesData } = await supabase
        .from('0007-ap-roles')
        .select('id, label')
        .eq('user_id', user.id);

      if (rolesData) {
        const rolesMap = rolesData.reduce((acc, role) => ({
          ...acc,
          [role.id]: role
        }), {});
        setRoles(rolesMap);
      }

      // Fetch domains
      const { data: domainsData } = await supabase
        .from('0007-ap-domains')
        .select('id, name');

      if (domainsData) {
        const domainsMap = domainsData.reduce((acc, domain) => ({
          ...acc,
          [domain.id]: domain
        }), {});
        setDomains(domainsMap);
      }

      // Fetch tasks with relationships
      const { data: tasksData } = await supabase
        .from('0007-ap-tasks')
        .select(`
          *,
          task_roles:0007-ap-task_roles(role_id),
          task_domains:0007-ap-task_domains(domain_id)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (tasksData) {
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error fetching task data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Consolidated drag end handler
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    // If dropping onto calendar (destination.droppableId starts with 'calendar')
    if (result.destination.droppableId.startsWith('calendar')) {
      const taskId = result.draggableId;
      const task = tasks.find(t => t.id === taskId);
        
      if (task) {
        // Extract date and time from the destination ID
        // Format: calendar-YYYY-MM-DD-HH-MM
        const [_, year, month, day, hour, minute] = result.destination.droppableId.split('-');
        const dateStr = `${year}-${month}-${day}`;
        const timeStr = `${hour}:${minute}`;
        
        // Update the task with the new date and time
        const { error } = await supabase
          .from('0007-ap-tasks')
          .update({
            due_date: dateStr,
            start_time: new Date(`${dateStr}T${timeStr}:00`).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId);
          
        if (!error) {
          // Refresh tasks after update
          setRefreshTrigger(prev => prev + 1);
        }
      }
    }
  };

  // Improved resize handlers
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      if (!prioritiesCollapsed) {
        // Calculate new width based on mouse position with constraints
        const newWidth = Math.max(256, Math.min(600, e.clientX - 0));
        setSidebarWidth(newWidth);  
      }
    };
    
    const handleMouseUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Apply width when component mounts or when width changes
  useEffect(() => {
    if (!prioritiesCollapsed && sidebarRef.current) {
      sidebarRef.current.style.width = `${sidebarWidth}px`;
    }
  }, [sidebarWidth, prioritiesCollapsed]);
  
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
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex overflow-hidden">
        {activeView === 'tasks' ? (
          /* Task Priorities View - Now the default with full height */
            <div className="flex-1 overflow-hidden h-full" style={{ marginRight: activeDrawer ? '320px' : '0' }}>
              <TaskQuadrants 
                tasks={tasks}
                setTasks={setTasks}
                roles={roles}
                domains={domains}
                loading={loading}
              />
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