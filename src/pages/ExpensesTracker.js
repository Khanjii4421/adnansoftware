import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_URL } from '../utils/api';

const ExpensesTracker = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); // week, month, 3months, 6months, year
  const [expenseForm, setExpenseForm] = useState({
    expense_name: '',
    expense_category: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // Expense categories - 5 predefined + 5 custom
  const predefinedCategories = [
    'Salary',
    'Rent',
    'House Bill',
    'Hotel',
    'Transport',
    'Staff Salary'
  ];

  const [customCategories, setCustomCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([...predefinedCategories]);

  // Summary data
  const [summary, setSummary] = useState({
    totalAdminProfit: 0,
    totalReceived: 0,
    purchaseTotalPaid: 0,
    remainingPurchase: 0,
    remainingBills: 0,
    totalProfit: 0,
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    netProfit: 0
  });

  // Chart data
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
      fetchCustomCategories();
    }
  }, [user, timeRange]);

  const fetchCustomCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/expenses/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const custom = response.data.categories || [];
      setCustomCategories(custom);
      setAllCategories([...predefinedCategories, ...custom]);
    } catch (error) {
      console.error('Error fetching custom categories:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch expenses
      const expensesResponse = await axios.get(`${API_URL}/expenses?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(expensesResponse.data.expenses || []);

      // Fetch summary (profit, sales, purchases)
      const summaryResponse = await axios.get(`${API_URL}/expenses/summary?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummary(summaryResponse.data);

      // Fetch chart data
      const chartResponse = await axios.get(`${API_URL}/expenses/chart?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChartData(chartResponse.data.chartData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch expenses data';
      console.error('Full error:', error.response?.data);
      alert(`Error: ${errorMessage}\n\nPlease make sure the expenses table exists in the database. Run expenses-schema.sql in Supabase SQL Editor.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editingExpense) {
        await axios.put(`${API_URL}/expenses/${editingExpense.id}`, expenseForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Expense updated successfully!');
      } else {
        await axios.post(`${API_URL}/expenses`, expenseForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Expense added successfully!');
      }
      
      setShowAddModal(false);
      setEditingExpense(null);
      setExpenseForm({
        expense_name: '',
        expense_category: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        description: ''
      });
      fetchData();
      fetchCustomCategories();
    } catch (error) {
      console.error('Error saving expense:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save expense';
      console.error('Full error:', error.response?.data);
      alert(`Error: ${errorMessage}\n\nPlease check:\n1. Expenses table exists in database\n2. All required fields are filled\n3. Database connection is working`);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      expense_name: expense.expense_name,
      expense_category: expense.expense_category,
      amount: expense.amount,
      expense_date: expense.expense_date,
      description: expense.description || ''
    });
    setShowAddModal(true);
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Expense deleted successfully!');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete expense');
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const category = expense.expense_category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += parseFloat(expense.amount || 0);
    return acc;
  }, {});

  const categoryData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value: parseFloat(value)
  }));

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Access Denied. Only admins can view expenses tracker.
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6 p-2 sm:p-3 md:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Expenses Tracker</h1>
          <button
            onClick={() => {
              setEditingExpense(null);
              setExpenseForm({
                expense_name: '',
                expense_category: '',
                amount: '',
                expense_date: new Date().toISOString().split('T')[0],
                description: ''
              });
              setShowAddModal(true);
            }}
            className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-indigo-600 text-white text-xs sm:text-sm md:text-base rounded-lg hover:bg-indigo-700 transition-colors shadow-lg whitespace-nowrap"
          >
            ➕ Add Expense
          </button>
        </div>

        {/* Time Range Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Time Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full md:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {/* Admin Profit */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 sm:p-6 text-white">
            <h3 className="text-xs sm:text-sm font-medium opacity-90">Admin Profit</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{formatCurrency(summary.totalAdminProfit)}</p>
            <p className="text-[10px] sm:text-xs mt-1 sm:mt-2 opacity-75">From Dashboard</p>
          </div>

          {/* Total Received */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 sm:p-6 text-white">
            <h3 className="text-xs sm:text-sm font-medium opacity-90">Total Received</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{formatCurrency(summary.totalReceived)}</p>
            <p className="text-[10px] sm:text-xs mt-1 sm:mt-2 opacity-75">From Generate Bill</p>
          </div>

          {/* Purchase Paid */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-4 sm:p-6 text-white">
            <h3 className="text-xs sm:text-sm font-medium opacity-90">Purchase Paid</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{formatCurrency(summary.purchaseTotalPaid)}</p>
            <p className="text-[10px] sm:text-xs mt-1 sm:mt-2 opacity-75">Total Paid</p>
          </div>

          {/* Remaining Purchase */}
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-4 sm:p-6 text-white">
            <h3 className="text-xs sm:text-sm font-medium opacity-90">Remaining Purchase</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{formatCurrency(summary.remainingPurchase)}</p>
            <p className="text-[10px] sm:text-xs mt-1 sm:mt-2 opacity-75">Unpaid Purchases</p>
          </div>

          {/* Remaining Bills */}
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg shadow-lg p-4 sm:p-6 text-white">
            <h3 className="text-xs sm:text-sm font-medium opacity-90">Remaining Bills</h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{formatCurrency(summary.remainingBills)}</p>
            <p className="text-[10px] sm:text-xs mt-1 sm:mt-2 opacity-75">Unpaid Bills</p>
          </div>
        </div>

        {/* Calculated Profit Section */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-xl p-4 sm:p-6 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-medium opacity-90 mb-2">Total Profit Calculation</h3>
              <div className="text-xs sm:text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Admin Profit:</span>
                  <span className="font-semibold">{formatCurrency(summary.totalAdminProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>+ Total Received:</span>
                  <span className="font-semibold">{formatCurrency(summary.totalReceived)}</span>
                </div>
                <div className="flex justify-between">
                  <span>- Purchase Paid:</span>
                  <span className="font-semibold">{formatCurrency(summary.purchaseTotalPaid)}</span>
                </div>
                <div className="border-t border-white/30 pt-1 mt-1 flex justify-between">
                  <span className="font-bold">= Total Profit:</span>
                  <span className="font-bold text-lg">{formatCurrency(summary.totalProfit)}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-medium opacity-90 mb-2">Expenses</h3>
              <div className="text-xs sm:text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Total Expenses:</span>
                  <span className="font-semibold">{formatCurrency(summary.totalExpenses)}</span>
                </div>
                <div className="text-[10px] sm:text-xs opacity-75 mt-2">
                  (By Categories Below)
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-medium opacity-90 mb-2">Final Net Profit</h3>
              <div className="text-xs sm:text-sm">
                <div className="flex justify-between mb-2">
                  <span>Total Profit:</span>
                  <span className="font-semibold">{formatCurrency(summary.totalProfit)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>- Total Expenses:</span>
                  <span className="font-semibold">{formatCurrency(summary.totalExpenses)}</span>
                </div>
                <div className="border-t-2 border-white/50 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-base sm:text-lg">Net Profit:</span>
                  <span className={`font-bold text-xl sm:text-2xl ${summary.netProfit >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    {formatCurrency(summary.netProfit)}
                  </span>
                </div>
                <div className="text-[10px] sm:text-xs opacity-75 mt-2">
                  {summary.netProfit >= 0 ? '💰 Amount to Take' : '💸 Amount to Give'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expense Categories Boxes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Expenses by Category</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              (These are deducted from Total Profit)
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {allCategories.map((category) => {
              const categoryTotal = expensesByCategory[category] || 0;
              return (
                <div
                  key={category}
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
                >
                  <h3 className="font-semibold text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">{category}</h3>
                  <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(categoryTotal)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profit vs Expenses Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Profit vs Expenses Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} name="Profit" />
                <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="netProfit" stroke="#8B5CF6" strokeWidth={2} name="Net Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Expenses by Category */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Expenses by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="value" fill="#4F46E5" name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">All Expenses</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        No expenses found
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(expense.expense_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {expense.expense_category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.expense_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {expense.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Expense Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </h3>
              <form onSubmit={handleAddExpense}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expense Category *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={expenseForm.expense_category}
                      onChange={(e) => {
                        const value = e.target.value;
                        setExpenseForm({ ...expenseForm, expense_category: value });
                        // If it's a new category, add it to custom categories
                        if (value && !allCategories.includes(value)) {
                          setExpenseForm({ ...expenseForm, expense_category: value, expense_name: value });
                        }
                      }}
                    >
                      <option value="">Select Category</option>
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__NEW__">+ Add New Category</option>
                    </select>
                    {expenseForm.expense_category === '__NEW__' && (
                      <input
                        type="text"
                        placeholder="Enter new category name"
                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        onChange={(e) => {
                          const newCat = e.target.value;
                          setExpenseForm({ ...expenseForm, expense_category: newCat, expense_name: newCat });
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expense Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={expenseForm.expense_name}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expense_name: e.target.value })}
                      placeholder="e.g., January Salary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (Rs.) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={expenseForm.expense_date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows="3"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingExpense(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {editingExpense ? 'Update' : 'Add'} Expense
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

export default ExpensesTracker;

