import React, { useState, useEffect } from 'react';
import { Reflection } from '../types';
import { formatDate } from '../utils/helpers';
import { BookOpen, Plus, Filter } from 'lucide-react';

const Reflections: React.FC = () => {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadReflections = async () => {
      setLoading(true);
      try {
        // In a real app, fetch from your API
        await new Promise(resolve => setTimeout(resolve, 1000));
        setReflections([]);
      } catch (error) {
        console.error('Error loading reflections:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadReflections();
  }, []);
  
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent align-[-0.125em]"></div>
          <p className="mt-2 text-gray-600">Loading your reflections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Reflections</h1>
          <p className="mt-1 text-sm text-gray-600">
            Record and review your journey's meaningful moments
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button className="btn-outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </button>
          <button className="btn-primary">
            <Plus className="mr-2 h-4 w-4" />
            New Reflection
          </button>
        </div>
      </div>
      
      {reflections.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8">
          <div className="text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reflections yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first reflection.</p>
            <div className="mt-6">
              <button className="btn-primary">
                <Plus className="mr-2 h-4 w-4" />
                New Reflection
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reflections.map((reflection) => (
            <div
              key={reflection.id}
              className="card p-4 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {formatDate(reflection.date)} · {reflection.type}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-gray-900">
                    {reflection.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reflections;