import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { API_URL } from '../utils/api';

const PurchaseDashboard = () => {
  const [dashboardStats, setDashboardStats] = useState({
    totalSuppliers: 0,
    totalPurchases: 0,
    totalPaid: 0,
    totalRemaining: 0,
    recentPurchases: [],
    suppliersWithBalance: []
  });
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, paid, unpaid
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
    fetchPayments();
  }, [selectedSupplier, paymentFilter]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/purchasing/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedSupplier) {
        params.append('supplier_id', selectedSupplier);
      }
      const response = await axios.get(`${API_URL}/purchasing/payments?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let paymentsList = response.data.payments || [];
      
      // Filter by payment status if needed
      if (paymentFilter === 'paid') {
        // Get all purchases and filter paid ones
        const purchasesResponse = await axios.get(`${API_URL}/purchasing/purchases?is_paid=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const paidPurchaseIds = (purchasesResponse.data.purchases || []).map(p => p.id);
        paymentsList = paymentsList.filter(p => paidPurchaseIds.includes(p.purchase_id));
      } else if (paymentFilter === 'unpaid') {
        const purchasesResponse = await axios.get(`${API_URL}/purchasing/purchases?is_paid=false`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const unpaidPurchaseIds = (purchasesResponse.data.purchases || []).map(p => p.id);
        paymentsList = paymentsList.filter(p => unpaidPurchaseIds.includes(p.purchase_id));
      }
      
      setPayments(paymentsList);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Purchase Dashboard <span className="text-lg text-gray-600">خریداری ڈیش بورڈ</span></h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/purchasing/suppliers')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Manage Suppliers
            </button>
            <button
              onClick={() => navigate('/purchasing/entry')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
            >
              New Purchase
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Total Suppliers</div>
            <div className="text-3xl font-bold text-emerald-600">{dashboardStats.totalSuppliers}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Total Purchases</div>
            <div className="text-3xl font-bold text-blue-600">{formatCurrency(dashboardStats.totalPurchases)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Total Paid</div>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(dashboardStats.totalPaid)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Total Remaining</div>
            <div className="text-3xl font-bold text-red-600">{formatCurrency(dashboardStats.totalRemaining)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Suppliers with Balance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Suppliers with Outstanding Balance</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dashboardStats.suppliersWithBalance.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No outstanding balances</div>
              ) : (
                dashboardStats.suppliersWithBalance.map((supplier) => (
                  <div key={supplier.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{supplier.name}</div>
                        {supplier.company_name && (
                          <div className="text-sm text-gray-600">{supplier.company_name}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Purchases: {formatCurrency(supplier.totalPurchases)} | 
                          Paid: {formatCurrency(supplier.totalPayments)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">
                          {formatCurrency(supplier.balance)}
                        </div>
                        <button
                          onClick={() => navigate(`/purchasing/entry?supplier=${supplier.id}`)}
                          className="text-xs text-emerald-600 hover:text-emerald-800 mt-1"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Purchases */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Recent Purchases</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dashboardStats.recentPurchases.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No recent purchases</div>
              ) : (
                dashboardStats.recentPurchases.map((purchase) => (
                  <div key={purchase.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{purchase.bill_number}</div>
                        <div className="text-sm text-gray-600">
                          {purchase.suppliers?.name || 'N/A'} | {formatDate(purchase.bill_date)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Payment: {purchase.payment_method || 'Credit'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(purchase.debit_amount)}</div>
                        <div className={`text-xs ${purchase.is_paid ? 'text-green-600' : 'text-red-600'}`}>
                          {purchase.is_paid ? 'Paid' : `Remaining: ${formatCurrency(purchase.remaining_amount)}`}
                        </div>
                        <button
                          onClick={() => navigate(`/purchasing/entry`)}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                        >
                          View →
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Payment History <span className="text-sm text-gray-600">ادائیگی کی تاریخ</span></h2>
            <div className="flex gap-3">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid Purchases</option>
                <option value="unpaid">Unpaid Purchases</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Bill Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Received By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500">No payments found</td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(payment.payment_date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payment.suppliers?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payment.purchases?.bill_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{payment.payment_method}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{payment.transaction_id || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{payment.received_by || '-'}</td>
                      <td className="px-6 py-4 text-sm">{payment.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PurchaseDashboard;

