import React from 'react';

const OnboardingTasks = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Set Your Initial Tasks</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-6">
          Let's break down your goals into actionable tasks. What are the first steps you need to take?
        </p>
        {/* Task creation form would go here */}
        <div className="space-y-4">
          <p className="text-gray-500 italic">
            Task creation interface will be implemented based on specific requirements
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTasks;