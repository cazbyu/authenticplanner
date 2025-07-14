import React from 'react';
import { useParams, Link } from 'react-router-dom';
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
  CheckCircle,
  TrendingUp,
  Calendar,
  Plus
} from 'lucide-react';

const DOMAIN_CONFIG = {
  physical: {
    name: 'Physical',
    description: 'Health, fitness, nutrition, and physical well-being',
    icon: Dumbbell,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  emotional: {
    name: 'Emotional',
    description: 'Mental health, stress management, and emotional intelligence',
    icon: Heart,
    color: 'bg-pink-500',
    lightColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200'
  },
  intellectual: {
    name: 'Intellectual',
    description: 'Learning, creativity, and cognitive development',
    icon: Brain,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  spiritual: {
    name: 'Spiritual',
    description: 'Purpose, meaning, values, and spiritual practices',
    icon: Sparkles,
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200'
  },
  financial: {
    name: 'Financial',
    description: 'Money management, investments, and financial security',
    icon: DollarSign,
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  social: {
    name: 'Social',
    description: 'Relationships, communication, and social connections',
    icon: Users,
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  },
  recreational: {
    name: 'Recreational',
    description: 'Hobbies, entertainment, and leisure activities',
    icon: Gamepad2,
    color: 'bg-teal-500',
    lightColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200'
  },
  community: {
    name: 'Community',
    description: 'Civic engagement, volunteering, and community involvement',
    icon: Building,
    color: 'bg-red-500',
    lightColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200'
  }
};

const DomainDetail: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  
  if (!domainId || !DOMAIN_CONFIG[domainId as keyof typeof DOMAIN_CONFIG]) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 md:px-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Domain Not Found</h1>
          <p className="text-gray-600 mb-6">The requested wellness domain could not be found.</p>
          <Link
            to="/domains"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Domain Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const domain = DOMAIN_CONFIG[domainId as keyof typeof DOMAIN_CONFIG];
  const IconComponent = domain.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/domains"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Domain Dashboard
        </Link>
        
        <div className="flex items-center space-x-4 mb-4">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl ${domain.color} text-white`}>
            <IconComponent className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{domain.name} Wellness</h1>
            <p className="text-lg text-gray-600 mt-1">{domain.description}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className={`${domain.lightColor} ${domain.borderColor} border-2 rounded-xl p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Score</p>
              <p className={`text-2xl font-bold ${domain.textColor}`}>7.2</p>
            </div>
            <TrendingUp className={`h-8 w-8 ${domain.textColor}`} />
          </div>
        </div>
        
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Goals</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
            <Target className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
            </div>
            <Calendar className="h-8 w-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Goals Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Active Goals</h2>
            <button className="inline-flex items-center px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
              <Plus className="h-4 w-4 mr-1" />
              Add Goal
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Sample Goal for {domain.name}</h3>
              <p className="text-sm text-gray-600 mb-3">This is a placeholder goal related to {domain.name.toLowerCase()} wellness.</p>
              <div className="flex items-center justify-between">
                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                  <div className={`${domain.color} h-2 rounded-full`} style={{ width: '65%' }}></div>
                </div>
                <span className="text-sm text-gray-600">65%</span>
              </div>
            </div>
            
            <div className="text-center py-8 text-gray-500">
              <Target className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm">No additional goals yet.</p>
              <p className="text-xs text-gray-400 mt-1">Create goals specific to your {domain.name.toLowerCase()} wellness journey.</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className={`w-2 h-2 rounded-full ${domain.color} mt-2`}></div>
              <div>
                <p className="text-sm text-gray-900">Completed task related to {domain.name.toLowerCase()} wellness</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-gray-300 mt-2"></div>
              <div>
                <p className="text-sm text-gray-900">Updated {domain.name.toLowerCase()} goal progress</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
            
            <div className="text-center py-8 text-gray-500">
              <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm">Activity tracking coming soon.</p>
              <p className="text-xs text-gray-400 mt-1">Your {domain.name.toLowerCase()} wellness activities will appear here.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Notice */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <IconComponent className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Domain Dashboard - Coming Soon</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                This is a placeholder page for the <strong>{domain.name}</strong> wellness domain. 
                Future features will include:
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Detailed progress tracking and analytics</li>
                <li>Domain-specific goal management</li>
                <li>Task filtering and organization</li>
                <li>Wellness insights and recommendations</li>
                <li>Integration with your 12-week goals</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainDetail;