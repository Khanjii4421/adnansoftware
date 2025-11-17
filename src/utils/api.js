// API URL Helper - Automatically detects environment
// Works for both localhost and production (mobile/desktop)

let cachedApiUrl = null;

export const getApiUrl = () => {
  // If REACT_APP_API_URL is set, use it (for production)
  // BUT: If it's localhost and we're on a production domain, ignore it!
  if (process.env.REACT_APP_API_URL) {
    const envUrl = process.env.REACT_APP_API_URL;
    
    // Check if we're running on a production domain but REACT_APP_API_URL is localhost
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocalhostEnv = envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
      const isProductionDomain = hostname !== 'localhost' && 
                                 hostname !== '127.0.0.1' && 
                                 !hostname.includes('192.168') &&
                                 !hostname.startsWith('10.') &&
                                 !hostname.startsWith('172.');
      
      // If env URL is localhost but we're on production domain, ignore it and use relative URL
      if (isLocalhostEnv && isProductionDomain) {
        console.warn('[API] ⚠️ REACT_APP_API_URL is localhost but running on production domain. Ignoring it.');
        console.warn('[API] Hostname:', hostname, 'Env URL:', envUrl);
        // Fall through to relative URL logic below
      } else {
        // Use the env URL if it's not a localhost/production mismatch
        if (!cachedApiUrl || cachedApiUrl !== envUrl) {
          cachedApiUrl = envUrl;
          console.log('[API] Using REACT_APP_API_URL:', cachedApiUrl);
        }
        return cachedApiUrl;
      }
    } else {
      // Build time - use env URL
      if (!cachedApiUrl || cachedApiUrl !== envUrl) {
        cachedApiUrl = envUrl;
        console.log('[API] Using REACT_APP_API_URL:', cachedApiUrl);
      }
      return cachedApiUrl;
    }
  }

  // If running on production domain (not localhost), use relative URL
  // This is checked at runtime, so it works on mobile browsers
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    const host = window.location.host;
    const origin = window.location.origin;
    
    // Check if running on a production domain
    // Exclude localhost, 127.0.0.1, and local network (192.168, 10.0, 172.16)
    const isLocalhost = hostname === 'localhost' || 
                        hostname === '127.0.0.1' || 
                        hostname.startsWith('192.168.') ||
                        hostname.startsWith('10.') ||
                        hostname.startsWith('172.16.') ||
                        hostname.startsWith('172.17.') ||
                        hostname.startsWith('172.18.') ||
                        hostname.startsWith('172.19.') ||
                        hostname.startsWith('172.20.') ||
                        hostname.startsWith('172.21.') ||
                        hostname.startsWith('172.22.') ||
                        hostname.startsWith('172.23.') ||
                        hostname.startsWith('172.24.') ||
                        hostname.startsWith('172.25.') ||
                        hostname.startsWith('172.26.') ||
                        hostname.startsWith('172.27.') ||
                        hostname.startsWith('172.28.') ||
                        hostname.startsWith('172.29.') ||
                        hostname.startsWith('172.30.') ||
                        hostname.startsWith('172.31.');
    
    if (!isLocalhost) {
      // Production domain - use relative URL
      const apiUrl = `${origin}/api`;
      if (!cachedApiUrl || cachedApiUrl !== apiUrl) {
        cachedApiUrl = apiUrl;
        console.log('=== API URL DETECTION ===');
        console.log('[API] ✅ Production mode detected!');
        console.log('[API] Using relative URL:', cachedApiUrl);
        console.log('[API] Full URL info:', {
          hostname,
          protocol,
          port,
          host,
          origin,
          apiUrl,
          fullURL: window.location.href
        });
        console.log('==========================');
      }
      return cachedApiUrl;
    } else {
      // Localhost detected - warn if on mobile
      console.warn('⚠️ [API] Localhost detected! This will NOT work on mobile.');
      console.warn('Current location:', window.location.href);
      console.warn('Expected: Railway domain (e.g., https://your-app.railway.app)');
    }
  }

  // Default to localhost for development
  const defaultUrl = 'http://localhost:3000/api';
  if (!cachedApiUrl || cachedApiUrl !== defaultUrl) {
    cachedApiUrl = defaultUrl;
    console.log('[API] Development mode. Using default URL:', cachedApiUrl);
  }
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

