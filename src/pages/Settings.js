import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { API_URL, getApiUrl } from '../utils/api';

const Settings = () => {
  const { user } = useAuth();
  const [dbStatus, setDbStatus] = useState({ status: 'checking', message: '' });
  const [apiStatus, setApiStatus] = useState({ status: 'checking', message: '' });
  const [backupProgress, setBackupProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [backupFile, setBackupFile] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [sellers, setSellers] = useState([]);
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    checkDatabase();
    checkAPI();
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

  const checkDatabase = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/health`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });
      
      if (response.data.database === 'connected') {
        setDbStatus({ status: 'connected', message: 'Database connection successful' });
      } else {
        setDbStatus({ status: 'error', message: 'Database not configured' });
      }
    } catch (error) {
      setDbStatus({ status: 'error', message: error.message || 'Failed to connect to database' });
    }
  };

  const checkAPI = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/test`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });
      
      if (response.data.message === 'Server is running!') {
        setApiStatus({ status: 'connected', message: 'API is responding correctly' });
      } else {
        setApiStatus({ status: 'error', message: 'API response unexpected' });
      }
    } catch (error) {
      setApiStatus({ status: 'error', message: error.message || 'Failed to connect to API' });
    }
  };

  const handleBackupOrders = async () => {
    try {
      setBackupProgress(0);
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      
      // Fetch all orders
      const response = await axios.get(`${apiUrl}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100000 } // Get all orders
      });

      const orders = response.data.orders || [];
      setBackupProgress(50);

      // Convert to Excel
      const ws = XLSX.utils.json_to_sheet(orders.map(order => ({
        'Reference Number': order.seller_reference_number,
        'Product Codes': order.product_codes,
        'Customer Name': order.customer_name,
        'Phone 1': order.phone_number_1,
        'Phone 2': order.phone_number_2,
        'Address': order.customer_address,
        'City': order.city,
        'Status': order.status,
        'Tracking ID': order.tracking_id,
        'Quantity': order.qty,
        'Seller Price': order.seller_price,
        'Shipper Price': order.shipper_price,
        'Delivery Charge': order.delivery_charge,
        'Profit': order.profit,
        'Is Paid': order.is_paid ? 'Yes' : 'No',
        'Created At': new Date(order.created_at).toLocaleString(),
        'Updated At': new Date(order.updated_at).toLocaleString()
      })));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      XLSX.writeFile(wb, `orders-backup-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setBackupProgress(100);
      setTimeout(() => setBackupProgress(0), 2000);
      alert(`✅ Backup completed! ${orders.length} orders exported.`);
    } catch (error) {
      console.error('Error backing up orders:', error);
      alert('❌ Failed to backup orders: ' + (error.message || 'Unknown error'));
      setBackupProgress(0);
    }
  };

  const handleImportOrders = async () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    if (!selectedSeller) {
      alert('Please select a seller');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportStatus('Reading file...');

    try {
      const fileData = await importFile.arrayBuffer();
      const workbook = XLSX.read(fileData);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      setImportStatus(`Found ${data.length} records. Processing in batches of 2000...`);
      
      const batchSize = 2000;
      const batches = [];
      for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
      }

      let totalProcessed = 0;
      let totalCreated = 0;
      let totalErrors = 0;

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        setImportStatus(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} records)...`);
        
        const formData = new FormData();
        const batchWorkbook = XLSX.utils.book_new();
        const batchSheet = XLSX.utils.json_to_sheet(batch);
        XLSX.utils.book_append_sheet(batchWorkbook, batchSheet, 'Orders');
        const batchBuffer = XLSX.write(batchWorkbook, { type: 'array', bookType: 'xlsx' });
        const batchBlob = new Blob([batchBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const batchFile = new File([batchBlob], `batch-${batchIndex + 1}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        formData.append('file', batchFile);
        formData.append('seller_id', selectedSeller);

        try {
          const token = localStorage.getItem('token');
          const apiUrl = getApiUrl();
          const response = await axios.post(`${apiUrl}/orders/bulk-upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`
            },
            timeout: 600000
          });

          totalProcessed += response.data.total_processed || batch.length;
          totalCreated += response.data.total_created || 0;
          totalErrors += response.data.total_errors || 0;

          const progress = ((batchIndex + 1) / batches.length) * 100;
          setImportProgress(progress);
        } catch (error) {
          console.error(`Error processing batch ${batchIndex + 1}:`, error);
          totalErrors += batch.length;
        }
      }

      setImportProgress(100);
      setImportStatus(`✅ Import completed! Processed: ${totalProcessed}, Created: ${totalCreated}, Errors: ${totalErrors}`);
      setImporting(false);
      
      setTimeout(() => {
        setImportProgress(0);
        setImportStatus('');
        setImportFile(null);
      }, 5000);
    } catch (error) {
      console.error('Error importing orders:', error);
      setImportStatus('❌ Import failed: ' + (error.message || 'Unknown error'));
      setImporting(false);
      setImportProgress(0);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-indigo-100">System configuration and maintenance</p>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>🔌</span> Database Connection
            </h2>
            <div className="space-y-3">
              <div className={`p-4 rounded-lg ${
                dbStatus.status === 'connected' ? 'bg-green-50 border border-green-300' :
                dbStatus.status === 'error' ? 'bg-red-50 border border-red-300' :
                'bg-yellow-50 border border-yellow-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${
                    dbStatus.status === 'connected' ? 'text-green-800' :
                    dbStatus.status === 'error' ? 'text-red-800' :
                    'text-yellow-800'
                  }`}>
                    {dbStatus.status === 'connected' ? '✅ Connected' :
                     dbStatus.status === 'error' ? '❌ Error' :
                     '⏳ Checking...'}
                  </span>
                </div>
                <p className={`text-sm mt-2 ${
                  dbStatus.status === 'connected' ? 'text-green-700' :
                  dbStatus.status === 'error' ? 'text-red-700' :
                  'text-yellow-700'
                }`}>
                  {dbStatus.message}
                </p>
              </div>
              <button
                onClick={checkDatabase}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Recheck Connection
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>🌐</span> API Status
            </h2>
            <div className="space-y-3">
              <div className={`p-4 rounded-lg ${
                apiStatus.status === 'connected' ? 'bg-green-50 border border-green-300' :
                apiStatus.status === 'error' ? 'bg-red-50 border border-red-300' :
                'bg-yellow-50 border border-yellow-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${
                    apiStatus.status === 'connected' ? 'text-green-800' :
                    apiStatus.status === 'error' ? 'text-red-800' :
                    'text-yellow-800'
                  }`}>
                    {apiStatus.status === 'connected' ? '✅ Connected' :
                     apiStatus.status === 'error' ? '❌ Error' :
                     '⏳ Checking...'}
                  </span>
                </div>
                <p className={`text-sm mt-2 ${
                  apiStatus.status === 'connected' ? 'text-green-700' :
                  apiStatus.status === 'error' ? 'text-red-700' :
                  'text-yellow-700'
                }`}>
                  {apiStatus.message}
                </p>
              </div>
              <button
                onClick={checkAPI}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Recheck API
              </button>
            </div>
          </div>
        </div>

        {/* Backup Orders */}
        {user?.role === 'admin' && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <span>💾</span> Backup All Orders
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Export all orders to an Excel file for backup purposes.
              </p>
              <button
                onClick={handleBackupOrders}
                disabled={backupProgress > 0 && backupProgress < 100}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {backupProgress > 0 && backupProgress < 100 ? `Backing up... ${Math.round(backupProgress)}%` : 'Download Backup'}
              </button>
              {backupProgress > 0 && backupProgress < 100 && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${backupProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Import Old Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <span>📥</span> Import Old Orders
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Import old orders from Excel file. Orders will be processed in batches of 2000.
              </p>
              
              {/* Template Download Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <span>📋</span> Download Template
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Download Excel template with all required columns for old orders import:
                </p>
                <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300 mb-3">
                  <p><strong>Required Columns:</strong> Ref #, Customer, Phone, Address, City, Products, Seller Price</p>
                  <p><strong>Optional Columns:</strong> Phone 2, Courier, Shipper Price, DC, Profit, Tracking ID, Status, Paid</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const apiUrl = getApiUrl();
                      const response = await fetch(`${apiUrl}/orders/bulk-upload-template`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      if (!response.ok) {
                        throw new Error('Failed to download template');
                      }
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'old-orders-import-template.xlsx';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (err) {
                      console.error('Error downloading template:', err);
                      alert('Failed to download template. Please try again.');
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  📥 Download Old Orders Template (Excel)
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Seller
                  </label>
                  <select
                    value={selectedSeller}
                    onChange={(e) => setSelectedSeller(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">Select seller</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name} ({seller.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Excel File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files[0])}
                    disabled={importing}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>

                {importStatus && (
                  <div className={`p-4 rounded-lg ${
                    importStatus.includes('✅') ? 'bg-green-50 border border-green-300 text-green-800' :
                    importStatus.includes('❌') ? 'bg-red-50 border border-red-300 text-red-800' :
                    'bg-blue-50 border border-blue-300 text-blue-800'
                  }`}>
                    <p className="text-sm font-medium">{importStatus}</p>
                  </div>
                )}

                {importProgress > 0 && importProgress < 100 && (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Progress: {Math.round(importProgress)}%
                    </p>
                  </div>
                )}

                <button
                  onClick={handleImportOrders}
                  disabled={!importFile || !selectedSeller || importing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  {importing ? 'Importing...' : 'Import Orders'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Settings;

