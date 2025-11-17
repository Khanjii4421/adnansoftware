import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Get API URL dynamically - don't cache at component level
  // This ensures it works on mobile browsers too
  const getCurrentApiUrl = () => {
    const apiUrl = getApiUrl();
    // Debug logging for mobile
    if (typeof window !== 'undefined') {
      console.log('[AuthContext] API URL:', apiUrl);
      console.log('[AuthContext] Window location:', window.location.href);
      console.log('[AuthContext] Hostname:', window.location.hostname);
    }
    return apiUrl;
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Try to load user from localStorage first
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setLoading(false);
        } catch (e) {
          // If parsing fails, fetch from server
          fetchCurrentUser();
        }
      } else {
        fetchCurrentUser();
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const apiUrl = getCurrentApiUrl(); // Get API URL dynamically
      const response = await axios.get(`${apiUrl}/auth/me`);
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      console.error('API URL used:', getCurrentApiUrl());
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const apiUrl = getCurrentApiUrl(); // Get API URL dynamically for each request
      
      // Detailed logging for mobile debugging
      console.log('=== LOGIN DEBUG INFO ===');
      console.log('[Login] Current URL:', window.location.href);
      console.log('[Login] Hostname:', window.location.hostname);
      console.log('[Login] Origin:', window.location.origin);
      console.log('[Login] API URL:', apiUrl);
      console.log('[Login] Full endpoint:', `${apiUrl}/auth/login`);
      console.log('========================');
      
      const response = await axios.post(`${apiUrl}/auth/login`, {
        email,
        password,
      }, {
        timeout: 20000, // 20 seconds timeout for mobile
      });
      const { access_token, user } = response.data;
      setToken(access_token);
      setUser(user);
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return { success: true, user };
    } catch (error) {
      console.error('=== LOGIN ERROR DETAILS ===');
      console.error('Error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('API URL used:', getCurrentApiUrl());
      console.error('Current location:', window.location.href);
      console.error('============================');
      
      let errorMessage = 'Login failed';
      
      // Handle network errors (no response from server)
      if (!error.response) {
        const apiUrl = getCurrentApiUrl();
        const isLocalhost = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');
        
        if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
          if (isLocalhost) {
            errorMessage = 'Local server not running. Please start the server on your laptop.';
          } else {
            errorMessage = 'Server connection refused. Please check if the server is running on Railway.';
          }
        } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          if (isLocalhost) {
            errorMessage = 'Cannot connect to localhost. Make sure your laptop server is running on port 3000.';
          } else {
            errorMessage = `Cannot connect to server at ${apiUrl}. Please check:\n1. Railway deployment is live\n2. Your internet connection\n3. Try again in a few moments`;
          }
        } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
          errorMessage = 'Request timeout. Server is taking too long to respond. Please check your internet connection.';
        } else if (error.message) {
          errorMessage = `Network error: ${error.message}. API URL: ${apiUrl}`;
        } else {
          errorMessage = `Unable to connect to server at ${apiUrl}. Please check your connection and try again.`;
        }
      } 
      // Handle server response errors (4xx, 5xx)
      else if (error.response?.data) {
        errorMessage = error.response.data.error || errorMessage;
        // Include details if available (for debugging)
        if (error.response.data.details && process.env.NODE_ENV === 'development') {
          errorMessage += `: ${error.response.data.details}`;
        }
        // For 500 errors, provide more helpful message
        if (error.response.status === 500) {
          if (errorMessage.includes('Database not configured') || errorMessage.includes('not configured')) {
            errorMessage = 'Database not configured. Please check your .env file and ensure Supabase credentials are set.';
          } else if (!errorMessage.includes('Internal server error')) {
            errorMessage = `Server error: ${errorMessage}`;
          }
        }
      } 
      // Handle other errors
      else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

