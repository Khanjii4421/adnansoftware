import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_URL } from '../utils/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [sellers, setSellers] = useState([]);
  const [kpis, setKpis] = useState({
    product_kpis: [],
    city_kpis: [],
    return_city_kpis: [],
    delivered_city_kpis: [],
    daily_trends: [],
    delivered_data: [],
    returned_data: [],
    summary: null
  });

  // Fetch sellers list
  useEffect(() => {
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
    fetchSellers();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Build query params with seller_id if selected
      const params = {};
      if (selectedSeller) {
        params.seller_id = selectedSeller;
      }
      
      // Parallel requests for better performance
      const [statsRes, kpiRes, lowStockRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          params: params
        }),
        axios.get(`${API_URL}/orders/kpis`, {
          headers: { Authorization: `Bearer ${token}` },
          params: params
        }),
        axios.get(`${API_URL}/inventory/low-stock`, {
          headers: { Authorization: `Bearer ${token}` },
          params: selectedSeller ? { seller_id: selectedSeller } : {}
        }).catch(() => ({ data: { inventory: [] } })) // Don't fail if low stock fails
      ]);
      
      console.log('[AdminDashboard] Stats response:', {
        totalOrders: statsRes.data.stats?.totalOrders,
        total_orders: statsRes.data.stats?.total_orders,
        delivered: statsRes.data.stats?.delivered,
        seller_id_filter: selectedSeller,
        fullStats: statsRes.data.stats
      });

      // Debug: inspect payload keys if counts look off
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('Dashboard /stats payload:', statsRes.data);
      }

      let incomingStats = statsRes.data.stats || statsRes.data || {};
      
      // Ensure we have the financial data
      if (!incomingStats.total_sales && incomingStats.total_sales !== 0) {
        incomingStats.total_sales = 0;
      }
      if (!incomingStats.total_shipper_price && incomingStats.total_shipper_price !== 0) {
        incomingStats.total_shipper_price = 0;
      }
      if (!incomingStats.seller_profit && incomingStats.seller_profit !== 0) {
        incomingStats.seller_profit = 0;
      }
      if (!incomingStats.admin_profit && incomingStats.admin_profit !== 0) {
        incomingStats.admin_profit = 0;
      }

      // Set low stock from parallel request
      setLowStock(lowStockRes.data.inventory?.slice(0, 10) || []);

      // Get additional KPI data from stats response
      const product_kpis = incomingStats.product_kpis || statsRes.data.product_kpis || [];
      const city_kpis = incomingStats.city_kpis || statsRes.data.city_kpis || [];
      const daily_trends = incomingStats.daily_trends || statsRes.data.daily_trends || [];

      // Process KPIs from parallel request
      const payload = kpiRes.data || {};
        // Ensure product codes are shown case-insensitively (backend already uppercases)
        const productKpis = Array.isArray(payload.product_kpis) ? payload.product_kpis : product_kpis;
        const deliveredData = Array.isArray(payload.delivered_data) ? payload.delivered_data : [];
        const returnedData = Array.isArray(payload.returned_data) ? payload.returned_data : [];
        const cityKpis = Array.isArray(payload.city_kpis) ? payload.city_kpis : city_kpis;
        const summary = payload.summary || null;

        // Merge missing/zero counts from summary into stats
        if (summary) {
          const merged = { ...incomingStats };
          const copyIf = (key) => {
            const v = merged[key];
            const sv = summary[key];
            if ((v === undefined || v === null || Number(v) === 0) && (sv !== undefined && sv !== null)) {
              merged[key] = sv;
            }
          };
          copyIf('total_orders');
          copyIf('delivered');
          copyIf('returned');
          copyIf('pending');
          copyIf('confirmed');
          // Recompute ratios if needed
          if (merged.total_orders > 0) {
            if (merged.delivered !== undefined && (merged.delivery_ratio === undefined || Number(merged.delivery_ratio) === 0)) {
              merged.delivery_ratio = (merged.delivered / merged.total_orders) * 100;
            }
            if (merged.returned !== undefined && (merged.return_ratio === undefined || Number(merged.return_ratio) === 0)) {
              merged.return_ratio = (merged.returned / merged.total_orders) * 100;
            }
          }
          incomingStats = merged;
        }

        setKpis({
          product_kpis: productKpis,
          city_kpis: cityKpis,
          return_city_kpis: Array.isArray(payload.return_city_kpis) ? payload.return_city_kpis : [],
          delivered_city_kpis: Array.isArray(payload.delivered_city_kpis) ? payload.delivered_city_kpis : [],
          daily_trends: daily_trends,
          delivered_data: deliveredData,
          returned_data: returnedData,
          summary
        });
      } catch (err) {
        console.error('Error processing KPIs:', err);
        setKpis({ 
          product_kpis: product_kpis, 
          city_kpis: city_kpis,
          return_city_kpis: [],
          delivered_city_kpis: [],
          daily_trends: daily_trends,
          delivered_data: [], 
          returned_data: [], 
          summary: null 
        });
      }

      // Commit stats after potential merge
      setStats(incomingStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setStats({});
      setLowStock([]);
      setKpis({ product_kpis: [], delivered_data: [], returned_data: [], summary: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedSeller]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 p-2 md:p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-xl p-6 md:p-8 border-2 border-green-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <span className="text-4xl">📊</span>
                Admin Dashboard
              </h1>
              <p className="text-base text-gray-700 font-medium">
                {selectedSeller 
                  ? `Showing data for: ${sellers.find(s => s.id === selectedSeller)?.name || sellers.find(s => s.id === selectedSeller)?.email || 'Selected Seller'}`
                  : "Welcome back! Here's your comprehensive overview"
                }
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Seller Filter Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="seller-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Filter by Seller:
                </label>
                <select
                  id="seller-filter"
                  value={selectedSeller}
                  onChange={(e) => {
                    console.log('[AdminDashboard] Seller changed to:', e.target.value);
                    setSelectedSeller(e.target.value);
                  }}
                  className="px-4 py-2 border-2 border-green-300 rounded-lg bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 min-w-[200px]"
                >
                  <option value="">All Sellers</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name || seller.email}
                    </option>
                  ))}
                </select>
                {selectedSeller && (
                  <button
                    onClick={() => {
                      console.log('[AdminDashboard] Clearing seller filter');
                      setSelectedSeller('');
                    }}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
                    title="Clear filter"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="hidden md:block">
                <div className="bg-white rounded-full p-4 shadow-lg">
                  <span className="text-4xl">🎯</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-green-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">📦</span>
                  <p className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Total Orders</p>
                </div>
                <p className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-1">{stats?.total_orders || stats?.totalOrders || 0}</p>
                <div className="h-1 bg-green-400 rounded-full mt-2"></div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-green-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">✅</span>
                  <p className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Delivered</p>
                </div>
                <p className="text-4xl md:text-5xl font-extrabold text-green-700 mb-1">{stats?.delivered || 0}</p>
                <div className="h-1 bg-green-500 rounded-full mt-2"></div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-green-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">↩️</span>
                  <p className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Returned</p>
                </div>
                <p className="text-4xl md:text-5xl font-extrabold text-red-600 mb-1">{stats?.returned || 0}</p>
                <div className="h-1 bg-red-400 rounded-full mt-2"></div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-green-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">⏳</span>
                  <p className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Pending</p>
                </div>
                <p className="text-4xl md:text-5xl font-extrabold text-yellow-600 mb-1">{stats?.pending || 0}</p>
                <div className="h-1 bg-yellow-400 rounded-full mt-2"></div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-green-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">✓</span>
                  <p className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Confirmed</p>
                </div>
                <p className="text-4xl md:text-5xl font-extrabold text-blue-600 mb-1">{stats?.confirmed || 0}</p>
                <div className="h-1 bg-blue-400 rounded-full mt-2"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Delivery Ratio */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-teal-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">📈</span>
                  <p className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Delivery Ratio</p>
                </div>
                <p className="text-4xl md:text-5xl font-extrabold text-teal-700 mb-2">{stats?.delivery_ratio?.toFixed(1) || 0}%</p>
                <p className="text-gray-600 text-xs font-medium">{stats?.delivered || 0} delivered orders</p>
                <div className="h-1 bg-teal-400 rounded-full mt-3"></div>
              </div>
            </div>
          </div>
        </div>

        {/* All KPI Graphs */}
        <div className="space-y-6">
          {/* Status Distribution - Pie Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Delivered Pie Chart */}
            <div className="bg-green-50 rounded-lg shadow-lg p-4 md:p-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Order Status Distribution</h3>
              <div className="w-full" style={{ minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height={250}>
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
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2, 3].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Delivered KPI donut */}
            <div className="bg-green-50 rounded-lg shadow-lg p-4 md:p-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Delivered Ratio</h3>
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 md:w-44 md:h-44">
                  <KpiDonut
                    value={stats?.delivered || 0}
                    total={stats?.total_orders || stats?.totalOrders || 0}
                    color="#10b981"
                  />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-700 font-medium">Delivered Orders</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">
                    {stats?.delivered || 0} / {stats?.total_orders || stats?.totalOrders || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Returned KPI donut */}
            <div className="bg-green-50 rounded-lg shadow-lg p-4 md:p-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Return Ratio</h3>
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 md:w-44 md:h-44">
                  <KpiDonut
                    value={stats?.returned || 0}
                    total={stats?.total_orders || stats?.totalOrders || 0}
                    color="#f43f5e"
                  />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-700 font-medium">Returned Orders</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">
                    {stats?.returned || 0} / {stats?.total_orders || stats?.totalOrders || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Product KPIs Bar Chart */}
          {kpis.product_kpis && Array.isArray(kpis.product_kpis) && kpis.product_kpis.length > 0 ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-green-300">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">📊</span>
                <h3 className="text-2xl font-extrabold text-gray-900">Top Products (Sales Count)</h3>
              </div>
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: '100%', minHeight: '350px' }}>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={kpis.product_kpis.slice(0, 10).sort((a, b) => (b.count || 0) - (a.count || 0))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis 
                        dataKey="product_code" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100}
                        tick={{ fontSize: 12, fill: '#374151' }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#374151' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#f9fafb', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="count" 
                        fill="#10b981" 
                        name="Sales Count"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl p-8 md:p-12 border-2 border-green-300 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Product Data Available</h3>
              <p className="text-gray-600">Product sales data will appear here once orders are created.</p>
            </div>
          )}

          {/* City KPIs Bar Chart */}
          {kpis.city_kpis && Array.isArray(kpis.city_kpis) && kpis.city_kpis.length > 0 ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-green-300">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🏙️</span>
                <h3 className="text-2xl font-extrabold text-gray-900">Top Cities (Order Count)</h3>
              </div>
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: '100%', minHeight: '350px' }}>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={kpis.city_kpis.slice(0, 10).sort((a, b) => (b.count || 0) - (a.count || 0))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis 
                        dataKey="city" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100}
                        tick={{ fontSize: 12, fill: '#374151' }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#374151' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#f9fafb', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="count" 
                        fill="#3b82f6" 
                        name="Order Count"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl p-8 md:p-12 border-2 border-green-300 text-center">
              <div className="text-6xl mb-4">🏙️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No City Data Available</h3>
              <p className="text-gray-600">City order data will appear here once orders are created.</p>
            </div>
          )}

          {/* Delivered Cities KPI Bar Chart */}
          {kpis.delivered_city_kpis && Array.isArray(kpis.delivered_city_kpis) && kpis.delivered_city_kpis.length > 0 ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-green-300">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">✅</span>
                <h3 className="text-2xl font-extrabold text-gray-900">Top Delivered Cities</h3>
              </div>
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: '100%', minHeight: '350px' }}>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={kpis.delivered_city_kpis.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis 
                        dataKey="city" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100}
                        tick={{ fontSize: 12, fill: '#374151' }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#374151' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#f9fafb', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="count" 
                        fill="#10b981" 
                        name="Delivered Count"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl p-8 md:p-12 border-2 border-green-300 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Delivered City Data Available</h3>
              <p className="text-gray-600">Delivered city data will appear here once orders are delivered.</p>
            </div>
          )}

          {/* Return Cities KPI Bar Chart */}
          {kpis.return_city_kpis && Array.isArray(kpis.return_city_kpis) && kpis.return_city_kpis.length > 0 ? (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-red-300">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">↩️</span>
                <h3 className="text-2xl font-extrabold text-gray-900">Top Return Cities</h3>
              </div>
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: '100%', minHeight: '350px' }}>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={kpis.return_city_kpis.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis 
                        dataKey="city" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100}
                        tick={{ fontSize: 12, fill: '#374151' }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#374151' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#f9fafb', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="count" 
                        fill="#f43f5e" 
                        name="Return Count"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl shadow-xl p-8 md:p-12 border-2 border-red-300 text-center">
              <div className="text-6xl mb-4">↩️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Return City Data Available</h3>
              <p className="text-gray-600">Return city data will appear here once return orders are processed.</p>
            </div>
          )}

          {/* Daily Trends Line Chart */}
          {kpis.daily_trends && Array.isArray(kpis.daily_trends) && kpis.daily_trends.length > 0 ? (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-indigo-300">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">📈</span>
                <h3 className="text-2xl font-extrabold text-gray-900">Daily Order Trends (Last 30 Days)</h3>
              </div>
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: '100%', minHeight: '350px' }}>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={kpis.daily_trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100}
                        tick={{ fontSize: 12, fill: '#374151' }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#374151' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#f9fafb', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#8884d8" 
                        strokeWidth={3} 
                        name="Total Orders"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="delivered" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        name="Delivered"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="returned" 
                        stroke="#f43f5e" 
                        strokeWidth={3} 
                        name="Returned"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pending" 
                        stroke="#fbbf24" 
                        strokeWidth={3} 
                        name="Pending"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-xl p-8 md:p-12 border-2 border-indigo-300 text-center">
              <div className="text-6xl mb-4">📈</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Trend Data Available</h3>
              <p className="text-gray-600">Daily trend data will appear here once orders are created over time.</p>
            </div>
          )}
        </div>

        {/* Financial Stats Section */}
        <div className="mt-8">
          <div className="mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
              <span className="text-4xl">💼</span>
              Financial Overview
            </h2>
            <p className="text-gray-600 mt-2">Total sales, shipper price, seller profit, and admin profit</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-blue-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">💰</span>
                  <p className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Total Sales</p>
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-blue-900 mb-2">
                  Rs. {parseFloat(stats?.total_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-gray-600 text-xs font-medium">Total revenue from all orders</p>
                <div className="h-1 bg-blue-400 rounded-full mt-3"></div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-purple-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">🚚</span>
                  <p className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Shipper Price</p>
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-purple-900 mb-2">
                  Rs. {parseFloat(stats?.total_shipper_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-gray-600 text-xs font-medium">Total shipping costs</p>
                <div className="h-1 bg-purple-400 rounded-full mt-3"></div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-green-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">💵</span>
                  <p className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Seller Profit</p>
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-green-700 mb-2">
                  Rs. {parseFloat(stats?.seller_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-gray-600 text-xs font-medium">Net profit from invoices</p>
                <div className="h-1 bg-green-500 rounded-full mt-3"></div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl shadow-xl p-5 md:p-6 border-2 border-orange-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">👑</span>
                  <p className="text-gray-700 text-sm font-semibold uppercase tracking-wide">Admin Profit</p>
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-orange-700 mb-2">
                  Rs. {Math.max(0, parseFloat(stats?.admin_profit || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-gray-600 text-xs font-medium">Admin earnings (remaining)</p>
                <div className="h-1 bg-orange-400 rounded-full mt-3"></div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Additional Stats (orders-related cards removed) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-green-50 rounded-lg shadow-lg p-4 md:p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 text-sm font-medium">Low Stock</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{stats?.low_stock || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStock && Array.isArray(lowStock) && lowStock.length > 0 && (
          <div className="bg-green-50 rounded-lg shadow-lg overflow-hidden border border-green-200">
            <div className="bg-green-100 p-4 md:p-6 border-b border-green-200">
              <h3 className="text-lg md:text-xl font-bold text-gray-800">Low Stock Alert (≤100 Qty)</h3>
            </div>
            <div className="p-4 md:p-6">
              <div className="space-y-3">
                {lowStock.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 rounded-lg bg-white border border-green-200">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{item.product_name}</p>
                      <p className="text-sm text-gray-600">
                        {item.product_code} • Qty: <span className="font-bold text-gray-800">{item.qty}</span>
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className="px-3 py-1 bg-red-200 text-red-800 text-xs font-bold rounded-full">LOW</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

// Lightweight sparkline component (SVG) for KPI series [{ date, count }]
const KpiSparkline = ({ data, color }) => {
  const width = 600;
  const height = 140;
  const padding = 24;

  const points = Array.isArray(data) ? data : [];
  const counts = points.map(p => Number(p.count) || 0);
  const maxY = Math.max(1, ...counts);
  const minY = 0;

  const n = Math.max(1, points.length);
  const xFor = (i) => {
    if (n === 1) return padding;
    const t = i / (n - 1);
    return padding + t * (width - padding * 2);
  };
  const yFor = (v) => {
    const t = (v - minY) / (maxY - minY || 1);
    return height - padding - t * (height - padding * 2);
  };

  const linePath = () => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)},${yFor(Number(p.count) || 0)}`).join(' ');
  };

  const areaPath = () => {
    if (points.length === 0) return '';
    const topPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)},${yFor(Number(p.count) || 0)}`).join(' ');
    const lastX = xFor(points.length - 1);
    const firstX = xFor(0);
    const baseY = height - padding;
    return `${topPath} L ${lastX},${baseY} L ${firstX},${baseY} Z`;
  };

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 md:h-36">
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => {
          const y = height - padding - g * (height - padding * 2);
          return <line key={g} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
        })}
        {/* Area */}
        <path d={areaPath()} fill={`${color}22`} />
        {/* Line */}
        <path d={linePath()} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={xFor(i)} cy={yFor(Number(p.count) || 0)} r="2.5" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{points[0]?.date || ''}</span>
        <span>{points[points.length - 1]?.date || ''}</span>
      </div>
    </div>
  );
};

export default AdminDashboard;

// Donut chart for a single KPI (value/total)
const KpiDonut = ({ value, total, color }) => {
  const size = 160;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.max(0, Math.min(1, (Number(value) || 0) / safeTotal));
  const dash = circumference * ratio;
  const gap = circumference - dash;
  const percent = Math.round(ratio * 100);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${gap}`}
        />
      </g>
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="fill-gray-800"
        style={{ fontSize: 20, fontWeight: 700 }}
      >
        {percent}%
      </text>
      <text
        x="50%"
        y="62%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="fill-gray-500"
        style={{ fontSize: 12, fontWeight: 500 }}
      >
        {Number(value) || 0}/{total || 0}
      </text>
    </svg>
  );
};
