import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { Link } from 'react-router-dom';

import { API_URL } from '../utils/api';

const LedgerCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    cnic: ''
  });
  const [bulkData, setBulkData] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/ledger/customers${searchTerm ? `?search=${searchTerm}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setMessage({ type: 'error', text: 'Failed to load customers' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/ledger/customers`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Customer added successfully!' });
      setFormData({ name: '', phone: '', address: '', city: '', cnic: '' });
      setShowAddForm(false);
      fetchCustomers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to add customer' });
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      
      // Parse bulk data (one customer per line, comma-separated: name,phone,address,city,cnic)
      const lines = bulkData.split('\n').filter(line => line.trim());
      const customersToAdd = [];

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          customersToAdd.push({
            name: parts[0] || '',
            phone: parts[1] || '',
            address: parts[2] || '',
            city: parts[3] || '',
            cnic: parts[4] || ''
          });
        }
      }

      if (customersToAdd.length === 0) {
        setMessage({ type: 'error', text: 'No valid customers found in bulk data' });
        setUploading(false);
        return;
      }

      // Add customers one by one (or you can create a bulk endpoint)
      let successCount = 0;
      let errorCount = 0;

      for (const customer of customersToAdd) {
        try {
          await axios.post(`${API_URL}/ledger/customers`, customer, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
        } catch (error) {
          errorCount++;
          console.error('Error adding customer:', customer, error);
        }
      }

      setMessage({
        type: successCount > 0 ? 'success' : 'error',
        text: `Added ${successCount} customers${errorCount > 0 ? `, ${errorCount} failed` : ''}`
      });
      setBulkData('');
      setShowBulkForm(false);
      fetchCustomers();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add customers in bulk' });
    } finally {
      setUploading(false);
    }
  };

<<<<<<< HEAD
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_URL}/ledger/customers/bulk-upload-template`;
      
      console.log('[LedgerCustomers] Downloading template from:', url);
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('[LedgerCustomers] Template download response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[LedgerCustomers] Template download failed:', response.status, errorText);
        throw new Error(`Failed to download template: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'customer-bulk-upload-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setMessage({
        type: 'success',
        text: 'Template downloaded successfully!'
      });
    } catch (error) {
      console.error('[LedgerCustomers] Error downloading template:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to download template'
      });
    }
  };

=======
>>>>>>> 8dc07ead76b7cbe28ec94158b4c8faa94539e79d
  const handleBulkFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

<<<<<<< HEAD
      console.log('[LedgerCustomers] Uploading file:', file.name, 'size:', file.size);

