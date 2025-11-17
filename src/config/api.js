// API Configuration
// Automatically detects environment and sets API URL

const getApiUrl = () => {
  // If REACT_APP_API_URL is set, use it (for production)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // If running on production domain (not localhost), use relative URL
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `${window.location.protocol}//${window.location.host}/api`;
  }

  // Default to localhost for development
  return 'http://localhost:3000/api';
};

export const API_URL = getApiUrl();

