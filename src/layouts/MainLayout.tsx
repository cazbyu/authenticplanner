import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Calendar, Settings, LogOut, Users, Compass, Clock, Target, BookOpen, BarChart3, Briefcase, Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.svg';
import { useAuth } from '../contexts/AuthContext';

// Drawer content components
import StrategicGoals from '../pages/StrategicGoals';
import Reflections from '../pages/Reflections';
import Scorecard from '../pages/Scorecard';
import Tasks from '../pages/Tasks';

const drawerItems = [
  {
    id: 'tasks',
    title: 'Tasks',
    description: 'View and manage your tasks',
    icon: Briefcase,
    component: Tasks,
  },
  {
    id: 'goals',
    title: 'Strategic Goals',
    description: 'Review your mission, vision, and goals',
    icon: Target,
    component: StrategicGoals,
  },
  {
    id: 'reflections',
    title: 'Reflections',
    description: 'View your task-related notes and reflections',
    icon: BookOpen,
    component: Reflections,
  },
  {
    id: 'scorecard',
    title: 'Scorecard',
    description: 'Track your balance and progress',
    icon: BarChart3,
    component: Scorecard,
  },
];

const navItems = [
  { name: 'Dashboard', path: '/', icon: Home },
  { name: 'Authentic Calendar', path: '/calendar', icon: Calendar },
  { name: '12 Week Cycle', path: '/twelve-week-cycle', icon: Clock },
  { name: 'Role Bank', path: '/role-bank', icon: Users },
  { name: 'Domain Dashboard', path: '/domains', icon: Compass },
  { name: 'Notes & Follow Up', path: '/notes', icon: BookOpen },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dresserOpen, setDresserOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState(null as string | null);
  const [dresserPosition, setDresserPosition] = useState({ x: 0, y: 0 });
  const location = useLocation();

  // --- Sidebar Toggle Handler ---
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // --- Dresser Logic ---
  const handleDrawerSelect = (drawer: string) => {
    if (activeDrawer === drawer) setActiveDrawer(null);
    else setActiveDrawer(drawer);
    setDresserOpen(true);
  };

  // --- Draggable Dresser ---
  const handleDresserDragEnd = (e: any, info: any) => {
    setDresserPosition({ x: info.point.x, y: info.point.y });
  };

  // --- Which drawer page is showing? ---
  const ActiveDrawerComponent = activeDrawer
    ? drawerItems.find(item => item.id === activeDrawer)?.component
    : null;

  // Hide sidebar/header on the calendar page only if you really want (remove if not needed)
  const isCalendarPage = location.pathname === '/' || location.pathname === '/calendar';

  return (
    <div className="min-h-screen h-full flex flex-col bg-gray-50">
      {/* Header */}
      {!isCalendarPage && (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white px-4 shadow-sm md:px-6">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
            aria-label={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
          </button>
          <div className="flex items-center space-x-2">
            <img src={logo} alt="Authentic Planner" className="h-8 w-8" />
            <span className="text-lg font-bold text-primary-600">Authentic Planner</span>
          </div>
        </header>
      )}

      {/* Left Sidebar - always present, collapsible */}
      {!isCalendarPage && (
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transition-all duration-300 flex flex-col
            ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
        >
          {/* Spacer for header */}
          <div className="h-16" />
          {/* Nav Links */}
          <nav className="flex-1 overflow-y-auto px-2 py-4">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
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
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                {user?.name?.charAt(0) || 'U'}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 truncate">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="truncate text-xs text-gray-500">{user?.email}</p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={logout}
                className="mt-4 flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign out
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Move main content to the right if sidebar is open */}
      <main className={`flex-1 flex flex-col min-h-0 h-full overflow-hidden transition-all duration-300 ${!isCalendarPage ? (sidebarCollapsed ? 'ml-16' : 'ml-64') : ''}`}>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Floating Dresser (Movable!) */}
      <motion.div
        className="fixed z-50"
        drag
        dragMomentum={false}
        dragElastic={0.1}
        dragTransition={{ bounceStiffness: 200, bounceDamping: 20 }}
        initial={{
          x: dresserPosition.x,
          y: dresserPosition.y,
        }}
        animate={{
          x: dresserPosition.x,
          y: dresserPosition.y,
        }}
        onDragEnd={handleDresserDragEnd}
        style={{
          bottom: 32,
          right: 32,
          width: 64,
          height: 64,
          borderRadius: '50%',
        }}
      >
        <button
          onClick={() => setDresserOpen(!dresserOpen)}
          className="flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Open floating menu"
        >
          <Archive className="h-7 w-7" />
        </button>
        {/* Expanded dresser icons */}
        {dresserOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 flex flex-col gap-3 bg-white rounded-xl p-3 shadow-xl border"
            style={{ minWidth: 72 }}
          >
            {drawerItems.map(item => {
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
      </motion.div>

      {/* Floating Dresser Drawer Content */}
      <AnimatePresence>
        {dresserOpen && activeDrawer && (
          <motion.div
            className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-xl border-l border-gray-200"
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex h-full flex-col">
              {/* Drawer Header */}
              <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {drawerItems.find(item => item.id === activeDrawer)?.title}
                </h2>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close drawer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              {/* Drawer Content */}
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
