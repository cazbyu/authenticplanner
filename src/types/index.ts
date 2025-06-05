// User types
export interface User {
  id: string;
  name: string;
  email: string;
  onboardingComplete: boolean;
  paymentVerified: boolean;
}

// Onboarding types
export interface OnboardingAnswers {
  whyHere: string;
  areaOfFocus: string;
  currentChallenge: string;
}

// Role types
export interface Role {
  id: string;
  name: string;
  description: string;
  domains: WellnessDomain[];
  relationships: Relationship[];
  dateCreated: string;
}

export interface Relationship {
  id: string;
  name: string;
  roleId: string;
}

// Wellness domain types
export type WellnessDomain = 
  | 'physical'
  | 'emotional'
  | 'intellectual'
  | 'spiritual'
  | 'financial'
  | 'social'
  | 'recreational'
  | 'community';

export const WELLNESS_DOMAINS: WellnessDomain[] = [
  'physical',
  'emotional',
  'intellectual',
  'spiritual',
  'financial',
  'social',
  'recreational',
  'community'
];

export const DOMAIN_LABELS: Record<WellnessDomain, string> = {
  physical: 'Physical',
  emotional: 'Emotional',
  intellectual: 'Intellectual',
  spiritual: 'Spiritual',
  financial: 'Financial',
  social: 'Social',
  recreational: 'Recreational',
  community: 'Community'
};

// Vision and goal types
export interface Vision {
  id: string;
  statement: string;
  dateCreated: string;
}

export interface MissionStatement {
  id: string;
  statement: string;
  dateCreated: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  timeframe: 'five-year' | 'one-year' | 'twelve-week';
  domains: WellnessDomain[];
  roles: string[]; // Role IDs
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number; // 0-100
  startDate: string;
  endDate: string;
  dateCreated: string;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description: string;
  roleIds: string[];
  domains: WellnessDomain[];
  isUrgent: boolean;
  isImportant: boolean;
  isAuthenticDeposit: boolean;
  goalId?: string;
  dueDate?: string;
  duration?: number; // in minutes
  status: 'pending' | 'completed' | 'cancelled';
  dateCreated: string;
  dateCompleted?: string;
}

// Reflection types
export interface Reflection {
  id: string;
  content: string;
  roleIds: string[];
  domains: WellnessDomain[];
  date: string;
  type: 'morning' | 'evening' | 'weekly';
  needsFollowUp: boolean;
  followUpTaskId?: string;
}

// Score types
export interface DailyScore {
  id: string;
  date: string;
  taskPoints: number;
  depositPoints: number;
  domainBalance: Record<WellnessDomain, number>;
  totalScore: number;
}

export interface WeeklyScore {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  totalScore: number;
  taskPoints: number;
  depositPoints: number;
  domainBalance: Record<WellnessDomain, number>;
  tasksCompleted: number;
  depositsCompleted: number;
}