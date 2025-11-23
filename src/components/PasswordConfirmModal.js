import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const PasswordConfirmModal = ({ isOpen, onClose, onConfirm, title = 'Confirm Deletion', message = 'This action cannot be undone.' }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  console.log('PasswordConfirmModal render:', { isOpen, title, mounted });

  if (!isOpen || !mounted) return null;

  console.log('PasswordConfirmModal is OPEN and rendering!');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(password);
      setPassword('');
      onClose();
    } catch (err) {
      setError(err.message || 'Password verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    onClose();
  };

  const modalContent = (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div 
        style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '24px', 
          maxWidth: '500px', 
          width: '100%',
          margin: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          zIndex: 10000
        }}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl"
      >
        <div style={{ backgroundColor: 'red', color: 'white', padding: '8px', marginBottom: '12px', textAlign: 'center', fontWeight: 'bold' }}>
          🔴 PASSWORD MODAL IS VISIBLE 🔴
        </div>
        <h3 className="text-xl font-bold text-red-600 mb-2">{title}</h3>
        <p className="text-gray-700 mb-4">{message}</p>
        <p className="text-sm text-gray-600 mb-4 font-semibold">
          ⚠️ Please enter your admin password to confirm this deletion:
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter your password"
              autoFocus
              disabled={loading}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Confirm Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render using portal to ensure it's at the top level
  if (typeof document !== 'undefined') {
    return ReactDOM.createPortal(modalContent, document.body);
  }
  
  return modalContent;
};

export default PasswordConfirmModal;

