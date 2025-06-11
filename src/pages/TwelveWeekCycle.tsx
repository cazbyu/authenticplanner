import React, { useState, useEffect } from 'react';
import { Plus, Target, Calendar, Clock, ChevronDown, ChevronUp, CheckSquare, Edit3, Trash2, X, Menu, Archive, Users, BookOpen, BarChart3, Briefcase, ChevronRight } from 'lucide-react';
import TaskForm from '../components/tasks/TaskForm';
import TwelveWeekGoalForm from '../components/goals/TwelveWeekGoalForm';
import TwelveWeekGoalEditForm from '../components/goals/TwelveWeekGoalEditForm';
import WeeklyGoalForm from '../components/goals/WeeklyGoalForm';
import WeeklyGoalEditForm from '../components/goals/WeeklyGoalEditForm';
import { format, differenceInDays, addWeeks, parseISO, differenceInWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.svg';

// Import drawer content components
import RoleBank from '../components/roles/RoleBank';
import StrategicGoals from '../pages/StrategicGoals';
import Reflections from '../pages/Reflections';
import Scorecard from '../pages/Scorecard';
import Tasks from '../pages/Tasks';

interface WeekBoxProps {
  weekNumber: number;
  startDate: Date;
  isActive?: boolean;
  isCurrent?: boolean;
  onClick: () => void;
}

interface CycleData {
  reflection_end: string;
  cycle_label: string;
  title?: string;
  start_date?: string;
}

interface WeeklyGoal {
  id: string;
  goal_id: string;
  week_number: number;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled';
  progress: number;
}

interface Role {
  id: string;
  label: string;
  category: string;
}

interface Domain {
  id: string;
  name: string;
}

interface TwelveWeekGoal {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number;
  created_at: string;
  domains: Domain[];
  roles: Role[];
  weeklyGoals: WeeklyGoal[];
  tasks: any[];
}

const WeekBox: React.FC<WeekBoxProps> = ({ weekNumber, startDate, isActive, isCurrent, onClick }) => (
  <button
    onClick={onClick}
    className={`
      h-20 w-full rounded-lg border-2 transition-colors
      ${isCurrent && !isActive
        ? 'border-blue-400 bg-blue-100 text-blue-800 ring-2 ring-blue-200' 
        : isActive 
        ? 'border-primary-500 bg-primary-50 text-primary-700' 
        : 'border-gray-200 bg-white hover:bg-gray-50'
      }
    `}
  >
    <div className="flex h-full flex-col items-center justify-center">
      <span className="text-xs font-medium text-gray-600">Week</span>
      <span className="text-lg font-bold">{weekNumber}</span>
      <span className="text-xs text-gray-500">
        ({format(startDate, 'dd MMM')})
      </span>
      {isCurrent && (
        <span className="text-xs font-medium text-blue-600">Current</span>
      )}
    </div>
  </button>
);

const TwelveWeekCycle: React.FC = () => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showGoalEditForm, setShowGoalEditForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<TwelveWeekGoal | null>(null);
  const [showWeeklyGoalForm, setShowWeeklyGoalForm] = useState(false);
  const [showWeeklyGoalEditForm, setShowWeeklyGoalEditForm] = useState(false);
  const [editingWeeklyGoal, setEditingWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [weeklyGoalFormData, setWeeklyGoalFormData] = useState<{
    goalId: string;
    weekNumber: number;
    domains: Domain[];
    roles: Role[];
  } | null>(null);
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [twelveWeekGoals, setTwelveWeekGoals] = useState<TwelveWeekGoal[]>([]);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [selectedWeekByGoal, setSelectedWeekByGoal] = useState<Record<string, number>>({});
  const [weeklyGoalsByGoal, setWeeklyGoalsByGoal] = useState<Record<string, WeeklyGoal[]>>({});

  // Navigation state
  const [mainSidebarOpen, setMainSidebarOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'roles' | 'tasks' | 'goals' | 'reflections' | 'scorecard' | null>(null);
  const [mobileNavExpanded, setMobileNavExpanded] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchCycleData(),
        fetchTwelveWeekGoals()
      ]);
      setLoading(false);
    };

    fetchData();
  }, []);

  const fetchCycleData = async () => {
    const { data, error } = await supabase
      .from('0007-ap-global-cycles')
      .select('reflection_end, cycle_label, title, start_date')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching cycle data:', error);
      return;
    }

    setCycleData(data);
  };

  const fetchTwelveWeekGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch main goals with their relationships
      const { data: goals, error: goalsError } = await supabase
        .from('0007-ap-goals_12wk_main')
        .select(`
          *,
          goal_domains:0007-ap-goal_domains(
            domain:0007-ap-domains(id, name)
          ),
          goal_roles:0007-ap-goal_roles(
            role:0007-ap-roles(id, label, category)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
        return;
      }

      // Transform the data to match our interface
      const transformedGoals: TwelveWeekGoal[] = (goals || []).map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        progress: goal.progress,
        created_at: goal.created_at,
        domains: goal.goal_domains?.map((gd: any) => gd.domain).filter(Boolean) || [],
        roles: goal.goal_roles?.map((gr: any) => gr.role).filter(Boolean) || [],
        weeklyGoals: [],
        tasks: []
      }));

      setTwelveWeekGoals(transformedGoals);

      // Set default selected week to current week (11) for each goal
      const defaultWeekSelection: Record<string, number> = {};
      transformedGoals.forEach(goal => {
        defaultWeekSelection[goal.id] = 11; // Current week
      });
      setSelectedWeekByGoal(defaultWeekSelection);

      // Fetch weekly goals for each 12-week goal
      await fetchWeeklyGoals(transformedGoals.map(g => g.id));

    } catch (error) {
      console.error('Error fetching 12-week goals:', error);
    }
  };

  const fetchWeeklyGoals = async (goalIds: string[]) => {
    if (goalIds.length === 0) return;

    try {
      const { data: weeklyGoals, error } = await supabase
        .from('0007-ap-goal_weekly_goals')
        .select('*')
        .in('goal_id', goalIds)
        .order('week_number', { ascending: true });

      if (error) {
        console.error('Error fetching weekly goals:', error);
        return;
      }

      // Group weekly goals by goal_id
      const groupedWeeklyGoals: Record<string, WeeklyGoal[]> = {};
      (weeklyGoals || []).forEach(wg => {
        if (!groupedWeeklyGoals[wg.goal_id]) {
          groupedWeeklyGoals[wg.goal_id] = [];
        }
        groupedWeeklyGoals[wg.goal_id].push(wg);
      });

      setWeeklyGoalsByGoal(groupedWeeklyGoals);

    } catch (error) {
      console.error('Error fetching weekly goals:', error);
    }
  };

  // Calculate remaining days using the exact reflection_end date
  const calculateRemainingDays = (endDateString?: string) => {
    if (!endDateString) return 0;
    
    const endDate = parseISO(endDateString);
    const today = new Date();
    
    const endDateStartOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const remainingDays = differenceInDays(endDateStartOfDay, todayStartOfDay);
    return Math.max(0, remainingDays);
  };

  // Format cycle end date using the exact reflection_end date
  const formatCycleEndDate = (dateString?: string) => {
    if (!dateString) return 'Invalid date';
    
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return format(date, 'dd MMM yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Calculate cycle start date and week start dates
  const getCycleStartDate = () => {
    if (cycleData?.start_date) {
      return parseISO(cycleData.start_date);
    }
    
    if (cycleData?.reflection_end) {
      const reflectionEndDate = parseISO(cycleData.reflection_end);
      return addWeeks(reflectionEndDate, -13);
    }
    
    return new Date();
  };

  const cycleStartDate = getCycleStartDate();
  const cycleEndDate = cycleData ? parseISO(cycleData.reflection_end) : new Date();

  // Calculate progress percentage
  const today = new Date();
  const totalDays = (cycleEndDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysElapsed = (today.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const progressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  const remainingDays = calculateRemainingDays(cycleData?.reflection_end);
  const currentCycleName = cycleData?.title || cycleData?.cycle_label || '2025 Cycle #2';

  // Generate week start dates
  const getWeekStartDates = () => {
    const weekDates = [];
    for (let i = 0; i < 12; i++) {
      weekDates.push(addWeeks(cycleStartDate, i));
    }
    return weekDates;
  };

  const weekStartDates = getWeekStartDates();

  // Calculate current week - HARDCODED TO WEEK 11 FOR NOW
  const getCurrentWeek = (): number | null => {
    return 11;
  };

  const currentWeek = getCurrentWeek();

  const handleWeekSelect = (goalId: string, weekNum: number) => {
    setSelectedWeekByGoal(prev => ({
      ...prev,
      [goalId]: weekNum
    }));
  };

  const handleToggleGoalExpand = (goalId: string) => {
    setExpandedGoal(expandedGoal === goalId ? null : goalId);
  };

  const handleGoalCreated = () => {
    setShowGoalForm(false);
    fetchTwelveWeekGoals(); // Refresh the goals list
  };

  const handleGoalUpdated = () => {
    setShowGoalEditForm(false);
    setEditingGoal(null);
    fetchTwelveWeekGoals(); // Refresh the goals list
  };

  const handleGoalDeleted = () => {
    setShowGoalEditForm(false);
    setEditingGoal(null);
    fetchTwelveWeekGoals(); // Refresh the goals list
  };

  const handleEditGoal = (goal: TwelveWeekGoal) => {
    setEditingGoal(goal);
    setShowGoalEditForm(true);
  };

  const handleWeeklyGoalCreated = () => {
    setShowWeeklyGoalForm(false);
    setWeeklyGoalFormData(null);
    // Refresh weekly goals for the specific goal
    if (weeklyGoalFormData) {
      fetchWeeklyGoals([weeklyGoalFormData.goalId]);
    }
  };

  const handleWeeklyGoalUpdated = () => {
    setShowWeeklyGoalEditForm(false);
    setEditingWeeklyGoal(null);
    // Refresh weekly goals for all goals
    fetchWeeklyGoals(twelveWeekGoals.map(g => g.id));
  };

  const handleWeeklyGoalDeleted = () => {
    setShowWeeklyGoalEditForm(false);
    setEditingWeeklyGoal(null);
    // Refresh weekly goals for all goals
    fetchWeeklyGoals(twelveWeekGoals.map(g => g.id));
  };

  const handleEditWeeklyGoal = (weeklyGoal: WeeklyGoal, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent event bubbling
    }
    console.log('Editing weekly goal:', weeklyGoal); // Debug log
    setEditingWeeklyGoal(weeklyGoal);
    setShowWeeklyGoalEditForm(true);
  };

  const handleDeleteWeeklyGoal = async (weeklyGoal: WeeklyGoal, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering edit modal
    
    if (!confirm(`Are you sure you want to delete the weekly goal "${weeklyGoal.title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('0007-ap-goal_weekly_goals')
        .delete()
        .eq('id', weeklyGoal.id);

      if (error) {
        console.error('Error deleting weekly goal:', error);
        toast.error('Failed to delete weekly goal');
        return;
      }

      toast.success('Weekly goal deleted successfully');
      // Refresh weekly goals for all goals
      fetchWeeklyGoals(twelveWeekGoals.map(g => g.id));
    } catch (err) {
      console.error('Error deleting weekly goal:', err);
      toast.error('An error occurred while deleting the weekly goal');
    }
  };

  const handleAddWeeklyGoal = (goalId: string) => {
    const goal = twelveWeekGoals.find(g => g.id === goalId);
    const selectedWeek = selectedWeekByGoal[goalId] || currentWeek || 11;
    
    if (goal) {
      setWeeklyGoalFormData({
        goalId,
        weekNumber: selectedWeek,
        domains: goal.domains,
        roles: goal.roles
      });
      setShowWeeklyGoalForm(true);
    }
  };

  const handleTaskSave = (taskData: any) => {
    console.log('Task saved:', taskData);
    setShowTaskForm(false);
  };

  // Navigation handlers
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

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
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.path === '/twelve-week-cycle';
                
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
                      🕐
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

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white min-h-[56px]">
        {/* Left Section: Menu, Logo */}
        <div className="flex items-center space-x-4">
          {/* Hamburger Menu */}
          <button
            onClick={toggleMainSidebar}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors lg:hidden"
            aria-label="Toggle main menu"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2">
            <img src={logo} alt="Authentic Planner" className="h-8 w-8" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-gray-700">12 Week</span>
              <span className="text-sm font-medium text-gray-700">Cycle</span>
            </div>
          </div>
        </div>

        {/* Right Section: Profile */}
        <div className="flex items-center space-x-3">
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

      {/* GLOBAL FLOATING DRESSER - Desktop Navigation Bar */}
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

      {/* GLOBAL FLOATING DRESSER - Mobile Expandable Stack */}
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

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8" style={{ marginRight: activeDrawer ? '320px' : '0' }}>
        {/* Main Title and Cycle Information */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">12 Week Goals</h1>
          <h2 className="text-xl text-gray-700 mb-2">{currentCycleName}</h2>
          <p className="text-lg text-gray-600">
            {remainingDays > 0 ? (
              <span className="font-medium text-primary-600">{remainingDays} days remain in the current cycle</span>
            ) : (
              <span className="font-medium text-red-600">Current cycle has ended</span>
            )}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
            <span>Cycle Progress</span>
            <span>Ends {cycleData ? formatCycleEndDate(cycleData.reflection_end) : ''}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div 
              className="h-2 rounded-full bg-primary-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* 12-Week Goals Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Target className="h-6 w-6 text-primary-600" />
              <h3 className="text-2xl font-bold text-gray-900">12-Week Goals</h3>
            </div>
            <button
              onClick={() => setShowGoalForm(true)}
              className="flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add 12-Week Goal
            </button>
          </div>

          {/* Goals List with Nested Weekly View */}
          <div className="space-y-4">
            {twelveWeekGoals.length > 0 ? (
              twelveWeekGoals.map(goal => {
                const goalWeeklyGoals = weeklyGoalsByGoal[goal.id] || [];
                const selectedWeek = selectedWeekByGoal[goal.id] || currentWeek || 11;
                const weeklyGoalsForSelectedWeek = goalWeeklyGoals.filter(wg => wg.week_number === selectedWeek);

                return (
                  <div key={goal.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    {/* Goal Header - Always Visible - CLICKABLE FOR EDIT */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleEditGoal(goal)}
                      title="Click to edit goal"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">{goal.title}</h3>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800`}>
                              {goal.status}
                            </span>
                            <Edit3 className="h-4 w-4 text-gray-400" />
                          </div>
                          
                          {goal.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{goal.description}</p>
                          )}

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{goal.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${goal.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Domains and Roles */}
                          <div className="space-y-2">
                            {goal.domains.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs text-gray-500 mr-1">Domains:</span>
                                {goal.domains.slice(0, 3).map(domain => (
                                  <span key={domain.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {domain.name}
                                  </span>
                                ))}
                                {goal.domains.length > 3 && (
                                  <span className="text-xs text-gray-500">+{goal.domains.length - 3} more</span>
                                )}
                              </div>
                            )}

                            {goal.roles.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs text-gray-500 mr-1">Roles:</span>
                                {goal.roles.slice(0, 2).map(role => (
                                  <span key={role.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
                                    {role.label}
                                  </span>
                                ))}
                                {goal.roles.length > 2 && (
                                  <span className="text-xs text-gray-500">+{goal.roles.length - 2} more</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Quick Stats */}
                          <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {goalWeeklyGoals.length} weekly goals
                            </span>
                            <span className="flex items-center">
                              <Target className="h-4 w-4 mr-1" />
                              {goal.tasks.length} tasks
                            </span>
                            <span className="text-xs">
                              Created {format(new Date(goal.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>

                        {/* Expand/Collapse Button */}
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent triggering edit
                              handleToggleGoalExpand(goal.id);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            title={expandedGoal === goal.id ? 'Collapse' : 'Expand'}
                          >
                            {expandedGoal === goal.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content - Weekly View, Goals, and Tasks */}
                    {expandedGoal === goal.id && (
                      <div className="border-t border-gray-200 p-4 space-y-6">
                        {/* Weekly View Grid */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Calendar className="h-5 w-5 mr-2" />
                            Weekly View
                          </h4>
                          
                          {/* Week Grid */}
                          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                            {Array.from({ length: 12 }, (_, i) => (
                              <WeekBox
                                key={i + 1}
                                weekNumber={i + 1}
                                startDate={weekStartDates[i]}
                                isActive={selectedWeekByGoal[goal.id] === i + 1}
                                isCurrent={currentWeek === i + 1}
                                onClick={() => handleWeekSelect(goal.id, i + 1)}
                              />
                            ))}
                          </div>

                          {/* Reflection Week */}
                          <button 
                            onClick={() => handleWeekSelect(goal.id, 13)}
                            className={`
                              w-full rounded-lg border-2 p-3 text-center transition-colors mb-6
                              ${currentWeek === 13 && selectedWeekByGoal[goal.id] !== 13
                                ? 'border-blue-400 bg-blue-100 text-blue-800 ring-2 ring-blue-200'
                                : selectedWeekByGoal[goal.id] === 13
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-md font-bold">Week 13 (Reflection Week)</span>
                              <span className="text-sm text-gray-500 mt-1">
                                ({format(addWeeks(cycleStartDate, 12), 'dd MMM')})
                              </span>
                              {currentWeek === 13 && (
                                <span className="text-sm font-medium text-blue-600 mt-1">Current</span>
                              )}
                            </div>
                          </button>
                        </div>

                        {/* Weekly Goals Section - ONLY SHOW IF WEEKLY GOALS EXIST */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900">
                              Week {selectedWeek} Goals
                            </h4>
                            <button
                              onClick={() => handleAddWeeklyGoal(goal.id)}
                              className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Weekly Goal
                            </button>
                          </div>

                          {/* Weekly Goals List */}
                          <div className="space-y-3 mb-4">
                            {weeklyGoalsForSelectedWeek.length > 0 ? (
                              weeklyGoalsForSelectedWeek.map(weeklyGoal => (
                                <div key={weeklyGoal.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <h5 
                                          className="font-medium text-gray-900 cursor-pointer hover:text-primary-600 transition-colors"
                                          onClick={(e) => handleEditWeeklyGoal(weeklyGoal, e)}
                                          title="Click to edit weekly goal"
                                        >
                                          {weeklyGoal.title}
                                        </h5>
                                        <Edit3 
                                          className="h-3 w-3 text-gray-400 cursor-pointer hover:text-primary-600" 
                                          onClick={(e) => handleEditWeeklyGoal(weeklyGoal, e)}
                                        />
                                      </div>
                                      {weeklyGoal.description && (
                                        <p className="text-sm text-gray-600 mt-1">{weeklyGoal.description}</p>
                                      )}
                                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                          weeklyGoal.status === 'completed' ? 'bg-green-100 text-green-800' :
                                          weeklyGoal.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                          'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {weeklyGoal.status}
                                        </span>
                                        <span>Progress: {weeklyGoal.progress}%</span>
                                      </div>
                                    </div>
                                    
                                    {/* Delete button for weekly goal */}
                                    <button
                                      onClick={(e) => handleDeleteWeeklyGoal(weeklyGoal, e)}
                                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                      title="Delete weekly goal"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>

                                  {/* Weekly Tasks Section - ONLY SHOW UNDER WEEKLY GOALS */}
                                  <div className="mt-4 pt-3 border-t border-gray-200">
                                    <div className="flex items-center justify-between mb-3">
                                      <h6 className="text-sm font-medium text-gray-700">
                                        Tasks for this weekly goal
                                      </h6>
                                      <button
                                        onClick={() => setShowTaskForm(true)}
                                        className="flex items-center text-xs text-primary-600 hover:text-primary-700"
                                      >
                                        <Plus className="mr-1 h-3 w-3" />
                                        Add Task
                                      </button>
                                    </div>

                                    {/* Task Table - Smaller version for weekly goals */}
                                    <div className="overflow-x-auto rounded border border-gray-200 bg-white">
                                      <table className="w-full border-collapse text-xs">
                                        <thead>
                                          <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="w-12 px-2 py-1 text-left text-xs font-medium text-gray-500">Pr</th>
                                            <th className="w-16 px-1 py-1 text-center text-xs font-medium text-gray-500">✓</th>
                                            <th className="w-16 px-1 py-1 text-center text-xs font-medium text-gray-500">→</th>
                                            <th className="w-16 px-1 py-1 text-center text-xs font-medium text-gray-500">↑</th>
                                            <th className="w-16 px-1 py-1 text-center text-xs font-medium text-gray-500">✗</th>
                                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Task Description</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Array.from({ length: 5 }).map((_, index) => (
                                            <tr key={index} className="border-b border-gray-200">
                                              <td className="px-2 py-1">
                                                <input
                                                  type="text"
                                                  className="w-10 rounded border border-gray-300 px-1 py-0.5 text-xs"
                                                  placeholder="A1"
                                                />
                                              </td>
                                              {['Complete', 'Delegate', 'Follow Up', 'Cancel'].map((action) => (
                                                <td key={action} className="px-1 py-1 text-center">
                                                  <input
                                                    type="checkbox"
                                                    className="h-3 w-3 cursor-pointer rounded border-2 border-gray-300 checked:border-primary-500 checked:bg-primary-500"
                                                  />
                                                </td>
                                              ))}
                                              <td className="px-2 py-1">
                                                <input
                                                  type="text"
                                                  className="w-full rounded border border-gray-300 px-1 py-0.5 text-xs"
                                                  placeholder="Enter task description"
                                                />
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">No weekly goals for Week {selectedWeek} yet.</p>
                                <button
                                  onClick={() => handleAddWeeklyGoal(goal.id)}
                                  className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                                >
                                  Add your first weekly goal
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No 12-Week Goals Yet</h3>
                <p className="text-gray-600 mb-4">
                  Create your first 12-week goal to start tracking your progress and organizing your weekly goals and tasks.
                </p>
                <button
                  onClick={() => setShowGoalForm(true)}
                  className="inline-flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First 12-Week Goal
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showGoalForm && (
        <TwelveWeekGoalForm
          onClose={() => setShowGoalForm(false)}
          onGoalCreated={handleGoalCreated}
        />
      )}

      {showGoalEditForm && editingGoal && (
        <TwelveWeekGoalEditForm
          goal={editingGoal}
          onClose={() => {
            setShowGoalEditForm(false);
            setEditingGoal(null);
          }}
          onGoalUpdated={handleGoalUpdated}
          onGoalDeleted={handleGoalDeleted}
        />
      )}

      {showWeeklyGoalForm && weeklyGoalFormData && (
        <WeeklyGoalForm
          onClose={() => {
            setShowWeeklyGoalForm(false);
            setWeeklyGoalFormData(null);
          }}
          onGoalCreated={handleWeeklyGoalCreated}
          twelveWeekGoalId={weeklyGoalFormData.goalId}
          weekNumber={weeklyGoalFormData.weekNumber}
          prefilledDomains={weeklyGoalFormData.domains}
          prefilledRoles={weeklyGoalFormData.roles}
        />
      )}

      {/* Weekly Goal Edit Modal - Make sure this is properly displayed */}
      {showWeeklyGoalEditForm && editingWeeklyGoal && (
        <WeeklyGoalEditForm
          weeklyGoal={editingWeeklyGoal}
          onClose={() => {
            setShowWeeklyGoalEditForm(false);
            setEditingWeeklyGoal(null);
          }}
          onGoalUpdated={handleWeeklyGoalUpdated}
          onGoalDeleted={handleWeeklyGoalDeleted}
        />
      )}

      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl">
            <TaskForm
              onSave={handleTaskSave}
              onDelete={() => setShowTaskForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TwelveWeekCycle;