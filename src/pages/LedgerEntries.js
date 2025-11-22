import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';

import { API_URL } from '../utils/api';

const LedgerEntries = () => {
  const [entries, setEntries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchParams] = useSearchParams();
  const customerIdFromUrl = searchParams.get('customer_id');

  const [formData, setFormData] = useState({
    customer_id: customerIdFromUrl || '',
    order_no: '',
    date: new Date().toISOString().split('T')[0],
    product: '',
    product_description: '',
    description: '',
    total_amount: '',
    paid_amount: '',
    debit: '',
    credit: '',
    payment_method: 'Cash',
    bank_note: '',
    attachment_url: ''
  });

  const [filters, setFilters] = useState({
    customer_id: customerIdFromUrl || '',
    order_id: '',
    order_no: '',
    start_date: '',
    end_date: ''
  });

  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [message, setMessage] = useState({ type: '', text: '' });

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
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.order_id) params.append('order_id', filters.order_id);
      if (filters.order_no) params.append('order_no', filters.order_no);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      // Use billing_entries endpoint instead of transactions
      const response = await axios.get(`${API_URL}/ledger/entries?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntries(response.data.entries || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
      setMessage({ type: 'error', text: 'Failed to load entries' });
    } finally {
      setLoading(false);
    }
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let updatedFormData = {
      ...formData,
      [name]: value
    };

    // Auto-calculate remaining balance and advance when total_amount or paid_amount changes
    if (name === 'total_amount' || name === 'paid_amount') {
      const total = parseFloat(updatedFormData.total_amount || 0);
      const paid = parseFloat(updatedFormData.paid_amount || 0);
      
      if (total > 0) {
        if (paid > total) {
          // Advance payment
          updatedFormData.credit = paid;
          updatedFormData.debit = 0;
        } else if (paid > 0) {
          // Partial payment
          updatedFormData.credit = paid;
          updatedFormData.debit = total - paid;
        } else {
          // No payment yet
          updatedFormData.debit = total;
          updatedFormData.credit = 0;
        }
      }
    }

    setFormData(updatedFormData);
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // Prepare transaction data
      const transactionData = {
        customer_id: formData.customer_id,
        date: formData.date,
        description: formData.description || formData.product_description || 'Entry',
        debit: parseFloat(formData.debit || 0),
        credit: parseFloat(formData.credit || 0),
        payment_method: formData.payment_method,
        bank_note: formData.bank_note,
        attachment_url: formData.attachment_url,
        order_no: formData.order_no,
        product: formData.product,
        product_description: formData.product_description,
        total_amount: parseFloat(formData.total_amount || 0),
        paid_amount: parseFloat(formData.paid_amount || 0)
      };

      await axios.post(`${API_URL}/ledger/transactions`, transactionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Entry added successfully!' });
      setFormData({
        customer_id: customerIdFromUrl || '',
        order_no: '',
        date: new Date().toISOString().split('T')[0],
        product: '',
        product_description: '',
        description: '',
        total_amount: '',
        paid_amount: '',
        debit: '',
        credit: '',
        payment_method: 'Cash',
        bank_note: '',
        attachment_url: ''
      });
      setShowPaymentForm(false);
      setShowAddForm(false);
      fetchEntries();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to add entry'
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/ledger/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Entry deleted successfully!' });
      fetchEntries();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to delete entry'
      });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await axios.get(`${API_URL}/ledger/entries/pdf?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ledger-entries-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Generating HTML version...');
      // Fallback to HTML generation
      generateHTMLReport();
    }
  };

  const generateHTMLReport = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ledger Entries Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #4F46E5; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Ledger Entries Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Description</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(entry => `
              <tr>
                <td>${formatDate(entry.date)}</td>
                <td>${entry.customers?.name || 'N/A'}</td>
                <td>${entry.description}</td>
                <td>${entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                <td>${entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                <td>${formatCurrency(entry.balance || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ledger-entries-${new Date().toISOString().split('T')[0]}.html`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await axios.get(`${API_URL}/ledger/entries/excel?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ledger-entries-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      // Fallback: Generate Excel using client-side library
      generateExcelClientSide();
    }
  };

  const generateExcelClientSide = () => {
    // Simple CSV export as fallback
    const headers = ['Date', 'Customer', 'Description', 'Debit', 'Credit', 'Balance', 'Payment Method'];
    const rows = entries.map(entry => [
      formatDate(entry.date),
      entry.customers?.name || 'N/A',
      entry.description || '',
      entry.debit || 0,
      entry.credit || 0,
      entry.balance || 0,
      entry.payment_method || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ledger-entries-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppReminder = () => {
    if (entries.length === 0) {
      alert('No entries to send');
      return;
    }

    const filteredEntries = entries.filter(entry => {
      if (filters.customer_id && entry.customer_id !== filters.customer_id) return false;
      if (filters.start_date && entry.date < filters.start_date) return false;
      if (filters.end_date && entry.date > filters.end_date) return false;
      return true;
    });

    if (filteredEntries.length === 0) {
      alert('No entries match the current filters');
      return;
    }

    const selectedCustomerForReminder = customers.find(c => c.id === (filters.customer_id || formData.customer_id));
    const customerPhone = selectedCustomerForReminder?.phone || '';
    
    const totalDebit = filteredEntries.reduce((sum, e) => sum + parseFloat(e.debit || 0), 0);
    const totalCredit = filteredEntries.reduce((sum, e) => sum + parseFloat(e.credit || 0), 0);
    const balance = filteredEntries[filteredEntries.length - 1]?.balance || 0;

    const message = `Hello ${selectedCustomerForReminder?.name || 'Customer'},

Ledger Summary:
Total Entries: ${filteredEntries.length}
Total Debit (Lena): Rs. ${totalDebit.toFixed(2)}
Total Credit (Dena): Rs. ${totalCredit.toFixed(2)}
Current Balance: Rs. ${balance.toFixed(2)}

${balance > 0 ? '⚠️ You have an outstanding balance. Please clear it at your earliest convenience.' : '✅ Your account is up to date.'}

Thank you!`;

    if (customerPhone) {
      const phoneNumber = customerPhone.replace(/\D/g, '');
      const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else {
      // Copy to clipboard if no phone
      navigator.clipboard.writeText(message);
      alert('Ledger summary copied to clipboard. Please send via WhatsApp manually.\n\n' + message);
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Ledger Entries</h1>
            <p className="text-sm text-gray-600 mt-1">Manage all debit and credit transactions</p>
          </div>
          <div className="flex gap-2">
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
                setShowAddForm(!showAddForm);
                setFormData({
                  ...formData,
                  customer_id: customerIdFromUrl || formData.customer_id
                });
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              + Add Entry
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
            {message.text}
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Add Entry Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.phone})
                      </option>
                    ))}
                  </select>
                  {selectedCustomer && (
                    <p className="text-xs text-gray-500 mt-1">
                      Current Balance: {formatCurrency(selectedCustomer.balance || 0)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Number (Generate Yourself)
                  </label>
                  <input
                    type="text"
                    name="order_no"
                    value={formData.order_no}
                    onChange={handleInputChange}
                    placeholder="Enter order number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="product"
                  value={formData.product}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter product name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Description
                </label>
                <textarea
                  name="product_description"
                  value={formData.product_description}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Enter product description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Payment received, Return adjustment, Order created"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <input
                    type="number"
                    name="total_amount"
                    value={formData.total_amount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Total order amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paid Amount (Jama)
                  </label>
                  <input
                    type="number"
                    name="paid_amount"
                    value={formData.paid_amount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Amount paid"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              {(formData.total_amount || formData.paid_amount) && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="ml-2 font-semibold text-gray-800">
                        {formatCurrency(parseFloat(formData.total_amount || 0))}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Paid Amount:</span>
                      <span className="ml-2 font-semibold text-green-600">
                        {formatCurrency(parseFloat(formData.paid_amount || 0))}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">
                        {parseFloat(formData.paid_amount || 0) > parseFloat(formData.total_amount || 0)
                          ? 'Advance:'
                          : 'Remaining:'}
                      </span>
                      <span
                        className={`ml-2 font-semibold ${
                          parseFloat(formData.paid_amount || 0) > parseFloat(formData.total_amount || 0)
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(
                          Math.abs(
                            parseFloat(formData.total_amount || 0) - parseFloat(formData.paid_amount || 0)
                          )
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <div>Debit (Lena): {formatCurrency(parseFloat(formData.debit || 0))}</div>
                    <div>Credit (Dena): {formatCurrency(parseFloat(formData.credit || 0))}</div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Debit Amount (Lena)</label>
                  <input
                    type="number"
                    name="debit"
                    value={formData.debit}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Amount given out"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Amount (Dena)</label>
                  <input
                    type="number"
                    name="credit"
                    value={formData.credit}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Amount received"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    readOnly
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Note / Remarks</label>
                <textarea
                  name="bank_note"
                  value={formData.bank_note}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Account details, transaction reference, or any remarks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachment URL (Optional)</label>
                <input
                  type="url"
                  name="attachment_url"
                  value={formData.attachment_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/receipt.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Entry
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

        {/* Entry Actions - PDF, WhatsApp, Excel */}
        {entries.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                📄 Download PDF
              </button>
              <button
                onClick={handleDownloadExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                📊 Download Excel
              </button>
              <button
                onClick={handleWhatsAppReminder}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                💬 WhatsApp Reminder
              </button>
            </div>
          </div>
        )}

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
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Order Number</label>
              <input
                type="text"
                name="order_no"
                value={filters.order_no}
                onChange={handleFilterChange}
                placeholder="Search by order number"
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
                onClick={() => setFilters({ customer_id: '', order_id: '', order_no: '', start_date: '', end_date: '' })}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Entries Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading entries...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                        No entries found. Add your first entry to get started!
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => {
                      // Extract product from entry
                      const productName = entry.product || 
                        (entry.bank_note && entry.bank_note.match(/Product:\s*([^|]+)/)?.[1]?.trim()) || 
                        '-';
                      
                      return (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.customers?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.customers?.phone || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {productName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {entry.description}
                          {entry.bank_note && (
                            <div className="text-xs text-gray-400 mt-1">{entry.bank_note}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className={`font-semibold ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(entry.balance || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.payment_method || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LedgerEntries;

