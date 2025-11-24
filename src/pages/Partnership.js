import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_URL } from '../utils/api';

const Partnership = () => {
  const [party1Data, setParty1Data] = useState({
    customers: [], // Array of all Party 1 customers with their data
    combinedTotals: {
      total_debit: 0,
      total_credit: 0,
      remaining_balance: 0
    },
    loading: true
  });

  const [party2Data, setParty2Data] = useState({
    customers: [], // Array of all Party 2 customers with their data
    combinedTotals: {
      total_debit: 0,
      total_credit: 0,
      remaining_balance: 0
    },
    loading: true
  });

  const [message, setMessage] = useState({ type: '', text: '' });
  const [party1SearchTerm, setParty1SearchTerm] = useState('');
  const [party2SearchTerm, setParty2SearchTerm] = useState('');

  useEffect(() => {
    fetchPartnershipData();
  }, []);

  const fetchPartnershipData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // First, get all customers to find all Party 1 and Party 2 customers
      const customersResponse = await axios.get(`${API_URL}/ledger/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allCustomers = customersResponse.data.customers || [];
      
      // Normalize party names for consistent matching (case-insensitive)
      const normalizeParty = (party) => {
        if (!party || typeof party !== 'string') return null;
        const trimmed = party.trim().toLowerCase();
        // Match "party 1", "party1", "PARTY 1", etc.
        const match = trimmed.match(/^party\s*(\d+)$/);
        if (match) return `Party ${match[1]}`;
        return party.trim();
      };
      
      // Find ALL customers by party field (case-insensitive matching)
      const party1Customers = allCustomers.filter(c => {
        const normalized = normalizeParty(c.party);
        return normalized === 'Party 1' || c.party === 'Party 1';
      });
      
      const party2Customers = allCustomers.filter(c => {
        const normalized = normalizeParty(c.party);
        return normalized === 'Party 2' || c.party === 'Party 2';
      });

      // Fetch data for all Party 1 customers
      const party1CustomersData = [];
      let party1CombinedDebit = 0;
      let party1CombinedCredit = 0;
      let party1CombinedBalance = 0;

      for (const customer of party1Customers) {
        try {
          const response = await axios.get(`${API_URL}/ledger/khata?customer_id=${customer.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const customerData = {
            customer: customer,
            entries: response.data.entries || [],
            totals: response.data.totals || {
              total_debit: 0,
              total_credit: 0,
              remaining_balance: 0
            }
          };

          party1CustomersData.push(customerData);
          
          // Accumulate totals
          party1CombinedDebit += customerData.totals.total_debit || 0;
          party1CombinedCredit += customerData.totals.total_credit || 0;
          party1CombinedBalance += customerData.totals.remaining_balance || 0;
        } catch (error) {
          console.error(`Error fetching data for Party 1 customer ${customer.id}:`, error);
        }
      }

      // Fetch data for all Party 2 customers
      const party2CustomersData = [];
      let party2CombinedDebit = 0;
      let party2CombinedCredit = 0;
      let party2CombinedBalance = 0;

      for (const customer of party2Customers) {
        try {
          const response = await axios.get(`${API_URL}/ledger/khata?customer_id=${customer.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const customerData = {
            customer: customer,
            entries: response.data.entries || [],
            totals: response.data.totals || {
              total_debit: 0,
              total_credit: 0,
              remaining_balance: 0
            }
          };

          party2CustomersData.push(customerData);
          
          // Accumulate totals
          party2CombinedDebit += customerData.totals.total_debit || 0;
          party2CombinedCredit += customerData.totals.total_credit || 0;
          party2CombinedBalance += customerData.totals.remaining_balance || 0;
        } catch (error) {
          console.error(`Error fetching data for Party 2 customer ${customer.id}:`, error);
        }
      }

      setParty1Data({
        customers: party1CustomersData,
        combinedTotals: {
          total_debit: party1CombinedDebit,
          total_credit: party1CombinedCredit,
          remaining_balance: party1CombinedBalance
        },
        loading: false
      });

      setParty2Data({
        customers: party2CustomersData,
        combinedTotals: {
          total_debit: party2CombinedDebit,
          total_credit: party2CombinedCredit,
          remaining_balance: party2CombinedBalance
        },
        loading: false
      });

      if (party1Customers.length === 0 && party2Customers.length === 0) {
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

  const PartyCard = ({ partyName, data, searchTerm, onSearchChange }) => {
    const { customers, combinedTotals, loading } = data;
    
    // Filter customers based on search term
    const filteredCustomers = customers.filter((customerData) => {
      if (!searchTerm.trim()) return true;
      
      const search = searchTerm.toLowerCase();
      const customer = customerData.customer;
      
      return (
        (customer.name && customer.name.toLowerCase().includes(search)) ||
        (customer.phone && customer.phone.toLowerCase().includes(search)) ||
        (customer.address && customer.address.toLowerCase().includes(search))
      );
    });

    // Recalculate totals based on filtered customers
    const filteredTotals = filteredCustomers.reduce(
      (acc, customerData) => {
        acc.total_debit += customerData.totals.total_debit || 0;
        acc.total_credit += customerData.totals.total_credit || 0;
        acc.remaining_balance += customerData.totals.remaining_balance || 0;
        return acc;
      },
      { total_debit: 0, total_credit: 0, remaining_balance: 0 }
    );
    
    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      );
    }

    if (!customers || customers.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">{partyName}</h3>
          <p className="text-gray-500">No customers found for {partyName}. Please create customers with party field set to "{partyName}" in the Customers section.</p>
        </div>
      );
    }

    // Use filtered totals
    const amountToTake = filteredTotals.total_debit || 0; // Kitna lena hai (debit)
    const amountGiven = filteredTotals.total_credit || 0; // Kitna diya hai (credit)
    const remainingBalance = filteredTotals.remaining_balance || 0; // Remaining balance

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            {partyName} ({filteredCustomers.length} {filteredCustomers.length === 1 ? 'Person' : 'Persons'}
            {searchTerm && filteredCustomers.length !== customers.length && ` of ${customers.length}`})
          </h3>
          
          {/* Search Filter */}
          <div className="w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder={`Search ${partyName} by name, phone, or address...`}
                value={searchTerm || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full md:w-80 px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <div className="absolute right-3 top-2.5 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
        
        {/* Combined Summary Cards for Filtered Persons */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 mb-6 border border-blue-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            {searchTerm ? 'Filtered Totals' : 'Combined Totals'} ({filteredCustomers.length} {filteredCustomers.length === 1 ? 'Person' : 'Persons'})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Kitna Lena Hai</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(amountToTake)}</p>
              <p className="text-xs text-gray-500 mt-1">Total Debit</p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Kitna Diya Hai</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(amountGiven)}</p>
              <p className="text-xs text-gray-500 mt-1">Total Credit</p>
            </div>
            
            <div className={`border rounded-lg p-4 ${remainingBalance >= 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
              <p className="text-sm text-gray-600 mb-1">Total Remaining Balance</p>
              <p className={`text-2xl font-bold ${remainingBalance >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                {formatCurrency(remainingBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {remainingBalance >= 0 ? 'Amount Due' : 'Credit Available'}
              </p>
            </div>
          </div>
        </div>

        {/* Individual Person Details */}
        {filteredCustomers.length === 0 && searchTerm ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No customers found matching "{searchTerm}"</p>
            <button
              onClick={() => onSearchChange('')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filter to see all customers
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCustomers.map((customerData, idx) => {
            const { customer, entries, totals } = customerData;
            const personDebit = totals.total_debit || 0;
            const personCredit = totals.total_credit || 0;
            const personBalance = totals.remaining_balance || 0;

            return (
              <div key={customer.id || idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                {/* Person Info */}
                <div className="mb-4">
                  <h5 className="text-lg font-semibold text-gray-800 mb-2">
                    Person {idx + 1}: {customer.name}
                  </h5>
                  {customer.phone && (
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-semibold">Phone:</span> {customer.phone}
                    </p>
                  )}
                  {customer.address && (
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-semibold">Address:</span> {customer.address}
                    </p>
                  )}
                  
                  {/* Individual Person Totals */}
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-gray-600">Debit</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(personDebit)}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="text-xs text-gray-600">Credit</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(personCredit)}</p>
                    </div>
                    <div className={`border rounded p-2 ${personBalance >= 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                      <p className="text-xs text-gray-600">Balance</p>
                      <p className={`text-lg font-bold ${personBalance >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                        {formatCurrency(personBalance)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Entries for this Person */}
                {entries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <h6 className="text-xs font-semibold text-gray-700 mb-2">Recent Entries ({entries.length})</h6>
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                          <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                          <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {entries.slice(-5).map((entry, entryIdx) => (
                          <tr key={entry.id || entryIdx} className="hover:bg-gray-50">
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                              {formatDate(entry.date)}
                            </td>
                            <td className="px-2 py-1 text-xs text-gray-900">
                              {entry.description || entry.bill_number || '-'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-medium text-red-600">
                              {parseFloat(entry.debit || 0) > 0 ? formatCurrency(entry.debit) : '-'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-medium text-green-600">
                              {parseFloat(entry.credit || 0) > 0 ? formatCurrency(entry.credit) : '-'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-right">
                              <span className={`font-bold ${parseFloat(entry.balance || 0) >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {formatCurrency(entry.balance)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {entries.length > 5 && (
                      <p className="text-xs text-gray-500 mt-2">Showing last 5 entries. Total: {entries.length} entries</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">No entries found for this person</p>
                )}
              </div>
            );
          })}
          </div>
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
          <PartyCard 
            partyName="Party 1" 
            data={party1Data} 
            searchTerm={party1SearchTerm}
            onSearchChange={setParty1SearchTerm}
          />
          <PartyCard 
            partyName="Party 2" 
            data={party2Data} 
            searchTerm={party2SearchTerm}
            onSearchChange={setParty2SearchTerm}
          />
        </div>

        {/* Combined Summary - All Persons from Both Parties */}
        {(party1Data.customers.length > 0 || party2Data.customers.length > 0) && (() => {
          // Calculate filtered totals for grand summary
          const party1Filtered = party1Data.customers.filter((customerData) => {
            if (!party1SearchTerm.trim()) return true;
            const search = party1SearchTerm.toLowerCase();
            const customer = customerData.customer;
            return (
              (customer.name && customer.name.toLowerCase().includes(search)) ||
              (customer.phone && customer.phone.toLowerCase().includes(search)) ||
              (customer.address && customer.address.toLowerCase().includes(search))
            );
          });

          const party2Filtered = party2Data.customers.filter((customerData) => {
            if (!party2SearchTerm.trim()) return true;
            const search = party2SearchTerm.toLowerCase();
            const customer = customerData.customer;
            return (
              (customer.name && customer.name.toLowerCase().includes(search)) ||
              (customer.phone && customer.phone.toLowerCase().includes(search)) ||
              (customer.address && customer.address.toLowerCase().includes(search))
            );
          });

          const party1FilteredTotals = party1Filtered.reduce(
            (acc, c) => {
              acc.total_debit += c.totals.total_debit || 0;
              acc.total_credit += c.totals.total_credit || 0;
              acc.remaining_balance += c.totals.remaining_balance || 0;
              return acc;
            },
            { total_debit: 0, total_credit: 0, remaining_balance: 0 }
          );

          const party2FilteredTotals = party2Filtered.reduce(
            (acc, c) => {
              acc.total_debit += c.totals.total_debit || 0;
              acc.total_credit += c.totals.total_credit || 0;
              acc.remaining_balance += c.totals.remaining_balance || 0;
              return acc;
            },
            { total_debit: 0, total_credit: 0, remaining_balance: 0 }
          );

          const hasActiveFilters = party1SearchTerm.trim() || party2SearchTerm.trim();

          return (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg shadow-sm p-6 border border-purple-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {hasActiveFilters ? 'Filtered Combined Summary' : 'Grand Combined Summary'} (Party 1 + Party 2)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Total Kitna Lena Hai</p>
                  <p className="text-3xl font-bold text-red-700">
                    {formatCurrency((party1FilteredTotals.total_debit || 0) + (party2FilteredTotals.total_debit || 0))}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Party 1 ({party1Filtered.length}/{party1Data.customers.length}) + Party 2 ({party2Filtered.length}/{party2Data.customers.length})
                  </p>
                </div>
                <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Total Kitna Diya Hai</p>
                  <p className="text-3xl font-bold text-green-700">
                    {formatCurrency((party1FilteredTotals.total_credit || 0) + (party2FilteredTotals.total_credit || 0))}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {hasActiveFilters ? 'Filtered Combined Credit' : 'Combined Credit (All Persons)'}
                  </p>
                </div>
                <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Total Remaining Balance</p>
                  <p className="text-3xl font-bold text-orange-700">
                    {formatCurrency((party1FilteredTotals.remaining_balance || 0) + (party2FilteredTotals.remaining_balance || 0))}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Total Check / Combined Balance</p>
                </div>
              </div>
              
              {/* Summary Stats */}
              <div className="mt-4 pt-4 border-t border-purple-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Party 1 Persons:</span>
                    <span className="font-bold text-gray-800 ml-2">
                      {party1Filtered.length}{hasActiveFilters && `/${party1Data.customers.length}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Party 2 Persons:</span>
                    <span className="font-bold text-gray-800 ml-2">
                      {party2Filtered.length}{hasActiveFilters && `/${party2Data.customers.length}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Persons:</span>
                    <span className="font-bold text-gray-800 ml-2">
                      {party1Filtered.length + party2Filtered.length}
                      {hasActiveFilters && `/${party1Data.customers.length + party2Data.customers.length}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Entries:</span>
                    <span className="font-bold text-gray-800 ml-2">
                      {party1Filtered.reduce((sum, c) => sum + (c.entries?.length || 0), 0) + 
                       party2Filtered.reduce((sum, c) => sum + (c.entries?.length || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </Layout>
  );
};

export default Partnership;

