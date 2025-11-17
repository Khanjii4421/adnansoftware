import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Start with sidebar open by default
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      // On desktop, ensure sidebar is open by default
      if (!isMobileView && window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else if (isMobileView) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const isActive = (path) => location.pathname === path;

  const sellerMenuItems = [
    { path: '/seller', label: 'Dashboard', icon: '📊', bgColor: 'bg-blue-50', textColor: 'text-blue-700', hoverBg: 'hover:bg-blue-100' },
    { path: '/orders', label: 'My Orders', icon: '📦', bgColor: 'bg-green-50', textColor: 'text-green-700', hoverBg: 'hover:bg-green-100' },
    { path: '/invoices', label: 'Billing', icon: '🧾', bgColor: 'bg-purple-50', textColor: 'text-purple-700', hoverBg: 'hover:bg-purple-100' },
    { path: '/generate-bill', label: 'Generate Bill', icon: '🧾', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700', hoverBg: 'hover:bg-indigo-100' },
    { path: '/purchasing', label: 'Purchasing', icon: '🛒', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', hoverBg: 'hover:bg-emerald-100' },
    { path: '/return-scan', label: 'Return Scan Records', icon: '🔍', bgColor: 'bg-orange-50', textColor: 'text-orange-700', hoverBg: 'hover:bg-orange-100' },
    { path: '/ledger', label: 'Ledger Khata', icon: '📒', bgColor: 'bg-teal-50', textColor: 'text-teal-700', hoverBg: 'hover:bg-teal-100' },
  ];

  const adminMenuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊', bgColor: 'bg-blue-50', textColor: 'text-blue-700', hoverBg: 'hover:bg-blue-100' },
    { path: '/orders', label: 'Orders', icon: '📦', bgColor: 'bg-green-50', textColor: 'text-green-700', hoverBg: 'hover:bg-green-100' },
    { path: '/products', label: 'Products', icon: '🛍️', bgColor: 'bg-pink-50', textColor: 'text-pink-700', hoverBg: 'hover:bg-pink-100' },
    { path: '/inventory', label: 'Inventory', icon: '📋', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', hoverBg: 'hover:bg-yellow-100' },
    { path: '/invoices', label: 'Invoices', icon: '🧾', bgColor: 'bg-purple-50', textColor: 'text-purple-700', hoverBg: 'hover:bg-purple-100' },
    { path: '/invoice-match', label: 'Invoice Match', icon: '🔗', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700', hoverBg: 'hover:bg-indigo-100' },
    { path: '/generate-bill', label: 'Generate Bill', icon: '🧾', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700', hoverBg: 'hover:bg-cyan-100' },
    { path: '/purchasing', label: 'Purchasing', icon: '🛒', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', hoverBg: 'hover:bg-emerald-100' },
    { path: '/sellers', label: 'Sellers', icon: '👥', bgColor: 'bg-red-50', textColor: 'text-red-700', hoverBg: 'hover:bg-red-100' },
    { path: '/automation', label: 'Automation', icon: '⚙️', bgColor: 'bg-gray-50', textColor: 'text-gray-700', hoverBg: 'hover:bg-gray-100' },
    { path: '/return-management', label: 'Return Management', icon: '↩️', bgColor: 'bg-orange-50', textColor: 'text-orange-700', hoverBg: 'hover:bg-orange-100' },
    { path: '/return-scan', label: 'Return Scan Records', icon: '🔍', bgColor: 'bg-amber-50', textColor: 'text-amber-700', hoverBg: 'hover:bg-amber-100' },
    { path: '/ledger', label: 'Ledger Khata', icon: '📒', bgColor: 'bg-teal-50', textColor: 'text-teal-700', hoverBg: 'hover:bg-teal-100' },
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : sellerMenuItems;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden" style={{ fontFamily: `'Poppins', system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif` }}>
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
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        } bg-gray-100 text-gray-800 transition-all duration-300 flex flex-col shadow-lg`}
      >
        <div className={`p-4 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center lg:justify-center'} border-b border-gray-200 flex-shrink-0`}>
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-xl text-gray-900">
                {user?.role === 'admin' ? 'Admin Portal' : 'Seller Portal'}
              </h1>
              <p className="text-xs text-gray-500 mt-1">Management System</p>
            </div>
          )}
          {/* Desktop toggle button - always visible when not mobile */}
          {!isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center ${sidebarOpen ? 'px-4' : 'px-2 lg:px-2 justify-center lg:justify-center'} py-3 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? `${item.bgColor || 'bg-blue-100'} ${item.textColor || 'text-blue-700'} font-semibold`
                  : `${item.textColor || 'text-blue-600'} ${item.hoverBg || 'hover:bg-blue-50'}`
              }`}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {sidebarOpen && (
                <span className="ml-3 font-medium whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center lg:justify-center'}`}>
            {sidebarOpen && (
              <div>
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded hover:bg-gray-200"
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header with Hamburger */}
        <header className="bg-white shadow-sm p-4 border-b border-gray-200 flex-shrink-0 lg:hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {menuItems.find((item) => isActive(item.path))?.label || 'Dashboard'}
              </h2>
            </div>
            {user?.role === 'admin' && (
              <div className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm font-semibold">
                Admin
              </div>
            )}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="bg-white shadow-sm p-4 md:p-6 border-b border-gray-200 flex-shrink-0 hidden lg:block">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                {menuItems.find((item) => isActive(item.path))?.label || 'Dashboard'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {user?.role === 'admin' ? 'Administrative Dashboard' : 'Seller Dashboard'}
              </p>
            </div>
            {user?.role === 'admin' && (
              <div className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold">
                Admin
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
