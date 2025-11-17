import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { API_URL, getApiUrl } from '../utils/api';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [paidFilter, setPaidFilter] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showReturnScan, setShowReturnScan] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [editingTrackingId, setEditingTrackingId] = useState(null);
  const [newTrackingId, setNewTrackingId] = useState('');
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [orderFormData, setOrderFormData] = useState({
    seller_reference_number: '',
    product_codes: '',
    customer_name: '',
    phone_number_1: '',
    phone_number_2: '',
    customer_address: '',
    city: '',
    courier_service: '',
    qty: '',
    seller_id: '',
    seller_price: '', // Allow seller to set their own price
    shipper_price: '', // Manual shipper price - REQUIRED
    delivery_charge: '' // Manual delivery charge - REQUIRED
  });
  const [kpiData, setKpiData] = useState(null);
  const [showKPIs, setShowKPIs] = useState(false);

  const fetchKPIData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/orders/kpis`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKpiData(response.data);
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
      if (user.role === 'admin') {
        fetchSellers();
      }
      if (showKPIs) {
        fetchKPIData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, sellerFilter, searchTerm, todayOnly, paidFilter, user, showKPIs]);

  // REMOVED: fetchProductsForOrders useEffect
  // No longer needed since shipper price is not calculated on frontend

  useEffect(() => {
    if (user?.role === 'admin' && showAddOrderModal) {
      fetchSellers();
    }
  }, [showAddOrderModal, user]);

  // Fetch next reference number when seller is selected
  const fetchNextReferenceNumber = async (sellerId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/sellers/${sellerId}/next-reference`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.next_reference_number;
    } catch (error) {
      console.error('Error fetching next reference:', error);
      return null;
    }
  };

  // Auto-calculate qty based on product codes
  const calculateQtyFromProducts = (productCodes) => {
    if (!productCodes) return '';
    
    const products = productCodes.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
    const qtyParts = [];
    
    products.forEach(prod => {
      // Only remove meter suffix (M7, M9, etc.) if there are at least 2 characters before it
      // This prevents removing M1 from HM1 (which is part of the product code)
      const baseCode = prod.replace(/(.{2,})M\d+$/i, '$1');
      // Check if product is KS1 or WDK1
      if (baseCode === 'KS1' || baseCode === 'WDK1') {
        qtyParts.push('1');
        qtyParts.push('2');
      } else {
        qtyParts.push('1');
      }
    });
    
    return qtyParts.join(',');
  };

  // DC is now always manual - no auto-fetch functions

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

  // REMOVED: fetchProductsForOrders function
  // No longer needed since shipper price is not calculated on frontend

  // REMOVED: All shipper price calculation functions
  // Shipper price is now ONLY calculated on the backend when order is CREATED
  // Once stored in database, it is IMMUTABLE and never recalculated
  // This ensures: "jo cheez ek bar store ho jaye wo change na ho saka" (once stored, cannot be changed)

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Refresh API URL in case it changed
      const currentApiUrl = getApiUrl();
      console.log('[Orders] Fetching from API URL:', currentApiUrl);
      
      if (!token) {
        alert('No authentication token found. Please login again.');
        return;
      }

      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (sellerFilter && user?.role === 'admin') params.append('seller_id', sellerFilter);
      if (searchTerm) params.append('search', searchTerm);
      if (todayOnly) params.append('today_only', 'true');
      if (paidFilter !== '') params.append('is_paid', paidFilter);

      const url = `${currentApiUrl}/orders?${params}`;
      console.log('[Orders] Request URL:', url);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 second timeout
      });
      console.log('Orders response:', response.data);
      const ordersData = response.data.orders || [];
      console.log('Orders count:', ordersData.length);
      
      // Debug: Check shipper_price values
      ordersData.forEach((order, index) => {
        console.log(`[Frontend] Order ${index + 1} - ID: ${order.id}, shipper_price: ${order.shipper_price} (type: ${typeof order.shipper_price})`);
      });
      
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      });
      
      let errorMessage = 'Failed to fetch orders';
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        errorMessage = 'Network error: Cannot connect to server. Please check if the backend server is running.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    if (user?.role === 'admin') {
      if (!sellerFilter) {
        alert('Please select a seller');
        setUploading(false);
        return;
      }
      formData.append('seller_id', sellerFilter);
    }

    try {
      const token = localStorage.getItem('token');
      
      // Show progress message for large files
      alert(`Uploading ${uploadFile.name}... This may take a few minutes for large files. Please wait.`);
      
      const response = await axios.post(`${API_URL}/orders/bulk-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        timeout: 600000, // 10 minutes timeout for large files
      });
      
      const { total_processed, total_created, total_errors, errors } = response.data;
      
      let message = `✅ Upload Complete!\n\n`;
      message += `Total Processed: ${total_processed}\n`;
      message += `Successfully Created: ${total_created}\n`;
      message += `Errors: ${total_errors}\n`;
      
      if (total_errors > 0 && errors && errors.length > 0) {
        message += `\nFirst ${Math.min(errors.length, 5)} errors:\n`;
        errors.slice(0, 5).forEach((err, idx) => {
          message += `${idx + 1}. Row ${err.row}: ${err.error}\n`;
        });
        if (errors.length > 5) {
          message += `... and ${errors.length - 5} more errors. Check console for full details.`;
        }
        console.error('Upload errors:', errors);
      }
      
      alert(message);
      
      setShowUploadModal(false);
      setUploadFile(null);
      fetchOrders();
    } catch (error) {
      console.error('Upload error:', error);
      if (error.code === 'ECONNABORTED') {
        alert('Upload timeout. The file might be too large. Please try again or split the file into smaller batches.');
      } else {
        alert(error.response?.data?.error || error.message || 'Upload failed. Please check the file format and try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/orders/${orderId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const handleTrackingIdUpdate = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/orders/${orderId}`, { tracking_id: newTrackingId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingTrackingId(null);
      setNewTrackingId('');
      fetchOrders();
    } catch (error) {
      alert('Failed to update tracking ID');
    }
  };

  const handlePaidToggle = async (orderId, isPaid) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/orders/${orderId}`, { is_paid: !isPaid }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
    } catch (error) {
      alert('Failed to update paid status');
    }
  };

  const handlePaidChange = async (orderId, value) => {
    try {
      const token = localStorage.getItem('token');
      const isPaid = value === 'paid';
      await axios.put(`${API_URL}/orders/${orderId}`, { is_paid: isPaid }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
    } catch (error) {
      alert('Failed to update paid status');
    }
  };

  const handleConfirmOrder = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/orders/${orderId}`, { status: 'confirmed' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
      alert('Order confirmed successfully!');
    } catch (error) {
      alert('Failed to confirm order');
    }
  };

  const handleReturnScan = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/orders/return-scan`, { tracking_id: trackingId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Order marked as return');
      setShowReturnScan(false);
      setTrackingId('');
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.error || 'Scan failed');
    }
  };

  const handleAddOrder = async (e) => {
    e.preventDefault();
    try {
      if (user?.role === 'admin' && !orderFormData.seller_id) {
        alert('Please select a seller');
        return;
      }

      // Validate DC is required
      if (!orderFormData.delivery_charge || parseFloat(orderFormData.delivery_charge) <= 0) {
        alert('Delivery Charge (DC) is required and must be greater than 0');
        return;
      }

      const token = localStorage.getItem('token');
      
      // Handle shipper_price - DB-friendly format
      // Empty string or undefined → null, otherwise → Number
      const shipperPriceValue = orderFormData.shipper_price === "" || orderFormData.shipper_price === undefined
        ? null
        : Number(orderFormData.shipper_price);
      
      const orderData = {
        ...orderFormData,
        shipper_price: shipperPriceValue // null if empty, Number if value provided
      };
      
      // Remove seller_id from orderData if seller, it will be set automatically on backend
      if (user?.role === 'seller') {
        delete orderData.seller_id;
      }
      
      await axios.post(`${API_URL}/orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Order created successfully!');
      setShowAddOrderModal(false);
      setOrderFormData({
        seller_reference_number: '',
        product_codes: '',
        customer_name: '',
        phone_number_1: '',
        phone_number_2: '',
        customer_address: '',
        city: '',
        courier_service: '',
        qty: '',
        seller_id: '',
        seller_price: '',
        shipper_price: '',
        delivery_charge: ''
      });
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create order');
    }
  };

  // REMOVED: handleEditOrder and handleUpdateOrder functions
  // Edit functionality has been completely disabled for both admin and seller
  // Orders cannot be edited once created

  const sendWhatsApp = (phone, order) => {
    const phoneNumber = phone.replace(/\D/g, '');
    const message = `Hello ${order.customer_name},

Your order reference: ${order.seller_reference_number}
Status: ${order.status}
${order.tracking_id ? `Tracking ID: ${order.tracking_id}` : ''}

Thank you for your order!`;
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const makeCall = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const downloadOrders = () => {
    const dataToExport = orders.map(order => {
      const baseData = {
        'Ref #': order.seller_reference_number,
        'Customer Name': order.customer_name,
        'Phone 1': order.phone_number_1,
        'Phone 2': order.phone_number_2 || '',
        'Address': order.customer_address,
        'City': order.city,
        'Products': order.product_codes,
        'Qty': order.qty,
        'Status': order.status,
        'Seller Price': order.seller_price,
        'Date': new Date(order.created_at).toLocaleDateString()
      };

      // Always use profit from database (calculated using immutable shipper_price)
      // Profit is calculated once and stored, never recalculated
      baseData['Profit'] = parseFloat(order.profit || 0).toFixed(2);

      // Only include admin-only fields for admins
      if (user?.role === 'admin') {
        baseData['Seller'] = order.seller_name || '';
        baseData['Tracking ID'] = order.tracking_id || '';
        baseData['Shipper Price'] = order.shipper_price;
        baseData['Delivery Charge'] = order.delivery_charge;
        baseData['Paid'] = order.is_paid ? 'Yes' : 'No';
      }

      return baseData;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `orders-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'returned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>

        {/* Header Actions */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <input
                type="text"
                placeholder="Search by tracking ID or seller reference number"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="delivered">Delivered</option>
                <option value="returned">Returned</option>
              </select>
              {user?.role === 'admin' && (
                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={sellerFilter}
                  onChange={(e) => setSellerFilter(e.target.value)}
                >
                  <option value="">All Sellers</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={paidFilter}
                onChange={(e) => setPaidFilter(e.target.value)}
              >
                <option value="">All (Paid/Unpaid)</option>
                <option value="true">Paid</option>
                <option value="false">Unpaid</option>
              </select>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={todayOnly}
                  onChange={(e) => {
                    setTodayOnly(e.target.checked);
                    console.log('Today Only filter:', e.target.checked);
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Today's Orders Only</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {(user?.role === 'seller' || user?.role === 'admin') && (
                <button
                  onClick={() => setShowAddOrderModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ➕ Add Order
                </button>
              )}
              {(user?.role === 'seller' || user?.role === 'admin') && (
                <>
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const response = await fetch(`${API_URL}/orders/bulk-upload-template`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        if (!response.ok) {
                          throw new Error('Failed to download template');
                        }
                        
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'bulk-upload-template.xlsx';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (err) {
                        console.error('Error downloading template:', err);
                        alert('Failed to download template. Please try again.');
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    📥 Download Template
                  </button>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    📤 Upload Orders
                  </button>
                </>
              )}
              {user?.role === 'admin' && (
                <button
                  onClick={() => setShowReturnScan(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  📦 Return Scan
                </button>
              )}
              <button
                onClick={downloadOrders}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                ⬇️ Download
              </button>
              <button
                onClick={() => {
                  setShowKPIs(!showKPIs);
                  if (!showKPIs && !kpiData) {
                    fetchKPIData();
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {showKPIs ? '📊 Hide KPIs' : '📊 Show KPIs'}
              </button>
            </div>
          </div>
        </div>

        {/* KPI Graphs Section */}
        {showKPIs && kpiData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                <div className="text-sm text-gray-600">Total Orders</div>
                <div className="text-2xl font-bold text-gray-900">{kpiData.summary?.total_orders || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                <div className="text-sm text-gray-600">Delivered</div>
                <div className="text-2xl font-bold text-green-600">{kpiData.summary?.delivered || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                <div className="text-sm text-gray-600">Returned</div>
                <div className="text-2xl font-bold text-red-600">{kpiData.summary?.returned || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                <div className="text-sm text-gray-600">Pending</div>
                <div className="text-2xl font-bold text-yellow-600">{kpiData.summary?.pending || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                <div className="text-sm text-gray-600">Return Ratio</div>
                <div className="text-2xl font-bold text-purple-600">{kpiData.return_ratio || 0}%</div>
              </div>
            </div>

            {/* All Products KPI Graph */}
            {kpiData.product_kpis && Array.isArray(kpiData.product_kpis) && kpiData.product_kpis.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">All Products KPI</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={kpiData.product_kpis.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product_code" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#8884d8" name="Total" />
                    <Bar dataKey="delivered" fill="#82ca9d" name="Delivered" />
                    <Bar dataKey="returned" fill="#ff7300" name="Returned" />
                    <Bar dataKey="pending" fill="#ffc658" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* City-wise KPI Graph */}
            {kpiData.city_kpis && Array.isArray(kpiData.city_kpis) && kpiData.city_kpis.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">City-wise KPI</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={kpiData.city_kpis.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="city" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#8884d8" name="Total" />
                    <Bar dataKey="delivered" fill="#82ca9d" name="Delivered" />
                    <Bar dataKey="returned" fill="#ff7300" name="Returned" />
                    <Bar dataKey="pending" fill="#ffc658" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Return Ratio Graph */}
            {kpiData.return_ratio_data && Array.isArray(kpiData.return_ratio_data) && kpiData.return_ratio_data.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Return Ratio Trend (Last 30 Days)</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={kpiData.return_ratio_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="ratio" stroke="#ff7300" name="Return Ratio %" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Delivered, Return, and Pending Graphs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Delivered Graph */}
              {kpiData.delivered_data && Array.isArray(kpiData.delivered_data) && kpiData.delivered_data.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Delivered Orders</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={kpiData.delivered_data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#82ca9d" name="Delivered" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Return Graph */}
              {kpiData.returned_data && Array.isArray(kpiData.returned_data) && kpiData.returned_data.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Return Orders</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={kpiData.returned_data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#ff7300" name="Returned" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pending Graph */}
              {kpiData.pending_data && Array.isArray(kpiData.pending_data) && kpiData.pending_data.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Pending Orders</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={kpiData.pending_data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#ffc658" name="Pending" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading orders...</p>
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg font-medium mb-2">No orders found</p>
              <p className="text-sm">Try adjusting your filters or create a new order</p>
            </div>
          ) : (
            <div className="relative">
              <div 
                className="w-full overflow-x-auto" 
                style={{ 
                  maxWidth: '100%',
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch',
                  maxHeight: 'calc(100vh - 300px)',
                  overflowY: 'auto'
                }}
              >
                <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'auto' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Ref #
                    </th>
                    {user?.role === 'admin' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Seller
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Courier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Products
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Seller Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Shipper Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      DC
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Profit
                    </th>
                    {user?.role === 'admin' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Tracking ID
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Status
                    </th>
                    {user?.role === 'admin' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Paid
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.seller_reference_number}
                      </td>
                      {user?.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.seller_name || '-'}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.phone_number_1}
                        {order.phone_number_2 && ` / ${order.phone_number_2}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs" title={order.customer_address}>
                        <div className="truncate">{order.customer_address || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.city || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.courier_service || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(() => {
                          if (!order.product_codes) return '-';
                          // Display products exactly as entered - no grouping, no count
                          // "GS1,GS1" will show as "GS1, GS1" (separate, not "GS1(2)")
                          const parts = order.product_codes.split(',').map(p => p.trim()).filter(p => p.length > 0);
                          return parts.join(', '); // Just join with comma and space
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                        Rs. {parseFloat(order.seller_price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700">
                        {(() => {
                          // Use shipper_price from database - show actual value, null if not set
                          const rawValue = order.shipper_price;
                          if (rawValue === null || rawValue === undefined || rawValue === '') {
                            return <>-</>;
                          }
                          const shipperPrice = parseFloat(rawValue);
                          if (isNaN(shipperPrice)) {
                            return <>-</>;
                          }
                          return <>Rs. {shipperPrice.toFixed(2)}</>;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {(() => {
                          // Use delivery_charge from server (entered manually)
                          const dc = parseFloat(order.delivery_charge || 0);
                          
                          // Display the delivery charge
                          if (dc > 0) {
                            return <>Rs. {dc.toFixed(2)}</>;
                          }
                          
                          // If 0, show dash (delivery charge not entered)
                          return <>-</>;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-700">
                        {(() => {
                          // Always calculate profit from current values to ensure accuracy
                          // Formula: Seller Price - Shipper Price - Delivery Charge
                          const sellerPrice = parseFloat(order.seller_price || 0);
                          const shipperPrice = parseFloat(order.shipper_price || 0);
                          const deliveryCharge = parseFloat(order.delivery_charge || 0);
                          const calculatedProfit = sellerPrice - shipperPrice - deliveryCharge;
                          
                          return <>Rs. {calculatedProfit.toFixed(2)}</>;
                        })()}
                      </td>
                      {user?.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {editingTrackingId === order.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={newTrackingId}
                                onChange={(e) => setNewTrackingId(e.target.value)}
                                className="px-2 py-1 border rounded text-xs"
                                placeholder="Enter tracking ID"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleTrackingIdUpdate(order.id);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleTrackingIdUpdate(order.id)}
                                className="text-green-600 hover:text-green-800"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setEditingTrackingId(null);
                                  setNewTrackingId('');
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span>{order.tracking_id || '-'}</span>
                              <button
                                onClick={() => {
                                  setEditingTrackingId(order.id);
                                  setNewTrackingId(order.tracking_id || '');
                                }}
                                className="text-indigo-600 hover:text-indigo-800 text-xs"
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user?.role === 'admin' ? (
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(order.status)}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="delivered">Delivered</option>
                            <option value="returned">Returned</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}
                          >
                            {order.status}
                          </span>
                        )}
                      </td>
                      {user?.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={(order.is_paid ? 'paid' : 'unpaid')}
                            onChange={(e) => handlePaidChange(order.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded-full border border-gray-300"
                          >
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                          </select>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => sendWhatsApp(order.phone_number_1, order)}
                          className="text-green-600 hover:text-green-900 text-lg"
                          title="Send WhatsApp"
                        >
                          💬
                        </button>
                        <button
                          onClick={() => makeCall(order.phone_number_1)}
                          className="text-blue-600 hover:text-blue-900 text-lg"
                          title="Call"
                        >
                          📞
                        </button>
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleConfirmOrder(order.id)}
                            className="text-purple-600 hover:text-purple-900 text-lg"
                            title="Confirm Order"
                          >
                            ✓
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Bulk Upload Orders (CSV/Excel)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload Excel file with columns: <strong>Ref #</strong> (optional), <strong>Customer</strong>, <strong>Phone</strong>, <strong>Address</strong>, <strong>City</strong>, <strong>Courier</strong>, <strong>Products</strong>, <strong>Seller Price</strong>, <strong>Shipper Price</strong>, <strong>DC</strong>
              </p>
              <p className="text-xs text-blue-600 mb-2 bg-blue-50 p-2 rounded">
                ✅ <strong>Automatic:</strong> Seller (from selection), Profit (calculated), Tracking ID (empty), Status (pending), Paid (false)
              </p>
              <p className="text-xs text-red-600 mb-2 bg-red-50 p-2 rounded font-semibold">
                ⚠️ <strong>Required in Excel:</strong> Customer, Phone, Address, City, Products, Seller Price, Shipper Price, DC
              </p>
              <p className="text-xs text-green-600 mb-2 bg-green-50 p-2 rounded">
                💡 <strong>Optional in Excel:</strong> Ref # (auto-generated if empty), Courier
              </p>
              <p className="text-xs text-orange-600 mb-2 bg-orange-50 p-2 rounded">
                📝 <strong>Manual Entry Only:</strong> Shipper Price must be manually entered in Excel. It is NOT auto-calculated from products.
              </p>
              <p className="text-xs text-blue-600 mb-2 bg-blue-50 p-2 rounded">
                💡 Product Codes format: 
                <br />- "KS1,KS2" = 2 products (KS1 and KS2)
                <br />- "KS1,KS1,KS3" = 3 products (KS1 appears twice, KS3 once)
                <br />- Products are entered as-is, no automatic calculations
              </p>
              <p className="text-xs text-green-600 mb-2 bg-green-50 p-2 rounded">
                ✅ Download the template first to see the correct format with examples
              </p>
              <p className="text-xs text-blue-600 mb-4 bg-blue-50 p-2 rounded">
                💡 Tip: Large files (10,000+ orders) are supported and will be processed in batches. Please wait for completion.
              </p>
              <form onSubmit={handleFileUpload}>
                {user?.role === 'admin' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Seller *
                    </label>
                    <select
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={sellerFilter}
                      onChange={(e) => setSellerFilter(e.target.value)}
                    >
                      <option value="">Select Seller</option>
                      {sellers.map((seller) => (
                        <option key={seller.id} value={seller.id}>
                          {seller.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="mb-4 w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {uploadFile && (
                  <div className="mb-4 p-2 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">
                      📄 File: {uploadFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Size: {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
                {uploading && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-blue-700">
                        Uploading and processing... This may take a few minutes for large files.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadFile(null);
                    }}
                    disabled={uploading}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadFile || uploading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Order Modal (Edit functionality removed) */}
        {showAddOrderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add New Order</h3>
              <form onSubmit={handleAddOrder}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user?.role === 'admin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Seller *</label>
                      <select
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={orderFormData.seller_id}
                        onChange={async (e) => {
                          const sellerId = e.target.value;
                          const nextRef = sellerId ? await fetchNextReferenceNumber(sellerId) : null;
                          setOrderFormData({ 
                            ...orderFormData, 
                            seller_id: sellerId, 
                            delivery_charge: '',
                            seller_reference_number: nextRef ? String(nextRef) : ''
                          });
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
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Number (Numeric Only) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={orderFormData.seller_reference_number}
                      onChange={(e) => setOrderFormData({ ...orderFormData, seller_reference_number: e.target.value })}
                      placeholder="Auto-filled from last order"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-generated based on seller's last order number
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Codes *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={orderFormData.product_codes}
                      onChange={(e) => {
                        const codes = e.target.value.toUpperCase(); // Always convert to uppercase
                        const autoQty = calculateQtyFromProducts(codes);
                        setOrderFormData({ ...orderFormData, product_codes: codes, qty: autoQty });
                      }}
                      placeholder="KS1,KS2 or KS1M9,KS2"
                      style={{ textTransform: 'uppercase' }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: KS1,KS2 or KS1M9. Products automatically shown in uppercase.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={orderFormData.customer_name}
                      onChange={(e) => setOrderFormData({ ...orderFormData, customer_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number 1 *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={orderFormData.phone_number_1}
                      onChange={(e) => setOrderFormData({ ...orderFormData, phone_number_1: e.target.value })}
                      placeholder="03001234567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number 2</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={orderFormData.phone_number_2}
                      onChange={(e) => setOrderFormData({ ...orderFormData, phone_number_2: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={orderFormData.city}
                      onChange={(e) => setOrderFormData({ ...orderFormData, city: e.target.value })}
                      placeholder="Lahore"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Address *</label>
                    <textarea
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={orderFormData.customer_address}
                      onChange={(e) => setOrderFormData({ ...orderFormData, customer_address: e.target.value })}
                      placeholder="Complete address"
                      rows="2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Courier Service</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={orderFormData.courier_service}
                      onChange={(e) => setOrderFormData({ ...orderFormData, courier_service: e.target.value })}
                    >
                      <option value="">Select Courier</option>
                      <option value="TCS">TCS</option>
                      <option value="Leopard">Leopard</option>
                      <option value="Call Courier">Call Courier</option>
                      <option value="Trax">Trax</option>
                      <option value="M&P">M&P</option>
                      <option value="Courier Express">Courier Express</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {/* Quantity field removed - auto-calculated from products */}
                  <input type="hidden" value={orderFormData.qty} />
                  {(user?.role === 'seller' || user?.role === 'admin') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Seller Price (Rs.) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={orderFormData.seller_price}
                        onChange={(e) => setOrderFormData({ ...orderFormData, seller_price: e.target.value })}
                        placeholder="Enter your selling price"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your own selling price for this order. Profit will be calculated automatically.
                      </p>
                    </div>
                  )}
                  {/* Shipper Price field - Optional, can be blank (null) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipper Price (Rs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={orderFormData.shipper_price || ''}
                      onChange={(e) => setOrderFormData({ ...orderFormData, shipper_price: e.target.value })}
                      placeholder="Enter shipper price (optional)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank to save as null. No default 0 will be set.
                    </p>
                  </div>
                  {/* Delivery Charge field - REQUIRED */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Charge (Rs.) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={orderFormData.delivery_charge}
                      onChange={(e) => setOrderFormData({ ...orderFormData, delivery_charge: e.target.value })}
                      placeholder="Enter delivery charge"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddOrderModal(false);
                      setOrderFormData({
                        seller_reference_number: '',
                        product_codes: '',
                        customer_name: '',
                        phone_number_1: '',
                        phone_number_2: '',
                        customer_address: '',
                        city: '',
                        courier_service: '',
                        qty: '',
                        seller_id: '',
                        seller_price: '',
                        shipper_price: '',
                        delivery_charge: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Return Scan Modal */}
        {showReturnScan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Return Scan</h3>
              <p className="text-sm text-gray-600 mb-4">
                Scan or enter the tracking ID to mark the order as return
              </p>
              <form onSubmit={handleReturnScan}>
                <input
                  type="text"
                  placeholder="Enter Tracking ID"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowReturnScan(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Scan & Mark Return
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

export default Orders;
