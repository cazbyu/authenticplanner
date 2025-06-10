import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Calendar, Settings, LogOut, ChevronRight, Drama as Drawer, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.svg';

// Import drawer content components
import RoleBank from '../components/roles/RoleBank';
import StrategicGoals from '../pages/StrategicGoals';
import Reflections from '../pages/Reflections';
import Scorecard from '../pages/Scorecard';
import Tasks from '../pages/Tasks';

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'roles' | 'tasks' | 'goals' | 'reflections' | 'scorecard' | null>(null);
  const location = useLocation();
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);
  
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
    if (!drawerOpen) {
      setActiveDrawer(null);
    }
  };

  const selectDrawer = (drawer: typeof activeDrawer) => {
    setActiveDrawer(drawer);
  };
  
  const navItems = [
    { name: 'Authentic Calendar', path: '/', icon: Calendar },
    { name: '12 Week Cycle', path: '/twelve-week-cycle', icon: Clock },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];
  
  const drawerItems = [
    { 
      id: 'roles',
      title: 'Role Bank',
      description: 'Manage your life roles and authentic deposits',
      component: RoleBank
    },
    {
      id: 'tasks',
      title: 'Tasks',
      description: 'View and manage your tasks',
      component: Tasks
    },
    {
      id: 'goals',
      title: 'Strategic Goals',
      description: 'Review your mission, vision, and goals',
      component: StrategicGoals
    },
    {
      id: 'reflections',
      title: 'Reflections',
      description: 'View your task-related notes and reflections',
      component: Reflections
    },
    {
      id: 'scorecard',
      title: 'Scorecard',
      description: 'Track your balance and progress',
      component: Scorecard
    }
  ];
  
  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };
  
  const drawerVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };
  
  const overlayVariants = {
    open: { opacity: 1, transition: { duration: 0.3 } },
    closed: { opacity: 0, transition: { duration: 0.3 } },
  };

  const ActiveDrawerComponent = activeDrawer 
    ? drawerItems.find(item => item.id === activeDrawer)?.component 
    : null;

  // Check if we're on the calendar page (which is now the main page)
  const isCalendarPage = location.pathname === '/' || location.pathname === '/calendar';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header - Show on all pages */}
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
      
      {/* Sidebar - Show on all pages */}
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
                {user?.name?.charAt(0) || 'U'}
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
      
      {/* Floating Dresser Button (Desktop) - Show on all pages */}
      <div className="fixed top-4 right-4 z-50 hidden lg:block">
        <button
          onClick={toggleDrawer}
          className="rounded-md bg-white p-2 text-gray-500 shadow-md hover:bg-gray-50 hover:text-gray-600"
          aria-label="Toggle floating dresser"
        >
          <Drawer className="h-6 w-6" />
        </button>
      </div>
      
      {/* Floating Dresser - Available on all pages */}
      <motion.aside
        className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-lg"
        initial="closed"
        animate={drawerOpen ? 'open' : 'closed'}
        variants={drawerVariants}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeDrawer ? drawerItems.find(item => item.id === activeDrawer)?.title : 'Floating Dresser'}
            </h2>
            <button
              onClick={toggleDrawer}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {ActiveDrawerComponent ? (
              <div className="p-4">
                <ActiveDrawerComponent />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-4">
                {drawerItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectDrawer(item.id as typeof activeDrawer)}
                    className="flex flex-col items-start rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                  >
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.aside>
      
      {/* Main content */}
      <main className="lg:pl-64">
        <div className="max-w-7xl px-4 py-6 sm:px-6 md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;