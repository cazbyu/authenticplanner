import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight, Users, Target, BookOpen, BarChart3, Briefcase, Archive, Plus, Calendar, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TwelveWeekGoalForm from '../components/goals/TwelveWeekGoalForm';
import TwelveWeekGoalEditForm from '../components/goals/TwelveWeekGoalEditForm';
import WeeklyGoalForm from '../components/goals/WeeklyGoalForm';
import WeeklyGoalEditForm from '../components/goals/WeeklyGoalEditForm';
import { supabase } from '../supabaseClient';
import { format, addWeeks, differenceInDays } from 'date-fns';
import logo from '../assets/logo.svg';

// Import drawer content components
import RoleBank from '../components/roles/RoleBank';
import StrategicGoals from '../pages/StrategicGoals';
import Reflections from '../pages/Reflections';
import Scorecard from '../pages/Scorecard';
import Tasks from '../pages/Tasks';

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
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  domains: Domain[];
  roles: Role[];
}

interface WeeklyGoal {
  id: string;
  goal_id: string;
  week_number: number;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled';
  progress: number;
  created_at: string;
  updated_at: string;
}

interface WeeklyTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled';
  week_number: number;
  goal_id: string;
  due_date?: string;
  created_at: string;
}

interface CycleInfo {
  id: string;
  cycle_label: string;
  title?: string;
  start_date: Date;
  end_date: Date;
  reflection_start: Date;
  reflection_end: Date;
  is_active: boolean;
}

