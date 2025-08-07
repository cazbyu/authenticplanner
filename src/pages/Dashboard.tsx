import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  CheckSquare, 
  BarChart3, 
  FileText, 
  ArrowRight,
  Clock,
  Target,
  Star,
  TrendingUp,
  Plus
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
  totalTasks: number;
  urgentTasks: number;
  completedThisWeek: number;
  authenticDeposits: number;
  activeRoles: number;
  weeklyScore: number;
  upcomingEvents: number;
  pendingNotes: number;
  activeTwelveWeekGoals: number;
  currentWeekNumber: number;
  cycleProgress: number;
}

interface QuickTask {
  id: string;
  title: string;
  is_urgent: boolean;
  is_important: boolean;
  is_authentic_deposit: boolean;
  due_date?: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_time: string;
  is_all_day: boolean;
}

interface TwelveWeekGoal {
  id: string;
  title: string;
  progress: number;
  status: string;
  start_date: string;
  end_date: string;
}
const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    urgentTasks: 0,
    completedThisWeek: 0,
    authenticDeposits: 0,
    activeRoles: 0,
    weeklyScore: 0,
    upcomingEvents: 0,
    pendingNotes: 0,
    activeTwelveWeekGoals: 0,
    currentWeekNumber: 0,
    cycleProgress: 0
  });
  const [quickTasks, setQuickTasks] = useState<QuickTask[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [activeTwelveWeekGoals, setActiveTwelveWeekGoals] = useState<TwelveWeekGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Get current week dates
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Fetch all data in parallel
      const [
        tasksRes,
        completedTasksRes,
        rolesRes,
        eventsRes,
        notesRes,
        twelveWeekGoalsRes
      ] = await Promise.all([
        // Active tasks
        supabase
          .from('0007-ap-tasks')
          .select('id, title, is_urgent, is_important, is_authentic_deposit, due_date, status')
          .eq('user_id', authUser.id)
          .in('status', ['pending', 'in_progress']),
        
        // Completed tasks this week
        supabase
          .from('0007-ap-tasks')
          .select('id, is_authentic_deposit')
          .eq('user_id', authUser.id)
          .eq('status', 'completed')
          .gte('completed_at', startOfWeek.toISOString())
          .lte('completed_at', endOfWeek.toISOString()),
        
        // Active roles
        supabase
          .from('0007-ap-roles')
          .select('id')
          .eq('user_id', authUser.id)
          .eq('is_active', true),
        
        // Upcoming events (next 7 days)
        supabase
          .from('0007-ap-tasks')
          .select('id, title, start_time, is_all_day')
          .eq('user_id', authUser.id)
          .not('start_time', 'is', null)
          .gte('start_time', now.toISOString())
          .lte('start_time', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('start_time', { ascending: true })
          .limit(5),
        
        // Notes (for follow-up count)
        supabase
          .from('0007-ap-notes')
          .select('id')
          .eq('user_id', authUser.id),
        
        // 12-week goals
        supabase
          .from('0007-ap-goals-12wk')
          .select('id, title, progress, status, start_date, end_date')
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
      ]);

      const tasks = tasksRes.data || [];
      const completedTasks = completedTasksRes.data || [];
      const roles = rolesRes.data || [];
      const events = eventsRes.data || [];
      const notes = notesRes.data || [];
      const twelveWeekGoals = twelveWeekGoalsRes.data || [];

      // Calculate stats
      const urgentTasks = tasks.filter(t => t.is_urgent).length;
      const authenticDeposits = tasks.filter(t => t.is_authentic_deposit).length;
      const completedDeposits = completedTasks.filter(t => t.is_authentic_deposit).length;
      
      // Simple scoring: 5 points per authentic deposit, 3 points per important task, 1 point per other task
      const weeklyScore = (completedDeposits * 5) + 
                         (completedTasks.filter(t => !t.is_authentic_deposit).length * 2);

      // Calculate 12-week cycle stats
      let currentWeekNumber = 0;
      let cycleProgress = 0;
      
      if (twelveWeekGoals.length > 0) {
        // Find the most recent active goal to determine current week
        const mostRecentGoal = twelveWeekGoals[0];
        if (mostRecentGoal.start_date) {
          const startDate = new Date(mostRecentGoal.start_date);
          const today = new Date();
          const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          currentWeekNumber = Math.min(Math.max(Math.floor(daysDiff / 7) + 1, 1), 12);
          cycleProgress = Math.round((currentWeekNumber / 12) * 100);
        }
      }
      setStats({
        totalTasks: tasks.length,
        urgentTasks,
        completedThisWeek: completedTasks.length,
        authenticDeposits,
        activeRoles: roles.length,
        weeklyScore,
        upcomingEvents: events.length,
        pendingNotes: notes.length,
        activeTwelveWeekGoals: twelveWeekGoals.length,
        currentWeekNumber,
        cycleProgress
      });

      // Set quick tasks (top 5 priority tasks)
      const priorityTasks = tasks
        .sort((a, b) => {
          // Sort by priority: urgent+important > urgent > important > others
          const aPriority = (a.is_urgent ? 2 : 0) + (a.is_important ? 1 : 0);
          const bPriority = (b.is_urgent ? 2 : 0) + (b.is_important ? 1 : 0);
          return bPriority - aPriority;
        })
        .slice(0, 5);
      
      setQuickTasks(priorityTasks);
      setUpcomingEvents(events);
      setActiveTwelveWeekGoals(twelveWeekGoals);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventTime = (startTime: string, isAllDay: boolean) => {
    if (isAllDay) return 'All day';
    const date = new Date(startTime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTaskDate = (dueDate?: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="text-lg text-gray-600">
            Here's your authentic journey overview for today
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-blue-600" />
            </div>
            {stats.urgentTasks > 0 && (
              <p className="text-sm text-red-600 mt-2">{stats.urgentTasks} urgent</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Weekly Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.weeklyScore}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">{stats.completedThisWeek} tasks completed</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Roles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeRoles}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">Authentic deposits: {stats.authenticDeposits}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingEvents}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">Next 7 days</p>
          </div>
        </div>

        {/* 12 Week Cycle Overview */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">12 Week Cycle Progress</h2>
              <div className="flex items-center space-x-4">
                <div>
                  <p className="text-sm opacity-90">Current Week</p>
                  <p className="text-2xl font-bold">{stats.currentWeekNumber}</p>
                </div>
                <div>
                  <p className="text-sm opacity-90">Active Goals</p>
                  <p className="text-2xl font-bold">{stats.activeTwelveWeekGoals}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">Cycle Progress</div>
              <div className="text-3xl font-bold">{stats.cycleProgress}%</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-3 mb-4">
            <div 
              className="bg-white h-3 rounded-full transition-all duration-300"
              style={{ width: `${stats.cycleProgress}%` }}
            />
          </div>
          
          {/* Active Goals Preview */}
          {activeTwelveWeekGoals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium opacity-90">Active 12-Week Goals:</p>
              {activeTwelveWeekGoals.slice(0, 3).map(goal => (
                <div key={goal.id} className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                  <span className="text-sm font-medium">{goal.title}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white h-2 rounded-full"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{goal.progress}%</span>
                  </div>
                </div>
              ))}
              {activeTwelveWeekGoals.length > 3 && (
                <p className="text-xs opacity-75">
                  +{activeTwelveWeekGoals.length - 3} more goals
                </p>
              )}
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-white/20">
            <Link
              to="/twelve-week-cycle"
              className="inline-flex items-center text-sm font-medium hover:underline"
            >
              View Full 12 Week Cycle
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        {/* Main Dashboard Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {/* Authentic Calendar Card */}
          <Link
            to="/calendar"
            className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Authentic Calendar</h3>
                  <p className="text-sm text-gray-600">Schedule & manage your time</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </div>
            
            {upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Upcoming Events:</p>
                {upcomingEvents.slice(0, 3).map(event => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900 truncate">{event.title}</span>
                    <span className="text-gray-500 text-xs">
                      {formatEventTime(event.start_time, event.is_all_day)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No upcoming events scheduled</p>
            )}
          </Link>

          {/* Role Bank Card */}
          <Link
            to="/role-bank"
            className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Role Bank</h3>
                  <p className="text-sm text-gray-600">Manage roles & relationships</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.activeRoles}</p>
                <p className="text-xs text-gray-500">Active Roles</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.authenticDeposits}</p>
                <p className="text-xs text-gray-500">Deposit Ideas</p>
              </div>
            </div>
          </Link>

          {/* Tasks by Priority Card */}
          <Link
            to="/calendar?view=priorities"
            className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <CheckSquare className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Tasks by Priority</h3>
                  <p className="text-sm text-gray-600">Focus on what matters most</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </div>
            
            {quickTasks.length > 0 ? (
              <div className="space-y-2">
                {quickTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="flex space-x-1">
                        {task.is_urgent && (
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        )}
                        {task.is_important && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                        {task.is_authentic_deposit && (
                          <Star className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      <span className="text-sm text-gray-900 truncate">{task.title}</span>
                    </div>
                    {task.due_date && (
                      <span className="text-xs text-gray-500 ml-2">
                        {formatTaskDate(task.due_date)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No pending tasks</p>
            )}
          </Link>

          {/* Scorecard Card */}
          <Link
            to="/scorecard/full"
            className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Scorecard</h3>
                  <p className="text-sm text-gray-600">Track your progress</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">This Week's Score</span>
                <span className="text-lg font-bold text-green-600">{stats.weeklyScore}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((stats.weeklyScore / 50) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {stats.completedThisWeek} tasks completed this week
              </p>
            </div>
          </Link>

          {/* Notes & Follow Up Card */}
          <Link
            to="/notes"
            className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Notes & Follow Up</h3>
                  <p className="text-sm text-gray-600">Capture insights & actions</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Notes</span>
                <span className="text-lg font-bold text-gray-900">{stats.pendingNotes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Follow-ups Needed</span>
                <span className="text-lg font-bold text-orange-600">
                  {Math.floor(stats.pendingNotes * 0.3)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Capture thoughts and track follow-up actions
              </p>
            </div>
          </Link>

          {/* Quick Actions Card */}
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border border-primary-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/calendar?action=add-task"
                className="flex items-center justify-between w-full p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Plus className="h-4 w-4 text-primary-600" />
                  <span className="text-sm font-medium text-gray-900">Add Task</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              
              <Link
                to="/calendar?action=add-event"
                className="flex items-center justify-between w-full p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-primary-600" />
                  <span className="text-sm font-medium text-gray-900">Schedule Event</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              
              <Link
                to="/twelve-week-cycle"
                className="flex items-center justify-between w-full p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Target className="h-4 w-4 text-primary-600" />
                  <span className="text-sm font-medium text-gray-900">Manage 12-Week Goals</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              
              <Link
                to="/role-bank"
                className="flex items-center justify-between w-full p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Star className="h-4 w-4 text-primary-600" />
                  <span className="text-sm font-medium text-gray-900">Add Deposit Idea</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* 12 Week Goals Detail Section */}
        {activeTwelveWeekGoals.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Target className="h-6 w-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900">Active 12-Week Goals</h2>
              </div>
              <Link
                to="/twelve-week-cycle"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Manage All Goals →
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTwelveWeekGoals.map(goal => (
                <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-gray-900 flex-1">{goal.title}</h4>
                    <span className="text-sm font-semibold text-purple-600 ml-2">{goal.progress}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Started: {goal.start_date ? new Date(goal.start_date).toLocaleDateString() : 'Not set'}
                    </span>
                    <span>
                      Ends: {goal.end_date ? new Date(goal.end_date).toLocaleDateString() : 'Not set'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-gray-600">Currently in week {stats.currentWeekNumber} of 12-week cycle</span>
              <span className="text-gray-400">Today</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Completed 3 authentic deposits this week</span>
              <span className="text-gray-400">2 hours ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Updated role relationships in Family category</span>
              <span className="text-gray-400">1 day ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-gray-600">Created new 12-week goal for Physical wellness</span>
              <span className="text-gray-400">3 days ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;