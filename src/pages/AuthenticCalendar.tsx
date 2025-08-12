import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon, CheckSquare, Users, Target, BookOpen, BarChart3, Briefcase, X, Archive, Compass, Menu } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import TaskEventForm from '../components/tasks/TaskEventForm';
import CalendarView from '../components/calendar/CalendarView';
import TaskQuadrants from '../components/tasks/TaskQuadrants';
import UnscheduledPriorities from '../components/tasks/UnscheduledPriorities';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { FullCalendar } from '@fullcalendar/core';
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
  const [loading, setLoading] = useState(true);
  const [activeDrawer, setActiveDrawer] = useState<'tasks' | 'goals' | 'reflections' | 'scorecard' | null>(null);
  const [activeView, setActiveView] = useState<'calendar' | 'priorities'>('calendar');
  const [mobileNavExpanded, setMobileNavExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const calendarRef = useRef<FullCalendar | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi && (view === 'timeGridWeek' || view === 'timeGridDay')) {
      setTimeout(() => {
        const now = new Date();
        const currentTime = format(now, 'HH:mm:ss');
        calendarApi.scrollToTime(currentTime);
      }, 100);
    }
  }, [view, refreshTrigger]);

  useEffect(() => {
    fetchAllTaskData();
  }, [refreshTrigger]);

  const fetchAllTaskData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      const tasksRes = await supabase
        .from('0007-ap-tasks')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'in_progress']);

      const taskIds = (tasksRes.data || []).map(t => t.id);

      const [rolesJoinRes, domainsJoinRes, rolesRes, domainsRes] = await Promise.all([
        supabase
          .from('0007-ap-universal-roles-join')
          .select('parent_id, role_id, parent_type')
          .in('parent_id', taskIds)
          .eq('parent_type', 'task'),
        supabase
          .from('0007-ap-universal-domains-join')
          .select('parent_id, domain_id, parent_type')
          .in('parent_id', taskIds)
          .eq('parent_type', 'task'),
        supabase
          .from('0007-ap-roles')
          .select('id, label')
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('0007-ap-domains')
          .select('id, name')
      ]);

      const rolesJoin = rolesJoinRes.data || [];
      const domainsJoin = domainsJoinRes.data || [];

      if (tasksRes.data) {
        const normalizedTasks = tasksRes.data.map(task => ({
          ...task,
          task_roles: rolesJoin
            .filter(r => r.parent_id === task.id)
            .map(r => ({ role_id: r.role_id })),
          task_domains: domainsJoin
            .filter(d => d.parent_id === task.id)
            .map(d => ({ domain_id: d.domain_id })),
        }));
        setTasks(normalizedTasks);
      }

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
    setCurrentDate(newStart);
  };

  const handlePrevious = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.prev();
      const newDate = calendarApi.getDate();
      setCurrentDate(newDate);
    }
  };

  const handleNext = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.next();
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

  const handleDrawerSelect = (drawer: typeof activeDrawer) => {
    if (activeDrawer === drawer) {
      setActiveDrawer(null);
    } else {
      setActiveDrawer(drawer);
    }
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
          return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd, yyyy')}`;
        } else {
          return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
        }
      }
      case 'dayGridMonth':
        return format(currentDate, 'MMMM yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  const drawerItems = [
    { id: 'tasks', title: 'Tasks', icon: Briefcase, component: Tasks },
    { id: 'goals', title: 'Strategic Goals', icon: Target, component: StrategicGoals },
    { id: 'reflections', title: 'Reflections', icon: BookOpen, component: Reflections },
    { id: 'scorecard', title: 'Scorecard', icon: BarChart3, component: Scorecard }
  ];

  const overlayVariants = {
    open: { opacity: 1, transition: { duration: 0.3 } },
    closed: { opacity: 0, transition: { duration: 0.3 } },
  };

  const drawerVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };
  
  const ActiveDrawerComponent = activeDrawer 
    ? drawerItems.find(item => item.id === activeDrawer)?.component 
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence>
        {activeDrawer && (
          <motion.div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            initial="closed"
            animate="open"
            exit="closed"
            variants={overlayVariants}
            onClick={() => {
              setActiveDrawer(null);
            }}
          />
        )}
      </AnimatePresence>

      <div>
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-4">
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            >
                <Menu className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
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

            {activeView === 'calendar' && (
              <>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handlePrevious}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronLeft className="h-3 w-3 text-gray-600" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronRight className="h-3 w-3 text-gray-600" />
                  </button>
                </div>
                <span className="text-lg font-medium">{getDateDisplayText()}</span>
                <div className="relative">
                  <select
                    value={view}
                    onChange={(e) => handleViewChange(e.target.value as 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth')}
                    className="appearance-none bg-white border border-gray-300 rounded-sm px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="timeGridDay">Day</option>
                    <option value="timeGridWeek">Week</option>
                    <option value="dayGridMonth">Month</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                </div>
              </>
            )}
            
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

        <main className="h-[calc(100vh-73px)] flex">
            <AnimatePresence>
                {sidebarOpen && activeView === 'calendar' && (
                    <motion.div
                        ref={sidebarRef}
                        className="border-r border-gray-200 bg-white flex-shrink-0 overflow-hidden"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 250, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="h-full flex flex-col w-[250px]">
                            <div className="p-3 border-b border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-800">Priority Order</h3>
                                <p className="text-xs text-gray-600 mt-1">Drag tasks to reorder</p>
                            </div>
                            <div className="flex-1">
                                <UnscheduledPriorities
                                    viewMode={'quadrant'}
                                    tasks={tasks}
                                    setTasks={setTasks}
                                    roles={roles}
                                    domains={domains}
                                    loading={loading}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 flex relative">
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
                                tasks={tasks}
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

      <div className="fixed top-1/2 right-0 transform -translate-y-1/2 z-30 hidden lg:block">
        <div className="bg-white border-l border-t border-b border-gray-200 rounded-l-lg shadow-lg overflow-hidden">
          <div className="flex flex-col">
            {drawerItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeDrawer === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleDrawerSelect(item.id as typeof activeDrawer)}
                  className={`group relative p-3 border-b border-gray-100 last:border-b-0 transition-all duration-200 overflow-hidden ${isActive ? 'bg-blue-50 text-blue-600 border-r-3 border-r-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  title={item.title}
                  aria-label={item.title}
                >
                  <IconComponent className="h-5 w-5" />
                  {!isActive && (
                    <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
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
                  className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
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
                <h2 className="text-lg font-semibold text-gray-900">{drawerItems.find(item => item.id === activeDrawer)?.title}</h2>
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

      {showTaskTypeMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowTaskTypeMenu(false)} />
          <div className="fixed z-50 bg-white rounded-md shadow-lg py-1 border border-gray-200" style={{ top: taskTypeMenuPosition.top + 5, left: taskTypeMenuPosition.left }}>
            <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors" onClick={() => { setTaskType('event'); setShowTaskTypeMenu(false); setShowTaskEventForm(true); }}>Event</button>
            <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors" onClick={() => { setTaskType('task'); setShowTaskTypeMenu(false); setShowTaskEventForm(true); }}>Task</button>
            <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors" onClick={() => { setTaskType('depositIdea'); setShowTaskTypeMenu(false); setShowTaskEventForm(true); }}>Deposit Idea</button>
          </div>
        </>
      )}

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