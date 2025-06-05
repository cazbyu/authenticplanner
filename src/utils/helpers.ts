import { format, startOfWeek, endOfWeek, addDays, parseISO, isValid } from 'date-fns';
import { Task, WellnessDomain, WELLNESS_DOMAINS } from '../types';

// Format date to display format
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(parsedDate)) return '';
  
  return format(parsedDate, 'MMM d, yyyy');
};

// Format time to display format
export const formatTime = (date: string | Date): string => {
  if (!date) return '';
  
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(parsedDate)) return '';
  
  return format(parsedDate, 'h:mm a');
};

// Get current week dates
export const getCurrentWeekDates = () => {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 }); // Start on Monday
  
  return {
    start,
    end: endOfWeek(now, { weekStartsOn: 1 }),
    days: Array.from({ length: 7 }, (_, i) => addDays(start, i))
  };
};

// Calculate task score based on the authentic planner system
export const calculateTaskScore = (task: Task): number => {
  if (task.status !== 'completed') return 0;
  
  if (task.isAuthenticDeposit) return 5;
  
  if (task.isImportant && !task.isUrgent) return 4;
  if (task.isImportant && task.isUrgent) return 3;
  if (!task.isImportant && task.isUrgent) return 1;
  return 0.5; // Not important, not urgent
};

// Calculate wellness domain balance
export const calculateDomainBalance = (tasks: Task[]): Record<WellnessDomain, number> => {
  const domainCounts: Record<WellnessDomain, number> = {
    physical: 0,
    emotional: 0,
    intellectual: 0,
    spiritual: 0,
    financial: 0,
    social: 0,
    recreational: 0,
    community: 0
  };
  
  const completedTasks = tasks.filter(task => task.status === 'completed');
  
  completedTasks.forEach(task => {
    task.domains.forEach(domain => {
      domainCounts[domain] += 1;
    });
  });
  
  return domainCounts;
};

// Generate a random ID (for demo purposes)
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Get color class for wellness domain
export const getDomainColorClass = (domain: WellnessDomain, type: 'bg' | 'text' | 'border' = 'bg'): string => {
  return `${type}-${domain}`;
};

// Group tasks by date
export const groupTasksByDate = (tasks: Task[]): Record<string, Task[]> => {
  return tasks.reduce((acc, task) => {
    if (!task.dueDate) return acc;
    
    const dateKey = task.dueDate.split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, Task[]>);
};

// Calculate total points for a week
export const calculateWeeklyPoints = (tasks: Task[]): number => {
  return tasks.reduce((total, task) => total + calculateTaskScore(task), 0);
};