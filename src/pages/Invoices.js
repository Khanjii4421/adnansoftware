import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

import { API_URL } from '../utils/api';

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceOrders, setInvoiceOrders] = useState([]);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [selectedInvoiceForPaid, setSelectedInvoiceForPaid] = useState(null);
  const [paidOrders, setPaidOrders] = useState([]);
  const [generateData, setGenerateData] = useState({
    seller_id: '',
    bill_number: '',
    other_expenses: 0,
    include_return_profit: false,
  });
  const [filterSellerId, setFilterSellerId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchByTracking, setSearchByTracking] = useState('');
  const [searchByReference, setSearchByReference] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOrderDetails, setSearchOrderDetails] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const closeError = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  useEffect(() => {
    fetchInvoices();
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
      setSellers(response.data.sellers);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      showError('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceDetails = async (invoiceId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedInvoice(response.data.invoice);
      setInvoiceOrders(response.data.orders || []);
      setShowInvoiceModal(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      showError('Failed to fetch invoice details');
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/invoices/generate`, generateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Don't show success alert, just close modal and refresh
      setShowGenerateModal(false);
      setGenerateData({
        seller_id: '',
        bill_number: '',
        other_expenses: 0,
        include_return_profit: false,
      });
      fetchInvoices();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to generate invoice');
    }
  };

  const handleDownloadPDF = async (invoiceId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      
      // Create a blob URL and download
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Also open in new window for printing
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showError('Failed to download invoice');
    }
  };

  const handleDownloadXLS = async (invoiceId) => {
    try {
      const token = localStorage.getItem('token');
      // Fetch invoice details
      const invoiceResponse = await axios.get(`${API_URL}/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const invoice = invoiceResponse.data.invoice;
      const orders = invoiceResponse.data.orders || [];

      // Get user role from context
      const userRole = user?.role || 'seller';

      // Calculate tax: 4% of delivered seller price only
      const deliveredOrders = orders.filter(o => o.status === 'delivered');
      const totalDeliveredSellerPrice = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.seller_price || 0), 0);
      const taxAmount = totalDeliveredSellerPrice * 0.04;
      
      // Recalculate total profit from displayed values (same as shown in invoice table)
      // Total Profit = Delivered Profit + Return DC (as negative)
      // User requirement: returned DC shown as negative in profit column
      let calculatedTotalProfit = 0;
      orders.forEach(order => {
        const statusLower = String(order.status || '').toLowerCase();
        const norm = statusLower.replace(/[^a-z]/g, '');
        if (norm === 'delivered') {
          calculatedTotalProfit += parseFloat(order.profit || 0);
        } else if (norm === 'returned' || norm === 'return') {
          // Returned orders: show DC as negative in profit (subtracts from total)
          const dcValue = parseFloat(order.delivery_charge || 0);
          calculatedTotalProfit -= Math.abs(dcValue); // Subtract DC from total
        }
      });

      // Prepare data for Excel
      const invoiceData = [
        ['Invoice Details'],
        ['Bill Number:', invoice.bill_number],
        ['Date:', new Date(invoice.invoice_date).toLocaleDateString()],
        ['Total Orders:', invoice.total_orders],
        ['Delivered Orders:', invoice.delivered_orders],
        ['Return Orders:', invoice.return_orders],
        ['Total Delivered Seller Price:', totalDeliveredSellerPrice],
        ['Total Profit (Delivered Profit - Return DC):', calculatedTotalProfit],
        ['Tax (4% of Delivered Seller Price):', taxAmount],
        ['Other Expenses:', invoice.other_expenses],
        ['Net Profit:', calculatedTotalProfit - parseFloat(invoice.other_expenses || 0)],
        [],
        ['Order Details']
      ];

      // Header row (same for admin and seller)
      invoiceData.push(['Ref #', 'Tracking ID', 'Customer Name', 'Phone', 'Address', 'City', 'Products', 'Status', 'Seller Price', 'Profit']);

      // Add order rows and calculate totals
      let totalSellerPrice = 0;
      let totalProfit = 0;
      
      orders.forEach(order => {
        // Show seller price for all orders (delivered and return)
        const displaySellerPrice = order.seller_price || 0;
        totalSellerPrice += parseFloat(displaySellerPrice);
        
        // Calculate profit based on order status
        // For delivered: use profit from order table (seller_price - shipper_price - dc)
        // For returned: show delivery charge as negative/minus in profit (as per user requirement)
        let displayProfit = 0;
        let profitText = '';
        const statusLower = String(order.status || '').toLowerCase();
        const norm = statusLower.replace(/[^a-z]/g, '');
        
        if (norm === 'delivered') {
          displayProfit = parseFloat(order.profit || 0);
          profitText = displayProfit;
          totalProfit += displayProfit; // Add delivered profit
        } else if (norm === 'returned' || norm === 'return') {
          // Returned orders: show delivery charge as negative/minus in profit column
          // User requirement: "Delivery charges Of returned status as minus in profit"
          const dcValue = parseFloat(order.delivery_charge || 0);
          displayProfit = -Math.abs(dcValue); // Show DC as negative in profit
          profitText = displayProfit; // Show negative DC value
          totalProfit += displayProfit; // Add negative DC to total (subtracts from total)
        } else {
          profitText = displayProfit;
        }
        
        // Ensure products are comma-separated
        const products = (order.product_codes || '').split(',').map(p => p.trim()).join(', ');
        
        invoiceData.push([
          order.seller_reference_number || '',
          order.tracking_id || '-',
          order.customer_name || '',
          order.phone_number_1 || '',
          order.customer_address || '',
          order.city || '',
          products,
          order.status || '',
          displaySellerPrice,
          profitText
        ]);
      });
      
      // Add TOTAL row
      invoiceData.push([]);
      invoiceData.push([
        '', '', '', '', '', '', '', 'TOTAL:',
        totalSellerPrice,
        totalProfit
      ]);

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(invoiceData);
      
      // Set column widths (same for admin and seller now)
      ws['!cols'] = [
        { wch: 15 }, // Ref #
        { wch: 15 }, // Tracking ID
        { wch: 20 }, // Customer Name
        { wch: 15 }, // Phone
        { wch: 30 }, // Address
        { wch: 15 }, // City
        { wch: 20 }, // Products
        { wch: 12 }, // Status
        { wch: 15 }, // Seller Price
        { wch: 20 }  // Profit
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
      XLSX.writeFile(wb, `invoice-${invoice.bill_number}-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error downloading XLS:', error);
      alert('Failed to download invoice as Excel');
    }
  };

  const sendWhatsAppReminder = (invoice) => {
    // Get seller's phone from invoice or use a default
    const sellerPhone = ''; // You may need to add phone to seller/user table
    const message = `Hello,\n\nInvoice ${invoice.bill_number} has been generated.\n\nTotal Orders: ${invoice.total_orders}\nDelivered: ${invoice.delivered_orders}\nReturns: ${invoice.return_orders}\nNet Profit: Rs. ${parseFloat(invoice.net_profit || 0).toFixed(2)}\n\nPlease review and confirm.\n\nThank you!`;
    
    if (sellerPhone) {
      const url = `https://wa.me/${sellerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else {
      // Copy to clipboard if no phone
      navigator.clipboard.writeText(message);
      alert('Invoice details copied to clipboard. Please send via WhatsApp manually.');
    }
  };

  const handleShowPaidModal = async (invoice) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/invoices/${invoice.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedInvoiceForPaid(invoice);
      setPaidOrders(response.data.orders || []);
      setShowPaidModal(true);
    } catch (error) {
      console.error('Error fetching invoice orders:', error);
      showError('Failed to fetch invoice orders');
    }
  };

  const handleMarkAsPaid = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to mark this invoice as PAID? This action confirms payment received.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/invoices/${invoiceId}/paid`, { is_paid: true }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Success - just close modal and refresh
      setShowPaidModal(false);
      fetchInvoices();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      showError(error.response?.data?.error || 'Failed to mark invoice as paid');
    }
  };

  const handleUnmarkAsPaid = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to unmark this invoice as paid?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/invoices/${invoiceId}/paid`, { is_paid: false }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Success - just refresh
      fetchInvoices();
    } catch (error) {
      console.error('Error unmarking invoice:', error);
      showError(error.response?.data?.error || 'Failed to unmark invoice');
    }
  };

  const handleDeleteInvoice = async (invoiceId, billNumber) => {
    // Enhanced security confirmation with invoice number
    const confirmMessage = `⚠️ DELETE INVOICE CONFIRMATION ⚠️\n\nInvoice Number: ${billNumber}\n\nAre you ABSOLUTELY SURE you want to DELETE this invoice?\n\nThis action is PERMANENT and CANNOT be undone!\n\nType "DELETE" in the next prompt to confirm.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Second level confirmation - ask user to type DELETE
    const userInput = prompt('Please type "DELETE" (in capital letters) to confirm deletion:');
    
    if (userInput !== 'DELETE') {
      alert('Deletion cancelled. You must type "DELETE" exactly to confirm.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Success - just refresh
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      showError(error.response?.data?.error || 'Failed to delete invoice');
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const handleSearchByOrder = async () => {
    if (!searchByTracking && !searchByReference) {
      alert('Please enter Tracking ID or Reference Number to search');
      return;
    }

    setIsSearching(true);
    try {
      const token = localStorage.getItem('token');
      const searchParams = new URLSearchParams();
      if (searchByTracking) searchParams.append('tracking_id', searchByTracking);
      if (searchByReference) searchParams.append('reference_number', searchByReference);

      const response = await axios.get(`${API_URL}/invoices/search?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.invoiceIds && response.data.invoiceIds.length > 0) {
        // Filter invoices to show only matching ones
        const matchingInvoices = invoices.filter(inv => 
          response.data.invoiceIds.includes(inv.id)
        );
        setSearchResults(matchingInvoices);
        setSearchOrderDetails(response.data.orderDetails || []);
        alert(`Found ${matchingInvoices.length} invoice(s) matching your search`);
      } else {
        setSearchResults([]);
        setSearchOrderDetails([]);
        alert('No invoices found with the given Tracking ID or Reference Number');
      }
    } catch (error) {
      console.error('Error searching invoices:', error);
      showError(error.response?.data?.error || 'Failed to search invoices');
      setSearchResults([]);
      setSearchOrderDetails([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Filter invoices based on seller and search term
  const filteredInvoices = (searchResults.length > 0 ? searchResults : invoices).filter((invoice) => {
    // Filter by seller
    if (filterSellerId && String(invoice.seller_id) !== String(filterSellerId)) {
      return false;
    }
    
    // Filter by search term (invoice number or date)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const billNumber = (invoice.bill_number || '').toLowerCase();
      const date = new Date(invoice.invoice_date).toLocaleDateString().toLowerCase();
      
      if (!billNumber.includes(searchLower) && !date.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });

  const resolveSellerName = (invoice) => {
    const apiName = invoice?.seller_name;
    if (apiName && String(apiName).trim().length > 0) return apiName;
    const match = sellers.find(s => String(s.id) === String(invoice.seller_id));
    return match?.name || '-';
  };

  return (
    <Layout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6 p-2 sm:p-3 md:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            {user?.role === 'admin' ? 'Invoices & Billing' : 'My Invoices'}
          </h1>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-indigo-600 text-white text-xs sm:text-sm md:text-base rounded-lg hover:bg-indigo-700 transition-colors shadow-lg whitespace-nowrap"
            >
              ➕ Generate Invoice
            </button>
          )}
        </div>

        {/* Filter Section */}
        {user?.role === 'admin' && (
          <div className="bg-white rounded-lg shadow p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Filter by Seller
                </label>
                <select
                  value={filterSellerId}
                  onChange={(e) => setFilterSellerId(e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Sellers</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Search by Invoice Number or Date
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Enter invoice number or date..."
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Search by Order Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Tracking ID
                  </label>
                  <input
                    type="text"
                    value={searchByTracking}
                    onChange={(e) => setSearchByTracking(e.target.value)}
                    placeholder="Enter tracking ID..."
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={searchByReference}
                    onChange={(e) => setSearchByReference(e.target.value)}
                    placeholder="Enter reference number..."
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSearchByOrder}
                    disabled={isSearching}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white text-xs sm:text-sm md:text-base rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {isSearching ? '🔍 Searching...' : '🔍 Search Invoice'}
                  </button>
                </div>
              </div>
              {(searchByTracking || searchByReference) && (
                <div className="mt-2 sm:mt-3">
                  {searchOrderDetails.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 mb-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-blue-900 mb-1 sm:mb-2">Order Details Found:</h4>
                      {searchOrderDetails.map((order, index) => (
                        <div key={index} className="text-xs sm:text-sm text-blue-800 mb-1">
                          {searchByTracking && (
                            <div className="break-words">
                              <span className="font-semibold">Tracking ID:</span> {order.tracking_id || 'N/A'} → 
                              <span className="font-semibold ml-1 sm:ml-2">Reference:</span> {order.reference_number || 'N/A'}
                            </div>
                          )}
                          {searchByReference && (
                            <div className="break-words">
                              <span className="font-semibold">Reference:</span> {order.reference_number || 'N/A'} → 
                              <span className="font-semibold ml-1 sm:ml-2">Tracking ID:</span> {order.tracking_id || 'N/A'}
                            </div>
                          )}
                          <div className="text-[10px] sm:text-xs text-blue-600 mt-1">
                            <span className="font-semibold">Seller:</span> {order.seller_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSearchByTracking('');
                      setSearchByReference('');
                      setSearchResults([]);
                      setSearchOrderDetails([]);
                    }}
                    className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill Number
                    </th>
                    {user?.role === 'admin' && (
                      <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seller
                      </th>
                    )}
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Orders
                    </th>
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delivered
                    </th>
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Returns
                    </th>
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={user?.role === 'admin' ? 8 : 7} className="px-3 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-gray-500">
                        No invoices found
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                          {invoice.bill_number}
                        </td>
                        {user?.role === 'admin' && (
                          <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {resolveSellerName(invoice)}
                          </td>
                        )}
                        <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {new Date(invoice.invoice_date).toLocaleDateString()}
                        </td>
                        <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {invoice.total_orders}
                        </td>
                        <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-green-600 font-semibold">
                          {invoice.delivered_orders}
                        </td>
                        <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-red-600 font-semibold">
                          {invoice.return_orders}
                        </td>
                        <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                          {invoice.is_paid ? (
                            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-green-100 text-green-800 rounded-full text-[10px] sm:text-xs font-semibold flex items-center">
                              <span className="text-sm sm:text-base md:text-lg mr-1">✓</span> Paid
                            </span>
                          ) : (
                            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-yellow-100 text-yellow-800 rounded-full text-[10px] sm:text-xs font-semibold">
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm font-medium space-x-1 sm:space-x-2">
                          {user?.role === 'admin' && (
                            <>
                              {!invoice.is_paid && (
                                <button
                                  onClick={() => handleShowPaidModal(invoice)}
                                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-600 text-white rounded hover:bg-green-700 text-[10px] sm:text-xs font-semibold"
                                  title="Mark as Paid & View Orders"
                                >
                                  💰 Paid
                                </button>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => handleDownloadPDF(invoice.id)}
                            className="text-green-600 hover:text-green-900 text-xs sm:text-sm"
                            title="Download PDF"
                          >
                            📄 PDF
                          </button>
                          <button
                            onClick={() => handleDownloadXLS(invoice.id)}
                            className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm"
                            title="Download Excel"
                          >
                            📊 XLS
                          </button>
                          {user?.role === 'admin' && (
                            <>
                              <button
                                onClick={() => sendWhatsAppReminder(invoice)}
                                className="text-green-500 hover:text-green-700 text-xs sm:text-sm"
                                title="Send WhatsApp"
                              >
                                💬
                              </button>
                              {!invoice.is_paid && (
                                <button
                                  onClick={() => handleDeleteInvoice(invoice.id, invoice.bill_number)}
                                  className="text-red-600 hover:text-red-900 text-xs sm:text-sm"
                                  title="Delete Invoice (Requires Confirmation)"
                                >
                                  🗑️
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Generate Invoice Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Generate Invoice</h3>
              <form onSubmit={handleGenerateInvoice}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seller *</label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={generateData.seller_id}
                      onChange={async (e) => {
                        const sellerId = e.target.value;
                        setGenerateData({ ...generateData, seller_id: sellerId, bill_number: '' });
                        
                        // Auto-populate next bill number for this seller
                        if (sellerId) {
                          try {
                            const token = localStorage.getItem('token');
                            const response = await axios.get(`${API_URL}/invoices?seller_id=${sellerId}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            const sellerInvoices = response.data.invoices || [];
                            
                            if (sellerInvoices.length > 0) {
                              // Get last invoice for this seller
                              const lastInvoice = sellerInvoices[0];
                              const lastBillNum = lastInvoice.bill_number;
                              const match = lastBillNum.match(/(\d+)/);
                              if (match) {
                                const lastNum = parseInt(match[1]);
                                const nextNum = lastNum + 1;
                                const nextBillNumber = `INV-${String(nextNum).padStart(3, '0')}`;
                                setGenerateData(prev => ({ ...prev, seller_id: sellerId, bill_number: nextBillNumber }));
                              }
                            }
                          } catch (error) {
                            console.error('Error fetching last invoice:', error);
                          }
                        }
                      }}
                    >
                      <option value="">Select Seller</option>
                      {sellers.map((seller) => (
                        <option key={seller.id} value={seller.id}>
                          {seller.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bill Number (Optional - Auto-generated if empty)
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={generateData.bill_number}
                      onChange={(e) =>
                        setGenerateData({ ...generateData, bill_number: e.target.value })
                      }
                      placeholder="e.g., BILL-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Other Expenses (Rs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={generateData.other_expenses}
                      onChange={(e) =>
                        setGenerateData({ ...generateData, other_expenses: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">Additional expenses to deduct from profit</p>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={generateData.include_return_profit}
                        onChange={(e) =>
                          setGenerateData({ ...generateData, include_return_profit: e.target.checked })
                        }
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Include return orders in invoice (Note: Return orders always included with negative profit)
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Return orders are always included in invoices with negative profit (minus delivery charge). This option is kept for future use.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Generate Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invoice Details Modal - Only for Admin */}
        {showInvoiceModal && selectedInvoice && user?.role === 'admin' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold">Invoice Details - {selectedInvoice.bill_number}</h3>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Seller</p>
                    <p className="font-semibold">{selectedInvoice.seller_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold">{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Order Summary</h4>
                  <div className="overflow-x-auto" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'auto' }}>
                      <thead className="bg-gray-50" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Ref #</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tracking ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Products</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Seller Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Shipper Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Delivery Charge</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoiceOrders.map((order) => {
                          // Show seller price for all orders (delivered and return)
                          const displaySellerPrice = parseFloat(order.seller_price || 0);
                          
                          // Calculate profit based on order status
                          // For delivered: use profit from order table (seller_price - shipper_price - dc)
                          // For returned: profit is ZERO, DC is negative (as per user requirement)
                          let displayProfit = 0;
                          const statusLower = String(order.status || '').toLowerCase();
                          const norm = statusLower.replace(/[^a-z]/g, '');
                          
                          if (norm === 'delivered') {
                            // Delivered orders: use profit directly from order table
                            displayProfit = parseFloat(order.profit || 0);
                          } else if (norm === 'returned' || norm === 'return') {
                            // Returned orders: profit is ZERO (DC will be negative in total calculation)
                            // User requirement: "PROFITE ZERO HO JAYA GA OR DC RETURN MINUS MAIN A JAYA GI"
                            displayProfit = 0;
                          }
                        
                        // Count products (comma-separated)
                        const productCodesArray = (order.product_codes || '').split(',').map(p => p.trim()).filter(p => p.length > 0);
                        const productCount = productCodesArray.length;
                        const products = productCodesArray.join(', ');
                        
                        // Display delivery charge
                        const displayDeliveryCharge = parseFloat(order.delivery_charge || 0);
                        const displayShipperPrice = parseFloat(order.shipper_price || 0);
                        
                        return (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{order.seller_reference_number}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap">{order.tracking_id || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{order.customer_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                              {products} {productCount > 0 && <span className="text-xs text-gray-400">({productCount})</span>}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <span className={`px-2 py-1 rounded text-xs ${
                                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                order.status === 'returned' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-700 whitespace-nowrap">
                              {displaySellerPrice > 0 ? formatCurrency(displaySellerPrice) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-blue-700 whitespace-nowrap">
                              {displayShipperPrice > 0 ? formatCurrency(displayShipperPrice) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <span className={displayDeliveryCharge < 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                                {formatCurrency(displayDeliveryCharge)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <span className={displayProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {formatCurrency(displayProfit)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {/* TOTAL ROW */}
                      <tr className="bg-indigo-50 font-bold border-t-2 border-indigo-600">
                        <td colSpan="5" className="px-4 py-3 text-sm text-right text-indigo-900 uppercase tracking-wider">
                          <strong>TOTAL:</strong>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-green-700 whitespace-nowrap">
                          {formatCurrency(invoiceOrders.reduce((sum, o) => sum + parseFloat(o.seller_price || 0), 0))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-700 whitespace-nowrap">
                          {formatCurrency(invoiceOrders.reduce((sum, o) => sum + parseFloat(o.shipper_price || 0), 0))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">
                          <span className={(() => {
                            const totalDC = invoiceOrders.reduce((sum, o) => sum + parseFloat(o.delivery_charge || 0), 0);
                            return totalDC < 0 ? 'text-red-600' : 'text-gray-600';
                          })()}>
                            {formatCurrency(invoiceOrders.reduce((sum, o) => sum + parseFloat(o.delivery_charge || 0), 0))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">
                          <span className={(() => {
                            const total = invoiceOrders.reduce((sum, o) => {
                              const statusLower = String(o.status || '').toLowerCase();
                              const norm = statusLower.replace(/[^a-z]/g, '');
                              if (norm === 'delivered') {
                                return sum + parseFloat(o.profit || 0);
                              } else if (norm === 'returned' || norm === 'return') {
                                // Returned orders: profit display is 0, but DC is subtracted from total
                                // Total profit = Delivered Profit - Return DC
                                return sum - parseFloat(o.delivery_charge || 0);
                              }
                              return sum;
                            }, 0);
                            return total >= 0 ? 'text-green-600' : 'text-red-600';
                          })()}>
                            {formatCurrency(invoiceOrders.reduce((sum, o) => {
                              const statusLower = String(o.status || '').toLowerCase();
                              const norm = statusLower.replace(/[^a-z]/g, '');
                              if (norm === 'delivered') {
                                return sum + parseFloat(o.profit || 0);
                              } else if (norm === 'returned' || norm === 'return') {
                                // Returned orders: profit display is 0, but DC is subtracted from total
                                // Total profit = Delivered Profit - Return DC
                                return sum - parseFloat(o.delivery_charge || 0);
                              }
                              return sum;
                            }, 0))}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Orders:</span>
                    <span className="font-semibold">{selectedInvoice.total_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivered Orders:</span>
                    <span className="font-semibold text-green-600">{selectedInvoice.delivered_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Return Orders:</span>
                    <span className="font-semibold text-red-600">{selectedInvoice.return_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Delivered Seller Price:</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedInvoice.total_delivered_seller_price || (() => {
                        // Calculate if not provided
                        const deliveredOrders = invoiceOrders.filter(o => o.status === 'delivered');
                        return deliveredOrders.reduce((sum, o) => sum + parseFloat(o.seller_price || 0), 0);
                      })())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (4% of Delivered Seller Price):</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedInvoice.tax_amount || (() => {
                        // Calculate if not provided - 4% of delivered seller price only
                        const deliveredOrders = invoiceOrders.filter(o => o.status === 'delivered');
                        const totalDeliveredSellerPrice = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.seller_price || 0), 0);
                        return totalDeliveredSellerPrice * 0.04;
                      })())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other Expenses:</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(selectedInvoice.other_expenses)}</span>
                  </div>
                  {/* Delivered vs Returned Ratio Graph */}
                  {((selectedInvoice.delivered_orders || 0) + (selectedInvoice.return_orders || 0)) > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold mb-4 text-center">Order Status Distribution</h4>
                      <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Delivered', value: selectedInvoice.delivered_orders || 0 },
                                { name: 'Returned', value: selectedInvoice.return_orders || 0 }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value, percent }) => {
                                if (value === 0) return '';
                                return `${name}: ${value} (${(percent * 100).toFixed(1)}%)`;
                              }}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              <Cell key="delivered" fill="#10b981" />
                              <Cell key="returned" fill="#ef4444" />
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between border-t-4 border-indigo-600 pt-4 mt-4">
                    <span className="text-2xl font-bold">Net Profit:</span>
                    <span className={`text-3xl font-bold ${(() => {
                      // Calculate from TOTAL row profit - tax - expenses
                      const totalProfit = invoiceOrders.reduce((sum, o) => {
                        const statusLower = String(o.status || '').toLowerCase();
                        const norm = statusLower.replace(/[^a-z]/g, '');
                        if (norm === 'delivered') {
                          return sum + parseFloat(o.profit || 0);
                        } else if (norm === 'returned' || norm === 'return') {
                          // Returned orders: profit display is 0, but DC is subtracted from total
                          // Total profit = Delivered Profit - Return DC
                          return sum - parseFloat(o.delivery_charge || 0);
                        }
                        return sum;
                      }, 0);
                      const deliveredOrders = invoiceOrders.filter(o => o.status === 'delivered');
                      const totalDeliveredSellerPrice = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.seller_price || 0), 0);
                      const taxAmount = totalDeliveredSellerPrice * 0.04;
                      const netProfit = totalProfit - taxAmount - parseFloat(selectedInvoice.other_expenses || 0);
                      return netProfit >= 0 ? 'text-green-600' : 'text-red-600';
                    })()}`}>
                      {formatCurrency((() => {
                        // Calculate from TOTAL row profit - tax - expenses
                        const totalProfit = invoiceOrders.reduce((sum, o) => {
                          const statusLower = String(o.status || '').toLowerCase();
                          const norm = statusLower.replace(/[^a-z]/g, '');
                          if (norm === 'delivered') {
                            return sum + parseFloat(o.profit || 0);
                          } else if (norm === 'returned' || norm === 'return') {
                            // Returned orders: profit display is 0, but DC is subtracted from total
                            // Total profit = Delivered Profit - Return DC
                            return sum - parseFloat(o.delivery_charge || 0);
                          }
                          return sum;
                        }, 0);
                        const deliveredOrders = invoiceOrders.filter(o => o.status === 'delivered');
                        const totalDeliveredSellerPrice = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.seller_price || 0), 0);
                        const taxAmount = totalDeliveredSellerPrice * 0.04;
                        return totalProfit - taxAmount - parseFloat(selectedInvoice.other_expenses || 0);
                      })())}
                    </span>
                  </div>
                </div>
              </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleDownloadPDF(selectedInvoice.id)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    📄 Download PDF
                  </button>
                  <button
                    onClick={() => handleDownloadXLS(selectedInvoice.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    📊 Download XLS
                  </button>
                  <button
                    onClick={() => {
                      setShowInvoiceModal(false);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Paid Modal - Show Orders and Mark as Paid */}
        {showPaidModal && selectedInvoiceForPaid && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 border-b pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Mark Invoice as PAID</h3>
                  <p className="text-lg text-indigo-600 font-semibold mt-1">
                    Invoice #: {selectedInvoiceForPaid.bill_number}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Date: {new Date(selectedInvoiceForPaid.invoice_date).toLocaleDateString()} | 
                    Seller: {selectedInvoiceForPaid.seller_name}
                  </p>
                </div>
                <button
                  onClick={() => setShowPaidModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="text-sm text-blue-900 font-semibold">
                  Review all orders/parcels included in this invoice before marking as paid
                </p>
              </div>

              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 text-lg">Orders/Parcels in this Invoice</h4>
                  <div className="overflow-x-auto" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="min-w-full divide-y divide-gray-200 border" style={{ tableLayout: 'auto' }}>
                      <thead className="bg-gray-100" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Ref #</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Tracking ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Phone</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">City</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Products</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Seller Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paidOrders.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="px-4 py-4 text-center text-gray-500">No orders found</td>
                          </tr>
                        ) : (
                          paidOrders.map((order, index) => {
                            const displaySellerPrice = parseFloat(order.seller_price || 0);
                            // USE ORDER TABLE PROFIT DIRECTLY
                            let displayProfit = 0;
                            const statusLower = String(order.status || '').toLowerCase();
                            const norm = statusLower.replace(/[^a-z]/g, '');
                            
                            if (norm === 'delivered') {
                              displayProfit = parseFloat(order.profit || 0);
                            } else if (norm === 'returned' || norm === 'return') {
                              // Returned orders: profit is ZERO (DC will be negative in total calculation)
                              // User requirement: "PROFITE ZERO HO JAYA GA OR DC RETURN MINUS MAIN A JAYA GI"
                              displayProfit = 0;
                            }
                            const products = (order.product_codes || '').split(',').map(p => p.trim()).join(', ');
                            
                            return (
                              <tr key={order.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{order.seller_reference_number}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap">{order.tracking_id || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{order.customer_name}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{order.phone_number_1}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{order.city || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{products}</td>
                                <td className="px-4 py-3 text-sm whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                    order.status === 'returned' ? 'bg-red-100 text-red-800' :
                                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {order.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-green-700 whitespace-nowrap">
                                  {displaySellerPrice > 0 ? formatCurrency(displaySellerPrice) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm whitespace-nowrap">
                                  <span className={`font-semibold ${displayProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(displayProfit)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                        {/* TOTAL ROW */}
                        {paidOrders.length > 0 && (
                          <tr className="bg-indigo-50 font-bold border-t-2 border-indigo-600">
                            <td colSpan="7" className="px-4 py-3 text-sm text-right text-indigo-900 uppercase tracking-wider">
                              <strong>TOTAL:</strong>
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-green-700 whitespace-nowrap">
                              {formatCurrency(paidOrders.reduce((sum, o) => sum + parseFloat(o.seller_price || 0), 0))}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">
                              <span className={(() => {
                                const total = paidOrders.reduce((sum, o) => {
                                  const statusLower = String(o.status || '').toLowerCase();
                                  const norm = statusLower.replace(/[^a-z]/g, '');
                                  if (norm === 'delivered') {
                                    return sum + parseFloat(o.profit || 0);
                                  } else if (norm === 'returned' || norm === 'return') {
                                    // Returned orders: profit display is 0, but DC is subtracted from total
                                    // Total profit = Delivered Profit - Return DC
                                    return sum - parseFloat(o.delivery_charge || 0);
                                  }
                                  return sum;
                                }, 0);
                                return total >= 0 ? 'text-green-600' : 'text-red-600';
                              })()}>
                                {formatCurrency(paidOrders.reduce((sum, o) => {
                                  const statusLower = String(o.status || '').toLowerCase();
                                  const norm = statusLower.replace(/[^a-z]/g, '');
                                  if (norm === 'delivered') {
                                    return sum + parseFloat(o.profit || 0);
                                  } else if (norm === 'returned' || norm === 'return') {
                                    // Returned orders: profit display is 0, but DC is subtracted from total
                                    // Total profit = Delivered Profit - Return DC
                                    return sum - parseFloat(o.delivery_charge || 0);
                                  }
                                  return sum;
                                }, 0))}
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary */}
                <div className="border-t pt-4 bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Orders</p>
                      <p className="text-xl font-bold text-gray-900">{selectedInvoiceForPaid.total_orders}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Delivered</p>
                      <p className="text-xl font-bold text-green-600">{selectedInvoiceForPaid.delivered_orders}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Returns</p>
                      <p className="text-xl font-bold text-red-600">{selectedInvoiceForPaid.return_orders}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Net Profit</p>
                      <p className={`text-xl font-bold ${parseFloat(selectedInvoiceForPaid.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(selectedInvoiceForPaid.net_profit)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowPaidModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleMarkAsPaid(selectedInvoiceForPaid.id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center"
                  >
                    <span className="text-lg mr-2">✓</span> Mark as PAID
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-red-600">Error</h3>
                <button
                  onClick={closeError}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <p className="text-gray-700">{errorMessage}</p>
              </div>
              <div className="flex justify-end p-4 border-t border-gray-200">
                <button
                  onClick={closeError}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </Layout>
  );
};

export default Invoices;
