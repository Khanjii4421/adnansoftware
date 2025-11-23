import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import PasswordConfirmModal from '../components/PasswordConfirmModal';

import { API_URL } from '../utils/api';

const LedgerCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]); // For getting unique parties
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    cnic: '',
    party: ''
  });
  const [bulkData, setBulkData] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchAllCustomers(); // Fetch all customers to get unique parties
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, selectedParty]);

  const fetchAllCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/ledger/customers`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const customersData = response.data.customers || [];
      setAllCustomers(customersData);
    } catch (error) {
      console.error('Error fetching all customers:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedParty) params.append('party', selectedParty);
      const queryString = params.toString();
      const response = await axios.get(
        `${API_URL}/ledger/customers${queryString ? `?${queryString}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const customersData = response.data.customers || [];
      console.log('[LedgerCustomers] Received customers:', customersData.length);
      console.log('[LedgerCustomers] Sample customer balances:', customersData.slice(0, 5).map(c => ({ name: c.name, balance: c.balance })));
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setMessage({ type: 'error', text: 'Failed to load customers' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingCustomerId) {
        // Update existing customer
        await axios.put(`${API_URL}/ledger/customers/${editingCustomerId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage({ type: 'success', text: 'Customer updated successfully!' });
      } else {
        // Add new customer
        await axios.post(`${API_URL}/ledger/customers`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage({ type: 'success', text: 'Customer added successfully!' });
      }
      setFormData({ name: '', phone: '', address: '', city: '', cnic: '', party: '' });
      setEditingCustomerId(null);
      setShowAddForm(false);
      fetchCustomers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || (editingCustomerId ? 'Failed to update customer' : 'Failed to add customer') });
    }
  };

  const handleEdit = (customer) => {
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      cnic: customer.cnic || '',
      party: customer.party || ''
    });
    setEditingCustomerId(customer.id);
    setShowAddForm(true);
    setShowBulkForm(false);
  };

  const handleCancelEdit = () => {
    setFormData({ name: '', phone: '', address: '', city: '', cnic: '', party: '' });
    setEditingCustomerId(null);
    setShowAddForm(false);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      
      // Parse bulk data (one customer per line, comma-separated: name,phone,address,city,cnic)
      const lines = bulkData.split('\n').filter(line => line.trim());
      const customersToAdd = [];

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          customersToAdd.push({
            name: parts[0] || '',
            phone: parts[1] || '',
            address: parts[2] || '',
            city: parts[3] || '',
            cnic: parts[4] || ''
          });
        }
      }

      if (customersToAdd.length === 0) {
        setMessage({ type: 'error', text: 'No valid customers found in bulk data' });
        setUploading(false);
        return;
      }

      // Add customers one by one (or you can create a bulk endpoint)
      let successCount = 0;
      let errorCount = 0;

      for (const customer of customersToAdd) {
        try {
          await axios.post(`${API_URL}/ledger/customers`, customer, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
        } catch (error) {
          errorCount++;
          console.error('Error adding customer:', customer, error);
        }
      }

      setMessage({
        type: successCount > 0 ? 'success' : 'error',
        text: `Added ${successCount} customers${errorCount > 0 ? `, ${errorCount} failed` : ''}`
      });
      setBulkData('');
      setShowBulkForm(false);
      fetchCustomers();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add customers in bulk' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_URL}/ledger/customers/bulk-upload-template`;
      
      console.log('[LedgerCustomers] Downloading template from:', url);
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('[LedgerCustomers] Template download response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[LedgerCustomers] Template download failed:', response.status, errorText);
        throw new Error(`Failed to download template: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'customer-bulk-upload-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setMessage({
        type: 'success',
        text: 'Template downloaded successfully!'
      });
    } catch (error) {
      console.error('[LedgerCustomers] Error downloading template:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to download template'
      });
    }
  };

  const handleBulkFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      console.log('[LedgerCustomers] Uploading file:', file.name, 'size:', file.size);

      const response = await axios.post(`${API_URL}/ledger/customers/bulk-upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('[LedgerCustomers] Upload response:', response.data);

      const { added = 0, skipped = 0, total = 0, errors = [], skipReasons = {} } = response.data;

      // Build detailed message
      let messageText = `Imported ${added} of ${total} customers`;
      if (skipped > 0) {
        messageText += `\n${skipped} skipped`;
        
        // Add breakdown of skip reasons
        const reasons = [];
        if (skipReasons.missingFields > 0) reasons.push(`${skipReasons.missingFields} missing name/phone`);
        if (skipReasons.duplicates > 0) reasons.push(`${skipReasons.duplicates} duplicate phone numbers`);
        if (skipReasons.insertErrors > 0) reasons.push(`${skipReasons.insertErrors} database errors`);
        if (skipReasons.otherErrors > 0) reasons.push(`${skipReasons.otherErrors} other errors`);
        
        if (reasons.length > 0) {
          messageText += `\nBreakdown: ${reasons.join(', ')}`;
        }
      }

      // Show sample errors if any (first 5)
      if (errors && errors.length > 0) {
        console.log('[LedgerCustomers] Upload errors:', errors);
        const sampleErrors = errors.slice(0, 5).map(err => `Row ${err.row}: ${err.error}`).join('\n');
        const moreErrors = errors.length > 5 ? `\n... and ${errors.length - 5} more (check console)` : '';
        
        // Show all errors in console
        console.warn('[LedgerCustomers] All errors:', errors);
        
        // Add sample errors to message
        messageText += `\n\nSample errors:\n${sampleErrors}${moreErrors}`;
      }

      setMessage({
        type: added > 0 ? 'success' : 'error',
        text: messageText
      });
      
      setShowBulkForm(false);
      fetchCustomers();
    } catch (error) {
      console.error('[LedgerCustomers] Upload error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload file';
      setMessage({
        type: 'error',
        text: `Upload failed: ${errorMessage}`
      });
    } finally {
      setUploading(false);
    }
  };

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const handleDelete = (id) => {
    setCustomerToDelete(id);
    setShowPasswordModal(true);
  };

  const confirmDeleteCustomer = async (password) => {
    if (!customerToDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/ledger/customers/${customerToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password }
      });
      setMessage({ type: 'success', text: 'Customer deleted successfully!' });
      fetchCustomers();
      setCustomerToDelete(null);
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete customer');
    }
  };

  const handleSendWhatsAppPDF = async (customerId, phoneNumber) => {
    if (!phoneNumber) {
      alert('Customer phone number is not available');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Get customer ledger entries via WhatsApp endpoint
      const response = await axios.get(`${API_URL}/ledger/khata/whatsapp?customer_id=${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { whatsapp_url, message, customer_name } = response.data;
      
      // Open WhatsApp with the message
      if (whatsapp_url) {
        window.open(whatsapp_url, '_blank');
        setMessage({ 
          type: 'success', 
          text: `WhatsApp message opened for ${customer_name}` 
        });
      } else {
        // Fallback: format phone and create WhatsApp URL manually
        const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
        const whatsappNumber = cleanPhone.startsWith('92') ? cleanPhone : 
                              cleanPhone.startsWith('0') ? '92' + cleanPhone.substring(1) : 
                              '92' + cleanPhone;
        
        const customer = customers.find(c => c.id === customerId);
        const remainingBalance = customer ? calculateRemainingBalance(customer.balance) : 0;
        const balanceMessage = `🧾 *Ledger Statement / کھاتہ - ${customer_name || 'Customer'}*\n\n` +
          `📊 *Account Summary / اکاؤنٹ خلاصہ:*\n` +
          `Remaining Balance / باقی بیلنس: Rs. ${remainingBalance.toFixed(2)}\n\n` +
          `📞 *Contact / رابطہ:*\n` +
          `Adnan Khaddar House\n` +
          `Iqbal bazar, Kamalia, Pakistan\n` +
          `Phone / فون: +92 301 7323200\n\n` +
          (remainingBalance > 0 ? `⚠️ *Outstanding Balance / باقی رقم: Rs. ${remainingBalance.toFixed(2)}*\nPlease clear your balance at your earliest convenience.\nبراہ کرم اپنا بیلنس جلد از جلد کلیئر کریں۔\n` : `✅ Your account is up to date.\n✅ آپ کا اکاؤنٹ اپ ڈیٹ ہے۔\n`);
        
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(balanceMessage)}`;
        window.open(whatsappUrl, '_blank');
        setMessage({ 
          type: 'success', 
          text: `WhatsApp message opened for ${customer_name || 'customer'}` 
        });
      }
      
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      console.error('Error response:', error.response);
      
      // Fallback: Create simple WhatsApp message with balance
      try {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
          const whatsappNumber = cleanPhone.startsWith('92') ? cleanPhone : 
                                cleanPhone.startsWith('0') ? '92' + cleanPhone.substring(1) : 
                                '92' + cleanPhone;
          
          const remainingBalance = calculateRemainingBalance(customer.balance);
          const balanceMessage = `🧾 *Ledger Statement / کھاتہ - ${customer.name}*\n\n` +
            `📊 *Account Summary / اکاؤنٹ خلاصہ:*\n` +
            `Remaining Balance / باقی بیلنس: Rs. ${remainingBalance.toFixed(2)}\n\n` +
            `📞 *Contact / رابطہ:*\n` +
            `Adnan Khaddar House\n` +
            `Iqbal bazar, Kamalia, Pakistan\n` +
            `Phone / فون: +92 301 7323200\n\n` +
            (remainingBalance > 0 ? `⚠️ *Outstanding Balance / باقی رقم: Rs. ${remainingBalance.toFixed(2)}*\nPlease clear your balance at your earliest convenience.\nبراہ کرم اپنا بیلنس جلد از جلد کلیئر کریں۔\n` : `✅ Your account is up to date.\n✅ آپ کا اکاؤنٹ اپ ڈیٹ ہے۔\n`);
          
          const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(balanceMessage)}`;
          window.open(whatsappUrl, '_blank');
          setMessage({ 
            type: 'success', 
            text: `WhatsApp message opened for ${customer.name}` 
          });
        } else {
          setMessage({ 
            type: 'error', 
            text: error.response?.data?.error || 'Failed to send WhatsApp message' 
          });
        }
      } catch (fallbackError) {
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.error || 'Failed to send WhatsApp message' 
        });
      }
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

  const calculateRemainingBalance = (balance) => {
    // Negative balance = customer owes money
    // Positive balance = customer has credit/overpaid
    return (balance || 0) < 0 ? Math.abs(balance || 0) : 0;
  };

  const handleDownloadBalance = () => {
    try {
      // Prepare data with 5 columns: Sr. No., Customer Name & City, Remaining Balance, Received (blank), Signature (blank)
      const tableRows = customers.map((customer, index) => {
        const customerNameCity = `${customer.name || ''}${customer.city ? `, ${customer.city}` : ''}`;
        const remainingBalance = calculateRemainingBalance(customer.balance);
        return {
          srNo: index + 1,
          name: customerNameCity,
          balance: remainingBalance, // Store numeric value for total calculation
          balanceFormatted: formatCurrency(remainingBalance),
          received: '',
          signature: ''
        };
      });

      // Calculate total
      const totalBalance = tableRows.reduce((sum, row) => sum + row.balance, 0);

      const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Create HTML content for printing
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Balance Report</title>
  <style>
    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm 8mm;
      }
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      table {
        page-break-inside: avoid;
      }
      thead {
        display: table-header-group;
      }
      tbody {
        display: table-row-group;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      padding: 5px 3px;
      font-size: 10px;
    }
    @media print {
      body {
        font-size: 9px;
        padding: 3px 2px;
      }
      th {
        font-size: 9px !important;
        padding: 4px 2px !important;
      }
      td {
        font-size: 8px !important;
        padding: 3px 2px !important;
      }
      .header h1 {
        font-size: 16px !important;
        margin-bottom: 3px;
      }
      .header .date {
        font-size: 10px !important;
      }
      .signature-section {
        margin-top: 10px;
        padding-top: 8px;
      }
      table {
        margin-bottom: 10px;
      }
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
    }
    .header h1 {
      font-size: 20px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 3px;
    }
    @media print {
      .header h1 {
        font-size: 24px;
      }
    }
    .header .date {
      font-size: 12px;
      color: #666;
    }
    @media print {
      .header .date {
        font-size: 14px;
      }
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      margin-left: 0;
      table-layout: fixed;
    }
    thead {
      background-color: #4f46e5;
      color: white;
    }
    th {
      padding: 6px 3px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #333;
      font-size: 10px;
    }
    th:nth-child(1) {
      width: 4%;
      min-width: 30px;
      text-align: center;
      padding: 6px 2px;
    }
    th:nth-child(2) {
      width: 38%;
      min-width: 120px;
      padding-left: 4px;
    }
    th:nth-child(3) {
      width: 18%;
      min-width: 90px;
      text-align: right;
      padding-right: 4px;
    }
    th:nth-child(4) {
      width: 20%;
      min-width: 70px;
      padding-left: 4px;
    }
    th:nth-child(5) {
      width: 20%;
      min-width: 70px;
      padding-left: 4px;
    }
    td {
      padding: 4px 2px;
      border: 1px solid #ddd;
      font-size: 10px;
      word-wrap: break-word;
      overflow: hidden;
    }
    td:nth-child(1) {
      text-align: center;
      padding: 4px 2px;
      font-weight: 500;
      font-size: 9px;
    }
    td:nth-child(2) {
      padding-left: 4px;
      font-size: 9px;
    }
    td:nth-child(3) {
      text-align: right;
      padding-right: 4px;
      font-size: 9px;
    }
    td:nth-child(4), td:nth-child(5) {
      padding-left: 4px;
      font-size: 9px;
    }
    tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .signature-section {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      padding-top: 15px;
      border-top: 2px solid #333;
    }
    .signature-box {
      width: 45%;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      margin-top: 30px;
      padding-bottom: 3px;
    }
    .signature-label {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background-color: #4f46e5;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      z-index: 1000;
    }
    .print-button:hover {
      background-color: #4338ca;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">🖨️ Print</button>
  
  <div class="header">
    <h1>Customer Balance Report</h1>
    <div class="date">Date: ${today}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Sr.</th>
        <th>Customer Name & City</th>
        <th>Remaining Balance</th>
        <th>Received</th>
        <th>Signature</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows.map(row => `
        <tr>
          <td>${row.srNo}</td>
          <td>${row.name}</td>
          <td>${row.balanceFormatted}</td>
          <td>${row.received}</td>
          <td>${row.signature}</td>
        </tr>
      `).join('')}
      <tr style="background-color: #e5e7eb; font-weight: bold; border-top: 2px solid #333;">
        <td style="padding: 5px 2px; font-size: 10px; text-align: center;"></td>
        <td style="padding: 5px 4px; font-size: 10px;">TOTAL</td>
        <td style="padding: 5px 4px; text-align: right; font-size: 10px; padding-right: 4px;">${formatCurrency(totalBalance)}</td>
        <td style="padding: 5px 4px; font-size: 10px;"></td>
        <td style="padding: 5px 4px; font-size: 10px;"></td>
      </tr>
    </tbody>
  </table>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-label">Signature:</div>
      <div class="signature-line"></div>
    </div>
    <div class="signature-box">
      <div class="signature-label">Date:</div>
      <div class="signature-line"></div>
    </div>
  </div>

  <script>
    // Auto print when opened (optional - can be removed if not needed)
    // window.onload = function() {
    //   window.print();
    // }
  </script>
</body>
</html>
      `;

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `customer-balance-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({
        type: 'success',
        text: 'Customer balance HTML file downloaded successfully! Open it and click Print button.'
      });
    } catch (error) {
      console.error('Error downloading balance HTML:', error);
      setMessage({
        type: 'error',
        text: 'Failed to download balance HTML file'
      });
    }
  };

  const handleDownloadXLS = () => {
    try {
      // Prepare data with 5 columns: Sr. No., Customer Name & City, Remaining Balance, Received (blank), Signature (blank)
      const excelData = customers.map((customer, index) => {
        const customerNameCity = `${customer.name || ''}${customer.city ? `, ${customer.city}` : ''}`;
        const remainingBalance = calculateRemainingBalance(customer.balance);
        return {
          'Sr. No.': index + 1,
          'Customer Name & City': customerNameCity,
          'Remaining Balance': remainingBalance,
          'Received': '',
          'Signature': ''
        };
      });

      // Calculate total and add total row
      const totalBalance = excelData.reduce((sum, row) => sum + (row['Remaining Balance'] || 0), 0);
      excelData.push({
        'Sr. No.': '',
        'Customer Name & City': 'TOTAL',
        'Remaining Balance': totalBalance,
        'Received': '',
        'Signature': ''
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths - optimized for content
      ws['!cols'] = [
        { wch: 6 },  // Sr. No.
        { wch: 30 }, // Customer Name & City
        { wch: 18 }, // Remaining Balance
        { wch: 15 }, // Received
        { wch: 15 }  // Signature
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Customer Balance');
      
      // Save file
      const fileName = `customer-balance-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setMessage({
        type: 'success',
        text: 'Customer balance Excel file downloaded successfully!'
      });
    } catch (error) {
      console.error('Error downloading balance XLS:', error);
      setMessage({
        type: 'error',
        text: 'Failed to download balance Excel file'
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Customers Management</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your ledger customers</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/ledger"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <Link
              to="/ledger/khata"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Ledger Khata
            </Link>
            <button
              onClick={() => {
                setShowBulkForm(!showBulkForm);
                setShowAddForm(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📥 Bulk Import
            </button>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowBulkForm(false);
                setEditingCustomerId(null);
                setFormData({ name: '', phone: '', address: '', city: '', cnic: '' });
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              + Add Customer
            </button>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            <div className="whitespace-pre-line text-sm">{message.text}</div>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="float-right font-bold text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Add/Edit Customer Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingCustomerId ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
                <input
                  type="text"
                  name="cnic"
                  value={formData.cnic}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Party</label>
                <select
                  name="party"
                  value={formData.party}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Party</option>
                  <option value="Party 1">Party 1</option>
                  <option value="Party 2">Party 2</option>
                  <option value="Party 3">Party 3</option>
                  <option value="Party 4">Party 4</option>
                  <option value="Party 5">Party 5</option>
                </select>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingCustomerId ? 'Update Customer' : 'Add Customer'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bulk Import Form */}
        {showBulkForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Bulk Import Customers</h2>
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                📥 Download Template
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 font-medium mb-1">📋 Template Columns (All Supported):</p>
                <div className="text-xs text-blue-700 grid grid-cols-2 md:grid-cols-5 gap-1">
                  <div><strong>Name</strong> <span className="text-red-600">*Required</span></div>
                  <div><strong>Phone</strong> <span className="text-red-600">*Required</span></div>
                  <div>Address (Optional)</div>
                  <div>City (Optional)</div>
                  <div>CNIC (Optional)</div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 Tip: Download the template to see the exact format with sample data
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Excel/CSV File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBulkFileUpload}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: Excel (.xlsx, .xls) or CSV. Columns: Name, Phone, Address, City, CNIC
                </p>
              </div>
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Paste Data (One per line, comma-separated: Name,Phone,Address,City,CNIC)
                </label>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  rows={10}
                  placeholder="Ali Khan,03001234567,123 Main St,Lahore,12345-1234567-1&#10;Ahmed Ali,03009876543,456 Park Ave,Karachi,"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  disabled={uploading}
                />
                <button
                  onClick={handleBulkSubmit}
                  disabled={uploading || !bulkData.trim()}
                  className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Importing...' : 'Import Data'}
                </button>
                <button
                  onClick={() => setShowBulkForm(false)}
                  className="mt-2 ml-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar and Party Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search by name, phone, city, address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Parties</option>
              <option value="No Party">No Party</option>
              {[...new Set(allCustomers.map(c => c.party).filter(Boolean))].sort().map(party => (
                <option key={party} value={party}>{party}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Customers Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading customers...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Party
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remaining Balance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                        No customers found. Add your first customer to get started!
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          {customer.cnic && (
                            <div className="text-xs text-gray-500">CNIC: {customer.cnic}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.phone}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {customer.address || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.city || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {customer.party || 'No Party'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-semibold ${
                              (customer.balance || 0) < 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {formatCurrency(
                              (customer.balance || 0) < 0 ? Math.abs(customer.balance) : 0
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/ledger/entries?customer_id=${customer.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            View Entries
                          </Link>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                            title="Edit Customer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleSendWhatsAppPDF(customer.id, customer.phone)}
                            className="text-green-600 hover:text-green-900 mr-4"
                            title="Send PDF via WhatsApp"
                          >
                            📱 WhatsApp
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {customers.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Total: <span className="font-semibold">{customers.length}</span> customers
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadBalance}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    📄 Download HTML
                  </button>
                  <button
                    onClick={handleDownloadXLS}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    📊 Download XLS
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setCustomerToDelete(null);
        }}
        onConfirm={confirmDeleteCustomer}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
      />
    </Layout>
  );
};

export default LedgerCustomers;

