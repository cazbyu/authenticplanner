import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight, Users, Target, BookOpen, BarChart3, Briefcase, Archive } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TwelveWeekGoalForm from '../components/goals/TwelveWeekGoalForm';
import TwelveWeekGoalEditForm from '../components/goals/TwelveWeekGoalEditForm';
import WeeklyGoalForm from '../components/goals/WeeklyGoalForm';
import WeeklyGoalEditForm from '../components/goals/WeeklyGoalEditForm';
import { supabase } from '../supabaseClient';
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
  const [editingGoal, setEditingGoal] = useState<TwelveWeekGoal | null>(null);
  const [showWeeklyGoalForm, setShowWeeklyGoalForm] = useState<{
    goalId: string;
    weekNumber: number;
    domains?: Domain[];
    roles?: Role[];
  } | null>(null);
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
      
      for (const goal of transformedGoals) {
        const { data: weeklyData, error: weeklyError } = await supabase
          .from('0007-ap-goal_weekly_goals')
          .select('*')
          .eq('goal_id', goal.id)
          .order('week_number', { ascending: true });

        if (!weeklyError && weeklyData) {
          weeklyGoalsData[goal.id] = weeklyData;
        }
      }

      setWeeklyGoals(weeklyGoalsData);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">12 Week Goals</h1>
            <p className="text-lg text-gray-600 mt-2">Spring 2025 Cycle</p>
            <p className="text-sm text-teal-600 mt-1">17 days remain in the current cycle</p>
            
            {/* Progress bar */}
            <div className="mt-4 max-w-md mx-auto">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Cycle Progress</span>
                <span>Ends 28 Jun 2025</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-teal-500 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
          </div>

          {/* Goals Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Target className="h-6 w-6 text-teal-600" />
                <h2 className="text-xl font-semibold text-gray-900">12-Week Goals</h2>
              </div>
              <button
                onClick={() => setShowGoalForm(true)}
                className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition-colors"
              >
                <span className="text-lg">+</span>
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
              <div className="space-y-4">
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

                    {/* Weekly Goals Section */}
                    {expandedGoals[goal.id] && (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-md font-medium text-gray-900">Weekly Goals</h4>
                          <button
                            onClick={() => setShowWeeklyGoalForm({
                              goalId: goal.id,
                              weekNumber: (weeklyGoals[goal.id]?.length || 0) + 1,
                              domains: goal.domains,
                              roles: goal.roles
                            })}
                            className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                          >
                            + Add Weekly Goal
                          </button>
                        </div>

                        {weeklyGoals[goal.id]?.length > 0 ? (
                          <div className="grid gap-3">
                            {weeklyGoals[goal.id].map((weeklyGoal) => (
                              <div key={weeklyGoal.id} className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-blue-800">Week {weeklyGoal.week_number}</span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(weeklyGoal.status)}`}>
                                        {weeklyGoal.status}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-900 mt-1">{weeklyGoal.title}</p>
                                    {weeklyGoal.description && (
                                      <p className="text-xs text-gray-600 mt-1">{weeklyGoal.description}</p>
                                    )}
                                    
                                    {/* Progress bar for weekly goal */}
                                    <div className="mt-2 flex items-center space-x-2">
                                      <div className="flex-1 bg-blue-200 rounded-full h-1.5">
                                        <div 
                                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                          style={{ width: `${weeklyGoal.progress}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-xs text-gray-600">{weeklyGoal.progress}%</span>
                                    </div>
                                  </div>
                                  
                                  <button
                                    onClick={() => setEditingWeeklyGoal(weeklyGoal)}
                                    className="text-blue-400 hover:text-blue-600 p-1 ml-2"
                                    title="Edit weekly goal"
                                  >
                                    ✏️
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-500">
                            <p className="text-sm">No weekly goals yet for this 12-week goal.</p>
                            <button
                              onClick={() => setShowWeeklyGoalForm({
                                goalId: goal.id,
                                weekNumber: 1,
                                domains: goal.domains,
                                roles: goal.roles
                              })}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                            >
                              Add your first weekly goal
                            </button>
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