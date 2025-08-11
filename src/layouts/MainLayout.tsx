// MainLayout.tsx
import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Menu, Home, Calendar, Settings, Users, Compass, Clock,
  Target, BookOpen, BarChart3, Briefcase, Archive, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.svg';
import { useAuth } from './contexts/AuthContext';

// Drawer content components
import StrategicGoals from './pages/StrategicGoals';
import Reflections from './pages/Reflections';
import Scorecard from './pages/Scorecard';
import Tasks from './pages/Tasks';

const drawerItems = [
  { id: 'tasks',       title: 'Tasks',           description: 'View and manage your tasks',            icon: Briefcase, component: Tasks },
  { id: 'goals',       title: 'Strategic Goals', description: 'Review your mission, vision, and goals', icon: Target,   component: StrategicGoals },
  { id: 'reflections', title: 'Reflections',     description: 'View your task-related notes',           icon: BookOpen, component: Reflections },
  { id: 'scorecard',   title: 'Scorecard',       description: 'Track your balance and progress',        icon: BarChart3,component: Scorecard },
];

const navItems = [
  { name: 'Dashboard',          path: '/',                   icon: Home },
  { name: 'Authentic Calendar', path: '/calendar',           icon: Calendar },
  { name: '12 Week Cycle',      path: '/twelve-week-cycle',  icon: Clock },
  { name: 'Role Bank',          path: '/role-bank',          icon: Users },
  { name: 'Domain Dashboard',   path: '/domains',            icon: Compass },
  { name: 'Notes & Follow Up',  path: '/notes',              icon: BookOpen },
  { name: 'Settings',           path: '/settings',           icon: Settings },
];

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dresserOpen, setDresserOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [dresserPosition, setDresserPosition] = useState({ x: 0, y: 0 });
  const location = useLocation();

  const toggleSidebar = () => setSidebarCollapsed((s) => !s);

  const handleDrawerSelect = (drawer: string) => {
    setActiveDrawer((curr) => (curr === drawer ? null : drawer));
    setDresserOpen(true);
  };

  const handleDresserDragEnd = (_e: any, info: any) => {
    setDresserPosition({ x: info.point.x, y: info.point.y });
  };

  const ActiveDrawerComponent =
    activeDrawer ? drawerItems.find((item) => item.id === activeDrawer)?.component : null;

  return (
    <div className="min-h-screen h-full flex flex-col bg-gray-50">
      {/* Header - always visible */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white px-4 shadow-sm md:px-6">
        <button
          onClick={toggleSidebar}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
          title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-2">
          <img src={logo} alt="Authentic Planner" className="h-8 w-8" />
          <span className="text-lg font-bold text-primary-600">Authentic Planner</span>
        </div>
      </header>

      {/* Left Sidebar - always mounted; collapses from 64 to 16 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transition-all duration-300 flex flex-col
        ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Spacer for header height */}
        <div className="h-16" />

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                  ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-100'}
                  ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                title={item.name}
              >
                <ItemIcon className="h-5 w-5" />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info & Sign out */}
        <div className={`border-t border-gray-200 p-4 ${sidebarCollapsed ? 'px-1' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
              {user?.name?.charAt(0) || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                <p className="truncate text-xs text-gray-500">{user?.email || ''}</p>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className={`mt-3 w-full flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50
              ${sidebarCollapsed ? 'px-2' : ''}`}
          >
            <ChevronRight className="h-4 w-4" />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content pushed by sidebar width */}
      <main
        className={`flex-1 flex flex-col min-h-0 h-full overflow-hidden transition-all duration-300
        ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}
      >
        <Outlet />
      </main>

      {/* GLOBAL FLOATING DRESSER - Desktop */}
      <div className="fixed top-1/2 right-0 -translate-y-1/2 z-30 hidden lg:block">
        <div className="bg-white border-l border-t border-b border-gray-200 rounded-l-lg shadow-lg overflow-hidden">
          <div className="flex flex-col">
            {drawerItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeDrawer === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleDrawerSelect(item.id)}
                  className={`group relative p-3 border-b border-gray-100 last:border-b-0 transition-all duration-200 overflow-hidden
                    ${isActive ? 'bg-blue-50 text-blue-600 border-r-3 border-r-blue-600 shadow-sm'
                               : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  title={item.title}
                  aria-label={item.title}
                >
                  <IconComponent className="h-5 w-5" />
                  {!isActive && (
                    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                      <div className="bg-gray-900 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap shadow-lg">
                        {item.title}
                        <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* GLOBAL FLOATING DRESSER - Mobile */}
      <div className="fixed bottom-4 right-4 z-30 lg:hidden">
        {!dresserOpen ? (
          <button
            onClick={() => setDresserOpen(true)}
            className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            aria-label="Open navigation"
          >
            <Archive className="h-6 w-6" />
          </button>
        ) : (
          <motion.div
            drag
            dragMomentum={false}
            onDragEnd={handleDresserDragEnd}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 flex flex-col gap-3 bg-white rounded-xl p-3 shadow-xl border"
            style={{ minWidth: 72, x: dresserPosition.x, y: dresserPosition.y }}
          >
            {drawerItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleDrawerSelect(item.id)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-700 hover:bg-blue-50"
                >
                  <IconComponent className="h-5 w-5" />
                  <span className="text-sm">{item.title}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Floating Dresser Drawer Content */}
      <AnimatePresence>
        {dresserOpen && activeDrawer && (
          <motion.div
            className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-xl border-l border-gray-200"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {drawerItems.find((d) => d.id === activeDrawer)?.title}
                </h2>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close drawer"
                  title="Close drawer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {ActiveDrawerComponent && (
                  <div className="p-4">
                    <ActiveDrawerComponent />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
