import React, { useState, useEffect } from 'react';

const ErrorHandler = ({ error, onClose }) => {
  const [show, setShow] = useState(!!error);

  useEffect(() => {
    setShow(!!error);
    if (error) {
      const timer = setTimeout(() => {
        setShow(false);
        if (onClose) onClose();
      }, 10000); // Auto-hide after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [error, onClose]);

  if (!show || !error) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
      <div className="bg-red-50 border-l-4 border-red-500 rounded-lg shadow-xl p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold text-red-800 mb-1">
              Error
            </h3>
            <p className="text-sm text-red-700">
              {typeof error === 'string' ? error : error.message || 'An error occurred'}
            </p>
            {error.details && (
              <p className="text-xs text-red-600 mt-1">
                {error.details}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => {
                setShow(false);
                if (onClose) onClose();
              }}
              className="text-red-500 hover:text-red-700 focus:outline-none"
            >
              <span className="text-xl">×</span>
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

// Global error handler hook
export const useErrorHandler = () => {
  const [error, setError] = useState(null);

  const showError = (errorMessage, details = null) => {
    setError({
      message: errorMessage,
      details: details
    });
  };

  const clearError = () => {
    setError(null);
  };

  return { error, showError, clearError };
};

export default ErrorHandler;

