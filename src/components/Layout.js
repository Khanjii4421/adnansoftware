import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from './Footer';
import WelcomeMessage from './WelcomeMessage';
import ErrorHandler, { useErrorHandler } from './ErrorHandler';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { error, showError, clearError } = useErrorHandler();

  // Global error handler for axios
  useEffect(() => {
    const axiosInterceptor = (error) => {
      if (error.response) {
        showError(error.response.data?.error || 'An error occurred', error.response.data?.details);
      } else if (error.request) {
        showError('Network error: Unable to connect to server');
      } else {
        showError(error.message || 'An unexpected error occurred');
      }
    };

    // You can add axios interceptor here if needed
    return () => {
      // Cleanup if needed
    };
  }, [showError]);
  
  // Load sidebar state from localStorage, default to true for desktop
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    if (saved !== null) {
      return saved === 'true';
    }
    // Default: open on desktop, closed on mobile
    return window.innerWidth >= 768;
  });
  
  const [isMobile, setIsMobile] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarOpen', sidebarOpen.toString());
  }, [sidebarOpen]);

  // Save dark mode state to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      // On mobile, always close sidebar
      if (isMobileView) {
        setSidebarOpen(false);
      } else {
        // On desktop, restore from localStorage or default to true
        const saved = localStorage.getItem('sidebarOpen');
        if (saved !== null) {
          setSidebarOpen(saved === 'true');
        } else {
          setSidebarOpen(true);
        }
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show welcome message on first load after login
  useEffect(() => {
    const hasShownWelcome = sessionStorage.getItem('welcomeShown');
    if (!hasShownWelcome && user) {
      setShowWelcome(true);
      sessionStorage.setItem('welcomeShown', 'true');
      
      // Hide after 2 seconds
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const isActive = (path) => location.pathname === path;

  // Watch component - Luxury brown watch with shining needles
  const WatchComponent = () => {
    const hours = currentTime.getHours() % 12 || 12;
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    
    const hourAngle = (hours * 30) + (minutes * 0.5);
    const minuteAngle = minutes * 6;
    const secondAngle = seconds * 6;

    return (
      <div className="relative flex items-center gap-3">
        {/* Watch */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-800 bg-gradient-to-br from-amber-700 to-amber-900 shadow-lg">
          {/* Watch face */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-800/30">
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-amber-900 rounded-full z-10"></div>
            
            {/* Hour marks */}
            {[12, 3, 6, 9].map((num, idx) => {
              const angle = num * 30 - 90;
              const rad = (angle * Math.PI) / 180;
              const radius = 18;
              const x = 50 + radius * Math.cos(rad);
              const y = 50 + radius * Math.sin(rad);
              return (
                <div
                  key={idx}
                  className="absolute w-1 h-1 bg-amber-900 rounded-full"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                ></div>
              );
            })}
            
            {/* Hour hand */}
            <div
              className="absolute top-1/2 left-1/2 origin-bottom z-5"
              style={{
                transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
                width: '3px',
                height: '25%',
                background: 'linear-gradient(to top, #92400e, #d97706)',
                borderRadius: '2px',
                boxShadow: '0 0 4px rgba(217, 119, 6, 0.6)'
              }}
            ></div>
            
            {/* Minute hand */}
            <div
              className="absolute top-1/2 left-1/2 origin-bottom z-6"
              style={{
                transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
                width: '2px',
                height: '35%',
                background: 'linear-gradient(to top, #78350f, #f59e0b)',
                borderRadius: '2px',
                boxShadow: '0 0 4px rgba(245, 158, 11, 0.6)'
              }}
            ></div>
            
            {/* Second hand with shine */}
            <div
              className="absolute top-1/2 left-1/2 origin-bottom z-7"
              style={{
                transform: `translate(-50%, -100%) rotate(${secondAngle}deg)`,
                width: '1px',
                height: '40%',
                background: 'linear-gradient(to top, #dc2626, #ef4444)',
                boxShadow: '0 0 6px rgba(239, 68, 68, 0.8), 0 0 10px rgba(239, 68, 68, 0.4)'
              }}
            ></div>
          </div>
        </div>
        
        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 border-2 border-amber-800/30 shadow-md transition-all duration-300 hover:scale-110"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <span className="text-2xl">🌙</span>
          ) : (
            <span className="text-2xl">☀️</span>
          )}
        </button>
      </div>
    );
  };

  const sellerMenuItems = [
    { path: '/seller', label: 'Dashboard', icon: '📊', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/orders', label: 'My Orders', icon: '📦', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/invoices', label: 'Billing', icon: '🧾', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/out-of-stock', label: 'Out of Stock', icon: '⚠️', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/return-scan', label: 'Return Scan Records', icon: '🔍', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
  ];

  const adminMenuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/orders', label: 'Orders', icon: '📦', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/products', label: 'Products', icon: '🛍️', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/inventory', label: 'Inventory', icon: '📋', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/invoices', label: 'Invoices', icon: '🧾', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/invoice-match', label: 'Invoice Match', icon: '🔗', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/generate-bill', label: 'Generate Bill', icon: '🧾', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/purchasing', label: 'Purchasing', icon: '🛒', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/expenses-tracker', label: 'Expenses Tracker', icon: '💰', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/employee-attendance', label: 'Employee Attendance', icon: '⏰', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/employee-management', label: 'Employee Management', icon: '👤', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/attendance-view', label: 'Attendance View', icon: '📅', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/sellers', label: 'Sellers', icon: '👥', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/automation', label: 'Automation', icon: '⚙️', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/return-management', label: 'Return Management', icon: '↩️', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/return-scan', label: 'Return Scan Records', icon: '🔍', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/return-match', label: 'Return Match Management', icon: '🔗', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/ledger', label: 'Ledger Khata', icon: '📒', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/out-of-stock', label: 'Out of Stock', icon: '⚠️', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
    { path: '/settings', label: 'Settings', icon: '⚙️', bgColor: 'bg-blue-600', textColor: 'text-white', hoverBg: 'hover:bg-blue-700 hover:text-white' },
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : sellerMenuItems;

  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden transition-colors duration-300`} style={{ fontFamily: `'Poppins', system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif` }}>
      {/* Welcome Message */}
      {showWelcome && <WelcomeMessage />}
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        ${
          sidebarOpen ? 'w-64 sm:w-72' : 'w-0 lg:w-16 xl:w-20'
        } bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-all duration-300 flex flex-col shadow-lg`}
      >
        <div className={`p-2 sm:p-3 md:p-4 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center lg:justify-center'} border-b border-gray-200 dark:border-gray-700 flex-shrink-0`}>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-sm sm:text-base md:text-lg lg:text-xl text-gray-900 dark:text-gray-100 truncate">
                {user?.role === 'admin' ? 'Admin Portal' : 'Seller Portal'}
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">Management System</p>
            </div>
          )}
          {/* Desktop toggle button - always visible when not mobile */}
          {!isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
              title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          )}
        </div>

        <nav className="flex-1 px-1 sm:px-2 py-2 sm:py-3 md:py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center ${sidebarOpen ? 'px-2 sm:px-3 md:px-4' : 'px-1.5 lg:px-2 justify-center lg:justify-center'} py-2 sm:py-2.5 md:py-3 rounded-lg transition-all duration-200 text-xs sm:text-sm md:text-base ${
                isActive(item.path)
                  ? `${item.bgColor || 'bg-blue-600'} ${item.textColor || 'text-white'} font-semibold`
                  : `bg-blue-500 ${item.textColor || 'text-white'} ${item.hoverBg || 'hover:bg-blue-600 hover:text-white'}`
              }`}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="text-base sm:text-lg md:text-xl flex-shrink-0">{item.icon}</span>
              {sidebarOpen && (
                <span className="ml-1.5 sm:ml-2 md:ml-3 font-medium whitespace-nowrap truncate text-xs sm:text-sm md:text-base">{item.label}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-2 sm:p-3 md:p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center lg:justify-center'}`}>
            {sidebarOpen && (
              <div className="min-w-0 flex-1 mr-1 sm:mr-2">
                <p className="text-[10px] sm:text-xs md:text-sm font-medium truncate text-gray-800 dark:text-gray-200">{user?.name || 'User'}</p>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || ''}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 rounded hover:bg-gray-200 flex-shrink-0"
              title="Logout"
            >
              <span className="text-base sm:text-lg md:text-xl">🚪</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header with Hamburger */}
        <header className="bg-white dark:bg-gray-800 shadow-sm p-2 sm:p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 lg:hidden transition-colors duration-300">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
              aria-label="Toggle menu"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 dark:text-gray-100 truncate">
                {menuItems.find((item) => isActive(item.path))?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <WatchComponent />
              {user?.role === 'admin' && (
                <div className="px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded text-[10px] sm:text-xs md:text-sm font-semibold flex-shrink-0">
                  Admin
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm p-3 sm:p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 hidden lg:block transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
                {menuItems.find((item) => isActive(item.path))?.label || 'Dashboard'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                {user?.role === 'admin' ? 'Administrative Dashboard' : 'Seller Dashboard'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <WatchComponent />
              {user?.role === 'admin' && (
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg text-xs sm:text-sm font-semibold">
                  Admin
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-6 min-h-0 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          {children}
        </main>
        <Footer />
      </div>
      <ErrorHandler error={error} onClose={clearError} />
    </div>
  );
};

export default Layout;
