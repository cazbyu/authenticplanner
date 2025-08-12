// MainLayout.tsx
import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Menu, Home, Calendar, Settings, Users, Compass, Clock,
  Target, BookOpen, BarChart3, Briefcase, Archive, ChevronRight, X, LogOut, Drama as Drawer 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.svg';
import { useAuth } from '../contexts/AuthContext';

// Drawer content components
import StrategicGoals from '../pages/StrategicGoals';
import Reflections from '../pages/Reflections';
import Scorecard from '../pages/Scorecard';
import Tasks from '../pages/Tasks';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dresserOpen, setDresserOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [dresserPosition, setDresserPosition] = useState({ x: 0, y: 0 });
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
const closeSidebar = () => setSidebarOpen(false);

  const handleDrawerSelect = (drawer: string) => {
    setActiveDrawer((curr) => (curr === drawer ? null : drawer));
    setDresserOpen(false);
  };

  const handleDresserDragEnd = (_e: any, info: any) => {
    setDresserPosition({ x: info.point.x, y: info.point.y });
  };

  const ActiveDrawerComponent =
    activeDrawer ? drawerItems.find((item) => item.id === activeDrawer)?.component : null;

  return (
    <div className="min-h-screen h-full flex flex-col bg-gray-50">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white px-4 shadow-sm md:px-6 lg:hidden">
        <button 
          onClick={toggleSidebar}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Authentic Planner" className="h-8 w-8" />
          <span className="text-lg font-bold text-primary-600">Authentic Planner</span>
        </div>
        
        <button
          onClick={toggleDrawer}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Toggle floating dresser"
        >
          <Drawer className="h-6 w-6" />
        </button>
      </header>
      
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {(sidebarOpen || drawerOpen) && (
          <motion.div 
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            initial="closed"
            animate="open"
            exit="closed"
            variants={overlayVariants}
            onClick={() => {
              closeSidebar();
              setDrawerOpen(false);
              setActiveDrawer(null);
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <motion.aside
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg lg:z-10 lg:shadow-none"
        initial="closed"
        animate={sidebarOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="w-8" /> {/* Spacer */}
            <button 
              onClick={closeSidebar}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-3 py-4">
           <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const ItemIcon = item.icon;
                
                return (
                   <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                       isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={closeSidebar}
                  >
                   <ItemIcon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-500'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                 {user?.name.charAt(0) || 'U'}
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="truncate text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="mt-4 flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="mr-3 h-5 w-5" />
               Sign out
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main content pushed by sidebar width */}
      <main
        className={`flex-1 flex flex-col min-h-0 h-full overflow-hidden transition-all duration-300
        ${sidebarCollapsed ? 'ml-0' : 'ml-64'}`}
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
