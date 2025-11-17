import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

import { API_URL } from '../utils/api';

const ReturnScan = () => {
  const { user } = useAuth();
  const [scannedReturns, setScannedReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [trackingIdSearch, setTrackingIdSearch] = useState('');
  const [refNumberSearch, setRefNumberSearch] = useState('');

  useEffect(() => {
    fetchScannedReturns();
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

  const fetchScannedReturns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const currentUser = user || JSON.parse(localStorage.getItem('user'));
      
      // Get all returned orders
      let url = `${API_URL}/orders?status=returned`;
      if (currentUser?.role === 'admin' && selectedSeller) {
        url += `&seller_id=${selectedSeller}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter only orders that have been marked as returned (status = returned)
      // And have tracking_id (scanned orders)
      const orders = (response.data.orders || []).filter(order => 
        order.status === 'returned' && order.tracking_id
      );
      
      // Sort by updated_at (return date/time) - most recent first
      orders.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB - dateA;
      });
      
      setScannedReturns(orders);
    } catch (error) {
      console.error('Error fetching scanned returns:', error);
      alert('Failed to fetch scanned returns');
    } finally {
      setLoading(false);
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
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const makeCall = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const sendWhatsApp = (phone, order) => {
    const phoneNumber = phone.replace(/\D/g, '');
    const message = `Hello ${order.customer_name},\n\nYour order reference: ${order.seller_reference_number}\nStatus: RETURNED\nTracking ID: ${order.tracking_id}\n\nThank you!`;
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Filter scanned returns based on search
  const filteredReturns = scannedReturns.filter(order => {
    if (trackingIdSearch && !order.tracking_id?.toLowerCase().includes(trackingIdSearch.toLowerCase())) {
      return false;
    }
    if (refNumberSearch && !order.seller_reference_number?.toLowerCase().includes(refNumberSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Return Scan Records</h1>
            <p className="text-gray-600 mt-1">View all parcels marked as return through scanning</p>
          </div>
          <button
            onClick={fetchScannedReturns}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Instructions Box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-3 text-lg">📋 Instructions: How to Use Return Scanner</h3>
          <div className="space-y-3 text-blue-800">
            <div>
              <p className="font-semibold mb-1">1. Access Return Scanner:</p>
              <p className="text-sm">• Go to <strong>Orders</strong> page</p>
              <p className="text-sm">• Click on <strong>"📦 Return Scan"</strong> button</p>
            </div>
            <div>
              <p className="font-semibold mb-1">2. Scan or Enter Tracking ID:</p>
              <p className="text-sm">• Use barcode scanner to scan the tracking ID from the parcel</p>
              <p className="text-sm">• Or manually type the tracking ID in the input field</p>
              <p className="text-sm">• Press Enter or click "Scan & Mark Return"</p>
            </div>
            <div>
              <p className="font-semibold mb-1">3. Automatic Processing:</p>
              <p className="text-sm">• System will find the order by tracking ID</p>
              <p className="text-sm">• Order status will automatically change to <strong>"RETURNED"</strong></p>
              <p className="text-sm">• Return date and time will be recorded</p>
            </div>
            <div>
              <p className="font-semibold mb-1">4. View Scanned Returns:</p>
              <p className="text-sm">• All scanned return parcels appear on this page automatically</p>
              <p className="text-sm">• You can see tracking ID, seller name, reference number, return date/time, and customer phone</p>
            </div>
            <div className="bg-yellow-100 border border-yellow-300 rounded p-3 mt-3">
              <p className="text-sm font-semibold text-yellow-900">⚠️ Note:</p>
              <p className="text-sm text-yellow-800">• Only orders with tracking IDs can be scanned</p>
              <p className="text-sm text-yellow-800">• Sellers can only scan their own orders</p>
              <p className="text-sm text-yellow-800">• Admin can scan any order</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Tracking ID
              </label>
              <input
                type="text"
                value={trackingIdSearch}
                onChange={(e) => setTrackingIdSearch(e.target.value)}
                placeholder="Enter tracking ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Reference Number
              </label>
              <input
                type="text"
                value={refNumberSearch}
                onChange={(e) => setRefNumberSearch(e.target.value)}
                placeholder="Enter reference number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Scanned Returns Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading scanned returns...</p>
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg font-medium mb-2">No scanned returns found</p>
              <p className="text-sm">Start scanning return parcels to see them here</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Total Scanned Returns: <span className="font-bold text-indigo-600">{filteredReturns.length}</span>
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tracking ID
                      </th>
                      {user?.role === 'admin' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Seller Name
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Return Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Products
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredReturns.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                          {order.tracking_id || '-'}
                        </td>
                        {user?.role === 'admin' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.seller_name || '-'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.seller_reference_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.customer_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <span>{order.phone_number_1 || '-'}</span>
                            {order.phone_number_1 && (
                              <>
                                <button
                                  onClick={() => makeCall(order.phone_number_1)}
                                  className="text-blue-600 hover:text-blue-900 text-lg"
                                  title="Call"
                                >
                                  📞
                                </button>
                                <button
                                  onClick={() => sendWhatsApp(order.phone_number_1, order)}
                                  className="text-green-600 hover:text-green-900 text-lg"
                                  title="Send WhatsApp"
                                >
                                  💬
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col">
                            <span className="font-semibold text-red-600">
                              {formatDate(order.updated_at || order.created_at)}
                            </span>
                            <span className="text-xs text-gray-400">
                              {order.updated_at ? 'Marked as Return' : 'Created'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {order.product_codes || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            RETURNED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ReturnScan;

