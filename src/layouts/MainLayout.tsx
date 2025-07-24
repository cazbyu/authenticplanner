import React, { useState, lazy, Suspense } from 'react';
import { Outlet, Link, useLocation, NavLink } from 'react-router-dom';
import { Menu, X, LogOut, ChevronRight, Archive } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.svg';
import { mainNavItems, drawerNavItems } from './navigation'; // Centralized navigation data

// --- Lazy Load Drawer Components ---
// This improves initial load time by only fetching the code for a drawer when it's opened.
const Tasks = lazy(() => import('../pages/Tasks'));
const StrategicGoals = lazy(() => import('../pages/StrategicGoals'));
const Reflections = lazy(() => import('../pages/Reflections'));
const Scorecard = lazy(() => import('../pages/Scorecard'));

// --- Type Definitions ---
type DrawerType = 'tasks' | 'goals' | 'reflections' | 'scorecard';

// --- Animation Variants ---
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


// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Renders the main sidebar navigation for desktop and mobile.
 */
const Sidebar = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <motion.aside
      className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg lg:flex lg:flex-col lg:shadow-none lg:translate-x-0"
      initial="closed"
      animate={isOpen ? 'open' : 'closed'}
      variants={sidebarVariants}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <img src={logo} alt="Authentic Planner" className="h-8 w-8" />
          <span className="text-lg font-bold text-primary-600">Authentic Planner</span>
        </Link>
        <button
          onClick={onClose}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end // Use 'end' for exact matching of the root path
            className={({ isActive }) =>
              `group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
            onClick={onClose}
          >
            <item.icon className={`mr-3 h-5 w-5 ${location.pathname === item.path ? 'text-primary-500' : 'text-gray-500'}`} />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium text-gray-900">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="mt-4 flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign out
        </button>
      </div>
    </motion.aside>
  );
};

/**
 * Renders the "Floating Dresser" navigation for both desktop and mobile.
 */
const FloatingDresser = ({ activeDrawer, onSelectDrawer }: { activeDrawer: DrawerType | null, onSelectDrawer: (drawer: DrawerType | null) => void }) => {
    const [mobileNavExpanded, setMobileNavExpanded] = useState(false);

    const handleDrawerSelect = (drawer: DrawerType) => {
        onSelectDrawer(activeDrawer === drawer ? null : drawer);
        setMobileNavExpanded(false);
    };

    return (
        <>
            {/* Desktop Vertical Bar */}
            <div className="fixed top-1/2 right-0 transform -translate-y-1/2 z-30 hidden lg:block">
                <div className="bg-white border-l border-t border-b border-gray-200 rounded-l-lg shadow-lg">
                    <div className="flex flex-col">
                        {drawerNavItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleDrawerSelect(item.id as DrawerType)}
                                className={`group relative p-3 border-b border-gray-100 last:border-b-0 transition-all ${activeDrawer === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                                title={item.title}
                            >
                                <item.icon className="h-5 w-5" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Floating Action Button (FAB) */}
            <div className="fixed bottom-4 right-4 z-30 lg:hidden">
                <AnimatePresence>
                    {mobileNavExpanded ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex flex-col-reverse items-center space-y-2 space-y-reverse">
                            <button onClick={() => setMobileNavExpanded(false)} className="flex items-center justify-center w-14 h-14 bg-gray-600 text-white rounded-full shadow-lg">
                                <X className="h-6 w-6" />
                            </button>
                            {drawerNavItems.map((item) => (
                                <button key={item.id} onClick={() => handleDrawerSelect(item.id as DrawerType)} className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg ${activeDrawer === item.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>
                                    <item.icon className="h-5 w-5" />
                                </button>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setMobileNavExpanded(true)} className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg">
                            <Archive className="h-6 w-6" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};


/**
 * Renders the content panel for the currently active drawer.
 */
const DrawerContent = ({ activeDrawer, onClose }: { activeDrawer: DrawerType | null, onClose: () => void }) => {
    const activeDrawerInfo = drawerNavItems.find(item => item.id === activeDrawer);
    
    const ComponentToRender = activeDrawerInfo?.component;

    return (
        <AnimatePresence>
            {activeDrawer && activeDrawerInfo && (
                <motion.div
                    className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-xl border-l border-gray-200"
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={drawerVariants}
                >
                    <div className="flex h-full flex-col">
                        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
                            <h2 className="text-lg font-semibold text-gray-900">{activeDrawerInfo.title}</h2>
                            <button onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <Suspense fallback={<div>Loading...</div>}>
                               {ComponentToRender && <ComponentToRender />}
                            </Suspense>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


// ============================================================================
// MAIN LAYOUT COMPONENT
// ============================================================================

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<DrawerType | null>(null);

  const handleCloseOverlays = () => {
    setSidebarOpen(false);
    setActiveDrawer(null);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white px-4 shadow-sm lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-md p-2 text-gray-500">
            <Menu className="h-6 w-6" />
          </button>
          <Link to="/dashboard" className="flex items-center space-x-2">
            <img src={logo} alt="Authentic Planner" className="h-8 w-8" />
          </Link>
          <div className="w-8" /> {/* Spacer */}
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating Dresser and its Content */}
      <FloatingDresser activeDrawer={activeDrawer} onSelectDrawer={setActiveDrawer} />
      <DrawerContent activeDrawer={activeDrawer} onClose={() => setActiveDrawer(null)} />

      {/* Overlay for mobile */}
      <AnimatePresence>
        {(sidebarOpen || activeDrawer) && (
          <motion.div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            initial="closed"
            animate="open"
            exit="closed"
            variants={overlayVariants}
            onClick={handleCloseOverlays}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
