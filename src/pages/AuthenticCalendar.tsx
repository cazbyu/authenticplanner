import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, ChevronDown, Menu, Calendar as CalendarIcon, CheckSquare } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { FullCalendar } from '@fullcalendar/core';

// --- Child Components ---
import TaskEventForm from '../components/tasks/TaskEventForm';
import CalendarView from '../components/calendar/CalendarView';
import TaskQuadrants from '../components/tasks/TaskQuadrants';
import UnscheduledPriorities from '../components/tasks/UnscheduledPriorities';

// --- Type Definitions (aligned with 0004-ap- schema) ---
interface Task {
  id: string;
  title: string;
  'due-date': string | null;
  'start-time': string | null;
  'end-time': string | null;
  'is-urgent': boolean;
  'is-important': boolean;
  'is-authentic-deposit': boolean;
  'is-twelve-week-goal': boolean;
  status: string;
  notes: string | null;
  'task-roles': { 'role-id': string }[];
  'task-domains': { 'domain-id': string }[];
}

interface Role {
  id: string;
  label: string;
}

interface Domain {
  id: string;
  name: string;
}

/**
 * The AuthenticCalendar page is the main workspace for users.
 * It acts as a "controller" component that fetches all task-related data
 * and manages the UI state for its child components, which handle the actual display.
 */
const AuthenticCalendar: React.FC = () => {
  // --- State Management ---

  // Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [domains, setDomains] = useState<Record<string, Domain>>({});
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeView, setActiveView] = useState<'calendar' | 'priorities'>('calendar');
  const [calendarView, setCalendarView] = useState<'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'>('timeGridWeek');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTaskEventForm, setShowTaskEventForm] = useState(false);
  
  // Triggers a data refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- Refs ---
  const calendarRef = useRef<FullCalendar | null>(null);
  const { user } = useAuth();

  // --- Data Fetching ---

  const fetchAllTaskData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [tasksRes, rolesRes, domainsRes] = await Promise.all([
        // IMPORTANT: Queries updated to use '0004-ap-' tables and hyphenated columns
        supabase
          .from('0004-ap-tasks')
          .select(`*, task-roles:0004-ap-task-roles!task-id(role-id), task-domains:0004-ap-task-domains(domain-id)`)
          .eq('user-id', user.id)
          .in('status', ['pending', 'in_progress']),
        supabase
          .from('0004-ap-roles')
          .select('id, label')
          .eq('user-id', user.id)
          .eq('is-active', true),
        supabase
          .from('0004-ap-domains')
          .select('id, name')
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (domainsRes.error) throw domainsRes.error;

      setTasks(tasksRes.data || []);
      setRoles((rolesRes.data || []).reduce((acc, role) => ({ ...acc, [role.id]: role }), {}));
      setDomains((domainsRes.data || []).reduce((acc, domain) => ({ ...acc, [domain.id]: domain }), {}));

    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllTaskData();
  }, [user, refreshTrigger, fetchAllTaskData]);


  // --- Event Handlers ---

  const handleTaskCreated = () => {
    setShowTaskEventForm(false);
    setRefreshTrigger(prev => prev + 1); // Trigger a data refresh
  };

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth') => {
    setCalendarView(newView);
  };

  const handlePrevious = () => calendarRef.current?.getApi().prev();
  const handleNext = () => calendarRef.current?.getApi().next();

  // --- UI Helpers ---

  const getDateDisplayText = () => {
    switch (calendarView) {
      case 'timeGridDay':
        return format(currentDate, 'MMMM d, yyyy');
      case 'timeGridWeek':
        const start = startOfWeek(currentDate, { weekStartsOn: 0 });
        const end = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
      case 'dayGridMonth':
        return format(currentDate, 'MMMM yyyy');
      default:
        return '';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('calendar')}
              className={`p-2 rounded-md transition-colors ${activeView === 'calendar' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
            >
              <CalendarIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setActiveView('priorities')}
              className={`p-2 rounded-md transition-colors ${activeView === 'priorities' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
            >
              <CheckSquare className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar Controls (only visible in calendar view) */}
          {activeView === 'calendar' && (
            <>
              <div className="flex items-center space-x-1">
                <button onClick={handlePrevious} className="p-1.5 hover:bg-gray-100 rounded-full">
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <button onClick={handleNext} className="p-1.5 hover:bg-gray-100 rounded-full">
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <span className="text-lg font-medium text-gray-800">{getDateDisplayText()}</span>
              <select
                value={calendarView}
                onChange={(e) => handleViewChange(e.target.value as any)}
                className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="timeGridDay">Day</option>
                <option value="timeGridWeek">Week</option>
                <option value="dayGridMonth">Month</option>
              </select>
            </>
          )}
        </div>
        <button
          onClick={() => setShowTaskEventForm(true)}
          className="flex items-center justify-center w-10 h-10 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Unscheduled Tasks Sidebar (only in calendar view) */}
        {activeView === 'calendar' && sidebarOpen && (
          <aside className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Unscheduled Priorities</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                <UnscheduledPriorities
                    tasks={tasks.filter(t => !t['start-time'])}
                    setTasks={setTasks}
                    roles={roles}
                    domains={domains}
                    loading={loading}
                />
            </div>
          </aside>
        )}

        {/* Calendar or Quadrants View */}
        <div className="flex-1 overflow-auto">
          {activeView === 'calendar' ? (
            <CalendarView
              ref={calendarRef}
              view={calendarView}
              currentDate={currentDate}
              onDateChange={handleDateChange}
              refreshTrigger={refreshTrigger}
              onTaskUpdated={() => setRefreshTrigger(p => p + 1)}
            />
          ) : (
            <TaskQuadrants
              tasks={tasks}
              setTasks={setTasks}
              roles={roles}
              domains={domains}
              loading={loading}
            />
          )}
        </div>
      </main>

      {/* Task Creation Modal */}
      {showTaskEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl">
            <TaskEventForm
              mode="create"
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
