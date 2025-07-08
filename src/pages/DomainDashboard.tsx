import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Brain, 
  Dumbbell, 
  Sparkles, 
  DollarSign, 
  Users, 
  Gamepad2, 
  Building,
  ArrowRight,
  BarChart3
} from 'lucide-react';

const WELLNESS_DOMAINS = [
  {
    id: 'physical',
    name: 'Physical',
    description: 'Health, fitness, nutrition, and physical well-being',
    icon: Dumbbell,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  {
    id: 'emotional',
    name: 'Emotional',
    description: 'Mental health, stress management, and emotional intelligence',
    icon: Heart,
    color: 'bg-pink-500',
    lightColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200'
  },
  {
    id: 'intellectual',
    name: 'Intellectual',
    description: 'Learning, creativity, and cognitive development',
    icon: Brain,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  {
    id: 'spiritual',
    name: 'Spiritual',
    description: 'Purpose, meaning, values, and spiritual practices',
    icon: Sparkles,
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200'
  },
  {
    id: 'financial',
    name: 'Financial',
    description: 'Money management, investments, and financial security',
    icon: DollarSign,
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  {
    id: 'social',
    name: 'Social',
    description: 'Relationships, communication, and social connections',
    icon: Users,
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  },
  {
    id: 'recreational',
    name: 'Recreational',
    description: 'Hobbies, entertainment, and leisure activities',
    icon: Gamepad2,
    color: 'bg-teal-500',
    lightColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200'
  },
  {
    id: 'community',
    name: 'Community',
    description: 'Civic engagement, volunteering, and community involvement',
    icon: Building,
    color: 'bg-red-500',
    lightColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200'
  }
];

const DomainDashboard: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 md:px-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Wellness Domain Dashboard</h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Explore and manage your progress across the 8 domains of personal wellness. 
          Each domain represents a key area of life balance and authentic living.
        </p>
      </div>

      {/* Domain Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {WELLNESS_DOMAINS.map((domain) => {
          const IconComponent = domain.icon;
          
          return (
            <Link
              key={domain.id}
              to={`/domains/${domain.id}`}
              className="group block"
            >
              <div className={`
                relative overflow-hidden rounded-xl border-2 ${domain.borderColor} ${domain.lightColor} 
                p-6 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1
                cursor-pointer
              `}>
                {/* Icon */}
                <div className={`
                  inline-flex items-center justify-center w-12 h-12 rounded-lg ${domain.color} 
                  text-white mb-4 group-hover:scale-110 transition-transform duration-300
                `}>
                  <IconComponent className="h-6 w-6" />
                </div>

                {/* Content */}
                <h3 className={`text-lg font-semibold ${domain.textColor} mb-2 group-hover:text-gray-900 transition-colors`}>
                  {domain.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {domain.description}
                </p>

                {/* Arrow indicator */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Explore Domain</span>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" />
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Stats Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Domain Balance Overview</h2>
          </div>
          <span className="text-sm text-gray-500">Last 30 days</span>
        </div>

        {/* Placeholder stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">6.2</div>
            <div className="text-sm text-gray-600">Average Balance</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">3</div>
            <div className="text-sm text-gray-600">Strong Domains</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">4</div>
            <div className="text-sm text-gray-600">Developing</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">1</div>
            <div className="text-sm text-gray-600">Needs Attention</div>
          </div>
        </div>
      </div>

      {/* Navigation hint */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Click on any domain above to explore detailed insights, goals, and tasks for that area of wellness.
        </p>
      </div>
    </div>
  );
};

export default DomainDashboard;