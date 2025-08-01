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
import StrategicGoals from '../pages/StrategicGoals';
import Reflections from '../pages/Reflections';
import Scorecard from '../pages/Scorecard';
import Tasks from '../pages/Tasks';

// --- Interfaces ---
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
interface Role { id: string; label: string; }
interface Domain { id: string; name: string; }

const AuthenticCalendar: React.FC = () => {
  // --- State Declarations ---
  const [showTaskEventForm, setShowTaskEventForm] = useState(false);
  const [taskType, setTaskType] = useState<'task' | 'event' | 'depositIdea'>('task');
  const [showTaskTypeMenu, setShowTaskTypeMenu] = useState(false);
  const [taskTypeMenuPosition, setTaskTypeMenuPosition] = useState({ top: 0, left: 0 });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'>('timeGridWeek');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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

  // --- Data Fetching and Effects ---
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi && (view === 'timeGridWeek' || view === 'timeGridDay')) {
      setTimeout(() => {
        calendarApi.scrollToTime(new Date().toTimeString().slice(0, 8));
      }, 100);
    }
  }, [view, refreshTrigger]);

  useEffect(() => {
    fetchAllTaskData();
  }, [refreshTrigger]);

  const fetchAllTaskData = async () => { /* ... Function content from your file ... */ };
  const handleDateChange = (newStart: Date) => setCurrentDate(newStart);
  const handlePrevious = () => calendarRef.current?.getApi().prev();
  const handleNext = () => calendarRef.current?.getApi().next();
  const handleViewChange = (newView: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth') => setView(newView);
  const handleTaskCreated = () => { setShowTaskEventForm(false); setRefreshTrigger(p => p + 1); };
  const handleMouseDown = (e: React.MouseEvent) => { setResizing(true); e.preventDefault(); };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setResizing(false);
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  // --- UI Handlers ---
  const toggleMainSidebar = () => setMainSidebarOpen(!mainSidebarOpen);
  const closeMainSidebar = () => setMainSidebarOpen(false);
  const handleDrawerSelect = (drawer: typeof activeDrawer) => { /* ... Function content from your file ... */ };
  const getDateDisplayText = () => { /* ... Function content from your file ... */ };

  // --- Constants for Navigation ---
  const navItems = [ /* ... Array content from your file ... */ ];
  const drawerItems = [ /* ... Array content from your file ... */ ];
  const sidebarVariants = { open: { x: 0 }, closed: { x: '-100%' } };
  const drawerVariants = { open: { x: 0 }, closed: { x: '100%' } };
  const overlayVariants = { open: { opacity: 1 }, closed: { opacity: 0 } };
  const ActiveDrawerComponent = activeDrawer ? drawerItems.find(item => item.id === activeDrawer)?.component : null;

  // --- RENDER ---
  return (
    <>
      <AnimatePresence>
        {(mainSidebarOpen || activeDrawer) && (
          <motion.div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" initial="closed" animate="open" exit="closed" variants={overlayVariants} onClick={() => { closeMainSidebar(); setActiveDrawer(null); }} />
        )}
      </AnimatePresence>

      <motion.aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg lg:z-10 lg:shadow-none lg:static lg:translate-x-0" initial="closed" animate={mainSidebarOpen ? 'open' : 'closed'} variants={sidebarVariants}>
        {/* Main Navigation Sidebar Content */}
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center space-x-2"><img src={logo} alt="Authentic Planner" className="h-8 w-8" /><span className="text-lg font-bold text-primary-600">Authentic Planner</span></div>
            <button onClick={closeMainSidebar} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden" aria-label="Close menu"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4"><nav className="space-y-1">{navItems.map((item) => <a key={item.path} href={item.path} className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${window.location.pathname === item.path ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-100'}`} onClick={closeMainSidebar}><item.icon className={`mr-3 h-5 w-5 ${window.location.pathname === item.path ? 'text-primary-500' : 'text-gray-500'}`} />{item.name}</a>)}</nav></div>
          <div className="border-t border-gray-200 p-4">{/* User section from your file */}</div>
        </div>
      </motion.aside>

      <div className={mainSidebarOpen ? 'lg:pl-64' : ''}>
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-4">
            <button onClick={toggleMainSidebar} className="p-2 hover:bg-gray-100 rounded-full lg:hidden" aria-label="Toggle main menu"><Menu className="h-5 w-5 text-gray-600" /></button>
            {/* View Toggle, Calendar Controls, etc. from your file */}
          </div>
          <div className="flex items-center space-x-2">{/* Plus button from your file */}</div>
        </header>

        <main className="h-[calc(100vh-73px)] flex">
          {sidebarOpen && activeView === 'calendar' && (
            <div ref={sidebarRef} className="border-r border-gray-200 bg-white flex-shrink-0 relative" style={{ width: `${sidebarWidth}px` }}>
              <div className="h-full flex flex-col">
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-5"></div>
                    <div className="flex items-center space-x-1">
                      <button className="p-1 rounded-full hover:bg-gray-200" onClick={() => setMiniCalendarActiveStartDate(d => { const p = new Date(d); p.setMonth(p.getMonth() - 1); return p; })}><ChevronLeft className="h-4 w-4 text-gray-600" /></button>
                      <span className="font-semibold text-xs text-gray-700 w-24 text-center">{miniCalendarActiveStartDate.toLocaleString("default", { month: "long", year: "numeric" })}</span>
                      <button className="p-1 rounded-full hover:bg-gray-200" onClick={() => setMiniCalendarActiveStartDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })}><ChevronRight className="h-4 w-4 text-gray-600" /></button>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-500 hover:bg-gray-100 rounded-md" title="Close sidebar"><img src="https://wyipyiahvjcvnwoxwttd.supabase.co/storage/v1/object/public/calendar-attachments//Hamburger.png" alt="Collapse menu" className="h-4 w-4" /></button>
                  </div>
                  <Calendar value={miniSelectedDate} onChange={(d) => { setMiniSelectedDate(d as Date); if (calendarRef.current) calendarRef.current.getApi().gotoDate(d as Date); }} activeStartDate={miniCalendarActiveStartDate} onActiveStartDateChange={({ activeStartDate }) => setMiniCalendarActiveStartDate(activeStartDate!)} className="react-calendar-borderless" formatShortWeekday={(_, date) => date.toLocaleDateString(undefined, { weekday: 'narrow' })} showNavigation={false} />
                </div>
                <div className="flex-1 overflow-y-auto">
                  <UnscheduledPriorities tasks={tasks.filter(t => !t.start_time)} setTasks={setTasks} roles={roles} domains={domains} loading={loading} />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500" onMouseDown={handleMouseDown} />
            </div>
          )}
          <div className="flex-1 flex flex-col relative">
            {!sidebarOpen && activeView === 'calendar' && (
              <button onClick={() => setSidebarOpen(true)} className="absolute top-16 left-3 z-10 p-1.5 bg-white rounded-md shadow-lg hover:bg-gray-100"><img src="https://wyipyiahvjcvnwoxwttd.supabase.co/storage/v1/object/public/calendar-attachments//Hamburger.png" alt="Show menu" className="h-5 w-5" /></button>
            )}
            <div className="flex-1 overflow-hidden">
              {activeView === 'calendar' ? <CalendarView ref={calendarRef} view={view} currentDate={currentDate} onDateChange={handleDateChange} refreshTrigger={refreshTrigger} onTaskUpdated={() => setRefreshTrigger(p => p + 1)} /> : <div className="h-full overflow-hidden"><TaskQuadrants tasks={tasks} setTasks={setTasks} roles={roles} domains={domains} loading={loading} /></div>}
            </div>
          </div>
        </main>
      </div>
      {/* All Modals and Dressers from your file */}
    </>
  );
};

export default AuthenticCalendar;