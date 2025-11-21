import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { API_URL } from '../utils/api';

const LedgerKhata = () => {
  const [entries, setEntries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const customerIdFromUrl = searchParams.get('customer_id');
  
  const [filters, setFilters] = useState({
    customer_id: customerIdFromUrl || '',
    bill_number: '',
    start_date: '',
    end_date: ''
  });

  const [totals, setTotals] = useState({
    total_amount: 0,
    total_received: 0,
    total_credit: 0,
    total_debit: 0,
    final_balance: 0,
    remaining_balance: 0
  });

  const [message, setMessage] = useState({ type: '', text: '' });
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingWhatsApp, setLoadingWhatsApp] = useState(false);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [addingPayment, setAddingPayment] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchEntries();
  }, [filters]);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/ledger/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      const token = localStorage.getItem('token');
      
      if (!token) {
        setMessage({ type: 'error', text: 'Please login to view ledger entries' });
        setLoading(false);
        return;
      }
      
      const params = new URLSearchParams();
      
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.bill_number) params.append('bill_number', filters.bill_number);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const url = `${API_URL}/ledger/khata?${params.toString()}`;
      console.log('[LedgerKhata] Fetching from:', url);
      console.log('[LedgerKhata] API_URL:', API_URL);
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('[LedgerKhata] Response received:', response.status, response.data?.count || 0, 'entries');
      if (response.data?.entries && response.data.entries.length > 0) {
        const sample = response.data.entries[0];
        console.log('[LedgerKhata] Sample entry:', sample);
        console.log('[LedgerKhata] Entry fields - description:', sample.description, 'debit:', sample.debit, 'credit:', sample.credit, 'balance:', sample.balance);
        // Check if all entries have required fields
        const entriesWithoutDescription = response.data.entries.filter(e => !e.description);
        const entriesWithoutDebit = response.data.entries.filter(e => e.entry_type === 'order' && (!e.debit || parseFloat(e.debit) === 0));
        if (entriesWithoutDescription.length > 0) {
          console.warn('[LedgerKhata] Entries without description:', entriesWithoutDescription.length);
        }
        if (entriesWithoutDebit.length > 0) {
          console.warn('[LedgerKhata] Bill entries without debit:', entriesWithoutDebit.length);
        }
      }
      console.log('[LedgerKhata] Totals:', response.data.totals);
      setEntries(response.data.entries || []);
      setTotals(response.data.totals || {
        total_amount: 0,
        total_received: 0,
        total_credit: 0,
        total_debit: 0,
        final_balance: 0,
        remaining_balance: 0
      });
      
      if (response.data.entries && response.data.entries.length === 0) {
        setMessage({ type: 'info', text: 'No bills found. Generate bills from the billing section to see bill summary here.' });
      }
    } catch (error) {
      console.error('[LedgerKhata] Error fetching ledger khata:', error);
      console.error('[LedgerKhata] Error response:', error.response);
      console.error('[LedgerKhata] Error status:', error.response?.status);
      console.error('[LedgerKhata] Error data:', error.response?.data);
      console.error('[LedgerKhata] Request URL:', error.config?.url);
      console.error('[LedgerKhata] API_URL used:', API_URL);
      
      let errorMessage = 'Failed to load ledger entries';
      if (error.response?.status === 404) {
        errorMessage = 'Ledger khata endpoint not found (404). Please restart the server to load new routes.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Please login to view ledger entries';
      } else if (error.response?.status === 500) {
        errorMessage = error.response?.data?.details || error.response?.data?.error || 'Server error occurred';
      } else if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
      setEntries([]);
      setTotals({
        total_amount: 0,
        total_received: 0,
        total_credit: 0,
        total_debit: 0,
        final_balance: 0,
        remaining_balance: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleDownloadPDF = async () => {
    try {
      setLoadingPDF(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.bill_number) params.append('bill_number', filters.bill_number);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await axios.get(`${API_URL}/ledger/khata/pdf?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const customerName = customers.find(c => c.id === filters.customer_id)?.name || 'all';
      link.setAttribute('download', `ledger-khata-${customerName}-${new Date().toISOString().split('T')[0]}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Also open in new window for printing
      window.open(url, '_blank');
      
      setMessage({ type: 'success', text: 'PDF downloaded successfully!' });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setMessage({ type: 'error', text: 'Failed to download PDF' });
    } finally {
      setLoadingPDF(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!filters.customer_id) {
      setMessage({ type: 'error', text: 'Please select a customer to send WhatsApp message' });
      return;
    }

    try {
      setLoadingWhatsApp(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.bill_number) params.append('bill_number', filters.bill_number);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await axios.get(`${API_URL}/ledger/khata/whatsapp?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { whatsapp_url, message, customer_name } = response.data;
      
      // Open WhatsApp with the message
      if (whatsapp_url) {
        window.open(whatsapp_url, '_blank');
        setMessage({ type: 'success', text: `WhatsApp message opened for ${customer_name}` });
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(message);
        setMessage({ type: 'success', text: 'Message copied to clipboard. Please send via WhatsApp manually.' });
        alert('WhatsApp message copied to clipboard:\n\n' + message);
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to generate WhatsApp message' });
    } finally {
      setLoadingWhatsApp(false);
    }
  };

  const handleAddPayment = (entry = null) => {
    // entry can be a bill entry or null for general payment
    setSelectedBill(entry);
    
    // If customer filter is set, use that customer; otherwise allow selection
    const customerForPayment = entry?.customer || (filters.customer_id ? customers.find(c => c.id === filters.customer_id) : null);
    setSelectedCustomerForPayment(customerForPayment);
    
    // Set payment amount based on remaining balance
    const totalRemaining = totals.remaining_balance || 0;
    setPaymentAmount(totalRemaining > 0 ? totalRemaining.toString() : '');
    
    setPaymentMethod('Cash');
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setPaymentDate(today);
    setTransactionId('');
    setReceivedBy('');
    setPaymentDescription('');
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    
    // For general payment, customer is required
    const customerId = selectedBill?.customer_id || selectedCustomerForPayment?.id || filters.customer_id;
    if (!customerId) {
      setMessage({ type: 'error', text: 'Please select a customer or filter by customer first' });
      return;
    }
    
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid payment amount' });
      return;
    }

    const amount = parseFloat(paymentAmount);
    const totalRemaining = totals.remaining_balance || 0;
    
    // For general payment, check against total remaining balance
    if (!selectedBill && amount > totalRemaining) {
      setMessage({ type: 'error', text: `Payment amount cannot exceed total remaining balance of ${formatCurrency(totalRemaining)}` });
      return;
    }
    
    // Check against total remaining balance
    if (amount > totalRemaining) {
      setMessage({ type: 'error', text: `Payment amount cannot exceed remaining balance of ${formatCurrency(totalRemaining)}` });
      return;
    }

    setAddingPayment(true);
    try {
      const token = localStorage.getItem('token');
      
      // Use general payment endpoint
      const paymentData = {
        customer_id: customerId,
        amount: amount,
        payment_method: paymentMethod,
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        transaction_id: transactionId || null,
        received_by: receivedBy || null,
        bill_number: selectedBill?.bill_number || null, // Optional bill reference
        description: paymentDescription || (selectedBill?.bill_number ? `Payment for bill ${selectedBill.bill_number}` : 'General payment')
      };

      // Use general payment endpoint
      const paymentUrl = `${API_URL}/ledger/payment`;
      console.log('[LedgerKhata] Sending payment request to:', paymentUrl);
      console.log('[LedgerKhata] Payment data:', paymentData);
      console.log('[LedgerKhata] API_URL:', API_URL);
      
      const response = await axios.post(paymentUrl, paymentData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[LedgerKhata] Payment response:', response.data);

      setMessage({ type: 'success', text: 'Payment added successfully! It will appear in ledger as credit entry.' });
      setShowPaymentModal(false);
      setSelectedBill(null);
      setSelectedCustomerForPayment(null);
      setPaymentAmount('');
      setPaymentDate('');
      setTransactionId('');
      setReceivedBy('');
      setPaymentDescription('');
      
      // Refresh entries
      fetchEntries();
    } catch (error) {
      console.error('Error adding payment:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error URL:', error.config?.url);
      
      let errorMessage = 'Failed to add payment';
      if (error.response?.status === 404) {
        errorMessage = `Payment endpoint not found (404). Please restart the server. URL: ${error.config?.url}`;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'error', text: `Payment failed: ${errorMessage}` });
    } finally {
      setAddingPayment(false);
    }
  };


  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-PK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedCustomer = customers.find(c => c.id === filters.customer_id);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Ledger Khata System <span className="text-sm text-gray-600">لیجر کھاتہ</span></h1>
            <p className="text-sm text-gray-600 mt-1">Chronological Ledger - Date & Time | Debit | Credit | Remaining Balance | Payment Method</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              to="/ledger"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Dashboard
            </Link>
            <Link
              to="/ledger/customers"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Customers
            </Link>
            <Link
              to="/generate-bill"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Bill
            </Link>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleAddPayment()}
              disabled={addingPayment || !filters.customer_id}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 font-semibold"
            >
              {addingPayment ? 'Adding...' : '➕ Add Payment'}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={loadingPDF || entries.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
            >
              {loadingPDF ? 'Generating...' : '📄 Download PDF'}
            </button>
            <button
              onClick={handleSendWhatsApp}
              disabled={loadingWhatsApp || !filters.customer_id}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
            >
              {loadingWhatsApp ? 'Preparing...' : '💬 Send WhatsApp'}
            </button>
          </div>
          {filters.customer_id && totals.remaining_balance > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              Total Remaining Balance: <span className="font-bold text-orange-600">{formatCurrency(totals.remaining_balance)}</span> - Add payment to reduce balance
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Customer</label>
              <select
                name="customer_id"
                value={filters.customer_id}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.phone})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Bill Number</label>
              <input
                type="text"
                name="bill_number"
                value={filters.bill_number}
                onChange={handleFilterChange}
                placeholder="Search by bill number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ customer_id: customerIdFromUrl || '', bill_number: '', start_date: '', end_date: '' })}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Totals Summary */}
        {entries.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6 border border-blue-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Ledger Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Debit</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(totals.total_debit)}</p>
                <p className="text-xs text-gray-500">From all bills</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Credit</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totals.total_credit)}</p>
                <p className="text-xs text-gray-500">All payments received</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Remaining Balance</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(totals.remaining_balance)}</p>
                <p className="text-xs text-gray-500">Debit - Credit</p>
              </div>
            </div>
          </div>
        )}

        {/* Chronological Ledger Table - Like CSV Format */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading ledger entries...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                        No ledger entries found. Generate bills and add payments to see entries here.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, index) => (
                      <tr 
                        key={entry.id || index} 
                        className={`hover:bg-gray-50 ${entry.entry_type === 'payment' ? 'bg-green-50' : 'bg-white'}`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(entry.date)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {entry.bill_number || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {entry.customer?.name || 'N/A'}
                          {entry.customer?.phone && (
                            <span className="block text-xs text-gray-500">{entry.customer.phone}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {entry.description ? entry.description : (entry.bill_number ? `Bill ${entry.bill_number}` : '-')}
                          {entry.entry_type === 'payment' && entry.transaction_id && (
                            <span className="block text-xs text-gray-500">Txn: {entry.transaction_id}</span>
                          )}
                          {entry.entry_type === 'payment' && entry.received_by && (
                            <span className="block text-xs text-gray-500">By: {entry.received_by}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                          {(() => {
                            const debit = parseFloat(entry.debit || 0);
                            return debit > 0 ? formatCurrency(debit) : '-';
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                          {(() => {
                            const credit = parseFloat(entry.credit || 0);
                            return credit > 0 ? formatCurrency(credit) : '-';
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                          {(() => {
                            const balance = parseFloat(entry.balance || 0);
                            return (
                              <span className={`font-bold ${balance >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {formatCurrency(balance)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.payment_method || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleAddPayment(entry)}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                            title="Add payment - will appear as credit entry in ledger"
                          >
                            Add Payment
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {entries.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan="5" className="px-4 py-3 text-sm text-gray-700 text-right">
                        TOTALS:
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">
                        {formatCurrency(totals.total_debit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">
                        {formatCurrency(totals.total_credit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600">
                        {formatCurrency(totals.remaining_balance)}
                      </td>
                      <td colSpan="2" className="px-4 py-3 text-sm text-gray-600">
                        Total Entries: {entries.length}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {entries.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Total Entries: <span className="font-semibold">{entries.length}</span>
                  {selectedCustomer && (
                    <span className="ml-4">
                      Customer: <span className="font-semibold">{selectedCustomer.name}</span>
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Payment Modal - Shows for both general payment and bill-specific payment */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">Add Payment</h3>
                {selectedBill?.bill_number && (
                  <p className="text-sm text-gray-600">Bill: {selectedBill.bill_number}</p>
                )}
                {selectedCustomerForPayment && (
                  <p className="text-sm text-gray-600">Customer: {selectedCustomerForPayment.name}</p>
                )}
                {!filters.customer_id && !selectedCustomerForPayment && (
                  <p className="text-sm text-orange-600">⚠️ Please select a customer first</p>
                )}
              </div>
              <form onSubmit={handleSubmitPayment} className="px-6 py-4">
                <div className="space-y-4">
                  {!filters.customer_id && !selectedCustomerForPayment && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedCustomerForPayment?.id || ''}
                        onChange={(e) => {
                          const customer = customers.find(c => c.id === e.target.value);
                          setSelectedCustomerForPayment(customer);
                        }}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} ({customer.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remaining Balance
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(totals.remaining_balance || 0)}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Payment will appear as credit entry in ledger</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter payment amount"
                      required
                      min="0"
                      max={totals.remaining_balance}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={paymentDescription}
                      onChange={(e) => setPaymentDescription(e.target.value)}
                      placeholder={selectedBill?.bill_number ? `Payment for bill ${selectedBill.bill_number}` : 'Payment description'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                    </select>
                  </div>
                  {paymentMethod === 'Bank Transfer' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transaction ID
                      </label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Enter transaction ID"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Received By
                    </label>
                    <input
                      type="text"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      placeholder="Name of person who received"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedBill(null);
                      setSelectedCustomerForPayment(null);
                      setPaymentAmount('');
                      setPaymentDate('');
                      setTransactionId('');
                      setReceivedBy('');
                      setPaymentDescription('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    disabled={addingPayment}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingPayment}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {addingPayment ? 'Adding...' : 'Add Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LedgerKhata;

