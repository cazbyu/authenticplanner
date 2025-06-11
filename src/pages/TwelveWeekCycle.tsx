import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight, Users, Target, BookOpen, BarChart3, Briefcase, Archive, Plus, Edit, Trash2, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import TwelveWeekGoalForm from '../components/goals/TwelveWeekGoalForm';
import TwelveWeekGoalEditForm from '../components/goals/TwelveWeekGoalEditForm';
import WeeklyGoalForm from '../components/goals/WeeklyGoalForm';
import WeeklyGoalEditForm from '../components/goals/WeeklyGoalEditForm';
import TaskForm from '../components/tasks/TaskForm';
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

const TwelveWeekCycle: React.FC = () => {
  const { user, logout } = useAuth();
  const [goals, setGoals] = useState<TwelveWeekGoal[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<Record<string, WeeklyGoal[]>>({});
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showWeeklyGoalForm, setShowWeeklyGoalForm] = useState<{ goalId: string; weekNumber: number } | null>(null);
  const [showTaskForm, setShowTaskForm] = useState<{ goalId: string; weeklyGoalId?: string } | null>(null);
  const [editingGoal, setEditingGoal] = useState<TwelveWeekGoal | null>(null);
  const [editingWeeklyGoal, setEditingWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  
  // Navigation state
  const [mainSidebarOpen, setMainSidebarOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'roles' | 'tasks' | 'goals' | 'reflections' | 'scorecard' | null>(null);
  const [mobileNavExpanded, setMobileNavExpanded] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch 12-week goals with their domains and roles
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
        toast.error('Failed to load goals');
        return;
      }

      // Transform the data to include domains and roles
      const transformedGoals = goalsData?.map(goal => ({
        ...goal,
        domains: goal.goal_domains?.map((gd: any) => gd.domain).filter(Boolean) || [],
        roles: goal.goal_roles?.map((gr: any) => gr.role).filter(Boolean) || []
      })) || [];

      setGoals(transformedGoals);

      // Fetch weekly goals for each 12-week goal
      if (transformedGoals.length > 0) {
        const { data: weeklyData, error: weeklyError } = await supabase
          .from('0007-ap-goal_weekly_goals')
          .select('*')
          .in('goal_id', transformedGoals.map(g => g.id))
          .order('week_number', { ascending: true });

        if (weeklyError) {
          console.error('Error fetching weekly goals:', weeklyError);
        } else {
          // Group weekly goals by goal_id
          const groupedWeekly = weeklyData?.reduce((acc, weekly) => {
            if (!acc[weekly.goal_id]) acc[weekly.goal_id] = [];
            acc[weekly.goal_id].push(weekly);
            return acc;
          }, {} as Record<string, WeeklyGoal[]>) || {};

          setWeeklyGoals(groupedWeekly);
        }
      }

    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };

  const handleGoalCreated = () => {
    setShowGoalForm(false);
    fetchGoals();
    toast.success('12-Week Goal created successfully!');
  };

  const handleGoalUpdated = () => {
    setEditingGoal(null);
    fetchGoals();
    toast.success('12-Week Goal updated successfully!');
  };

  const handleGoalDeleted = () => {
    setEditingGoal(null);
    fetchGoals();
    toast.success('12-Week Goal deleted successfully!');
  };

  const handleWeeklyGoalCreated = () => {
    setShowWeeklyGoalForm(null);
    fetchGoals();
    toast.success('Weekly goal created successfully!');
  };

  const handleWeeklyGoalUpdated = () => {
    setEditingWeeklyGoal(null);
    fetchGoals();
    toast.success('Weekly goal updated successfully!');
  };

  const handleWeeklyGoalDeleted = () => {
    setEditingWeeklyGoal(null);
    fetchGoals();
    toast.success('Weekly goal deleted successfully!');
  };

  const handleTaskCreated = () => {
    setShowTaskForm(null);
    toast.success('Task created successfully!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getWeeklyStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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

  // Navigation functions
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

  // Helper function to get initial task form data with pre-selected goal and domains
  const getInitialTaskFormData = () => {
    if (!showTaskForm) return {};

    const goal = goals.find(g => g.id === showTaskForm.goalId);
    if (!goal) return {};

    return {
      isTwelveWeekGoal: true, // Pre-select 12-Week Goal checkbox
      selectedDomainIds: goal.domains.map(d => d.id), // Pre-select goal's domains
      selectedRoleIds: goal.roles.map(r => r.id), // Pre-select goal's roles
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading your 12-week goals...</p>
        </div>
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

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white px-4 shadow-sm md:px-6 lg:hidden">
        <button 
          onClick={toggleMainSidebar}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Authentic Planner" className="h-8 w-8" />
          <span className="text-lg font-bold text-primary-600">12 Week Cycle</span>
        </div>
        
        <div className="relative">
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
      </header>

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
                      {item.icon === 'Calendar' && '📅'}
                      {item.icon === 'Clock' && '⏰'}
                      {item.icon === 'Settings' && '⚙️'}
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
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">12-Week Cycle</h1>
                <p className="mt-2 text-gray-600">
                  Break down your strategic goals into actionable 12-week cycles
                </p>
              </div>
              <button
                onClick={() => setShowGoalForm(true)}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                New 12-Week Goal
              </button>
            </div>
          </div>

          {/* Goals List */}
          <div className="space-y-6">
            {goals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No 12-week goals yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first 12-week goal.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowGoalForm(true)}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors mx-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Goal
                  </button>
                </div>
              </div>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Goal Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h2 className="text-xl font-semibold text-gray-900">{goal.title}</h2>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                            {goal.status}
                          </span>
                        </div>
                        
                        {goal.description && (
                          <p className="text-gray-600 mb-3">{goal.description}</p>
                        )}

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{goal.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Domains and Roles */}
                        <div className="flex flex-wrap gap-2 mb-3">
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

                        {/* Dates */}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {goal.start_date && (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>Started: {new Date(goal.start_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {goal.end_date && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>Ends: {new Date(goal.end_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingGoal(goal)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          title="Edit goal"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleGoalExpansion(goal.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          title={expandedGoals[goal.id] ? "Collapse" : "Expand"}
                        >
                          <ChevronRight className={`h-4 w-4 transition-transform ${expandedGoals[goal.id] ? 'rotate-90' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Goals Section */}
                  {expandedGoals[goal.id] && (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Weekly Goals</h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setShowTaskForm({ goalId: goal.id })}
                            className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Task
                          </button>
                          <button
                            onClick={() => setShowWeeklyGoalForm({ goalId: goal.id, weekNumber: (weeklyGoals[goal.id]?.length || 0) + 1 })}
                            className="flex items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Weekly Goal
                          </button>
                        </div>
                      </div>

                      {/* Weekly Goals Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 12 }, (_, index) => {
                          const weekNumber = index + 1;
                          const weekGoals = weeklyGoals[goal.id]?.filter(wg => wg.week_number === weekNumber) || [];
                          
                          return (
                            <div key={weekNumber} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-900">Week {weekNumber}</h4>
                                <button
                                  onClick={() => setShowWeeklyGoalForm({ goalId: goal.id, weekNumber })}
                                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                  title="Add weekly goal"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              
                              <div className="space-y-2">
                                {weekGoals.length === 0 ? (
                                  <p className="text-xs text-gray-500 italic">No goals set for this week</p>
                                ) : (
                                  weekGoals.map(weeklyGoal => (
                                    <div key={weeklyGoal.id} className="bg-white p-2 rounded border">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">{weeklyGoal.title}</p>
                                          {weeklyGoal.description && (
                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{weeklyGoal.description}</p>
                                          )}
                                          <div className="flex items-center justify-between mt-2">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getWeeklyStatusColor(weeklyGoal.status)}`}>
                                              {weeklyGoal.status}
                                            </span>
                                            <span className="text-xs text-gray-500">{weeklyGoal.progress}%</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-1 ml-2">
                                          <button
                                            onClick={() => setShowTaskForm({ goalId: goal.id, weeklyGoalId: weeklyGoal.id })}
                                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Add task for this weekly goal"
                                          >
                                            <Plus className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => setEditingWeeklyGoal(weeklyGoal)}
                                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                            title="Edit weekly goal"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
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
          prefilledDomains={goals.find(g => g.id === showWeeklyGoalForm.goalId)?.domains || []}
          prefilledRoles={goals.find(g => g.id === showWeeklyGoalForm.goalId)?.roles || []}
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

      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl mx-4">
            <TaskForm
              onClose={() => setShowTaskForm(null)}
              onTaskCreated={handleTaskCreated}
              initialFormData={getInitialTaskFormData()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TwelveWeekCycle;