import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { API_URL } from '../utils/api';

const COLORS = ['#00C49F', '#FF8042', '#FFBB28', '#8884D8'];

const SellerDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState([]);
  const [trendPeriod, setTrendPeriod] = useState('week');
  const [kpiData, setKpiData] = useState(null);
  const [invoiceStats, setInvoiceStats] = useState({
    totalOrders: 0,
    totalProfit: 0,
    paidAmount: 0
  });

  useEffect(() => {
    fetchStats();
    fetchTrends();
  }, [trendPeriod]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const [statsResponse, invoicesResponse] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/invoices`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setStats(statsResponse.data.stats);
      
      // Set KPI data from dashboard stats
      setKpiData({
        product_kpis: statsResponse.data.product_kpis || [],
        city_kpis: statsResponse.data.city_kpis || [],
        daily_trends: statsResponse.data.daily_trends || []
      });

      // Calculate invoice stats
      const invoices = invoicesResponse.data.invoices || [];
      const totalOrders = invoices.reduce((sum, inv) => sum + (inv.total_orders || 0), 0);
      const totalProfit = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_profit || 0), 0);
      const paidAmount = invoices
        .filter(inv => inv.is_paid)
        .reduce((sum, inv) => sum + parseFloat(inv.total_profit || 0), 0);

      setInvoiceStats({
        totalOrders,
        totalProfit,
        paidAmount
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/dashboard/trends?period=${trendPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrends(response.data.trends || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
      setTrends([]);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
          <p className="text-indigo-100">Welcome back! Here's your overview</p>
        </div>

        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Today's Orders</p>
                <p className="text-4xl font-bold">{stats?.today_orders || 0}</p>
                <p className="text-blue-100 text-xs mt-2">📦 New orders today</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-full">
                <span className="text-4xl">📦</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Delivered</p>
                <p className="text-4xl font-bold">{stats?.delivered || 0}</p>
                <p className="text-green-100 text-xs mt-2">✓ Completed orders</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-full">
                <span className="text-4xl">✓</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium mb-1">Pending</p>
                <p className="text-4xl font-bold">{stats?.pending || 0}</p>
                <p className="text-yellow-100 text-xs mt-2">⏳ In progress</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-full">
                <span className="text-4xl">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium mb-1">Returns</p>
                <p className="text-4xl font-bold">{stats?.returned || 0}</p>
                <p className="text-red-100 text-xs mt-2">↩️ Returned orders</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-full">
                <span className="text-4xl">↩️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice-based Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Orders</p>
                <p className="text-4xl font-bold">{invoiceStats.totalOrders}</p>
                <p className="text-blue-100 text-xs mt-2">From all invoices</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-full">
                <span className="text-4xl">📦</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Total Profit</p>
                <p className="text-3xl font-bold">Rs. {invoiceStats.totalProfit.toLocaleString()}</p>
                <p className="text-green-100 text-xs mt-2">From all invoices</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-full">
                <span className="text-4xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Paid Amount</p>
                <p className="text-3xl font-bold">Rs. {invoiceStats.paidAmount.toLocaleString()}</p>
                <p className="text-purple-100 text-xs mt-2">Amount received</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-full">
                <span className="text-4xl">✅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Distribution Pie Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Delivered', value: stats?.delivered || 0 },
                  { name: 'Returned', value: stats?.returned || 0 },
                  { name: 'Pending', value: stats?.pending || 0 },
                  { name: 'Confirmed', value: stats?.confirmed || 0 }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {[0, 1, 2, 3].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Product KPIs */}
        {kpiData && kpiData.product_kpis && kpiData.product_kpis.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Top Products (Sales Count)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={kpiData.product_kpis.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product_code" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Sales Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* City KPIs */}
        {kpiData && kpiData.city_kpis && kpiData.city_kpis.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Top Cities (Order Count)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={kpiData.city_kpis.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="city" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#00C49F" name="Order Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Trends Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trends */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Sales Trends</h3>
              <select
                value={trendPeriod}
                onChange={(e) => setTrendPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="daily">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} name="Orders" />
                  <Line yAxisId="right" type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={2} name="Sales (Rs.)" />
                  <Line yAxisId="right" type="monotone" dataKey="profit" stroke="#F59E0B" strokeWidth={2} name="Profit (Rs.)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>

          {/* Financial Overview */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Financial Overview</h3>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="seller_price" fill="#3B82F6" name="Seller Price" />
                  <Bar dataKey="profit" fill="#10B981" name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SellerDashboard;

