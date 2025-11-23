import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_URL } from '../utils/api';

const Partnership = () => {
  const [party1Data, setParty1Data] = useState({
    customer: null,
    entries: [],
    totals: {
      total_debit: 0,
      total_credit: 0,
      remaining_balance: 0
    },
    loading: true
  });

  const [party2Data, setParty2Data] = useState({
    customer: null,
    entries: [],
    totals: {
      total_debit: 0,
      total_credit: 0,
      remaining_balance: 0
    },
    loading: true
  });

  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchPartnershipData();
  }, []);

  const fetchPartnershipData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // First, get all customers to find Party 1 and Party 2
      const customersResponse = await axios.get(`${API_URL}/ledger/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allCustomers = customersResponse.data.customers || [];
      // Find customers by party field (not name) - same as LedgerCustomers page
      const party1 = allCustomers.find(c => c.party === 'Party 1');
      const party2 = allCustomers.find(c => c.party === 'Party 2');

      // Fetch Party 1 data
      if (party1) {
        try {
          const party1Response = await axios.get(`${API_URL}/ledger/khata?customer_id=${party1.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setParty1Data({
            customer: party1,
            entries: party1Response.data.entries || [],
            totals: party1Response.data.totals || {
              total_debit: 0,
              total_credit: 0,
              remaining_balance: 0
            },
            loading: false
          });
        } catch (error) {
          console.error('Error fetching Party 1 data:', error);
          setParty1Data(prev => ({ ...prev, loading: false }));
        }
      } else {
        setParty1Data(prev => ({ ...prev, loading: false }));
      }

      // Fetch Party 2 data
      if (party2) {
        try {
          const party2Response = await axios.get(`${API_URL}/ledger/khata?customer_id=${party2.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setParty2Data({
            customer: party2,
            entries: party2Response.data.entries || [],
            totals: party2Response.data.totals || {
              total_debit: 0,
              total_credit: 0,
              remaining_balance: 0
            },
            loading: false
          });
        } catch (error) {
          console.error('Error fetching Party 2 data:', error);
          setParty2Data(prev => ({ ...prev, loading: false }));
        }
      } else {
        setParty2Data(prev => ({ ...prev, loading: false }));
      }

      if (!party1 && !party2) {
        setMessage({ type: 'info', text: 'Party 1 and Party 2 customers not found. Please create customers with party field set to "Party 1" or "Party 2" in the Customers section.' });
      }
    } catch (error) {
      console.error('Error fetching partnership data:', error);
      setMessage({ type: 'error', text: 'Failed to load partnership data' });
      setParty1Data(prev => ({ ...prev, loading: false }));
      setParty2Data(prev => ({ ...prev, loading: false }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const PartyCard = ({ partyName, data }) => {
    const { customer, entries, totals, loading } = data;
    
    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      );
    }

    if (!customer) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">{partyName}</h3>
          <p className="text-gray-500">Customer not found. Please create {partyName} in the Customers section.</p>
        </div>
      );
    }

    // Calculate amounts
    const amountToTake = totals.total_debit || 0; // Kitna lena hai (debit)
    const amountGiven = totals.total_credit || 0; // Kitna diya hai (credit)
    const remainingBalance = totals.remaining_balance || 0; // Remaining balance

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4">{partyName}</h3>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Kitna Lena Hai</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(amountToTake)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Debit</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Kitna Diya Hai</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(amountGiven)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Credit</p>
          </div>
          
          <div className={`border rounded-lg p-4 ${remainingBalance >= 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
            <p className="text-sm text-gray-600 mb-1">Remaining Balance</p>
            <p className={`text-2xl font-bold ${remainingBalance >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
              {formatCurrency(remainingBalance)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {remainingBalance >= 0 ? 'Amount Due' : 'Credit Available'}
            </p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Customer:</span> {customer.name}
            {customer.phone && <span className="ml-2">({customer.phone})</span>}
          </p>
          {customer.address && (
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold">Address:</span> {customer.address}
            </p>
          )}
        </div>

        {/* Recent Entries Table */}
        {entries.length > 0 ? (
          <div className="overflow-x-auto">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Entries</h4>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.slice(-10).map((entry, index) => (
                  <tr key={entry.id || index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {entry.description || entry.bill_number || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-red-600">
                      {parseFloat(entry.debit || 0) > 0 ? formatCurrency(entry.debit) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-green-600">
                      {parseFloat(entry.credit || 0) > 0 ? formatCurrency(entry.credit) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                      <span className={`font-bold ${parseFloat(entry.balance || 0) >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatCurrency(entry.balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length > 10 && (
              <p className="text-xs text-gray-500 mt-2">Showing last 10 entries. Total: {entries.length} entries</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No entries found for {partyName}</p>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Partnership Page <span className="text-sm text-gray-600">شراکت</span></h1>
            <p className="text-sm text-gray-600 mt-1">Party 1 aur Party 2 ka lena-dena ka hisaab</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              to="/ledger"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Dashboard
            </Link>
            <Link
              to="/ledger/khata"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Ledger Khata
            </Link>
            <Link
              to="/ledger/customers"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Customers
            </Link>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 
              message.type === 'error' ? 'bg-red-100 text-red-800' : 
              'bg-blue-100 text-blue-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{message.text}</span>
              <button
                onClick={() => setMessage({ type: '', text: '' })}
                className="font-bold hover:text-gray-900"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Partnership Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PartyCard partyName="Party 1" data={party1Data} />
          <PartyCard partyName="Party 2" data={party2Data} />
        </div>

        {/* Combined Summary */}
        {(party1Data.customer || party2Data.customer) && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg shadow-sm p-6 border border-purple-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Combined Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Kitna Lena Hai</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency((party1Data.totals.total_debit || 0) + (party2Data.totals.total_debit || 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">Party 1 + Party 2 Debit</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Kitna Diya Hai</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency((party1Data.totals.total_credit || 0) + (party2Data.totals.total_credit || 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">Party 1 + Party 2 Credit</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Remaining Balance</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency((party1Data.totals.remaining_balance || 0) + (party2Data.totals.remaining_balance || 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">Combined Balance</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Partnership;

