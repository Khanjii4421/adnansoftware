import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

import { API_URL } from '../utils/api';

const LedgerDashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedParty, setSelectedParty] = useState('');
  const [partyStats, setPartyStats] = useState(null);

  const periods = [
    { value: 'day', label: 'Today' },
    { value: '3days', label: 'Last 3 Days' },
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'This Month' },
    { value: '3months', label: 'Last 3 Months' },
    { value: '6months', label: 'Last 6 Months' },
    { value: 'year', label: 'This Year' }
  ];

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, selectedParty]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch stats and analytics in parallel
      const params = selectedParty ? `?party=${selectedParty}` : '';
      const [statsResponse, analyticsResponse, partyStatsResponse] = await Promise.all([
        axios.get(`${API_URL}/ledger/dashboard/stats${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/ledger/dashboard/analytics?period=${selectedPeriod}${selectedParty ? `&party=${selectedParty}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/ledger/dashboard/party-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setStats(statsResponse.data.stats);
      setAnalytics(analyticsResponse.data);
      setPartyStats(partyStatsResponse.data.partyStats || []);
      console.log('[LedgerDashboard] Analytics data:', analyticsResponse.data);
      console.log('[LedgerDashboard] Chart data:', analyticsResponse.data?.data || analyticsResponse.data?.chartData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/ledger/customers"
            className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">👥 Manage Customers</h3>
                <p className="text-blue-100 text-sm">Add customers individually or in bulk</p>
              </div>
              <div className="text-4xl">→</div>
            </div>
          </Link>
          <Link
            to="/ledger/entries"
            className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-6 text-white hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">📝 Manage Entries</h3>
                <p className="text-green-100 text-sm">Add debit/credit transactions</p>
              </div>
              <div className="text-4xl">→</div>
            </div>
          </Link>
          <Link
            to="/ledger/khata"
            className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg shadow-lg p-6 text-white hover:from-orange-700 hover:to-orange-800 transition-all transform hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">📊 Ledger Khata</h3>
                <p className="text-orange-100 text-sm">Complete ledger with all billing details</p>
              </div>
              <div className="text-4xl">→</div>
            </div>
          </Link>
          <Link
            to="/ledger/partnership"
            className="bg-gradient-to-r from-pink-600 to-pink-700 rounded-lg shadow-lg p-6 text-white hover:from-pink-700 hover:to-pink-800 transition-all transform hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">🤝 Partnership</h3>
                <p className="text-pink-100 text-sm">Party 1 & Party 2 ledger details</p>
              </div>
              <div className="text-4xl">→</div>
            </div>
          </Link>
          <Link
            to="/generate-bill"
            className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow-lg p-6 text-white hover:from-purple-700 hover:to-purple-800 transition-all transform hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">🧾 Generate Bill</h3>
                <p className="text-purple-100 text-sm">Create bills with products and payments</p>
              </div>
              <div className="text-4xl">→</div>
            </div>
          </Link>
        </div>

        {/* Period and Party Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-semibold text-gray-700 self-center mr-2">Time Period:</span>
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === period.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-semibold text-gray-700 mr-2">Filter by Party:</span>
            <select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Parties</option>
              <option value="Party 1">Party 1</option>
              <option value="Party 2">Party 2</option>
              <option value="Party 3">Party 3</option>
              <option value="Party 4">Party 4</option>
              <option value="Party 5">Party 5</option>
            </select>
          </div>
        </div>

        {/* Party-wise Statistics */}
        {partyStats && partyStats.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Party-wise Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {partyStats.map((party) => (
                <div key={party.party || 'No Party'} className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">{party.party || 'No Party'}</p>
                      <p className="text-xl font-bold mt-1">{party.customerCount || 0} Customers</p>
                      <p className="text-sm opacity-90 mt-1">Balance: {formatCurrency(party.totalBalance || 0)}</p>
                    </div>
                    <div className="text-3xl opacity-80">👥</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Debit */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Debit</p>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {formatCurrency(stats?.totalDebit || 0)}
                </p>
                {analytics?.summary && (
                  <p className="text-xs text-gray-500 mt-1">
                    Period: {formatCurrency(analytics.summary.totalDebit)}
                  </p>
                )}
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <span className="text-2xl">📤</span>
              </div>
            </div>
          </div>

          {/* Total Credit */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Credit</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {formatCurrency(stats?.totalCredit || 0)}
                </p>
                {analytics?.summary && (
                  <p className="text-xs text-gray-500 mt-1">
                    Period: {formatCurrency(analytics.summary.totalCredit)}
                  </p>
                )}
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <span className="text-2xl">📥</span>
              </div>
            </div>
          </div>

          {/* Current Balance */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Balance</p>
                <p className={`text-2xl font-bold mt-2 ${
                  (stats?.currentBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(stats?.currentBalance || 0)}
                </p>
                {analytics?.summary && (
                  <p className="text-xs text-gray-500 mt-1">
                    Net: {formatCurrency(analytics.summary.netBalance)}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-full ${
                (stats?.currentBalance || 0) >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          {/* Customers */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {stats?.customerCount || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.transactionCount || 0} Transactions
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Debit vs Credit Line Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Debit vs Credit Trend ({periods.find(p => p.value === selectedPeriod)?.label})
            </h3>
            {(!analytics?.data && !analytics?.chartData) || (analytics?.data?.length === 0 && analytics?.chartData?.length === 0) ? (
              <div className="flex items-center justify-center h-[350px] text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">📊</p>
                  <p>No data available for this period</p>
                </div>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={analytics?.data || analytics?.chartData || []}>
                <defs>
                  <linearGradient id="colorDebit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  tickFormatter={(value) => `Rs ${(value / 1000).toFixed(0)}k`}
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Date: ${formatDate(label)}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="debit"
                  stroke="#EF4444"
                  fillOpacity={1}
                  fill="url(#colorDebit)"
                  name="Debit"
                />
                <Area
                  type="monotone"
                  dataKey="credit"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorCredit)"
                  name="Credit"
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
            {analytics?.summary && (
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500">Period Debit</p>
                  <p className="text-sm font-semibold text-red-600">
                    {formatCurrency(analytics.summary.totalDebit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Period Credit</p>
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(analytics.summary.totalCredit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Net Balance</p>
                  <p className={`text-sm font-semibold ${
                    analytics.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(analytics.summary.netBalance)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Debit vs Credit Bar Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Daily Comparison ({periods.find(p => p.value === selectedPeriod)?.label})
            </h3>
            {(!analytics?.data && !analytics?.chartData) || (analytics?.data?.length === 0 && analytics?.chartData?.length === 0) ? (
              <div className="flex items-center justify-center h-[350px] text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">📊</p>
                  <p>No data available for this period</p>
                </div>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analytics?.data || analytics?.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  tickFormatter={(value) => `Rs ${(value / 1000).toFixed(0)}k`}
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Date: ${formatDate(label)}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="debit" fill="#EF4444" name="Debit" radius={[4, 4, 0, 0]} />
                <Bar dataKey="credit" fill="#10B981" name="Credit" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
            {analytics?.summary && (
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  {analytics.summary.transactionCount} transactions in this period
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Balance Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Balance Trend ({periods.find(p => p.value === selectedPeriod)?.label})
          </h3>
          {(!analytics?.data && !analytics?.chartData) || (analytics?.data?.length === 0 && analytics?.chartData?.length === 0) ? (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">📊</p>
                <p>No data available for this period</p>
              </div>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics?.data || analytics?.chartData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                tickFormatter={(value) => `Rs ${(value / 1000).toFixed(0)}k`}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '8px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Balance"
              />
            </LineChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Top Due Customers */}
        {stats?.topDueCustomers && stats.topDueCustomers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Top Due Customers</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.topDueCustomers.map((customer, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                        {formatCurrency(customer.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-4">Period Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm opacity-90">Start Date</p>
              <p className="text-lg font-semibold">
                {analytics?.startDate ? formatDate(analytics.startDate) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-90">End Date</p>
              <p className="text-lg font-semibold">
                {analytics?.endDate ? formatDate(analytics.endDate) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-90">Total Transactions</p>
              <p className="text-lg font-semibold">
                {analytics?.summary?.transactionCount || 0}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-90">Net Balance</p>
              <p className="text-lg font-semibold">
                {analytics?.summary ? formatCurrency(analytics.summary.netBalance) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LedgerDashboard;

