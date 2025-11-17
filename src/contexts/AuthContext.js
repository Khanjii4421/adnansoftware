import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// API URL Helper - Automatically detects environment
const getApiUrl = () => {
  // If REACT_APP_API_URL is set, use it (for production)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // If running on production domain (not localhost), use relative URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('192.168')) {
      return `${window.location.protocol}//${window.location.host}/api`;
    }
  }

  // Default to localhost for development
  return 'http://localhost:3000/api';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const API_URL = getApiUrl();

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
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      }, {
        timeout: 10000, // 10 seconds timeout
      });
      const { access_token, user } = response.data;
      setToken(access_token);
      setUser(user);
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';
      
      // Handle network errors (no response from server)
      if (!error.response) {
        if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Server connection refused. Please check if the server is running.';
        } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          errorMessage = 'Network error. Please check your internet connection and ensure the server is running.';
        } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
          errorMessage = 'Request timeout. The server is taking too long to respond.';
        } else if (error.message) {
          errorMessage = `Network error: ${error.message}`;
        } else {
          errorMessage = 'Unable to connect to server. Please check your connection and try again.';
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