const TwelveWeekCycle: React.FC = () => {
  const { user, logout } = useAuth();
  const [goals, setGoals] = useState<TwelveWeekGoal[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<Record<string, WeeklyGoal[]>>({});
  const [weeklyTasks, setWeeklyTasks] = useState<Record<string, WeeklyTask[]>>({});
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<TwelveWeekGoal | null>(null);
  const [showWeeklyGoalForm, setShowWeeklyGoalForm] = useState<{
    goalId: string;
    weekNumber: number;
    domains?: Domain[];
    roles?: Role[];
  } | null>(null);
  const [editingWeeklyGoal, setEditingWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [selectedWeeks, setSelectedWeeks] = useState<Record<string, number>>({});
  
  // Cycle information - now loaded from database
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  
  // Navigation state
  const [mainSidebarOpen, setMainSidebarOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'roles' | 'tasks' | 'goals' | 'reflections' | 'scorecard' | null>(null);
  const [mobileNavExpanded, setMobileNavExpanded] = useState(false);

  useEffect(() => {
    fetchCycleInfo();
  }, []);

  useEffect(() => {
    if (cycleInfo) {
      fetchGoals();
    }
  }, [cycleInfo]);

  // Fetch current active cycle from database
  const fetchCycleInfo = async () => {
    try {
      const { data: cycles, error } = await supabase
        .from('0007-ap-global-cycles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching cycle info:', error);
        // Fallback to default cycle if database fetch fails
        setCycleInfo({
          id: 'default',
          cycle_label: 'Spring 2025 Cycle',
          title: 'Spring 2025 Cycle',
          start_date: new Date('2025-01-06'),
          end_date: new Date('2025-03-31'),
          reflection_start: new Date('2025-04-01'),
          reflection_end: new Date('2025-04-07'),
          is_active: true
        });
        return;
      }

      if (cycles && cycles.length > 0) {
        const cycle = cycles[0];
        setCycleInfo({
          id: cycle.id,
          cycle_label: cycle.cycle_label || 'Current Cycle',
          title: cycle.title || cycle.cycle_label || 'Current Cycle',
          start_date: new Date(cycle.start_date),
          end_date: new Date(cycle.end_date),
          reflection_start: new Date(cycle.reflection_start),
          reflection_end: new Date(cycle.reflection_end),
          is_active: cycle.is_active
        });
      } else {
        // No active cycle found, use default
        setCycleInfo({
          id: 'default',
          cycle_label: 'Spring 2025 Cycle',
          title: 'Spring 2025 Cycle',
          start_date: new Date('2025-01-06'),
          end_date: new Date('2025-03-31'),
          reflection_start: new Date('2025-04-01'),
          reflection_end: new Date('2025-04-07'),
          is_active: true
        });
      }
    } catch (error) {
      console.error('Error fetching cycle info:', error);
      // Fallback to default cycle
      setCycleInfo({
        id: 'default',
        cycle_label: 'Spring 2025 Cycle',
        title: 'Spring 2025 Cycle',
        start_date: new Date('2025-01-06'),
        end_date: new Date('2025-03-31'),
        reflection_start: new Date('2025-04-01'),
        reflection_end: new Date('2025-04-07'),
        is_active: true
      });
    }
  };

  // Calculate current week and days remaining
  const getCurrentWeek = () => {
    if (!cycleInfo) return 1;
    
    const today = new Date();
    const cycleStart = cycleInfo.start_date;
    const cycleEnd = cycleInfo.end_date;
    
    if (today < cycleStart) return 0; // Before cycle starts
    if (today > cycleEnd) return 13; // In reflection week or after
    
    const weeksDiff = Math.floor((today.getTime() - cycleStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.min(weeksDiff + 1, 12); // Weeks 1-12
  };

  const getDaysRemaining = () => {
    if (!cycleInfo) return 0;
    
    const today = new Date();
    const cycleEnd = cycleInfo.reflection_end;
    return Math.max(0, differenceInDays(cycleEnd, today));
  };

  const getWeekStartDate = (weekNumber: number) => {
    if (!cycleInfo) return new Date();
    
    if (weekNumber === 13) return cycleInfo.reflection_start;
    // Week start dates: start_date + (weekNumber - 1) * 7 days
    return addWeeks(cycleInfo.start_date, weekNumber - 1);
  };

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch 12-week goals with their relationships
      const { data: goalsData, error: goalsError } = await supabase
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
      const transformedGoals: TwelveWeekGoal[] = (goalsData || []).map(goal => ({
        ...goal,
        domains: goal.goal_domains?.map((gd: any) => gd.domain).filter(Boolean) || [],
        roles: goal.goal_roles?.map((gr: any) => gr.role).filter(Boolean) || []
      }));

      setGoals(transformedGoals);

      // Fetch weekly goals for each 12-week goal
      const weeklyGoalsData: Record<string, WeeklyGoal[]> = {};
      const weeklyTasksData: Record<string, WeeklyTask[]> = {};
      
      for (const goal of transformedGoals) {
        const { data: weeklyData, error: weeklyError } = await supabase
          .from('0007-ap-goal_weekly_goals')
          .select('*')
          .eq('goal_id', goal.id)
          .order('week_number', { ascending: true });

        if (!weeklyError && weeklyData) {
          weeklyGoalsData[goal.id] = weeklyData;
        }

        // Fetch weekly tasks (mock data for now - you can implement this table)
        weeklyTasksData[goal.id] = [];
      }

      setWeeklyGoals(weeklyGoalsData);
      setWeeklyTasks(weeklyTasksData);

    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalCreated = () => {
    setShowGoalForm(false);
    fetchGoals();
  };

  const handleGoalUpdated = () => {
    setEditingGoal(null);
    fetchGoals();
  };

  const handleGoalDeleted = () => {
    setEditingGoal(null);
    fetchGoals();
  };

  const handleWeeklyGoalCreated = () => {
    setShowWeeklyGoalForm(null);
    fetchGoals();
  };

  const handleWeeklyGoalUpdated = () => {
    setEditingWeeklyGoal(null);
    fetchGoals();
  };

  const handleWeeklyGoalDeleted = () => {
    setEditingWeeklyGoal(null);
    fetchGoals();
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };

  const selectWeek = (goalId: string, weekNumber: number) => {
    setSelectedWeeks(prev => ({
      ...prev,
      [goalId]: prev[goalId] === weekNumber ? 0 : weekNumber
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDomainColor = (domainName: string) => {
    const colors: Record<string, string> = {
      'Physical': 'bg-blue-100 text-blue-800 border-blue-200',
      'Emotional': 'bg-pink-100 text-pink-800 border-pink-200',
      'Intellectual': 'bg-purple-100 text-purple-800 border-purple-200',
      'Spiritual': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Financial': 'bg-green-100 text-green-800 border-green-200',
      'Social': 'bg-orange-100 text-orange-800 border-orange-200',
      'Recreational': 'bg-teal-100 text-teal-800 border-teal-200',
      'Community': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[domainName] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Navigation handlers
  const toggleMainSidebar = () => setMainSidebarOpen(!mainSidebarOpen);
  const closeMainSidebar = () => setMainSidebarOpen(false);

  const handleDrawerSelect = (drawer: typeof activeDrawer) => {
    if (activeDrawer === drawer) {
      setActiveDrawer(null);
    } else {
      setActiveDrawer(drawer);
    }
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

  // Don't render until we have cycle info
  if (loading || !cycleInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading cycle information...</p>
        </div>
      </div>
    );
  }

  const currentWeek = getCurrentWeek();
  const daysRemaining = getDaysRemaining();

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
                  <ChevronRight className="h-5 w-5" />
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

      {/* Main content */}
      <main className="lg:pl-0" style={{ marginRight: activeDrawer ? '320px' : '0' }}>
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 md:px-8">
          {/* Enhanced Header with Real Cycle Info */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">12 Week Goals</h1>
            <p className="text-lg text-gray-600 mt-2">{cycleInfo.title || cycleInfo.cycle_label}</p>
            <p className="text-sm text-teal-600 mt-1 font-medium">
              {daysRemaining} days remain in the current cycle
            </p>
            
            {/* Enhanced Progress bar with week indicator */}
            <div className="mt-4 max-w-md mx-auto">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Week {currentWeek} of 12</span>
                <span>Ends {format(cycleInfo.reflection_end, 'dd MMM yyyy')}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-teal-500 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${(currentWeek / 12) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Goals Section with Enhanced Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Target className="h-6 w-6 text-teal-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {cycleInfo.title || cycleInfo.cycle_label} Goals ({daysRemaining} Days Remain)
                </h2>
              </div>
              <button
                onClick={() => setShowGoalForm(true)}
                className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add 12-Week Goal</span>
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No 12-week goals yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first 12-week goal.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowGoalForm(true)}
                    className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition-colors"
                  >
                    Add 12-Week Goal
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {goals.map((goal) => (
                  <div key={goal.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Goal Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-medium text-gray-900">{goal.title}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                              {goal.status}
                            </span>
                          </div>
                          {goal.description && (
                            <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                          )}
                          
                          {/* Progress bar */}
                          <div className="mt-2 flex items-center space-x-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-teal-500 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${goal.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{goal.progress}%</span>
                          </div>

                          {/* Domains and Roles */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {goal.domains.map(domain => (
                              <span key={domain.id} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getDomainColor(domain.name)}`}>
                                {domain.name}
                              </span>
                            ))}
                            {goal.roles.map(role => (
                              <span key={role.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800 border border-secondary-200">
                                {role.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingGoal(goal)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                            title="Edit goal"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => toggleGoalExpansion(goal.id)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                            title={expandedGoals[goal.id] ? "Collapse weeks" : "Expand weeks"}
                          >
                            {expandedGoals[goal.id] ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Weekly Grid and Tasks Section */}
                    {expandedGoals[goal.id] && (
                      <div className="p-6">
                        {/* Weekly Grid */}
                        <div className="mb-6">
                          <h4 className="text-md font-medium text-gray-900 mb-4">Weekly Progress</h4>
                          
                          {/* Weeks 1-12 Grid */}
                          <div className="grid grid-cols-6 gap-3 mb-4">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(weekNum => {
                              const weekStart = getWeekStartDate(weekNum);
                              const isCurrentWeek = weekNum === currentWeek;
                              const isSelected = selectedWeeks[goal.id] === weekNum;
                              const weeklyGoal = weeklyGoals[goal.id]?.find(wg => wg.week_number === weekNum);
                              
                              return (
                                <button
                                  key={weekNum}
                                  onClick={() => selectWeek(goal.id, weekNum)}
                                  className={`
                                    p-3 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md
                                    ${isCurrentWeek 
                                      ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md' 
                                      : isSelected
                                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                                      : weeklyGoal
                                      ? 'border-green-300 bg-green-50 text-green-700'
                                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }
                                  `}
                                >
                                  <div className="font-medium text-sm">Week {weekNum}</div>
                                  <div className="text-xs mt-1">
                                    ({format(weekStart, 'dd MMM')})
                                  </div>
                                  {weeklyGoal && (
                                    <div className="mt-1">
                                      <CheckCircle className="h-3 w-3 mx-auto" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          
                          {/* Week 13 (Reflection Week) */}
                          <button
                            onClick={() => selectWeek(goal.id, 13)}
                            className={`
                              w-full p-4 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md
                              ${selectedWeeks[goal.id] === 13
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-purple-300 bg-purple-50 text-purple-600 hover:border-purple-400'
                              }
                            `}
                          >
                            <div className="font-medium">Week 13 (Reflection Week)</div>
                            <div className="text-sm mt-1">
                              {format(cycleInfo.reflection_start, 'dd MMM')} - {format(cycleInfo.reflection_end, 'dd MMM')}
                            </div>
                          </button>
                        </div>

                        {/* Weekly Tasks Section */}
                        {selectedWeeks[goal.id] > 0 && (
                          <div className="border-t border-gray-200 pt-6">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-md font-medium text-gray-900">
                                Week {selectedWeeks[goal.id]} Tasks
                                {selectedWeeks[goal.id] === 13 && ' (Reflection)'}
                              </h5>
                              <button
                                onClick={() => setShowWeeklyGoalForm({
                                  goalId: goal.id,
                                  weekNumber: selectedWeeks[goal.id],
                                  domains: goal.domains,
                                  roles: goal.roles
                                })}
                                className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                              >
                                + Add Task
                              </button>
                            </div>

                            {/* Tasks List */}
                            <div className="space-y-2">
                              {weeklyTasks[goal.id]?.filter(task => task.week_number === selectedWeeks[goal.id]).length > 0 ? (
                                weeklyTasks[goal.id]
                                  .filter(task => task.week_number === selectedWeeks[goal.id])
                                  .map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                      <div className="flex items-center space-x-3">
                                        <input
                                          type="checkbox"
                                          checked={task.status === 'completed'}
                                          className="h-4 w-4 text-teal-600 rounded"
                                          readOnly
                                        />
                                        <span className={`text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                          {task.title}
                                        </span>
                                      </div>
                                      {task.due_date && (
                                        <span className="text-xs text-gray-500">
                                          Due: {format(new Date(task.due_date), 'MMM dd')}
                                        </span>
                                      )}
                                    </div>
                                  ))
                              ) : (
                                <div className="text-center py-6 text-gray-500">
                                  <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                  <p className="text-sm">No tasks for Week {selectedWeeks[goal.id]} yet.</p>
                                  <button
                                    onClick={() => setShowWeeklyGoalForm({
                                      goalId: goal.id,
                                      weekNumber: selectedWeeks[goal.id],
                                      domains: goal.domains,
                                      roles: goal.roles
                                    })}
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                                  >
                                    Add your first task
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
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

      {editingGoal && (
        <TwelveWeekGoalEditForm
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onGoalUpdated={handleGoalUpdated}
          onGoalDeleted={handleGoalDeleted}
        />
      )}

      {showWeeklyGoalForm && (
        <WeeklyGoalForm
          onClose={() => setShowWeeklyGoalForm(null)}
          onGoalCreated={handleWeeklyGoalCreated}
          twelveWeekGoalId={showWeeklyGoalForm.goalId}
          weekNumber={showWeeklyGoalForm.weekNumber}
          prefilledDomains={showWeeklyGoalForm.domains}
          prefilledRoles={showWeeklyGoalForm.roles}
        />
      )}

      {editingWeeklyGoal && (
        <WeeklyGoalEditForm
          weeklyGoal={editingWeeklyGoal}
          onClose={() => setEditingWeeklyGoal(null)}
          onGoalUpdated={handleWeeklyGoalUpdated}
          onGoalDeleted={handleWeeklyGoalDeleted}
        />
      )}
    </div>
  );
};

export default TwelveWeekCycle;