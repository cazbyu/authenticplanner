import { Role, Task, WeeklyScore, WellnessDomain } from '../types';
import { addDays, subDays, format } from 'date-fns';

// Helper to generate dates
const today = new Date();
const formatDate = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");

// Mock roles
export const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Parent',
    description: 'Nurturing and guiding my children',
    domains: ['emotional', 'social'],
    relationships: [
      { id: '1', name: 'Child 1', roleId: '1' },
      { id: '2', name: 'Child 2', roleId: '1' }
    ],
    dateCreated: formatDate(subDays(today, 30))
  },
  {
    id: '2',
    name: 'Professional',
    description: 'Career growth and contributions',
    domains: ['intellectual', 'financial'],
    relationships: [
      { id: '3', name: 'Manager', roleId: '2' },
      { id: '4', name: 'Team Member 1', roleId: '2' },
      { id: '5', name: 'Team Member 2', roleId: '2' }
    ],
    dateCreated: formatDate(subDays(today, 30))
  },
  {
    id: '3',
    name: 'Health Seeker',
    description: 'Physical and mental well-being',
    domains: ['physical', 'emotional'],
    relationships: [
      { id: '6', name: 'Fitness Coach', roleId: '3' }
    ],
    dateCreated: formatDate(subDays(today, 25))
  },
  {
    id: '4',
    name: 'Community Member',
    description: 'Contributing to my local community',
    domains: ['community', 'social'],
    relationships: [
      { id: '7', name: 'Neighbor 1', roleId: '4' },
      { id: '8', name: 'Neighbor 2', roleId: '4' }
    ],
    dateCreated: formatDate(subDays(today, 20))
  },
  {
    id: '5',
    name: 'Learner',
    description: 'Continuous growth and education',
    domains: ['intellectual', 'spiritual'],
    relationships: [],
    dateCreated: formatDate(subDays(today, 15))
  }
];

// Mock tasks
export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Family dinner and game night',
    description: 'Quality time with the family playing board games',
    roleIds: ['1'],
    domains: ['emotional', 'social'],
    isUrgent: false,
    isImportant: true,
    isAuthenticDeposit: true,
    dueDate: formatDate(addDays(today, 1)),
    duration: 120,
    status: 'pending',
    dateCreated: formatDate(subDays(today, 7))
  },
  {
    id: '2',
    title: 'Prepare quarterly presentation',
    description: 'Finalize slides and talking points for team presentation',
    roleIds: ['2'],
    domains: ['intellectual', 'financial'],
    isUrgent: true,
    isImportant: true,
    isAuthenticDeposit: false,
    dueDate: formatDate(addDays(today, 2)),
    duration: 90,
    status: 'pending',
    dateCreated: formatDate(subDays(today, 5))
  },
  {
    id: '3',
    title: 'Morning jog and meditation',
    description: '30-minute jog followed by 10 minutes of meditation',
    roleIds: ['3'],
    domains: ['physical', 'spiritual'],
    isUrgent: false,
    isImportant: true,
    isAuthenticDeposit: true,
    dueDate: formatDate(today),
    duration: 40,
    status: 'completed',
    dateCreated: formatDate(subDays(today, 1)),
    dateCompleted: formatDate(today)
  },
  {
    id: '4',
    title: 'Neighborhood cleanup volunteer',
    description: 'Join community effort to clean local park',
    roleIds: ['4'],
    domains: ['community', 'physical'],
    isUrgent: false,
    isImportant: true,
    isAuthenticDeposit: true,
    dueDate: formatDate(addDays(today, 4)),
    duration: 180,
    status: 'pending',
    dateCreated: formatDate(subDays(today, 10))
  },
  {
    id: '5',
    title: 'Read chapter from personal development book',
    description: 'Continue progress on current book',
    roleIds: ['5'],
    domains: ['intellectual', 'spiritual'],
    isUrgent: false,
    isImportant: true,
    isAuthenticDeposit: true,
    status: 'completed',
    dateCreated: formatDate(subDays(today, 3)),
    dateCompleted: formatDate(subDays(today, 1))
  },
  {
    id: '6',
    title: 'Help kids with homework',
    description: 'Math and science homework assistance',
    roleIds: ['1'],
    domains: ['emotional', 'intellectual'],
    isUrgent: true,
    isImportant: true,
    isAuthenticDeposit: false,
    status: 'completed',
    dateCreated: formatDate(subDays(today, 2)),
    dateCompleted: formatDate(subDays(today, 2))
  },
  {
    id: '7',
    title: 'Respond to urgent client emails',
    description: 'Address concerns from key accounts',
    roleIds: ['2'],
    domains: ['financial'],
    isUrgent: true,
    isImportant: false,
    isAuthenticDeposit: false,
    status: 'pending',
    dateCreated: formatDate(today)
  },
  {
    id: '8',
    title: 'Schedule annual physical checkup',
    description: 'Call doctor office to set appointment',
    roleIds: ['3'],
    domains: ['physical'],
    isUrgent: false,
    isImportant: true,
    isAuthenticDeposit: false,
    status: 'pending',
    dateCreated: formatDate(subDays(today, 5))
  }
];

// Mock weekly score
export const mockWeeklyScore: WeeklyScore = {
  id: '1',
  weekStartDate: formatDate(subDays(today, 7)),
  weekEndDate: formatDate(today),
  totalScore: 42,
  taskPoints: 27,
  depositPoints: 15,
  domainBalance: {
    physical: 3,
    emotional: 2,
    intellectual: 4,
    spiritual: 1,
    financial: 2,
    social: 3,
    recreational: 1,
    community: 2
  },
  tasksCompleted: 9,
  depositsCompleted: 3
};

// Mock domain counts for the balance wheel
export const mockDomainCounts: Record<WellnessDomain, number> = {
  physical: 3,
  emotional: 2,
  intellectual: 4,
  spiritual: 1,
  financial: 2,
  social: 3,
  recreational: 1,
  community: 2
};