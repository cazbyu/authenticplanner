import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Calendar, CheckCircle, Users, Target, ChevronRight,
  Star, ArrowUpRight
} from 'lucide-react';
import { Role, Task, WellnessDomain, WELLNESS_DOMAINS, DOMAIN_LABELS } from '../types';
import BalanceWheel from '../components/BalanceWheel';
import TaskCard from '../components/TaskCard';
import { calculateDomainBalance } from '../utils/helpers';
import { mockRoles, mockTasks, mockWeeklyScore } from '../data/mockData';

const Dashboard: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Domain balance data
  const [domainCounts, setDomainCounts] = useState<Record<WellnessDomain, number>>(
    WELLNESS_DOMAINS.reduce((acc, domain) => ({ ...acc, [domain]: 0 }), {} as Record<WellnessDomain, number>)
  );

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setRoles(mockRoles);
        setTasks(mockTasks);
        
        const now = new Date();
        const upcoming = mockTasks.filter(task => 
          task.status === 'pending' && 
          (!task.dueDate || new Date(task.dueDate) >= now)
        ).slice(0, 3);
        setUpcomingTasks(upcoming);
        
        const completed = mockTasks
          .filter(task => task.status === 'completed')
          .sort((a, b) => new Date(b.dateCompleted || '').getTime() - new Date(a.dateCompleted || '').getTime())
          .slice(0, 3);
        setCompletedTasks(completed);
        
        const balance = calculateDomainBalance(mockTasks);
        setDomainCounts(balance);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Calculate role touch progress
  const rolesTouched = roles.filter(role => 
    tasks.some(task => 
      task.roleIds.includes(role.id) && 
      task.status === 'completed'
    )
  ).length;
  
  const roleProgress = (rolesTouched / roles.length) * 100;

  // Calculate authentic deposits
  const authenticDeposits = tasks.filter(task => task.isAuthenticDeposit);
  const completedDeposits = authenticDeposits.filter(task => task.status === 'completed');
  const depositProgress = (completedDeposits.length / 14) * 100; // Weekly goal of 14

  // Calculate goal-focused tasks
  const goalTasks = tasks.filter(task => task.goalId);
  const completedGoalTasks = goalTasks.filter(task => task.status === 'completed');
  const goalProgress = (completedGoalTasks.length / goalTasks.length) * 100;

  // Find max domain count for relative scaling
  const maxDomainCount = Math.max(...Object.values(domainCounts));
  
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent align-[-0.125em]"></div>
          <p className="mt-2 text-gray-600">Loading your snapshot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Your Snapshot</h1>
        <div className="text-sm text-gray-500">Week of {new Date().toLocaleDateString()}</div>
      </div>
      
      {/* Top Row - Role Progress and Authentic Deposits */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Role Progress Card */}
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Role Progress</h2>
              <p className="mt-1 text-sm text-gray-500">Roles touched this week</p>
            </div>
            <div className="rounded-full bg-primary-100 p-2">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-gray-900">{rolesTouched}/{roles.length}</div>
              <div className="text-sm text-gray-500">roles</div>
            </div>
            <div className="mt-2">
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div 
                  className="h-2 rounded-full bg-primary-500 transition-all"
                  style={{ width: `${roleProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Authentic Deposits Card */}
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Authentic Deposits</h2>
              <p className="mt-1 text-sm text-gray-500">Weekly progress</p>
            </div>
            <div className="rounded-full bg-accent-100 p-2">
              <Star className="h-5 w-5 text-accent-600" />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-gray-900">{completedDeposits.length}/14</div>
              <div className="text-sm text-gray-500">deposits</div>
            </div>
            <div className="mt-2">
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div 
                  className="h-2 rounded-full bg-accent-500 transition-all"
                  style={{ width: `${depositProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Domain Balance and Goal Progress */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Domain Balance Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Domain Balance</h2>
            <Link to="/scorecard" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              View details
              <ArrowUpRight className="ml-1 inline h-4 w-4" />
            </Link>
          </div>
          
          <div className="mt-4 space-y-3">
            {WELLNESS_DOMAINS.map(domain => (
              <div key={domain} className="flex items-center">
                <span className="w-24 text-sm font-medium text-gray-600">
                  {DOMAIN_LABELS[domain]}
                </span>
                <div className="flex-1">
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div 
                      className={`h-2 rounded-full bg-${domain}`}
                      style={{ 
                        width: `${(domainCounts[domain] / maxDomainCount) * 100}%`,
                        transition: 'width 0.3s ease-in-out'
                      }}
                    />
                  </div>
                </div>
                <span className="ml-2 text-sm text-gray-600">
                  {domainCounts[domain]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Goal Progress Card */}
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Goal-Focused Tasks</h2>
              <p className="mt-1 text-sm text-gray-500">Progress on goal-aligned tasks</p>
            </div>
            <div className="rounded-full bg-secondary-100 p-2">
              <Target className="h-5 w-5 text-secondary-600" />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-gray-900">
                {completedGoalTasks.length}/{goalTasks.length}
              </div>
              <div className="text-sm text-gray-500">tasks completed</div>
            </div>
            <div className="mt-2">
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div 
                  className="h-2 rounded-full bg-secondary-500 transition-all"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <Link 
              to="/strategic-goals"
              className="text-sm font-medium text-secondary-600 hover:text-secondary-700"
            >
              View all goals
              <ArrowUpRight className="ml-1 inline h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;