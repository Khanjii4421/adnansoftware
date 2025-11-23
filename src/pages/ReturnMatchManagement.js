import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';
import PasswordConfirmModal from '../components/PasswordConfirmModal';
import { API_URL } from '../utils/api';

const ReturnMatchManagement = () => {
  const { user } = useAuth();
  const [scannedReturns, setScannedReturns] = useState([]);
  const [portalReturns, setPortalReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [newPortalReturnId, setNewPortalReturnId] = useState('');
  const [newPortalReturnTrackingId, setNewPortalReturnTrackingId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [portalReturnFile, setPortalReturnFile] = useState(null);
  const [scannedReturnFile, setScannedReturnFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [matchResults, setMatchResults] = useState(null);
  const [showFileUpload, setShowFileUpload] = useState(false);

  useEffect(() => {
    fetchData();
    if (user?.role === 'admin') {
      fetchSellers();
    }
  }, [selectedSeller, user]);

  const fetchSellers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/sellers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSellers(response.data.sellers || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const currentUser = user || JSON.parse(localStorage.getItem('user'));
      
      // Fetch scanned returns
      let url = `${API_URL}/orders?status=returned`;
      if (currentUser?.role === 'admin' && selectedSeller) {
        url += `&seller_id=${selectedSeller}`;
      }

      const [returnsResponse, portalResponse] = await Promise.all([
        axios.get(url, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/portal-returns`, { 
          headers: { Authorization: `Bearer ${token}` },
          // Don't throw error if endpoint fails, just return empty array
          validateStatus: (status) => status < 500
        }).catch(err => {
          // If error, return empty array
          console.log('[ReturnMatchManagement] Portal returns endpoint error (table may not exist):', err.message);
          return { data: { portal_returns: [] } };
        })
      ]);
      
      // Filter only orders that have been marked as returned and have tracking_id
      const orders = (returnsResponse.data.orders || []).filter(order => 
        order.status === 'returned' && order.tracking_id
      );
      
      setScannedReturns(orders);
      setPortalReturns(portalResponse.data?.portal_returns || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays to prevent crashes
      setScannedReturns([]);
      setPortalReturns([]);
      
      // Only show error message if it's not a portal returns table issue
      if (error.response?.status !== 500 || !error.config?.url?.includes('portal-returns')) {
        setMessage({ type: 'error', text: 'Failed to load data: ' + (error.message || 'Unknown error') });
      } else {
        // Portal returns table doesn't exist - this is expected, don't show error
        console.log('[ReturnMatchManagement] Portal returns table does not exist yet. This is normal.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTable = async () => {
    const sqlQuery = `CREATE TABLE IF NOT EXISTS portal_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_return_id TEXT NOT NULL UNIQUE,
  tracking_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`;

    const instructions = `1. Go to your Supabase Dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the SQL query below
5. Click "Run" or press Ctrl+Enter
6. Wait for success message
7. Come back here and click "Refresh" button`;

    // Try to check via API first, but if it fails, show SQL directly
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/portal-returns/create-table`,
        {},
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }
      );
      
      if (response.data.table_exists) {
        setMessage({ type: 'success', text: '✅ Table already exists! You can now add portal returns.' });
        fetchData();
        return;
      } else if (response.data.sql) {
        // Show SQL instructions from API
        const instructions = response.data.instructions?.join('\n') || '';
        setMessage({ 
          type: 'error', 
          text: `${response.data.message}\n\nSQL Query:\n${response.data.sql}\n\nInstructions:\n${instructions}` 
        });
        return;
      }
    } catch (error) {
      console.log('API check failed, showing SQL directly:', error.message);
      // If API fails, just show the SQL directly
    }

    // Fallback: Show SQL directly
    setMessage({ 
      type: 'error', 
      text: `Table does not exist. Please run the SQL below in your Supabase SQL Editor.\n\nSQL Query:\n${sqlQuery}\n\nInstructions:\n${instructions}` 
    });
  };

  const handleAddPortalReturn = async (e) => {
    e.preventDefault();
    if (!newPortalReturnId.trim() || !newPortalReturnTrackingId.trim()) {
      setMessage({ type: 'error', text: 'Please enter both Portal Return ID and Tracking ID' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/portal-returns`,
        {
          portal_return_id: newPortalReturnId.trim(),
          tracking_id: newPortalReturnTrackingId.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: 'Portal return ID added successfully!' });
      setNewPortalReturnId('');
      setNewPortalReturnTrackingId('');
      fetchData();
    } catch (error) {
      console.error('Error adding portal return:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add portal return ID';
      let fullMessage = errorMessage;
      
      // If table doesn't exist, show SQL instructions with create button
      if (error.response?.data?.sql || errorMessage.includes('does not exist')) {
        const sql = error.response?.data?.sql || `CREATE TABLE portal_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_return_id TEXT NOT NULL UNIQUE,
  tracking_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`;
        fullMessage = `${errorMessage}\n\nSQL to create table:\n${sql}\n\nClick "Create Table" button below to get instructions, or run the SQL in Supabase SQL Editor.`;
      }
      
      // Show additional details if available
      if (error.response?.data?.details) {
        fullMessage += `\n\nDetails: ${error.response.data.details}`;
      }
      
      setMessage({ type: 'error', text: fullMessage });
    }
  };

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [portalReturnToDelete, setPortalReturnToDelete] = useState(null);

  const handleDeletePortalReturn = (id) => {
    setPortalReturnToDelete(id);
    setShowPasswordModal(true);
  };

  const confirmDeletePortalReturn = async (password) => {
    if (!portalReturnToDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/portal-returns/${portalReturnToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password }
      });
      
      setMessage({ type: 'success', text: 'Portal return ID deleted successfully!' });
      fetchData();
      setPortalReturnToDelete(null);
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete portal return ID');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Match scanned returns with portal returns by tracking_id
  const getMatchedPortalReturn = (trackingId) => {
    return portalReturns.find(pr => 
      pr.tracking_id && trackingId && 
      pr.tracking_id.trim().toLowerCase() === trackingId.trim().toLowerCase()
    );
  };

  // Get unmatched scanned returns (no portal return ID)
  const unmatchedScannedReturns = scannedReturns.filter(order => 
    !getMatchedPortalReturn(order.tracking_id)
  );

  // Get unmatched portal returns (no scanned return)
  const unmatchedPortalReturns = portalReturns.filter(pr => 
    !scannedReturns.find(order => 
      order.tracking_id && pr.tracking_id &&
      order.tracking_id.trim().toLowerCase() === pr.tracking_id.trim().toLowerCase()
    )
  );

  // Parse Excel/CSV file
  const parseFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Extract tracking IDs from file data
  const extractTrackingIds = (data) => {
    const trackingIds = [];
    data.forEach(row => {
      // Try different column names
      const trackingId = row['Tracking ID'] || row['tracking_id'] || row['Tracking'] || 
                        row['TrackingID'] || row['TRACKING_ID'] || row['tracking'] ||
                        row['ID'] || row['id'] || '';
      
      if (trackingId) {
        // Clean tracking ID (remove spaces, dashes, etc.)
        const cleanId = String(trackingId).trim().replace(/[\s\-\[\]{}()]/g, '');
        if (cleanId) {
          trackingIds.push(cleanId);
        }
      }
    });
    return trackingIds;
  };

  // Extract portal return IDs and tracking IDs from file
  const extractPortalReturns = (data) => {
    const portalReturns = [];
    data.forEach(row => {
      // Try different column name combinations
      const portalReturnId = row['Portal Return ID'] || row['portal_return_id'] || 
                            row['Portal Return'] || row['Return ID'] || row['return_id'] ||
                            row['Portal ID'] || row['portal_id'] || '';
      
      const trackingId = row['Tracking ID'] || row['tracking_id'] || row['Tracking'] || 
                        row['TrackingID'] || row['TRACKING_ID'] || row['tracking'] ||
                        row['ID'] || row['id'] || '';
      
      if (portalReturnId && trackingId) {
        const cleanTrackingId = String(trackingId).trim().replace(/[\s\-\[\]{}()]/g, '');
        if (cleanTrackingId) {
          portalReturns.push({
            portal_return_id: String(portalReturnId).trim(),
            tracking_id: cleanTrackingId
          });
        }
      }
    });
    return portalReturns;
  };

  // Handle file upload and matching
  const handleFileMatch = async () => {
    if (!portalReturnFile && !scannedReturnFile) {
      setMessage({ type: 'error', text: 'Please upload at least one file' });
      return;
    }

    setUploading(true);
    setMatchResults(null);

    try {
      let portalReturnIds = [];
      let scannedReturnIds = [];
      let portalReturnsFromFile = [];

      // Parse portal return file
      if (portalReturnFile) {
        const portalData = await parseFile(portalReturnFile);
        portalReturnsFromFile = extractPortalReturns(portalData);
        portalReturnIds = portalReturnsFromFile.map(pr => pr.tracking_id.toLowerCase());
      }

      // Parse scanned return file
      if (scannedReturnFile) {
        const scannedData = await parseFile(scannedReturnFile);
        scannedReturnIds = extractTrackingIds(scannedData).map(id => id.toLowerCase());
      }

      // Match IDs
      const matched = [];
      const portalOnly = [];
      const scannedOnly = [];

      // Find matches
      portalReturnIds.forEach(portalId => {
        if (scannedReturnIds.includes(portalId)) {
          matched.push(portalId);
        } else {
          portalOnly.push(portalId);
        }
      });

      // Find scanned only
      scannedReturnIds.forEach(scannedId => {
        if (!portalReturnIds.includes(scannedId)) {
          scannedOnly.push(scannedId);
        }
      });

      setMatchResults({
        matched,
        portalOnly,
        scannedOnly,
        portalReturnsFromFile,
        totalPortal: portalReturnIds.length,
        totalScanned: scannedReturnIds.length,
        totalMatched: matched.length
      });

      setMessage({ 
        type: 'success', 
        text: `Match complete!\n\nPortal Returns: ${portalReturnIds.length}\nScanned Returns: ${scannedReturnIds.length}\nMatched: ${matched.length}\nMismatched: ${portalOnly.length + scannedOnly.length}` 
      });
    } catch (error) {
      console.error('Error processing files:', error);
      setMessage({ type: 'error', text: 'Failed to process files: ' + error.message });
    } finally {
      setUploading(false);
    }
  };

  // Bulk add portal returns from file
  const handleBulkAddPortalReturns = async () => {
    if (!matchResults || !matchResults.portalReturnsFromFile || matchResults.portalReturnsFromFile.length === 0) {
      setMessage({ type: 'error', text: 'No portal returns to add. Please upload and match files first.' });
      return;
    }

    if (!window.confirm(`Add ${matchResults.portalReturnsFromFile.length} portal returns to database?`)) {
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      const token = localStorage.getItem('token');
      
      for (const portalReturn of matchResults.portalReturnsFromFile) {
        try {
          await axios.post(
            `${API_URL}/portal-returns`,
            portalReturn,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          successCount++;
        } catch (error) {
          errorCount++;
          // Don't count duplicates as errors
          if (!error.response?.data?.error?.includes('already exists')) {
            errors.push({
              portal_return_id: portalReturn.portal_return_id,
              error: error.response?.data?.error || error.message
            });
          } else {
            successCount++; // Count duplicates as success
          }
        }
      }

      setMessage({ 
        type: successCount > 0 ? 'success' : 'error',
        text: `Bulk add complete!\n\nAdded: ${successCount}\nErrors: ${errorCount}${errors.length > 0 ? '\n\nFirst 5 errors:\n' + errors.slice(0, 5).map(e => `${e.portal_return_id}: ${e.error}`).join('\n') : ''}` 
      });
      
      fetchData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to bulk add portal returns: ' + error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Return Match Management</h1>
            <p className="text-gray-600 mt-1">Match scanned return parcels with portal return IDs</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {showFileUpload ? '✕ Close Upload' : '📁 Upload Files'}
            </button>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            <div className="whitespace-pre-line text-sm font-mono" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {message.text}
            </div>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="float-right font-bold text-lg leading-none mt-2"
            >
              ×
            </button>
            {message.text.includes('CREATE TABLE') && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
                <p className="text-xs text-yellow-800 font-semibold mb-2">📋 Instructions:</p>
                <ol className="text-xs text-yellow-700 list-decimal list-inside space-y-1">
                  <li>Go to your Supabase Dashboard</li>
                  <li>Open the SQL Editor</li>
                  <li>Copy and paste the SQL query above</li>
                  <li>Click "Run" to create the table</li>
                  <li>Then try adding the portal return ID again</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* File Upload Section */}
        {showFileUpload && (
          <div className="bg-white rounded-lg shadow p-6 border-2 border-purple-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📁 Upload Files for Matching</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Upload two files: one with Portal Return IDs and one with Scanned Return Tracking IDs. 
              The system will match them and show mismatches.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portal Return File (Excel/CSV)
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setPortalReturnFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Columns: Portal Return ID, Tracking ID (or just Tracking ID)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scanned Return File (Excel/CSV)
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setScannedReturnFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Column: Tracking ID
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleFileMatch}
                disabled={uploading || (!portalReturnFile && !scannedReturnFile)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Processing...' : '🔍 Match Files'}
              </button>
              {matchResults && matchResults.portalReturnsFromFile && matchResults.portalReturnsFromFile.length > 0 && (
                <button
                  onClick={handleBulkAddPortalReturns}
                  disabled={uploading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Adding...' : `➕ Add ${matchResults.portalReturnsFromFile.length} Portal Returns`}
                </button>
              )}
            </div>

            {/* Match Results */}
            {matchResults && (
              <div className="mt-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Match Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-blue-600 font-semibold">Total Portal</div>
                      <div className="text-2xl font-bold">{matchResults.totalPortal}</div>
                    </div>
                    <div>
                      <div className="text-blue-600 font-semibold">Total Scanned</div>
                      <div className="text-2xl font-bold">{matchResults.totalScanned}</div>
                    </div>
                    <div>
                      <div className="text-green-600 font-semibold">Matched</div>
                      <div className="text-2xl font-bold text-green-600">{matchResults.totalMatched}</div>
                    </div>
                    <div>
                      <div className="text-red-600 font-semibold">Mismatched</div>
                      <div className="text-2xl font-bold text-red-600">
                        {matchResults.portalOnly.length + matchResults.scannedOnly.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mismatched Items */}
                {(matchResults.portalOnly.length > 0 || matchResults.scannedOnly.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Portal Only (Not Scanned) */}
                    {matchResults.portalOnly.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-900 mb-2">
                          ⚠️ Portal Returns Not Scanned ({matchResults.portalOnly.length})
                        </h4>
                        <div className="max-h-60 overflow-y-auto">
                          <ul className="text-sm text-red-700 space-y-1">
                            {matchResults.portalOnly.slice(0, 50).map((id, idx) => (
                              <li key={idx} className="font-mono">{id}</li>
                            ))}
                            {matchResults.portalOnly.length > 50 && (
                              <li className="text-red-600 italic">... and {matchResults.portalOnly.length - 50} more</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Scanned Only (No Portal Return) */}
                    {matchResults.scannedOnly.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-900 mb-2">
                          ⚠️ Scanned Returns No Portal ID ({matchResults.scannedOnly.length})
                        </h4>
                        <div className="max-h-60 overflow-y-auto">
                          <ul className="text-sm text-yellow-700 space-y-1">
                            {matchResults.scannedOnly.slice(0, 50).map((id, idx) => (
                              <li key={idx} className="font-mono">{id}</li>
                            ))}
                            {matchResults.scannedOnly.length > 50 && (
                              <li className="text-yellow-600 italic">... and {matchResults.scannedOnly.length - 50} more</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Matched Items */}
                {matchResults.matched.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">
                      ✅ Matched ({matchResults.matched.length})
                    </h4>
                    <p className="text-sm text-green-700">
                      These tracking IDs appear in both files and are matched successfully.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filters and Add Portal Return */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {user?.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Seller
                </label>
                <select
                  value={selectedSeller}
                  onChange={(e) => setSelectedSeller(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Sellers</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {/* Create Table Button (if needed) */}
          {user?.role === 'admin' && (
            <div className="border-t pt-4 mt-4 mb-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 mb-3">
                  <strong>⚠️ First Time Setup:</strong> If you see "table does not exist" errors, you need to create the portal_returns table first.
                </p>
                <button
                  onClick={handleCreateTable}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  🔧 Check/Create Table
                </button>
              </div>
            </div>
          )}

          {/* Add Portal Return Form */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Portal Return ID</h3>
            <form onSubmit={handleAddPortalReturn} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Portal Return ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPortalReturnId}
                  onChange={(e) => setNewPortalReturnId(e.target.value)}
                  placeholder="Enter portal return ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPortalReturnTrackingId}
                  onChange={(e) => setNewPortalReturnTrackingId(e.target.value)}
                  placeholder="Enter tracking ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  + Add Portal Return
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Two Column Layout */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading data...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side: Scanned Returns */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-blue-50">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">
                    📦 Scanned Returns ({scannedReturns.length})
                  </h2>
                  <span className="text-sm text-gray-600">
                    Matched: {scannedReturns.length - unmatchedScannedReturns.length} | 
                    Unmatched: <span className="font-bold text-red-600">{unmatchedScannedReturns.length}</span>
                  </span>
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
                {scannedReturns.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No scanned returns found</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {scannedReturns.map((order) => {
                        const matched = getMatchedPortalReturn(order.tracking_id);
                        const isUnmatched = !matched;
                        return (
                          <tr
                            key={order.id}
                            className={`hover:bg-gray-50 ${isUnmatched ? 'bg-red-50' : 'bg-green-50'}`}
                          >
                            <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                              {order.tracking_id || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {order.seller_reference_number || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {order.customer_name || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {matched ? (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  ✓ Matched
                                </span>
                              ) : (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  ✗ Not Scanned for Return
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right Side: Portal Returns */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-green-50">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">
                    🌐 Portal Return IDs ({portalReturns.length})
                  </h2>
                  <span className="text-sm text-gray-600">
                    Matched: {portalReturns.length - unmatchedPortalReturns.length} | 
                    Unmatched: <span className="font-bold text-red-600">{unmatchedPortalReturns.length}</span>
                  </span>
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
                {portalReturns.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No portal return IDs found</p>
                    <p className="text-sm mt-2">Add portal return IDs using the form above</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Portal Return ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {portalReturns.map((portalReturn) => {
                        const matched = scannedReturns.find(order => 
                          order.tracking_id && portalReturn.tracking_id &&
                          order.tracking_id.trim().toLowerCase() === portalReturn.tracking_id.trim().toLowerCase()
                        );
                        const isUnmatched = !matched;
                        return (
                          <tr
                            key={portalReturn.id}
                            className={`hover:bg-gray-50 ${isUnmatched ? 'bg-red-50' : 'bg-green-50'}`}
                          >
                            <td className="px-4 py-3 text-sm font-semibold text-purple-600">
                              {portalReturn.portal_return_id || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {portalReturn.tracking_id || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {matched ? (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  ✓ Matched
                                </span>
                              ) : (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  ✗ Return Exists But Not Scanned
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => handleDeletePortalReturn(portalReturn.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Scanned Returns</div>
              <div className="text-2xl font-bold text-blue-600">{scannedReturns.length}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Portal Returns</div>
              <div className="text-2xl font-bold text-green-600">{portalReturns.length}</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Matched</div>
              <div className="text-2xl font-bold text-yellow-600">
                {scannedReturns.length - unmatchedScannedReturns.length}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Unmatched</div>
              <div className="text-2xl font-bold text-red-600">
                {unmatchedScannedReturns.length + unmatchedPortalReturns.length}
              </div>
            </div>
          </div>
        </div>
      </div>
      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPortalReturnToDelete(null);
        }}
        onConfirm={confirmDeletePortalReturn}
        title="Delete Portal Return ID"
        message="Are you sure you want to delete this portal return ID? This action cannot be undone."
      />
    </Layout>
  );
};

export default ReturnMatchManagement;

