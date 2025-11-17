// API URL Helper - Automatically detects environment
// Works for both localhost and production (mobile/desktop)

let cachedApiUrl = null;

export const getApiUrl = () => {
  // Return cached URL if already calculated (after first call)
  if (cachedApiUrl !== null && typeof window !== 'undefined') {
    return cachedApiUrl;
  }

  // If REACT_APP_API_URL is set, use it (for production)
  if (process.env.REACT_APP_API_URL) {
    cachedApiUrl = process.env.REACT_APP_API_URL;
    console.log('[API] Using REACT_APP_API_URL:', cachedApiUrl);
    return cachedApiUrl;
  }

  // If running on production domain (not localhost), use relative URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    const host = window.location.host;
    
    // Check if running on a production domain
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('192.168')) {
      cachedApiUrl = `${protocol}//${host}/api`;
      console.log('[API] Production mode detected. Using relative URL:', cachedApiUrl);
      console.log('[API] Hostname:', hostname, 'Protocol:', protocol, 'Port:', port);
      return cachedApiUrl;
    }
  }

  // Default to localhost for development
  cachedApiUrl = 'http://localhost:3000/api';
  console.log('[API] Development mode. Using default URL:', cachedApiUrl);
  return cachedApiUrl;
};

// Export API_URL - IMPORTANT: This is evaluated at build time!
// For production deployment, components should use getApiUrl() directly
// But for backward compatibility with existing code, we export a constant
// During build, window doesn't exist, so it defaults to localhost
// At runtime in browser, components should ideally use getApiUrl() instead

// WARNING: API_URL constant may use localhost if evaluated at build time
// Components should use getApiUrl() directly: `${getApiUrl()}/endpoint`
// But for backward compatibility, we export API_URL with runtime check:
export const API_URL = (() => {
  // This IIFE runs when module loads at runtime (in browser)
  // But during build, window doesn't exist, so it returns localhost
  // The real fix is for components to use getApiUrl() dynamically
  if (typeof window !== 'undefined') {
    return getApiUrl(); // Runtime in browser
  }
  return 'http://localhost:3000/api'; // Build time fallback
})();

// RECOMMENDATION: Update components to use getApiUrl() instead of API_URL
// Example: Change `${API_URL}/sellers` to `${getApiUrl()}/sellers`

