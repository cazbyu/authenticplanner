import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  ArrowLeft,
  Heart, 
  Brain, 
  Dumbbell, 
  Sparkles, 
  DollarSign, 
  Users, 
  Gamepad2, 
  Building,
  Target,
  TrendingUp,
  BarChart3,
  UserCheck
} from 'lucide-react';

interface WellnessDomain {
  id: string;
  name: string;
  score: number;
  tasksCompleted: number;
  tasksTotal: number;
}

interface BalanceWheelData {
  domains: WellnessDomain[];
}

const DOMAIN_CONFIG = {
  Physical: { icon: Dumbbell, color: '#3B82F6' },
  Emotional: { icon: Heart, color: '#EC4899' },
  Intellectual: { icon: Brain, color: '#8B5CF6' },
  Spiritual: { icon: Sparkles, color: '#A78BFA' },
  Financial: { icon: DollarSign, color: '#10B981' },
  Social: { icon: Users, color: '#F59E0B' },
  Recreational: { icon: Gamepad2, color: '#6366F1' },
  Community: { icon: Building, color: '#EF4444' }
};

const FullScorecard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'wellness' | 'roles' | 'goals' | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceWheelData>({ domains: [] });
  const [loading, setLoading] = useState(false);

  const fetchWellnessBalance = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all domains
      const { data: domains } = await supabase
        .from('0007-ap-domains')
        .select('id, name');

      if (!domains) return;

      // Get tasks for the last 30 days with domain relationships
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: tasks } = await supabase
        .from('0007-ap-tasks')
        .select(`
          *,
          task_domains:0007-ap-task-domains(
            domain:0007-ap-domains(id, name)
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Calculate scores for each domain
      const domainScores = domains.map(domain => {
        const domainTasks = tasks?.filter(task => 
          task.task_domains?.some((td: any) => td.domain?.name === domain.name)
        ) || [];

        const completedTasks = domainTasks.filter(task => task.status === 'completed');
        const score = domainTasks.length > 0 ? Math.round((completedTasks.length / domainTasks.length) * 100) : 0;

        return {
          id: domain.id,
          name: domain.name,
          score,
          tasksCompleted: completedTasks.length,
          tasksTotal: domainTasks.length
        };
      });

      setBalanceData({ domains: domainScores });
    } catch (error) {
      console.error('Error fetching wellness balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const BalanceWheel: React.FC = () => {
    const centerX = 150;
    const centerY = 150;
    const radius = 120;
    const domains = balanceData.domains;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Wellness Balance Wheel</h3>
        
        <div className="flex justify-center mb-6">
          <svg width="300" height="300" className="transform -rotate-90">
            {/* Background circles */}
            {[20, 40, 60, 80, 100].map(percent => (
              <circle
                key={percent}
                cx={centerX}
                cy={centerY}
                r={(radius * percent) / 100}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            ))}
            
            {/* Domain segments */}
            {domains.map((domain, index) => {
              const angle = (360 / domains.length) * index;
              const nextAngle = (360 / domains.length) * (index + 1);
              const config = DOMAIN_CONFIG[domain.name as keyof typeof DOMAIN_CONFIG];
              
              if (!config) return null;
              
              const scoreRadius = (radius * domain.score) / 100;
              
              // Calculate path for the segment
              const startAngleRad = (angle * Math.PI) / 180;
              const endAngleRad = (nextAngle * Math.PI) / 180;
              
              const x1 = centerX + Math.cos(startAngleRad) * scoreRadius;
              const y1 = centerY + Math.sin(startAngleRad) * scoreRadius;
              const x2 = centerX + Math.cos(endAngleRad) * scoreRadius;
              const y2 = centerY + Math.sin(endAngleRad) * scoreRadius;
              
              const largeArcFlag = (nextAngle - angle) > 180 ? 1 : 0;
              
              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${scoreRadius} ${scoreRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              return (
                <path
                  key={domain.id}
                  d={pathData}
                  fill={config.color}
                  fillOpacity="0.7"
                  stroke={config.color}
                  strokeWidth="2"
                />
              );
            })}
            
            {/* Center circle */}
            <circle
              cx={centerX}
              cy={centerY}
              r="8"
              fill="#374151"
            />
          </svg>
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-3">
          {domains.map(domain => {
            const config = DOMAIN_CONFIG[domain.name as keyof typeof DOMAIN_CONFIG];
            if (!config) return null;
            
            const IconComponent = config.icon;
            
            return (
              <div key={domain.id} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900 truncate">{domain.name}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {domain.score}% ({domain.tasksCompleted}/{domain.tasksTotal})
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const RolesAndRelationships: React.FC = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Roles and Relationships</h3>
      <div className="text-center py-12 text-gray-500">
        <UserCheck className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">Roles & Relationships Analytics</p>
        <p className="text-sm">
          Detailed analysis of your role performance and relationship investments coming soon.
        </p>
      </div>
    </div>
  );

  const GoalsAndProgress: React.FC = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Goals and Progress</h3>
      <div className="text-center py-12 text-gray-500">
        <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">Goals & Progress Analytics</p>
        <p className="text-sm">
          Comprehensive goal tracking and progress analytics coming soon.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Full Scoreboard</h1>
          <p className="text-lg text-gray-600">
            Comprehensive analytics for your wellness balance, roles, and goals
          </p>
        </div>

        {/* Section Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => {
              setActiveSection('wellness');
              fetchWellnessBalance();
            }}
            className={`p-6 rounded-lg border-2 transition-all duration-200 text-left ${
              activeSection === 'wellness'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Wellness Domains & Balance</h3>
            </div>
            <p className="text-sm text-gray-600">
              View your balance wheel and domain-specific performance metrics
            </p>
          </button>

          <button
            onClick={() => setActiveSection('roles')}
            className={`p-6 rounded-lg border-2 transition-all duration-200 text-left ${
              activeSection === 'roles'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Roles and Relationships</h3>
            </div>
            <p className="text-sm text-gray-600">
              Analyze your role performance and relationship investments
            </p>
          </button>

          <button
            onClick={() => setActiveSection('goals')}
            className={`p-6 rounded-lg border-2 transition-all duration-200 text-left ${
              activeSection === 'goals'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Goals and Progress</h3>
            </div>
            <p className="text-sm text-gray-600">
              Track your goal achievement and progress over time
            </p>
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-96">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
            </div>
          )}

          {!loading && activeSection === 'wellness' && <BalanceWheel />}
          {!loading && activeSection === 'roles' && <RolesAndRelationships />}
          {!loading && activeSection === 'goals' && <GoalsAndProgress />}

          {!loading && !activeSection && (
            <div className="text-center py-12 text-gray-500">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose a Section</h3>
              <p className="text-gray-600">
                Select one of the sections above to view detailed analytics and insights.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullScorecard;