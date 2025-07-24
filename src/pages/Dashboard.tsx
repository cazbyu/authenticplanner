import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar,
  Users,
  CheckSquare,
  BarChart3,
  ArrowRight,
  Clock,
  Target,
  Star,
  Plus,
  TrendingUp
} from 'lucide-react';

// --- Type Definitions ---

interface DashboardStats {
  activeTasks: number;
  urgentTasks: number;
  completedThisWeek: number;
  activeRoles: number;
}

interface QuickTask {
  id: string;
  title: string;
  'is-urgent': boolean;
  'is-important': boolean;
}

interface UpcomingEvent {
  id: string;
  title: string;
  'start-time': string;
}

interface TwelveWeekGoal {
  id: string;
  title: string;
  progress: number;
}


// --- Sub-Components ---

/**
 * A reusable card for displaying a key statistic.
 */
const StatCard = ({ title, value, icon: Icon, detail }: { title: string, value: string | number, icon: React.ElementType, detail?: string }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <Icon className="h-8 w-8 text-gray-400" />
    </div>
    {detail && <p className="text-xs text-gray-500 mt-2">{detail}</p>}
  </div>
);

/**
 * A generic wrapper for dashboard widgets.
 */
const DashboardCard = ({ title, linkTo, children }: { title: string, linkTo: string, children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <Link to={linkTo} className="text-sm font-medium text-primary-600 hover:underline">View all</Link>
        </div>
        <div className="flex-1">
            {children}
        </div>
    </div>
);


// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [quickTasks, setQuickTasks] = useState<QuickTask[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [activeGoals, setActiveGoals] = useState<TwelveWeekGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  /**
   * Fetches all necessary data for the dashboard in parallel.
   */
  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Define date range for "this week"
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);

      const [
        tasksRes,
        rolesRes,
        goalsRes
      ] = await Promise.all([
        // Fetch all tasks (events and tasks)
        supabase
          .from('0004-ap-tasks')
          .select('id, title, is-urgent, is-important, status, start-time, completed-at')
          .eq('user-id', user.id),
        // Fetch active roles
        supabase
          .from('0004-ap-roles')
          .select('id', { count: 'exact' })
          .eq('user-id', user.id)
          .eq('is-active', true),
        // Fetch active 12-week goals
        supabase
            .from('0004-ap-goals')
            .select('id, title, progress')
            .eq('user-id', user.id)
            .eq('type', 'twelve_week')
            .eq('status', 'active')
            .limit(5)
      ]);
      
      const allTasks = tasksRes.data || [];

      // --- Process Data ---

      // Filter for active tasks
      const activeTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
      
      // Filter for upcoming events (in the next 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const upcoming = allTasks
        .filter(t => t['start-time'] && new Date(t['start-time']) > new Date() && new Date(t['start-time']) < sevenDaysFromNow)
        .sort((a, b) => new Date(a['start-time']!).getTime() - new Date(b['start-time']!).getTime())
        .slice(0, 3);
      setUpcomingEvents(upcoming);

      // Get top 5 priority tasks
      const priorityTasks = [...activeTasks]
        .sort((a, b) => (b['is-urgent'] ? 2 : 0) + (b['is-important'] ? 1 : 0) - ((a['is-urgent'] ? 2 : 0) + (a['is-important'] ? 1 : 0)))
        .slice(0, 5);
      setQuickTasks(priorityTasks);

      // Set active goals
      setActiveGoals(goalsRes.data || []);

      // Calculate stats
      setStats({
        activeTasks: activeTasks.length,
        urgentTasks: activeTasks.filter(t => t['is-urgent']).length,
        completedThisWeek: allTasks.filter(t => t.status === 'completed' && t['completed-at'] && new Date(t['completed-at']) >= startOfWeek).length,
        activeRoles: rolesRes.count || 0,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-lg text-gray-600 mt-1">
            Here's your authentic journey overview for today.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Active Tasks" value={stats?.activeTasks || 0} icon={CheckSquare} detail={`${stats?.urgentTasks || 0} urgent`} />
          <StatCard title="Completed This Week" value={stats?.completedThisWeek || 0} icon={TrendingUp} />
          <StatCard title="Active Roles" value={stats?.activeRoles || 0} icon={Users} />
          <StatCard title="Upcoming Events" value={upcomingEvents.length} icon={Calendar} detail="In next 7 days" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <DashboardCard title="Priority Tasks" linkTo="/calendar">
                {quickTasks.length > 0 ? (
                    <ul className="space-y-3">
                        {quickTasks.map(task => (
                            <li key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    {task['is-urgent'] && <div className="w-2 h-2 rounded-full bg-red-500" title="Urgent"></div>}
                                    {task['is-important'] && <div className="w-2 h-2 rounded-full bg-blue-500" title="Important"></div>}
                                    <p className="text-sm font-medium text-gray-800">{task.title}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-gray-500">No active tasks. Great job!</p>}
            </DashboardCard>
            <DashboardCard title="Upcoming Events" linkTo="/calendar">
                {upcomingEvents.length > 0 ? (
                     <ul className="space-y-3">
                        {upcomingEvents.map(event => (
                            <li key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-800">{event.title}</p>
                                <p className="text-xs text-gray-500">{new Date(event['start-time']).toLocaleString([], {month: 'short', day: 'numeric', hour: 'numeric', minute:'2-digit'})}</p>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-gray-500">No events scheduled in the next 7 days.</p>}
            </DashboardCard>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <DashboardCard title="12-Week Goals" linkTo="/twelve-week-cycle">
                {activeGoals.length > 0 ? (
                    <ul className="space-y-3">
                        {activeGoals.map(goal => (
                             <li key={goal.id} className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-800 mb-2">{goal.title}</p>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-primary-600 h-1.5 rounded-full" style={{width: `${goal.progress || 0}%`}}></div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-gray-500">No active 12-week goals.</p>}
            </DashboardCard>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                    <Link to="/calendar" className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <span className="text-sm font-medium text-gray-800">Add New Task</span>
                        <Plus className="h-4 w-4 text-gray-500" />
                    </Link>
                    <Link to="/role-bank" className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <span className="text-sm font-medium text-gray-800">Add Deposit Idea</span>
                        <Star className="h-4 w-4 text-gray-500" />
                    </Link>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