=======
>>>>>>> 8dc07ead76b7cbe28ec94158b4c8faa94539e79d
      const response = await axios.post(`${API_URL}/ledger/customers/bulk-upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

<<<<<<< HEAD
      console.log('[LedgerCustomers] Upload response:', response.data);

      const { added = 0, skipped = 0, total = 0, errors = [], skipReasons = {} } = response.data;

      // Build detailed message
      let messageText = `Imported ${added} of ${total} customers`;
      if (skipped > 0) {
        messageText += `\n${skipped} skipped`;
        
        // Add breakdown of skip reasons
        const reasons = [];
        if (skipReasons.missingFields > 0) reasons.push(`${skipReasons.missingFields} missing name/phone`);
        if (skipReasons.duplicates > 0) reasons.push(`${skipReasons.duplicates} duplicate phone numbers`);
        if (skipReasons.insertErrors > 0) reasons.push(`${skipReasons.insertErrors} database errors`);
        if (skipReasons.otherErrors > 0) reasons.push(`${skipReasons.otherErrors} other errors`);
        
        if (reasons.length > 0) {
          messageText += `\nBreakdown: ${reasons.join(', ')}`;
        }
      }

      // Show sample errors if any (first 5)
      if (errors && errors.length > 0) {
        console.log('[LedgerCustomers] Upload errors:', errors);
        const sampleErrors = errors.slice(0, 5).map(err => `Row ${err.row}: ${err.error}`).join('\n');
        const moreErrors = errors.length > 5 ? `\n... and ${errors.length - 5} more (check console)` : '';
        
        // Show all errors in console
        console.warn('[LedgerCustomers] All errors:', errors);
        
        // Add sample errors to message
        messageText += `\n\nSample errors:\n${sampleErrors}${moreErrors}`;
      }

      setMessage({
        type: added > 0 ? 'success' : 'error',
        text: messageText
      });
      
      setShowBulkForm(false);
      fetchCustomers();
    } catch (error) {
      console.error('[LedgerCustomers] Upload error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload file';
      setMessage({
        type: 'error',
        text: `Upload failed: ${errorMessage}`
=======
      setMessage({
        type: 'success',
        text: `Successfully imported ${response.data.added || 0} customers`
      });
      setShowBulkForm(false);
      fetchCustomers();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to upload file'
>>>>>>> 8dc07ead76b7cbe28ec94158b4c8faa94539e79d
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/ledger/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Customer deleted successfully!' });
      fetchCustomers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete customer' });
    }
  };

  const handleSendWhatsAppPDF = async (customerId, phoneNumber) => {
    if (!phoneNumber) {
      alert('Customer phone number is not available');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // First, generate and download the PDF
      const response = await axios.get(`${API_URL}/ledger/customers/${customerId}/enhanced-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create blob and download link
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      // Open PDF in new window for user to review
      const newWindow = window.open(url, '_blank');
      
      // Wait a bit then try to send via WhatsApp
      setTimeout(() => {
        // Format phone number (remove spaces, dashes, etc.)
        const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
        const whatsappNumber = cleanPhone.startsWith('92') ? cleanPhone : 
                              cleanPhone.startsWith('0') ? '92' + cleanPhone.substring(1) : 
                              '92' + cleanPhone;
        
        // Create WhatsApp message
        const message = encodeURIComponent(`Hello! Please find your ledger statement from Adnan Khaddar House.`);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
        
        // Open WhatsApp
        window.open(whatsappUrl, '_blank');
        
        // Also provide download option
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ledger-${customerId}-${new Date().toISOString().split('T')[0]}.html`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        setMessage({ 
          type: 'success', 
          text: 'PDF opened. Please attach it to WhatsApp and send to the customer.' 
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to generate PDF. Please try again.' 
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Customers Management</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your ledger customers</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/ledger"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Back to Dashboard
            </Link>
<<<<<<< HEAD
            <Link
              to="/ledger/khata"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Ledger Khata
            </Link>
=======
>>>>>>> 8dc07ead76b7cbe28ec94158b4c8faa94539e79d
            <button
              onClick={() => {
                setShowBulkForm(!showBulkForm);
                setShowAddForm(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📥 Bulk Import
            </button>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowBulkForm(false);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              + Add Customer
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
<<<<<<< HEAD
            <div className="whitespace-pre-line text-sm">{message.text}</div>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="float-right font-bold text-lg leading-none"
=======
            {message.text}
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="float-right font-bold"
>>>>>>> 8dc07ead76b7cbe28ec94158b4c8faa94539e79d
            >
              ×
            </button>
          </div>
        )}

        {/* Add Customer Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Customer</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
                <input
                  type="text"
                  name="cnic"
                  value={formData.cnic}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Customer
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bulk Import Form */}
        {showBulkForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
<<<<<<< HEAD
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Bulk Import Customers</h2>
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                📥 Download Template
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 font-medium mb-1">📋 Template Columns (All Supported):</p>
                <div className="text-xs text-blue-700 grid grid-cols-2 md:grid-cols-5 gap-1">
                  <div><strong>Name</strong> <span className="text-red-600">*Required</span></div>
                  <div><strong>Phone</strong> <span className="text-red-600">*Required</span></div>
                  <div>Address (Optional)</div>
                  <div>City (Optional)</div>
                  <div>CNIC (Optional)</div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 Tip: Download the template to see the exact format with sample data
                </p>
              </div>
=======
            <h2 className="text-xl font-bold text-gray-800 mb-4">Bulk Import Customers</h2>
            <div className="space-y-4">
>>>>>>> 8dc07ead76b7cbe28ec94158b4c8faa94539e79d
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Excel/CSV File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBulkFileUpload}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
<<<<<<< HEAD
                  Supported formats: Excel (.xlsx, .xls) or CSV. Columns: Name, Phone, Address, City, CNIC
=======
                  File should have columns: Name, Phone, Address, City, CNIC
>>>>>>> 8dc07ead76b7cbe28ec94158b4c8faa94539e79d
                </p>
              </div>
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Paste Data (One per line, comma-separated: Name,Phone,Address,City,CNIC)
                </label>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  rows={10}
                  placeholder="Ali Khan,03001234567,123 Main St,Lahore,12345-1234567-1&#10;Ahmed Ali,03009876543,456 Park Ave,Karachi,"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  disabled={uploading}
                />
                <button
                  onClick={handleBulkSubmit}
                  disabled={uploading || !bulkData.trim()}
                  className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Importing...' : 'Import Data'}
                </button>
                <button
                  onClick={() => setShowBulkForm(false)}
                  className="mt-2 ml-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Customers Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading customers...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        No customers found. Add your first customer to get started!
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          {customer.cnic && (
                            <div className="text-xs text-gray-500">CNIC: {customer.cnic}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.phone}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {customer.address || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.city || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-semibold ${
                              customer.balance >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(customer.balance || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/ledger/entries?customer_id=${customer.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            View Entries
                          </Link>
                          <button
                            onClick={() => handleSendWhatsAppPDF(customer.id, customer.phone)}
                            className="text-green-600 hover:text-green-900 mr-4"
                            title="Send PDF via WhatsApp"
                          >
                            📱 WhatsApp
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {customers.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Total: <span className="font-semibold">{customers.length}</span> customers
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LedgerCustomers;

