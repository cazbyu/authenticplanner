import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Trophy, 
  Star, 
  Users, 
  Target, 
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  ExternalLink
} from 'lucide-react';

interface WeeklyStats {
  totalScore: number;
  authenticDeposits: {
    scheduled: number;
    completed: number;
  };
  rolesTargeted: {
    scheduled: number;
    completed: number;
  };
  domainsTargeted: {
    scheduled: number;
    completed: number;
  };
  twelveWeekGoals: Array<{
    id: string;
    title: string;
    weeklyTasksCompleted: number;
    weeklyTasksTotal: number;
    overallProgress: number;
  }>;
}

const Scorecard: React.FC = () => {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalScore: 0,
    authenticDeposits: { scheduled: 0, completed: 0 },
    rolesTargeted: { scheduled: 0, completed: 0 },
    domainsTargeted: { scheduled: 0, completed: 0 },
    twelveWeekGoals: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyStats();
  }, []);

  const fetchWeeklyStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current week's date range
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Fetch tasks for this week
      const { data: tasks } = await supabase
        .from('0007-ap-tasks')
        .select(`
          *,
          task_roles:0007-ap-task-roles!task_id(role_id, 0007-ap-roles:role_id(label))
          goal_tasks:0007-ap-task-12wkgoals(
            goal:0007-ap-goals-12wk(id, title, progress)
          )
        `)
        .eq('user_id', user.id)
        .lte('due_date', endOfWeek.toISOString().split('T')[0]);

      if (!tasks) {
        setLoading(false);
        return;
      }

      // Calculate authentic deposits
      const authenticDeposits = {
        scheduled: tasks.filter(t => t.is_authentic_deposit).length,
        completed: tasks.filter(t => t.is_authentic_deposit && t.status === 'completed').length
      };

      // Calculate roles targeted
      const rolesTargeted = {
        scheduled: tasks.filter(t => t.task_roles && t.task_roles.length > 0).length,
        completed: tasks.filter(t => t.task_roles && t.task_roles.length > 0 && t.status === 'completed').length
      };

      // Calculate domains targeted
      const domainsTargeted = {
        scheduled: tasks.filter(t => t.task_domains && t.task_domains.length > 0).length,
        completed: tasks.filter(t => t.task_domains && t.task_domains.length > 0 && t.status === 'completed').length
      };

      // Calculate 12-week goals progress
      const goalTasksMap = new Map();
      tasks.forEach(task => {
        if (task.goal_tasks && task.goal_tasks.length > 0) {
          task.goal_tasks.forEach((gt: any) => {
            if (gt.goal) {
              const goalId = gt.goal.id;
              if (!goalTasksMap.has(goalId)) {
                goalTasksMap.set(goalId, {
                  id: goalId,
                  title: gt.goal.title,
                  overallProgress: gt.goal.progress,
                  weeklyTasksTotal: 0,
                  weeklyTasksCompleted: 0
                });
              }
              const goalData = goalTasksMap.get(goalId);
              goalData.weeklyTasksTotal++;
              if (task.status === 'completed') {
                goalData.weeklyTasksCompleted++;
              }
            }
          });
        }
      });

      const twelveWeekGoals = Array.from(goalTasksMap.values());

      // Calculate total score (simplified scoring system)
      const totalScore = 
        (authenticDeposits.completed * 5) + // 5 points per authentic deposit
        (rolesTargeted.completed * 3) + // 3 points per role-targeted task
        (domainsTargeted.completed * 2) + // 2 points per domain-targeted task
        (tasks.filter(t => t.status === 'completed' && t.is_important && !t.is_urgent).length * 4) + // 4 points for important non-urgent
        (tasks.filter(t => t.status === 'completed' && t.is_urgent && t.is_important).length * 3) + // 3 points for urgent important
        (tasks.filter(t => t.status === 'completed' && t.is_urgent && !t.is_important).length * 1); // 1 point for urgent non-important

      setWeeklyStats({
        totalScore,
        authenticDeposits,
        rolesTargeted,
        domainsTargeted,
        twelveWeekGoals
      });

    } catch (error) {
      console.error('Error fetching weekly stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    scheduled: number;
    completed: number;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, scheduled, completed, icon, color }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Scheduled:</span>
          <span className="font-medium">{scheduled}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Completed:</span>
          <span className="font-medium text-green-600">{completed}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: scheduled > 0 ? `${(completed / scheduled) * 100}%` : '0%' }}
          />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* This Week's Score */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">This Week's Score</h2>
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8" />
              <span className="text-3xl font-bold">{weeklyStats.totalScore}</span>
              <span className="text-sm opacity-90">points</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">Week of</div>
            <div className="font-medium">
              {new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Authentic Deposits"
          scheduled={weeklyStats.authenticDeposits.scheduled}
          completed={weeklyStats.authenticDeposits.completed}
          icon={<Star className="h-5 w-5 text-yellow-600" />}
          color="bg-yellow-100"
        />
        
        <StatCard
          title="Roles Targeted"
          scheduled={weeklyStats.rolesTargeted.scheduled}
          completed={weeklyStats.rolesTargeted.completed}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          color="bg-blue-100"
        />
        
        <StatCard
          title="Domains Targeted"
          scheduled={weeklyStats.domainsTargeted.scheduled}
          completed={weeklyStats.domainsTargeted.completed}
          icon={<Target className="h-5 w-5 text-green-600" />}
          color="bg-green-100"
        />
      </div>

      {/* 12 Week Goals Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">12 Week Goals</h3>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        
        {weeklyStats.twelveWeekGoals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No 12-week goals with tasks this week</p>
          </div>
        ) : (
          <div className="space-y-4">
            {weeklyStats.twelveWeekGoals.map(goal => (
              <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-gray-900 flex-1">{goal.title}</h4>
                  <div className="text-right ml-4">
                    <div className="text-sm text-gray-600">Overall Progress</div>
                    <div className="font-semibold text-blue-600">{goal.overallProgress}%</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 mb-1">This Week's Tasks</div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{goal.weeklyTasksCompleted} of {goal.weeklyTasksTotal} completed</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Weekly Progress</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ 
                          width: goal.weeklyTasksTotal > 0 
                            ? `${(goal.weeklyTasksCompleted / goal.weeklyTasksTotal) * 100}%` 
                            : '0%' 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Scoreboard Link */}
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Want to see more?</h3>
        <p className="text-gray-600 mb-4">
          Explore your complete wellness balance, role relationships, and detailed progress analytics.
        </p>
        <Link
          to="/scorecard/full"
          className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <TrendingUp className="h-5 w-5 mr-2" />
          View Full Scoreboard
          <ExternalLink className="h-4 w-4 ml-2" />
        </Link>
      </div>
    </div>
  );
};

export default Scorecard;