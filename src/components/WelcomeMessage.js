import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const WelcomeMessage = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show welcome message on mount (after login)
    const timer = setTimeout(() => {
      setShow(true);
    }, 100);

    // Hide after 2 seconds
    const hideTimer = setTimeout(() => {
      setShow(false);
    }, 2100);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!show || !user) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 rounded-3xl shadow-2xl p-8 md:p-12 mx-4 transform animate-scaleIn">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl animate-bounce">
              <span className="text-5xl md:text-6xl">👋</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 animate-slideUp">
            Welcome{user?.name ? `, ${user.name}` : ''}!
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-medium mb-2">
            {user?.role === 'admin' ? 'Admin Portal' : 'Seller Portal'}
          </p>
          <p className="text-lg md:text-xl text-white/80">
            Management System
          </p>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.5s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.6s ease-out 0.2s both;
        }
      `}</style>
    </div>
  );
};

export default WelcomeMessage;

