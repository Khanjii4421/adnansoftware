import React, { useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import * as XLSX from 'xlsx';

import { API_URL } from '../utils/api';

const InvoiceMatch = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matchResults, setMatchResults] = useState(null);
  const [error, setError] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setCsvFile(file);
        setError('');
      } else {
        setError('Please upload a CSV file');
        setCsvFile(null);
      }
    }
  };

  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Convert to array of objects - expect columns: seller_reference, invoice_number, profit
          // Try to auto-detect headers
          let headers = [];
          let dataRows = [];

          if (jsonData.length > 0) {
            // First row might be headers
            const firstRow = jsonData[0].map((cell) =>
              String(cell || '').toLowerCase().trim()
            );

            // Common header variations
            const referenceHeaders = [
              'seller_reference',
              'seller reference',
              'reference',
              'order reference',
              'order_reference',
              'ref',
              'ref#',
              'reference number',
            ];
            const invoiceHeaders = [
              'invoice',
              'invoice_number',
              'invoice number',
              'bill_number',
              'bill number',
              'bill',
            ];
            const profitHeaders = [
              'profit',
              'seller_profit',
              'seller profit',
              'amount',
            ];

            // Find header indices
            let refIndex = -1;
            let invoiceIndex = -1;
            let profitIndex = -1;

            firstRow.forEach((header, index) => {
              if (referenceHeaders.some((h) => header.includes(h))) {
                refIndex = index;
              }
              if (invoiceHeaders.some((h) => header.includes(h))) {
                invoiceIndex = index;
              }
              if (profitHeaders.some((h) => header.includes(h))) {
                profitIndex = index;
              }
            });

            // If headers found, use them
            if (refIndex >= 0 && invoiceIndex >= 0 && profitIndex >= 0) {
              dataRows = jsonData.slice(1).map((row) => ({
                seller_reference: String(row[refIndex] || '').trim(),
                invoice_number: String(row[invoiceIndex] || '').trim(),
                profit: parseFloat(row[profitIndex] || 0),
              }));
            } else {
              // Assume first 3 columns are: seller_reference, invoice_number, profit
              dataRows = jsonData.slice(0).map((row) => ({
                seller_reference: String(row[0] || '').trim(),
                invoice_number: String(row[1] || '').trim(),
                profit: parseFloat(row[2] || 0),
              }));
            }
          }

          resolve(dataRows.filter((row) => row.seller_reference && row.invoice_number));
        } catch (err) {
          reject(new Error('Failed to parse CSV file: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  };

  const handleMatch = async () => {
    if (!csvFile) {
      setError('Please select a CSV file first');
      return;
    }

    setLoading(true);
    setError('');
    setMatchResults(null);

    try {
      // Parse CSV
      const csvData = await parseCSV(csvFile);

      if (csvData.length === 0) {
        setError('No valid data found in CSV file');
        setLoading(false);
        return;
      }

      // Send to backend for matching
      const token = localStorage.getItem('token');
      const url = `${API_URL}/invoices/match`;
      console.log('Calling API:', url);
      console.log('CSV Data:', csvData.length, 'records');
      
      const response = await axios.post(
        url,
        { csv_data: csvData },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setMatchResults(response.data);
    } catch (err) {
      console.error('Error matching invoices:', err);
      console.error('Error response:', err.response);
      console.error('Error status:', err.response?.status);
      console.error('Error data:', err.response?.data);
      
      if (err.response?.status === 404) {
        setError('API endpoint not found. Please ensure the server is running and restarted after the latest changes.');
      } else {
        setError(
          err.response?.data?.error || err.message || 'Failed to match invoices'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      matched: 'bg-green-100 text-green-800',
      'profit_mismatch': 'bg-yellow-100 text-yellow-800',
      'already_paid': 'bg-blue-100 text-blue-800',
      'not_found': 'bg-red-100 text-red-800',
      'not_delivered': 'bg-orange-100 text-orange-800',
    };
    const statusLabels = {
      matched: 'Matched ✓',
      'profit_mismatch': 'Profit Mismatch ⚠',
      'already_paid': 'Already Paid 💰',
      'not_found': 'Not Found ❌',
      'not_delivered': 'Not Delivered 📦',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          statusColors[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {statusLabels[status] || status}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice Match</h1>
            <p className="text-gray-600 mt-1">
              Upload seller's CSV bill to match with your invoices and orders
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Seller's CSV Bill</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV File (Expected columns: Seller Reference, Invoice Number, Profit)
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {csvFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: <span className="font-medium">{csvFile.name}</span>
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              onClick={handleMatch}
              disabled={!csvFile || loading}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                !csvFile || loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {loading ? 'Matching...' : 'Match Invoices'}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {matchResults && (
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Total Records</div>
                <div className="text-2xl font-bold text-gray-900">
                  {matchResults.summary?.total || 0}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Matched</div>
                <div className="text-2xl font-bold text-green-600">
                  {matchResults.summary?.matched || 0}
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Profit Mismatch</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {matchResults.summary?.profit_mismatch || 0}
                </div>
              </div>
              <div className="bg-red-50 rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Issues</div>
                <div className="text-2xl font-bold text-red-600">
                  {matchResults.summary?.issues || 0}
                </div>
              </div>
            </div>

            {/* Matched Records */}
            {matchResults.matched && matchResults.matched.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-green-50 px-6 py-4 border-b border-green-200">
                  <h3 className="text-xl font-semibold text-green-900">
                    Matched Records ({matchResults.matched.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Seller Ref #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          System Ref #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Seller Profit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          System Profit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {matchResults.matched.map((match, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {match.seller_reference}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {match.system_reference || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {match.invoice_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(match.seller_profit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(match.system_profit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge('matched')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {match.order_status || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Profit Mismatch Records */}
            {matchResults.profit_mismatch &&
              matchResults.profit_mismatch.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-200">
                    <h3 className="text-xl font-semibold text-yellow-900">
                      Profit Mismatch ({matchResults.profit_mismatch.length})
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      These order references have incorrect profit amounts
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Seller Ref #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            System Ref #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Seller Profit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            System Profit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Difference
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {matchResults.profit_mismatch.map((match, index) => {
                          const difference =
                            parseFloat(match.seller_profit || 0) -
                            parseFloat(match.system_profit || 0);
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {match.seller_reference}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {match.system_reference || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {match.invoice_number}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(match.seller_profit)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(match.system_profit)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-yellow-600">
                                {difference > 0 ? '+' : ''}
                                {formatCurrency(difference)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {match.order_status || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Already Paid Parcels */}
            {matchResults.already_paid &&
              matchResults.already_paid.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
                    <h3 className="text-xl font-semibold text-blue-900">
                      Already Paid Parcels ({matchResults.already_paid.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Seller Ref #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            System Ref #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Profit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {matchResults.already_paid.map((match, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {match.seller_reference}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {match.system_reference || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {match.invoice_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(match.seller_profit)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {match.order_status || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Not Found in System */}
            {matchResults.not_found &&
              matchResults.not_found.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-red-50 px-6 py-4 border-b border-red-200">
                    <h3 className="text-xl font-semibold text-red-900">
                      Not Found in System ({matchResults.not_found.length})
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      These records are not in our system
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Seller Ref #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Seller Profit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {matchResults.not_found.map((match, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {match.seller_reference}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {match.invoice_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(match.seller_profit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Not Delivered */}
            {matchResults.not_delivered &&
              matchResults.not_delivered.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-orange-50 px-6 py-4 border-b border-orange-200">
                    <h3 className="text-xl font-semibold text-orange-900">
                      Not Delivered ({matchResults.not_delivered.length})
                    </h3>
                    <p className="text-sm text-orange-700 mt-1">
                      These orders are not yet delivered
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Seller Ref #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            System Ref #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Profit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {matchResults.not_delivered.map((match, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {match.seller_reference}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {match.system_reference || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {match.invoice_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(match.seller_profit)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {match.order_status || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InvoiceMatch;

