import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';

import { API_URL } from '../utils/api';

const Automation = () => {
  const { user } = useAuth();
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [manualUpdates, setManualUpdates] = useState([{ seller_reference_number: '', status: 'delivered' }]);
  const [activeTab, setActiveTab] = useState('status'); // 'status', 'tracking', 'return-scan'
  const [trackingUploadFile, setTrackingUploadFile] = useState(null);
  const [trackingManualUpdates, setTrackingManualUpdates] = useState([{ seller_reference_number: '', tracking_id: '' }]);
  const [returnScanFile, setReturnScanFile] = useState(null);
  const [returnScanTrackingIds, setReturnScanTrackingIds] = useState('');
  const [digiPortalSyncing, setDigiPortalSyncing] = useState(false);
  const [digiPortalResults, setDigiPortalResults] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSellers();
    }
  }, [user]);

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

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Access denied. Only administrators can access this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select a file');
      return;
    }

    setUploading(true);
    setResults(null);

    try {
      // Read the Excel/CSV file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Process the data
          const orders = jsonData.map(row => {
            const refNumber = row['Reference Number'] || row['ref_number'] || row['Ref #'] || row['Seller Reference Number'] || row['Reference'] || '';
            const status = (row['Status'] || row['status'] || 'delivered').toLowerCase().trim();
            return {
              seller_reference_number: String(refNumber).trim(),
              status: status
            };
          }).filter(order => order.seller_reference_number && order.seller_reference_number.length > 0);

          if (orders.length === 0) {
            alert('No valid orders found in the file. Please check the format. Each row must have a Reference Number and optionally a Status.');
            setUploading(false);
            return;
          }

          // Validate that all orders have required fields
          const invalidOrders = orders.filter(order => !order.seller_reference_number || !order.status);
          if (invalidOrders.length > 0) {
            alert(`Found ${invalidOrders.length} orders with missing required fields. Please check your file.`);
            setUploading(false);
            return;
          }

          // Send to API - include seller_id if selected
          const token = localStorage.getItem('token');
          const requestBody = { orders };
          if (selectedSeller) {
            requestBody.seller_id = selectedSeller;
          }
          
          // Show processing message for large batches
          if (orders.length > 50) {
            console.log(`Processing ${orders.length} orders... This may take a moment.`);
          }
          
          const startTime = Date.now();
          const response = await axios.post(
            `${API_URL}/orders/bulk-update-status`,
            requestBody,
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 300000 // 5 minutes timeout for large batches
            }
          );
          const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

          setResults(response.data);
          const updatedCount = response.data.updated?.length || 0;
          const errorCount = response.data.errors?.length || 0;
          alert(`✅ Processed ${orders.length} orders in ${processingTime}s\n\nUpdated: ${updatedCount}\nErrors: ${errorCount}`);
          setUploadFile(null);
        } catch (error) {
          console.error('Error processing file:', error);
          const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
          alert(`Error processing file: ${errorMessage}`);
          if (error.response?.data?.error) {
            console.error('Server error details:', error.response.data);
          }
        } finally {
          setUploading(false);
        }
      };

      reader.readAsArrayBuffer(uploadFile);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file: ' + error.message);
      setUploading(false);
    }
  };

  const handleManualUpdate = async () => {
    // Filter and validate updates - ensure proper format
    const validUpdates = manualUpdates
      .filter(update => update.seller_reference_number && update.seller_reference_number.trim().length > 0)
      .map(update => ({
        seller_reference_number: String(update.seller_reference_number).trim(),
        status: (update.status || 'delivered').toLowerCase().trim()
      }));
    
    if (validUpdates.length === 0) {
      alert('Please add at least one order with a valid reference number to update');
      return;
    }

    setUploading(true);
    setResults(null);

    try {
      const token = localStorage.getItem('token');
      const requestBody = { orders: validUpdates };
      if (selectedSeller) {
        requestBody.seller_id = selectedSeller;
      }
      
      // Show processing message for large batches
      if (validUpdates.length > 50) {
        console.log(`Processing ${validUpdates.length} orders... This may take a moment.`);
      }
      
      const startTime = Date.now();
      const response = await axios.post(
        `${API_URL}/orders/bulk-update-status`,
        requestBody,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 300000 // 5 minutes timeout for large batches
        }
      );
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

      setResults(response.data);
      const updatedCount = response.data.updated?.length || 0;
      const errorCount = response.data.errors?.length || 0;
      alert(`✅ Processed ${validUpdates.length} orders in ${processingTime}s\n\nUpdated: ${updatedCount}\nErrors: ${errorCount}`);
      setManualUpdates([{ seller_reference_number: '', status: 'delivered' }]);
    } catch (error) {
      console.error('Error updating orders:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      alert(`Error updating orders: ${errorMessage}`);
      if (error.response?.data?.error) {
        console.error('Server error details:', error.response.data);
      }
      console.error('Error updating orders:', error);
      alert('Error updating orders: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  const addManualRow = () => {
    setManualUpdates([...manualUpdates, { seller_reference_number: '', status: 'delivered' }]);
  };

  const removeManualRow = (index) => {
    setManualUpdates(manualUpdates.filter((_, i) => i !== index));
  };

  const updateManualRow = (index, field, value) => {
    const updated = [...manualUpdates];
    updated[index][field] = value;
    setManualUpdates(updated);
  };

  const handleBulkTrackingUpload = async (e) => {
    e.preventDefault();
    if (!trackingUploadFile && trackingManualUpdates.filter(u => u.seller_reference_number && u.tracking_id).length === 0) {
      alert('Please upload a file or enter tracking IDs manually');
      return;
    }

    setUploading(true);
    setResults(null);

    try {
      let updates = [];
      
      if (trackingUploadFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            updates = jsonData.map(row => ({
              seller_reference_number: row['Reference Number'] || row['ref_number'] || row['Ref #'] || row['Seller Reference Number'] || '',
              tracking_id: row['Tracking ID'] || row['tracking_id'] || row['Tracking'] || ''
            })).filter(u => u.seller_reference_number && u.tracking_id);

            await processTrackingUpdates(updates);
          } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file: ' + error.message);
            setUploading(false);
          }
        };
        reader.readAsArrayBuffer(trackingUploadFile);
      } else {
        updates = trackingManualUpdates.filter(u => u.seller_reference_number && u.tracking_id);
        await processTrackingUpdates(updates);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
      setUploading(false);
    }
  };

  const processTrackingUpdates = async (updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/orders/bulk-update-tracking`,
        { updates },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setResults(response.data);
      alert(`Processed ${updates.length} orders: ${response.data.updated.length} updated, ${response.data.errors.length} errors`);
      setTrackingUploadFile(null);
      setTrackingManualUpdates([{ seller_reference_number: '', tracking_id: '' }]);
    } catch (error) {
      console.error('Error updating tracking IDs:', error);
      alert('Error updating tracking IDs: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleBulkReturnScan = async (e) => {
    e.preventDefault();
    // Skip anything after comma in each tracking ID (e.g., "TRACK123,1764,2400" -> "TRACK123")
    const trackingIds = returnScanTrackingIds.split('\n')
      .map(id => id.trim().split(',')[0].trim())
      .filter(id => id);
    
    if (trackingIds.length === 0 && !returnScanFile) {
      alert('Please enter tracking IDs or upload a file');
      return;
    }

    setUploading(true);
    setResults(null);

    try {
      let ids = [];
      
      if (returnScanFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            ids = jsonData.map(row => {
              const id = row['Tracking ID'] || row['tracking_id'] || row['Tracking'] || '';
              // Skip anything after comma (e.g., "TRACK123,1764,2400" -> "TRACK123")
              return id ? String(id).trim().split(',')[0].trim() : '';
            }).filter(id => id);

            await processReturnScan(ids);
          } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file: ' + error.message);
            setUploading(false);
          }
        };
        reader.readAsArrayBuffer(returnScanFile);
      } else {
        await processReturnScan(trackingIds);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
      setUploading(false);
    }
  };

  const processReturnScan = async (trackingIds) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/orders/bulk-return-scan`,
        { tracking_ids: trackingIds },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setResults(response.data);
      alert(`Processed ${trackingIds.length} orders: ${response.data.updated.length} marked as return, ${response.data.errors.length} errors`);
      setReturnScanFile(null);
      setReturnScanTrackingIds('');
    } catch (error) {
      console.error('Error processing return scan:', error);
      alert('Error processing return scan: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDigiPortalSync = async () => {
    setDigiPortalSyncing(true);
    setDigiPortalResults(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/orders/sync-digi-portal`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setDigiPortalResults(response.data);
      alert(`✅ Sync Complete!\n\nTotal Checked: ${response.data.total}\nUpdated: ${response.data.updated}\nErrors: ${response.data.errors}`);
    } catch (error) {
      console.error('Error syncing from Digi portal:', error);
      alert('Error syncing from Digi portal: ' + (error.response?.data?.error || error.message));
      setDigiPortalResults({ error: error.response?.data?.error || error.message });
    } finally {
      setDigiPortalSyncing(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900">Automation & Bulk Operations</h1>
        <p className="text-gray-600">Manage orders in bulk - status updates, tracking IDs, and return scans</p>

        {/* Seller Selection for Status Updates */}
        {activeTab === 'status' && (
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Seller (Optional)
            </label>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Sellers</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name} ({seller.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              {selectedSeller 
                ? 'Only orders from the selected seller will be updated.'
                : 'Orders from all sellers will be processed. Select a seller to filter.'}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'status'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Status Updates
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'tracking'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Bulk Tracking ID
          </button>
          <button
            onClick={() => setActiveTab('return-scan')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'return-scan'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Bulk Return Scan
          </button>
          <button
            onClick={() => setActiveTab('digi-portal')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'digi-portal'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔄 Digi Portal Sync
          </button>
        </div>

        {/* Status Update Tab */}
        {activeTab === 'status' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Upload Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📤 Upload CSV/Excel File</h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload a file with columns: <strong>Reference Number</strong> (or Ref #) and <strong>Status</strong> (delivered, return, paid)
            </p>
            <form onSubmit={handleFileUpload}>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="mb-4 w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700"
              >
                {uploading ? 'Processing...' : 'Upload & Update'}
              </button>
            </form>
          </div>

          {/* Manual Update Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">✏️ Manual Update</h2>
            <div className="space-y-2 mb-4">
              {manualUpdates.map((update, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Reference Number"
                    value={update.seller_reference_number}
                    onChange={(e) => updateManualRow(index, 'seller_reference_number', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <select
                    value={update.status}
                    onChange={(e) => updateManualRow(index, 'status', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="delivered">Delivered</option>
                    <option value="returned">Returned</option>
                    <option value="paid">Paid</option>
                  </select>
                  {manualUpdates.length > 1 && (
                    <button
                      onClick={() => removeManualRow(index)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addManualRow}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                + Add Row
              </button>
              <button
                onClick={handleManualUpdate}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700"
              >
                Update Orders
              </button>
            </div>
          </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
              <h3 className="font-semibold text-blue-900 mb-2">📝 Instructions</h3>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                <li>File format: CSV or Excel (.xlsx, .xls)</li>
                <li>Required columns: Reference Number (or Ref #) and Status</li>
                <li>Status values: delivered, returned, paid</li>
                <li>Reference numbers must match existing orders</li>
                <li>You can update multiple orders at once</li>
              </ul>
            </div>
          </>
        )}

        {/* Bulk Tracking ID Tab */}
        {activeTab === 'tracking' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">📤 Upload CSV/Excel File</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload a file with columns: <strong>Reference Number</strong> and <strong>Tracking ID</strong>
              </p>
              <form onSubmit={handleBulkTrackingUpload}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setTrackingUploadFile(e.target.files[0])}
                  className="mb-4 w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  type="submit"
                  disabled={!trackingUploadFile || uploading}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700"
                >
                  {uploading ? 'Processing...' : 'Upload & Update'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">✏️ Manual Update</h2>
              <div className="space-y-2 mb-4">
                {trackingManualUpdates.map((update, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Reference Number"
                      value={update.seller_reference_number}
                      onChange={(e) => {
                        const updated = [...trackingManualUpdates];
                        updated[index].seller_reference_number = e.target.value;
                        setTrackingManualUpdates(updated);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Tracking ID"
                      value={update.tracking_id}
                      onChange={(e) => {
                        const updated = [...trackingManualUpdates];
                        updated[index].tracking_id = e.target.value;
                        setTrackingManualUpdates(updated);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    {trackingManualUpdates.length > 1 && (
                      <button
                        onClick={() => setTrackingManualUpdates(trackingManualUpdates.filter((_, i) => i !== index))}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTrackingManualUpdates([...trackingManualUpdates, { seller_reference_number: '', tracking_id: '' }])}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  + Add Row
                </button>
                <button
                  onClick={handleBulkTrackingUpload}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700"
                >
                  Update Tracking IDs
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Return Scan Tab */}
        {activeTab === 'return-scan' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">📤 Upload CSV/Excel File</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload a file with <strong>Tracking ID</strong> column. Each tracking ID will be marked as return automatically.
              </p>
              <form onSubmit={handleBulkReturnScan}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setReturnScanFile(e.target.files[0])}
                  className="mb-4 w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  type="submit"
                  disabled={!returnScanFile || uploading}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 hover:bg-red-700"
                >
                  {uploading ? 'Processing...' : 'Scan & Mark Returns'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">✏️ Manual Entry</h2>
              <p className="text-sm text-gray-600 mb-4">
                Enter tracking IDs (one per line). Orders will be automatically marked as return when scanned.
              </p>
              <textarea
                value={returnScanTrackingIds}
                onChange={(e) => setReturnScanTrackingIds(e.target.value)}
                placeholder="Enter tracking IDs, one per line:&#10;TRACK001&#10;TRACK002&#10;TRACK003"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 h-48"
                rows="10"
              />
              <button
                onClick={handleBulkReturnScan}
                disabled={uploading || !returnScanTrackingIds.trim()}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 hover:bg-red-700"
              >
                {uploading ? 'Processing...' : 'Scan & Mark Returns'}
              </button>
            </div>
          </div>
        )}

        {/* Digi Portal Sync Tab */}
        {activeTab === 'digi-portal' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">🔄 Digi Portal Automatic Status Sync</h3>
              <p className="text-sm text-blue-800 mb-4">
                This feature automatically syncs order status from Digi Portal (TCS, MNP, Leopard, etc.) based on tracking IDs.
                Only orders with status "delivered" or "returned" will be updated.
              </p>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                <li>Syncs all pending/confirmed orders with tracking IDs</li>
                <li>Supports multiple courier services (TCS, MNP, Leopard, etc.)</li>
                <li>Only updates "delivered" and "returned" statuses</li>
                <li>Automatic sync runs every 15 minutes (if enabled in .env)</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Manual Sync</h2>
              <p className="text-sm text-gray-600 mb-4">
                Click the button below to manually sync all orders from Digi Portal for all sellers.
              </p>
              <button
                onClick={handleDigiPortalSync}
                disabled={digiPortalSyncing}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 font-medium"
              >
                {digiPortalSyncing ? '🔄 Syncing...' : '🔄 Sync from Digi Portal'}
              </button>

              {digiPortalResults && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Sync Results</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 font-medium">Total Checked</p>
                      <p className="text-2xl font-bold text-gray-700">{digiPortalResults.total || 0}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-medium">Updated</p>
                      <p className="text-2xl font-bold text-green-700">{digiPortalResults.updated || 0}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-600 font-medium">Errors</p>
                      <p className="text-2xl font-bold text-red-700">{digiPortalResults.errors || 0}</p>
                    </div>
                  </div>

                  {digiPortalResults.details && digiPortalResults.details.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Details:</h4>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                        {digiPortalResults.details.slice(0, 20).map((detail, index) => (
                          <div key={index} className={`text-sm mb-2 ${detail.success ? 'text-green-700' : 'text-red-700'}`}>
                            {detail.success ? (
                              <span>✅ {detail.trackingId}: Updated to {detail.status}</span>
                            ) : (
                              <span>❌ {detail.trackingId || detail.orderId}: {detail.error}</span>
                            )}
                          </div>
                        ))}
                        {digiPortalResults.details.length > 20 && (
                          <p className="text-xs text-gray-500 mt-2">
                            ... and {digiPortalResults.details.length - 20} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {digiPortalResults.error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700 text-sm">{digiPortalResults.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-900 mb-2">⚙️ Configuration Required</h3>
              <p className="text-sm text-yellow-800 mb-2">
                To use this feature, you need to configure Digi Portal credentials in your <code className="bg-yellow-100 px-1 rounded">.env</code> file:
              </p>
              <pre className="bg-yellow-100 p-3 rounded text-xs overflow-x-auto">
{`DIGI_PORTAL_AUTO_SYNC_ENABLED=true
DIGI_PORTAL_BASE_URL=https://your-digi-portal-url.com/api
DIGI_PORTAL_USERNAME=your-username
DIGI_PORTAL_PASSWORD=your-password
DIGI_PORTAL_AHSAN_USERNAME=ahsan-username
DIGI_PORTAL_AHSAN_PASSWORD=ahsan-password`}
              </pre>
            </div>
          </div>
        )}

        {/* Results Section - Show for all tabs */}
        {results && activeTab !== 'digi-portal' && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">📊 Update Results</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Successfully Updated</p>
                <p className="text-2xl font-bold text-green-700">{results.updated?.length || 0}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600 font-medium">Errors</p>
                <p className="text-2xl font-bold text-red-700">{results.errors?.length || 0}</p>
              </div>
            </div>

            {results.errors && results.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-red-600 mb-2">Errors:</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {results.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      <strong>{error.ref || error.tracking_id || 'N/A'}:</strong> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.updated && results.updated.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-green-600 mb-2">Updated Orders:</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {results.updated.map((ref, index) => (
                      <span key={index} className="px-2 py-1 bg-green-200 text-green-800 rounded text-sm">
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Automation;

