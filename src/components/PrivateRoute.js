import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  const currentPath = window.location.pathname;
  
  // Allow sellers to only access seller routes
  if (user?.role === 'seller') {
    // Sellers can access /seller, /orders, /invoices, /out-of-stock, and /return-scan routes
    if (currentPath.startsWith('/admin') || currentPath === '/sellers' || currentPath === '/products' || 
        currentPath === '/inventory' || 
        currentPath === '/automation' || currentPath === '/return-management' ||
        currentPath === '/generate-bill' || currentPath === '/purchasing' || 
        currentPath.startsWith('/purchasing') || currentPath === '/ledger' ||
        currentPath.startsWith('/ledger') || currentPath === '/invoice-match' ||
        currentPath === '/expenses-tracker') {
      return <Navigate to="/seller" replace />;
    }
  }
  
  // Allow admin to access all routes except /seller (seller dashboard)
  if (user?.role === 'admin' && currentPath.startsWith('/seller') && currentPath !== '/sellers') {
    return <Navigate to="/admin" replace />;
  }

  // Auto-redirect admin users to /admin when accessing root
  if (user?.role === 'admin' && currentPath === '/') {
    return <Navigate to="/admin" replace />;
  }

  // Auto-redirect seller users to /seller when accessing root
  if (user?.role === 'seller' && currentPath === '/') {
    return <Navigate to="/seller" replace />;
  }

  return children;
};

export default PrivateRoute;

