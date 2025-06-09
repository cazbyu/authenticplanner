import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import TaskForm from '../components/tasks/TaskForm';
import { format } from 'date-fns';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface WeekBoxProps {
  weekNumber: number;
  isActive?: boolean;
  onClick: () => void;
}

interface CycleData {
  reflection_end: string;
  cycle_label: string;
}

const WeekBox: React.FC<WeekBoxProps> = ({ weekNumber, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
      h-24 w-full rounded-lg border-2 transition-colors
      ${isActive 
        ? 'border-primary-500 bg-primary-50 text-primary-700' 
        : 'border-gray-200 bg-white hover:bg-gray-50'
      }
    `}
  >
    <div className="flex h-full flex-col items-center justify-center">
      <span className="text-sm font-medium text-gray-600">Week</span>
      <span className="text-xl font-bold">{weekNumber}</span>
    </div>
  </button>
);

const TwelveWeekCycle: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(8);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const [quarterlyGoal, setQuarterlyGoal] = useState('');
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchCycleData = async () => {
      const { data, error } = await supabase
        .from('0007-ap-global-cycles')
        .select('reflection_end, cycle_label')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching cycle data:', error);
        return;
      }

      setCycleData(data);
      setLoading(false);
    };

    fetchCycleData();
  }, []);

  const handleWeekSelect = (weekNum: number) => {
    setSelectedWeek(weekNum);
  };

  const handleAddTask = () => {
    setShowTaskForm(true);
  };

  const handleTaskSave = (taskData: any) => {
    console.log('Task saved:', taskData);
    setShowTaskForm(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  // Format cycle end date
  const formatCycleEndDate = (dateString?: string) => {
    if (!dateString) return 'Invalid date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return format(date, 'dd MMM yyyy');
  };

  // Calculate progress percentage
  const today = new Date();
  const cycleEndDate = cycleData ? new Date(cycleData.reflection_end) : new Date();
  const cycleStartDate = new Date(cycleEndDate);
  cycleStartDate.setDate(cycleStartDate.getDate() - (13 * 7)); // 13 weeks back from end date

  const totalDays = (cycleEndDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysElapsed = (today.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const progressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  // Format the cycle label to include "Goal 1"
  const formattedCycleLabel = cycleData?.cycle_label ? `${cycleData.cycle_label} Goal 1:` : '2025Q Goal 1:';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
          <span>Cycle Progress</span>
          <span>Ends {cycleData ? formatCycleEndDate(cycleData.reflection_end) : ''}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div 
            className="h-2 rounded-full bg-primary-500 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Goal Section */}
      <div className="mb-8">
        <div className="mb-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{formattedCycleLabel}</h2>
            <button
              className="flex items-center rounded-md bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Cycle Goal
            </button>
          </div>
          <input
            type="text"
            value={quarterlyGoal}
            onChange={(e) => setQuarterlyGoal(e.target.value)}
            placeholder="Enter your quarterly goal here..."
            className="w-full rounded-lg border border-gray-300 p-3 text-lg"
          />
          <div className="mt-2 text-sm text-gray-600">
            12 Week Goal Score: XX/XX (XXX%)
          </div>
        </div>
      </div>

      {/* Week Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <WeekBox
            key={i + 1}
            weekNumber={i + 1}
            isActive={selectedWeek === i + 1}
            onClick={() => handleWeekSelect(i + 1)}
          />
        ))}
      </div>

      {/* Reflection Week */}
      <div className="space-y-4">
        <button 
          onClick={() => handleWeekSelect(13)}
          className={`
            w-full rounded-lg border-2 p-4 text-center transition-colors
            ${selectedWeek === 13
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 bg-white hover:bg-gray-50'
            }
          `}
        >
          <span className="text-lg font-bold">Week 13 (Reflection Week)</span>
        </button>

        {/* Weekly Goal Input moved here */}
        <div className="rounded-lg border-2 border-gray-200 p-4">
          <h3 className="mb-2 text-lg font-semibold">Week {selectedWeek} Goal:</h3>
          <input
            type="text"
            value={weeklyGoal}
            onChange={(e) => setWeeklyGoal(e.target.value)}
            placeholder="Enter your weekly goal here..."
            className="w-full rounded-lg border border-gray-300 p-2"
          />
          <div className="mt-2">
            <div className="text-sm text-gray-600">
              Weekly Goal Score: XX/XX (XXX%)
            </div>
          </div>
        </div>
      </div>

      {/* Selected Week View */}
      {selectedWeek && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">Tasks (Week {selectedWeek} Goal)</h3>
            <button
              onClick={handleAddTask}
              className="flex items-center rounded-md bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Task
            </button>
          </div>

          {/* Task Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="w-16 px-3 py-2 text-left text-xs font-medium text-gray-500">Pr</th>
                  <th className="w-20 px-2 py-2 text-center text-xs font-medium text-gray-500">Complete</th>
                  <th className="w-20 px-2 py-2 text-center text-xs font-medium text-gray-500">Delegate</th>
                  <th className="w-20 px-2 py-2 text-center text-xs font-medium text-gray-500">Follow Up</th>
                  <th className="w-20 px-2 py-2 text-center text-xs font-medium text-gray-500">Cancel</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Task Description</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className="w-12 rounded border border-gray-300 px-2 py-1 text-sm"
                        placeholder="A1"
                      />
                    </td>
                    {['Complete', 'Delegate', 'Follow Up', 'Cancel'].map((action) => (
                      <td key={action} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          className="h-5 w-5 cursor-pointer rounded-full border-2 border-gray-300 checked:border-primary-500 checked:bg-primary-500"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        placeholder="Enter task description"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl">
            <TaskForm
              onSave={handleTaskSave}
              onDelete={() => setShowTaskForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TwelveWeekCycle;