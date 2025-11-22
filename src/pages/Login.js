import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
<<<<<<< HEAD
    
    // Validate email and password
    if (!email || !email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!password || !password.trim()) {
      setError('Please enter your password');
      return;
    }
    
    setLoading(true);

    try {
      const result = await login(email.trim(), password);
      
      console.log('=== LOGIN PAGE RESULT ===');
      console.log('[Login Page] Full result object:', result);
      console.log('[Login Page] Result success:', result?.success);
      console.log('[Login Page] Result error:', result?.error);
      console.log('[Login Page] Result user:', result?.user);
      console.log('[Login Page] Result keys:', result ? Object.keys(result) : 'No result');
      console.log('=========================');

      if (result && result.success) {
        // Auto-redirect based on role
        if (result.user && result.user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else if (result.user && result.user.role) {
          navigate('/seller', { replace: true });
        } else {
          setError('Invalid user data received');
          setLoading(false);
        }
      } else {
        const errorMsg = result?.error || 'Login failed. Please try again.';
        setError(errorMsg);
        setLoading(false);
      }
    } catch (error) {
      console.error('[Login Page] Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
=======
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Auto-redirect based on role
      if (result.user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/seller', { replace: true });
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
>>>>>>> 8dc07ead76b7cbe28ec94158b4c8faa94539e79d
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 relative overflow-hidden py-4 px-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full space-y-6 md:space-y-8 p-6 md:p-10 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 relative z-10 mx-4 my-4">
        {/* Brand Logo/Header */}
        <div className="text-center">
          <div className="flex justify-center mb-3 md:mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform">
              <span className="text-3xl md:text-4xl font-bold text-white">AK</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-1 md:mb-2">
            Adnan Khaddar
          </h1>
          <p className="text-lg md:text-xl font-semibold text-gray-700 mb-1">Management Portal</p>
          <div className="flex items-center justify-center gap-2 mt-2 md:mt-3">
            <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
            <div className="h-1 w-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
            <div className="h-1 w-12 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"></div>
          </div>
          <p className="mt-3 md:mt-4 text-xs md:text-sm font-medium text-gray-500">
            Welcome back! Please sign in to continue
          </p>
        </div>
        <form className="mt-6 md:mt-8 space-y-5 md:space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 text-red-800 px-4 md:px-5 py-3 md:py-4 rounded-xl relative shadow-lg">
              <div className="flex items-start gap-2 md:gap-3">
                <span className="text-xl md:text-2xl">⚠️</span>
                <div className="flex-1">
                  <strong className="font-bold text-base md:text-lg block mb-1">Login Failed</strong>
                  <p className="text-xs md:text-sm">{error}</p>
                  {(error.includes('Database') || error.includes('Supabase') || error.includes('schema')) ? (
                    <div className="mt-3 p-3 bg-white/50 rounded-lg border border-red-200">
                      <p className="text-xs font-semibold mb-1">💡 Solution:</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>Created a .env file with Supabase credentials</li>
                        <li>Run the database schema (supabase-schema.sql) in Supabase</li>
                        <li>Restarted the server after creating .env file</li>
                      </ul>
                    </div>
                  ) : error.includes('localhost') || error.includes('127.0.0.1') ? (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs font-semibold mb-1">⚠️ Mobile Device Issue:</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>App is trying to connect to localhost</li>
                        <li>Make sure you're accessing the Railway URL: <strong>https://your-app.railway.app</strong></li>
                        <li>Check browser console for API URL details (F12)</li>
                        <li>Clear browser cache and reload the page</li>
                      </ul>
                    </div>
                  ) : error.includes('Network') || error.includes('connection') ? (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-semibold mb-1">💡 Troubleshooting:</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>Check your internet connection</li>
                        <li>Verify Railway deployment is live</li>
                        <li>Check browser console (F12) for detailed error logs</li>
                        <li>Try refreshing the page</li>
                        <li>If on mobile, try using WiFi instead of mobile data</li>
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
          <div className="space-y-4 md:space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-base md:text-lg">📧</span>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none relative block w-full pl-9 md:pl-10 pr-3 py-2.5 md:py-3 text-sm md:text-base border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-base md:text-lg">🔒</span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none relative block w-full pl-9 md:pl-10 pr-3 py-2.5 md:py-3 text-sm md:text-base border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3 md:py-4 px-6 border border-transparent text-sm md:text-base font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 hover:via-teal-700 hover:to-cyan-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="text-xl">→</span>
                </>
              )}
            </button>
          </div>
          
          {/* Footer */}
          <div className="text-center pt-3 md:pt-4">
            <p className="text-[10px] md:text-xs text-gray-500">
              © 2025 Dev By Khalil Khan. All rights reserved.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

