import { lazy } from 'react';
import {
  Home,
  Calendar,
  Clock,
  Users,
  Compass,
  BookOpen,
  Settings,
  Briefcase,
  Target,
  BarChart3
} from 'lucide-react';

// --- Lazy Load Drawer Components ---
// This improves initial load time by only fetching the code for a drawer when it's opened.
const Tasks = lazy(() => import('../pages/Tasks'));
const StrategicGoals = lazy(() => import('../pages/StrategicGoals'));
const Reflections = lazy(() => import('../pages/Reflections'));
const Scorecard = lazy(() => import('../pages/Scorecard'));

/**
 * Defines the navigation items for the main sidebar.
 */
export const mainNavItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Authentic Calendar', path: '/calendar', icon: Calendar },
  { name: '12 Week Cycle', path: '/twelve-week-cycle', icon: Clock },
  { name: 'Role Bank', path: '/role-bank', icon: Users },
  { name: 'Domain Dashboard', path: '/domains', icon: Compass },
  { name: 'Reflections', path: '/reflections', icon: BookOpen },
  { name: 'Settings', path: '/settings', icon: Settings },
];

/**
 * Defines the navigation items for the "Floating Dresser" drawer.
 */
export const drawerNavItems = [
  {
    id: 'tasks',
    title: 'Tasks',
    icon: Briefcase,
    component: Tasks
  },
  {
    id: 'goals',
    title: 'Strategic Goals',
    icon: Target,
    component: StrategicGoals
  },
  {
    id: 'reflections',
    title: 'Reflections',
    icon: BookOpen,
    component: Reflections
  },
  {
    id: 'scorecard',
    title: 'Scorecard',
    icon: BarChart3,
    component: Scorecard
  }
];
