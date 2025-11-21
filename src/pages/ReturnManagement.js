import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { API_URL } from '../utils/api';

// Get user from localStorage since useAuth might not be available
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const ReturnManagement = () => {
  const [user, setUser] = useState(getCurrentUser());
  const [returnedOrders, setReturnedOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [profitOrders, setProfitOrders] = useState([]);
  const bulkEndpointAvailable = useRef(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    fetchReturnedOrders();
    if (currentUser?.role === 'admin') {
      fetchSellers();
    }
  }, [selectedSeller]);

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

  const fetchReturnedOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const currentUser = getCurrentUser();
      
      // Build query parameters - use 'returned' status
      const params = { status: 'returned' };
      if (currentUser?.role === 'admin' && selectedSeller) {
        params.seller_id = selectedSeller;
      }

      const response = await axios.get(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: params
      });
      
      // Filter orders that were returned - handle both 'returned' and 'return' status
      const orders = (response.data.orders || []).filter(order => {
        const statusLower = String(order.status || '').toLowerCase().trim();
        return statusLower === 'returned' || statusLower === 'return';
      });
      
      console.log('[ReturnManagement] Fetched returned orders:', orders.length);
      setReturnedOrders(orders);
    } catch (error) {
      console.error('Error fetching returned orders:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert(`Failed to fetch returned orders: ${error.response?.data?.error || error.message}`);
      setReturnedOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === returnedOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(returnedOrders.map(order => order.id));
    }
  };

  const handleMarkForNextBill = () => {
    if (selectedOrders.length === 0) {
      alert('Please select at least one order');
      return;
    }

    const orders = returnedOrders.filter(order => selectedOrders.includes(order.id));
    setProfitOrders(orders);
    setShowProfitModal(true);
  };

  const handleConfirmProfitOnNextBill = async () => {
    try {
      const token = localStorage.getItem('token');
      if (bulkEndpointAvailable.current) {
        try {
          const response = await axios.post(
            `${API_URL}/orders/mark-profit-on-next-bill`,
            { order_ids: selectedOrders },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          if (response.data.errors && response.data.errors.length > 0) {
            alert(`Marked ${response.data.updated.length} orders. ${response.data.errors.length} errors occurred.`);
          } else {
            alert(`Successfully marked ${response.data.updated.length} order(s) for profit on next bill.`);
          }
        } catch (err) {
          if (err.response?.status === 404) {
            bulkEndpointAvailable.current = false;
          } else {
            throw err;
          }
        }
      }

      if (!bulkEndpointAvailable.current) {
        await Promise.all(selectedOrders.map((id) =>
          axios.put(`${API_URL}/orders/${id}`, { profit_on_next_bill: true }, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ));
        alert(`Successfully marked ${selectedOrders.length} order(s) for profit on next bill.`);
      }

      setShowProfitModal(false);
      setSelectedOrders([]);
      fetchReturnedOrders();
    } catch (error) {
      console.error('Error marking orders:', error);
      alert(error.response?.data?.error || 'Failed to mark orders for next bill profit');
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const getTotalProfit = () => {
    return returnedOrders
      .filter(order => selectedOrders.includes(order.id))
      .reduce((sum, order) => sum + parseFloat(order.profit || 0), 0);
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Return Management</h1>
            <p className="text-gray-600 mt-1">Manage returned orders and profit on next bill</p>
          </div>
          {selectedOrders.length > 0 && (
            <div className="flex gap-4 items-center">
              <span className="text-sm text-gray-600">
                {selectedOrders.length} order(s) selected • Total Profit: {formatCurrency(getTotalProfit())}
              </span>
              <button
                onClick={handleMarkForNextBill}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Mark for Next Bill Profit
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        {user?.role === 'admin' && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">Filter by Seller:</label>
              <select
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Sellers</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchReturnedOrders}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Return Management Rules</h3>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li>Orders that were received (delivered) but then returned by customer can get profit on next bill</li>
            <li>Select returned orders and mark them to include profit in the next invoice</li>
            <li>When next invoice is generated, these orders' profit will be included</li>
            <li>This helps manage returns where seller should still receive profit on next billing cycle</li>
          </ul>
        </div>

        {/* Returned Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading returned orders...</p>
            </div>
          ) : returnedOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No returned orders found
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === returnedOrders.length && returnedOrders.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Select All ({returnedOrders.length} orders)
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Total Profit: <span className="font-bold text-green-600">{formatCurrency(getTotalProfit())}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref #</th>
                      {user?.role === 'admin' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipper Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Bill</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {returnedOrders.map((order) => (
                      <tr 
                        key={order.id} 
                        className={`hover:bg-gray-50 ${selectedOrders.includes(order.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => handleSelectOrder(order.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.seller_reference_number}
                        </td>
                        {user?.role === 'admin' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.seller?.name || order.seller_name || '-'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.customer_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {order.product_codes}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                          {formatCurrency(order.seller_price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700">
                          {formatCurrency(order.shipper_price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-700">
                          {formatCurrency(order.profit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.updated_at || order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              {order.status}
                            </span>
                            {order.profit_on_next_bill && (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800" title="Profit will be included in next bill">
                                💰 Next Bill
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Profit on Next Bill Modal */}
        {showProfitModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Confirm Profit on Next Bill</h3>
              <p className="text-sm text-gray-600 mb-4">
                The following {profitOrders.length} order(s) will receive profit on the next invoice:
              </p>
              
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {profitOrders.map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.seller_reference_number}</p>
                      <p className="text-xs text-gray-500">{order.customer_name} • {order.product_codes}</p>
                    </div>
                    <p className="font-bold text-green-600">{formatCurrency(order.profit)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Total Profit to be added:</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(getTotalProfit())}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowProfitModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmProfitOnNextBill}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReturnManagement;

