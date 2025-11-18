import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import * as XLSX from 'xlsx';

import { API_URL } from '../utils/api';

// Brand Information
const BRAND_INFO = {
  name: 'Adnan Khaddar House',
  address: 'Iqbal bazar,Kamalia, Pakistan',
  phone: '+92 301 7323200', // Update with your actual phone number
  whatsapp: '923017323200' // Update with your actual WhatsApp number (without +)
};

const GenerateBill = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [products, setProducts] = useState([{ product_name: '', meters: '', meter_price: '', price: '' }]);
  const [lastGeneratedBill, setLastGeneratedBill] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);
  const [debitAmount, setDebitAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState([]);
  const [searchBillNumber, setSearchBillNumber] = useState('');
  const [searchCustomerId, setSearchCustomerId] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedBillForView, setSelectedBillForView] = useState(null);
  const [showBillViewModal, setShowBillViewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodForPayment, setPaymentMethodForPayment] = useState('Cash');
  const [receivedByForPayment, setReceivedByForPayment] = useState('');
  const [transactionIdForPayment, setTransactionIdForPayment] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [customerTotalBills, setCustomerTotalBills] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalBills: 0,
    totalReceived: 0,
    totalRemaining: 0,
    customerStats: null
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentHistoryFilter, setPaymentHistoryFilter] = useState('all'); // 'all', 'paid', 'unpaid'
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
  const [whatsappLanguage, setWhatsappLanguage] = useState('both'); // 'english', 'urdu', 'both'
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderCustomers, setReminderCustomers] = useState([]);
  const [selectedReminderCustomer, setSelectedReminderCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
    fetchNextBillNumber();
    fetchBills();
  }, []);

  // Update dashboard when customer filter changes
  useEffect(() => {
    if (searchCustomerId) {
      fetchBills();
    } else {
      fetchBills();
    }
  }, [searchCustomerId]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerTotalBills();
    }
  }, [selectedCustomer]);

  useEffect(() => {
    calculateTotals();
  }, [products, creditAmount]);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/ledger/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setMessage({ type: 'error', text: 'Failed to load customers' });
    }
  };

  const fetchNextBillNumber = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/bills/next-number`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBillNumber(response.data.bill_number || '');
    } catch (error) {
      console.error('Error fetching next bill number:', error);
      // Generate default bill number if API fails
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      setBillNumber(`BILL-${year}${month}-001`);
    }
  };

  const fetchBills = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchCustomerId) {
        params.append('customer_id', searchCustomerId);
      }
      if (searchBillNumber) {
        params.append('bill_number', searchBillNumber);
      }
      const response = await axios.get(`${API_URL}/bills?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBills(response.data.bills || []);
      
      // Calculate dashboard stats
      calculateDashboardStats(response.data.bills || []);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  const calculateDashboardStats = (billsList) => {
    const totalBills = billsList.length;
    let totalReceived = 0;
    let totalRemaining = 0;
    let totalPurchase = 0;

    billsList.forEach(bill => {
      const total = parseFloat(bill.order_total || 0);
      const received = parseFloat(bill.credit || 0);
      const remaining = Math.max(0, total - received);
      
      totalPurchase += total;
      totalReceived += received;
      totalRemaining += remaining;
    });

    setDashboardStats({
      totalBills,
      totalReceived,
      totalRemaining,
      totalPurchase,
      customerStats: searchCustomerId ? {
        customer_id: searchCustomerId,
        customer_name: customers.find(c => c.id === searchCustomerId)?.name || 'Selected Customer'
      } : null
    });
  };

  const fetchCustomerTotalBills = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/bills/customer/${selectedCustomer}/total`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomerTotalBills(response.data.total_bills || 0);
    } catch (error) {
      console.error('Error fetching customer total bills:', error);
      setCustomerTotalBills(0);
    }
  };

  const calculateTotals = () => {
    let total = 0;
    products.forEach(product => {
      // Calculate price from meter_price * meters
      const meterPrice = parseFloat(product.meter_price || 0);
      const meters = parseFloat(product.meters || 0);
      const calculatedPrice = meterPrice * meters;
      total += calculatedPrice; // No quantity multiplication
    });
    setTotalAmount(total);
    const credit = parseFloat(creditAmount || 0);
    const debit = total - credit;
    setDebitAmount(debit > 0 ? debit : 0);
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value
    };
    
    // Auto-calculate price when meter_price or meters changes
    if (field === 'meter_price' || field === 'meters') {
      const meterPrice = parseFloat(updatedProducts[index].meter_price || 0);
      const meters = parseFloat(updatedProducts[index].meters || 0);
      updatedProducts[index].price = (meterPrice * meters).toFixed(2);
    }
    
    setProducts(updatedProducts);
  };

  const addProduct = () => {
    setProducts([...products, { product_name: '', meters: '', meter_price: '', price: '' }]);
  };

  const removeProduct = (index) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setMessage({ type: 'error', text: 'Please select a customer' });
      return;
    }
    if (totalAmount <= 0) {
      setMessage({ type: 'error', text: 'Total amount must be greater than 0' });
      return;
    }

    // Show transaction ID modal for Bank Transfer
    if (paymentMethod === 'Bank Transfer' && !transactionId) {
      setShowTransactionModal(true);
      return;
    }

    // Show received by for Cash
    if (paymentMethod === 'Cash' && !receivedBy) {
      setMessage({ type: 'error', text: 'Please enter "Received By" name for Cash payment' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const billData = {
        customer_id: selectedCustomer,
        bill_number: billNumber,
        bill_date: billDate,
        products: products.filter(p => p.product_name && (p.price || (p.meter_price && p.meters))),
        total_amount: totalAmount,
        credit: creditAmount,
        debit: debitAmount,
        payment_method: paymentMethod,
        description: description,
        transaction_id: paymentMethod === 'Bank Transfer' ? transactionId : null,
        received_by: paymentMethod === 'Cash' ? receivedBy : null
      };

      console.log('Sending bill data:', billData);
      const response = await axios.post(`${API_URL}/bills`, billData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Bill creation response:', response.data);
      setMessage({ type: 'success', text: 'Bill generated successfully!' });
      
      // Store last generated bill for PDF/Print
      setLastGeneratedBill({
        bill_number: billNumber,
        customer: selectedCustomerData,
        products: products.filter(p => p.product_name && (p.price || (p.meter_price && p.meters))),
        total_amount: totalAmount,
        credit: creditAmount,
        debit: debitAmount,
        payment_method: paymentMethod,
        description: description,
        date: billDate
      });
      
      // Reset form
      setSelectedCustomer('');
      setProducts([{ product_name: '', meters: '', meter_price: '', price: '' }]);
      setCreditAmount(0);
      setPaymentMethod('Cash');
      setDescription('');
      setTransactionId('');
      setReceivedBy('');
      setShowTransactionModal(false);
      fetchNextBillNumber();
      fetchBills();
      fetchCustomerTotalBills();
      
      // Refresh entries in LedgerEntries page if it's open
      window.dispatchEvent(new Event('billsUpdated'));
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error generating bill:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to generate bill';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await axios.post(`${API_URL}/bills/bulk-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setMessage({ type: 'success', text: `Successfully uploaded ${response.data.total_created} bills!` });
      setShowBulkUpload(false);
      setUploadFile(null);
      fetchBills();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error uploading bills:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to upload bills' });
    } finally {
      setUploading(false);
    }
  };

  const handlePrintBill = () => {
    if (!lastGeneratedBill) return;
    
    const printWindow = window.open('', '_blank');
    const html = generateBillHTML(lastGeneratedBill);
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownloadPDF = async () => {
    if (!lastGeneratedBill) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/bills/${lastGeneratedBill.bill_number}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bill-${lastGeneratedBill.bill_number}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      // Fallback to client-side PDF
      const printWindow = window.open('', '_blank');
      const html = generateBillHTML(lastGeneratedBill);
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  // Format brand footer for messages
  const getBrandFooter = (language = 'both') => {
    if (language === 'english') {
      return `\n\n━━━━━━━━━━━━━━━━━━\n` +
        `🏪 ${BRAND_INFO.name}\n` +
        `📍 ${BRAND_INFO.address}\n` +
        `📞 ${BRAND_INFO.phone}\n` +
        `💬 WhatsApp: ${BRAND_INFO.whatsapp}`;
    } else if (language === 'urdu') {
      return `\n\n━━━━━━━━━━━━━━━━━━\n` +
        `🏪 ${BRAND_INFO.name}\n` +
        `📍 ${BRAND_INFO.address}\n` +
        `📞 ${BRAND_INFO.phone}\n` +
        `💬 واٹس ایپ: ${BRAND_INFO.whatsapp}`;
    } else {
      return `\n\n━━━━━━━━━━━━━━━━━━\n` +
        `🏪 ${BRAND_INFO.name}\n` +
        `📍 ${BRAND_INFO.address}\n` +
        `📞 ${BRAND_INFO.phone}\n` +
        `💬 WhatsApp / واٹس ایپ: ${BRAND_INFO.whatsapp}`;
    }
  };

  const handleSendWhatsApp = (language = 'both') => {
    if (!lastGeneratedBill) {
      setMessage({ type: 'error', text: 'No bill generated yet' });
      return;
    }
    
    const customer = lastGeneratedBill.customer || selectedCustomerData;
    if (!customer || !customer.phone) {
      setMessage({ type: 'error', text: 'Customer phone number not available' });
      return;
    }
    
    const phoneNumber = customer.phone.replace(/\D/g, '');
    const productsList = lastGeneratedBill.products.map((p, idx) => 
      `${idx + 1}. ${p.product_name} (${p.meters || 'N/A'}m) - Rs. ${parseFloat(p.price || 0).toFixed(2)}`
    ).join('\n');
    
    const productsListUrdu = lastGeneratedBill.products.map((p, idx) => 
      `${idx + 1}. ${p.product_name} (${p.meters || 'N/A'} میٹر) - Rs. ${parseFloat(p.price || 0).toFixed(2)}`
    ).join('\n');
    
    const dateStr = new Date(lastGeneratedBill.date).toLocaleDateString('en-GB');
    const brandFooter = getBrandFooter(language);
    
    let billText = '';
    
    if (language === 'english') {
      billText = `🧾 *Bill Details*\n\n` +
        `📋 Bill Number: ${lastGeneratedBill.bill_number}\n` +
        `📅 Date: ${dateStr}\n\n` +
        `🛍️ *Products:*\n${productsList}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 Total Amount: Rs. ${lastGeneratedBill.total_amount.toFixed(2)}\n` +
        `✅ Paid: Rs. ${lastGeneratedBill.credit.toFixed(2)}\n` +
        `⏳ Remaining: Rs. ${lastGeneratedBill.debit.toFixed(2)}\n` +
        `💳 Payment Method: ${lastGeneratedBill.payment_method}` +
        brandFooter;
    } else if (language === 'urdu') {
      billText = `🧾 *بل کی تفصیلات*\n\n` +
        `📋 بل نمبر: ${lastGeneratedBill.bill_number}\n` +
        `📅 تاریخ: ${dateStr}\n\n` +
        `🛍️ *پروڈکٹس:*\n${productsListUrdu}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 کل رقم: Rs. ${lastGeneratedBill.total_amount.toFixed(2)}\n` +
        `✅ ادا شدہ: Rs. ${lastGeneratedBill.credit.toFixed(2)}\n` +
        `⏳ باقی: Rs. ${lastGeneratedBill.debit.toFixed(2)}\n` +
        `💳 ادائیگی کا طریقہ: ${lastGeneratedBill.payment_method}` +
        brandFooter;
    } else {
      // Both English and Urdu
      billText = `🧾 *Bill Details / بل کی تفصیلات*\n\n` +
        `📋 Bill Number / بل نمبر: ${lastGeneratedBill.bill_number}\n` +
        `📅 Date / تاریخ: ${dateStr}\n\n` +
        `🛍️ *Products / پروڈکٹس:*\n${productsList}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 Total Amount / کل رقم: Rs. ${lastGeneratedBill.total_amount.toFixed(2)}\n` +
        `✅ Paid / ادا شدہ: Rs. ${lastGeneratedBill.credit.toFixed(2)}\n` +
        `⏳ Remaining / باقی: Rs. ${lastGeneratedBill.debit.toFixed(2)}\n` +
        `💳 Payment Method / ادائیگی کا طریقہ: ${lastGeneratedBill.payment_method}` +
        brandFooter;
    }
    
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(billText)}`;
    window.open(url, '_blank');
  };

  const handleViewBill = async (bill) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/bills/${bill.bill_number}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'text'
      });
      
      setSelectedBillForView({
        ...bill,
        html: response.data
      });
      setShowBillViewModal(true);
      
      // Fetch payment history for this bill
      fetchPaymentHistory(bill.bill_number);
    } catch (error) {
      console.error('Error fetching bill details:', error);
      setMessage({ type: 'error', text: 'Failed to load bill details' });
    }
  };

  const fetchPaymentHistory = async (billNumber, filter = 'all') => {
    try {
      setLoadingPaymentHistory(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (billNumber) {
        params.append('bill_number', billNumber);
      }
      if (filter && filter !== 'all') {
        params.append('status', filter);
      }
      
      const response = await axios.get(`${API_URL}/payments/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPaymentHistory(response.data.payments || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoadingPaymentHistory(false);
    }
  };

  const handleDownloadBillPDF = async (billNumber) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/bills/${billNumber}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bill-${billNumber}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setMessage({ type: 'error', text: 'Failed to download PDF' });
    }
  };


  const handleDeleteBill = (bill) => {
    setBillToDelete(bill);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteBill = async () => {
    if (!billToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      const billNumber = billToDelete.bill_number;
      
      console.log('[Delete] Attempting to delete bill:', billNumber);
      console.log('[Delete] API URL:', `${API_URL}/bills/${billNumber}`);
      
      // Encode bill number to handle special characters
      const encodedBillNumber = encodeURIComponent(billNumber);
      const response = await axios.delete(`${API_URL}/bills/${encodedBillNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[Delete] Success response:', response.data);
      
      setMessage({ type: 'success', text: `Bill ${billNumber} deleted successfully` });
      setShowDeleteConfirm(false);
      setBillToDelete(null);
      
      // Refresh bills list
      await fetchBills();
      
      // Dispatch event for other components
      window.dispatchEvent(new Event('billsUpdated'));
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('[Delete] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to delete bill. Please check console for details.';
      
      setMessage({ type: 'error', text: errorMessage });
      setShowDeleteConfirm(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleSendBillWhatsApp = (bill, language = 'both') => {
    if (!bill.customer_phone) {
      setMessage({ type: 'error', text: 'Customer phone number not available' });
      return;
    }
    
    const phoneNumber = bill.customer_phone.replace(/\D/g, '');
    const dateStr = new Date(bill.date).toLocaleDateString('en-GB');
    const brandFooter = getBrandFooter(language);
    
    let billText = '';
    
    if (language === 'english') {
      billText = `🧾 *Bill Details*\n\n` +
        `📋 Bill Number: ${bill.bill_number}\n` +
        `📅 Date: ${dateStr}\n` +
        `👤 Customer: ${bill.customer_name}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 Total Amount: Rs. ${parseFloat(bill.order_total || 0).toFixed(2)}\n` +
        `✅ Paid: Rs. ${parseFloat(bill.credit || 0).toFixed(2)}\n` +
        `⏳ Remaining: Rs. ${parseFloat(bill.debit || 0).toFixed(2)}\n` +
        `💳 Payment Method: ${bill.payment_method || 'Cash'}` +
        brandFooter;
    } else if (language === 'urdu') {
      billText = `🧾 *بل کی تفصیلات*\n\n` +
        `📋 بل نمبر: ${bill.bill_number}\n` +
        `📅 تاریخ: ${dateStr}\n` +
        `👤 کسٹمر: ${bill.customer_name}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 کل رقم: Rs. ${parseFloat(bill.order_total || 0).toFixed(2)}\n` +
        `✅ ادا شدہ: Rs. ${parseFloat(bill.credit || 0).toFixed(2)}\n` +
        `⏳ باقی: Rs. ${parseFloat(bill.debit || 0).toFixed(2)}\n` +
        `💳 ادائیگی کا طریقہ: ${bill.payment_method || 'Cash'}` +
        brandFooter;
    } else {
      // Both English and Urdu
      billText = `🧾 *Bill Details / بل کی تفصیلات*\n\n` +
        `📋 Bill Number / بل نمبر: ${bill.bill_number}\n` +
        `📅 Date / تاریخ: ${dateStr}\n` +
        `👤 Customer / کسٹمر: ${bill.customer_name}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 Total Amount / کل رقم: Rs. ${parseFloat(bill.order_total || 0).toFixed(2)}\n` +
        `✅ Paid / ادا شدہ: Rs. ${parseFloat(bill.credit || 0).toFixed(2)}\n` +
        `⏳ Remaining / باقی: Rs. ${parseFloat(bill.debit || 0).toFixed(2)}\n` +
        `💳 Payment Method / ادائیگی کا طریقہ: ${bill.payment_method || 'Cash'}` +
        brandFooter;
    }
    
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(billText)}`;
    window.open(url, '_blank');
  };

  // Fetch customers needing reminders
  const fetchReminderCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/ledger/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allCustomers = response.data.customers || [];
      
      // Get bills for all customers to calculate balances
      const billsResponse = await axios.get(`${API_URL}/bills`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allBills = billsResponse.data.bills || [];
      
      // Calculate balance for each customer
      const customersWithBalance = allCustomers.map(customer => {
        const customerBills = allBills.filter(b => b.customer_id === customer.id);
        const total = customerBills.reduce((sum, b) => sum + parseFloat(b.order_total || 0), 0);
        const paid = customerBills.reduce((sum, b) => sum + parseFloat(b.credit || 0), 0);
        const balance = total - paid;
        
        // Get last bill date
        const lastBill = customerBills.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const lastBillDate = lastBill ? new Date(lastBill.date) : null;
        const daysSinceLastBill = lastBillDate ? Math.floor((new Date() - lastBillDate) / (1000 * 60 * 60 * 24)) : null;
        
        return {
          ...customer,
          balance,
          lastBillDate,
          daysSinceLastBill,
          bills: customerBills
        };
      });
      
      // Filter customers needing reminders
      const reminderList = customersWithBalance.filter(c => {
        if (!c.phone || c.balance <= 0) return false;
        
        // High balance customers (>1 lakh) - daily reminder
        if (c.balance >= 100000) return true;
        
        // Weekly reminder - last bill was 7+ days ago
        if (c.daysSinceLastBill && c.daysSinceLastBill >= 7) return true;
        
        return false;
      });
      
      setReminderCustomers(reminderList);
      return reminderList;
    } catch (error) {
      console.error('Error fetching reminder customers:', error);
      setMessage({ type: 'error', text: 'Failed to fetch reminder customers' });
      return [];
    }
  };

  // Generate customer report message
  const generateCustomerReport = (customer, language = 'both') => {
    const brandFooter = getBrandFooter(language);
    const totalBills = customer.bills?.length || 0;
    const totalAmount = customer.bills?.reduce((sum, b) => sum + parseFloat(b.order_total || 0), 0) || 0;
    const totalPaid = customer.bills?.reduce((sum, b) => sum + parseFloat(b.credit || 0), 0) || 0;
    const balance = totalAmount - totalPaid;
    
    if (language === 'english') {
      return `📊 *Account Statement / Reminder*\n\n` +
        `👤 Customer: ${customer.name}\n` +
        `📞 Phone: ${customer.phone}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📋 Total Bills: ${totalBills}\n` +
        `💰 Total Amount: Rs. ${totalAmount.toFixed(2)}\n` +
        `✅ Total Paid: Rs. ${totalPaid.toFixed(2)}\n` +
        `⏳ *Outstanding Balance: Rs. ${balance.toFixed(2)}*\n\n` +
        `🔔 *Payment Reminder*\n` +
        `Please clear your outstanding balance at your earliest convenience.\n\n` +
        `Thank you for your business! 🙏` +
        brandFooter;
    } else if (language === 'urdu') {
      return `📊 *اکاؤنٹ سٹیٹمنٹ / یاد دہانی*\n\n` +
        `👤 کسٹمر: ${customer.name}\n` +
        `📞 فون: ${customer.phone}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📋 کل بلز: ${totalBills}\n` +
        `💰 کل رقم: Rs. ${totalAmount.toFixed(2)}\n` +
        `✅ کل ادا شدہ: Rs. ${totalPaid.toFixed(2)}\n` +
        `⏳ *باقی رقم: Rs. ${balance.toFixed(2)}*\n\n` +
        `🔔 *ادائیگی کی یاد دہانی*\n` +
        `براہ کرم اپنی باقی رقم جلد از جلد ادا کریں۔\n\n` +
        `آپ کے کاروبار کا شکریہ! 🙏` +
        brandFooter;
    } else {
      return `📊 *Account Statement / Reminder*\n*اکاؤنٹ سٹیٹمنٹ / یاد دہانی*\n\n` +
        `👤 Customer / کسٹمر: ${customer.name}\n` +
        `📞 Phone / فون: ${customer.phone}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📋 Total Bills / کل بلز: ${totalBills}\n` +
        `💰 Total Amount / کل رقم: Rs. ${totalAmount.toFixed(2)}\n` +
        `✅ Total Paid / کل ادا شدہ: Rs. ${totalPaid.toFixed(2)}\n` +
        `⏳ *Outstanding Balance / باقی رقم: Rs. ${balance.toFixed(2)}*\n\n` +
        `🔔 *Payment Reminder / ادائیگی کی یاد دہانی*\n` +
        `Please clear your outstanding balance at your earliest convenience.\n` +
        `براہ کرم اپنی باقی رقم جلد از جلد ادا کریں۔\n\n` +
        `Thank you for your business! / آپ کے کاروبار کا شکریہ! 🙏` +
        brandFooter;
    }
  };

  // Send reminder to customer
  const handleSendReminder = (customer, language = 'both') => {
    if (!customer.phone) {
      setMessage({ type: 'error', text: 'Customer phone number not available' });
      return;
    }
    
    const phoneNumber = customer.phone.replace(/\D/g, '');
    const message = generateCustomerReport(customer, language);
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Open reminder modal
  const handleOpenReminderModal = async () => {
    setShowReminderModal(true);
    await fetchReminderCustomers();
  };

  const handlePaymentClick = (bill) => {
    setSelectedBillForPayment(bill);
    setPaymentAmount(0);
    setPaymentMethodForPayment('Cash');
    setReceivedByForPayment('');
    setTransactionIdForPayment('');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedBillForPayment) return;
    
    // Calculate remaining correctly: order_total - credit
    const total = parseFloat(selectedBillForPayment.order_total || 0);
    const received = parseFloat(selectedBillForPayment.credit || 0);
    const remaining = Math.max(0, total - received);
    const payment = parseFloat(paymentAmount || 0);
    
    if (payment <= 0) {
      setMessage({ type: 'error', text: 'Payment amount must be greater than 0' });
      return;
    }
    
    if (payment > remaining) {
      setMessage({ type: 'error', text: `Payment cannot exceed remaining amount (Rs. ${remaining.toFixed(2)})` });
      return;
    }

    if (paymentMethodForPayment === 'Cash' && !receivedByForPayment) {
      setMessage({ type: 'error', text: 'Please enter "Received By" name for Cash payment' });
      return;
    }

    if (paymentMethodForPayment === 'Bank Transfer' && !transactionIdForPayment) {
      setMessage({ type: 'error', text: 'Please enter Transaction ID for Bank Transfer' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/bills/${selectedBillForPayment.bill_number}/payment`, {
        amount: payment,
        payment_method: paymentMethodForPayment,
        received_by: paymentMethodForPayment === 'Cash' ? receivedByForPayment : null,
        transaction_id: paymentMethodForPayment === 'Bank Transfer' ? transactionIdForPayment : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const isFullyCleared = payment >= remaining;
      
      if (isFullyCleared && selectedBillForPayment.customer_phone) {
        // Send WhatsApp notification (both English and Urdu)
        const phoneNumber = selectedBillForPayment.customer_phone.replace(/\D/g, '');
        const message = `✅ *Bill Cleared Successfully! / بل مکمل طور پر ادا ہو گیا!*\n\n` +
          `📋 Bill Number / بل نمبر: ${selectedBillForPayment.bill_number}\n\n` +
          `🎉 Your bill has been fully paid. Thank you! / آپ کا بل مکمل طور پر ادا ہو گیا ہے۔ شکریہ!\n\n` +
          getBrandFooter('both');
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      }

      setMessage({ 
        type: 'success', 
        text: isFullyCleared 
          ? `Bill ${selectedBillForPayment.bill_number} cleared successfully! WhatsApp message sent.` 
          : `Payment of Rs. ${payment.toFixed(2)} recorded. Remaining: Rs. ${(remaining - payment).toFixed(2)}` 
      });
      
      setShowPaymentModal(false);
      const billNumberForRefresh = selectedBillForPayment.bill_number;
      setSelectedBillForPayment(null);
      setPaymentAmount(0);
      setPaymentMethodForPayment('Cash');
      setReceivedByForPayment('');
      setTransactionIdForPayment('');
      
      fetchBills();
      window.dispatchEvent(new Event('billsUpdated'));
      
      // Refresh payment history if bill view modal is open
      if (showBillViewModal && selectedBillForView && selectedBillForView.bill_number === billNumberForRefresh) {
        fetchPaymentHistory(billNumberForRefresh, paymentHistoryFilter);
      }
      
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      console.error('Error recording payment:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.error || 'Failed to record payment';
      const errorDetails = error.response?.data?.details || '';
      const errorHint = error.response?.data?.hint || '';
      
      setMessage({ 
        type: 'error', 
        text: `${errorMessage}${errorDetails ? `: ${errorDetails}` : ''}${errorHint ? ` (${errorHint})` : ''}` 
      });
    }
  };

  const generateBillHTML = (bill) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bill ${bill.bill_number}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .urdu { font-family: 'Noto Nastaliq Urdu', 'Nori Nastaleeq', 'Jameel Noori Nastaleeq', Arial, sans-serif; direction: rtl; }
    .bill-container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4F46E5; padding-bottom: 20px; }
    .header h1 { color: #4F46E5; font-size: 32px; margin-bottom: 10px; }
    .header h1 .urdu { font-size: 28px; }
    .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; }
    .info-box h3 { color: #4F46E5; font-size: 16px; margin-bottom: 10px; }
    .info-box h3 .urdu { font-size: 14px; }
    .products-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .products-table th { background: #4F46E5; color: white; padding: 12px; text-align: left; }
    .products-table th .urdu { font-size: 0.85em; }
    .products-table td { padding: 10px; border-bottom: 1px solid #e0e0e0; }
    .summary-section { margin-top: 30px; border-top: 2px solid #e0e0e0; padding-top: 20px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .summary-row.total { font-size: 18px; font-weight: bold; border-top: 2px solid #4F46E5; margin-top: 10px; padding-top: 15px; }
    @media print {
      body { background: white; }
      .bill-container { box-shadow: none; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="bill-container">
    <div class="header">
      <h1>BILL <span class="urdu">بل</span></h1>
      <p>Bill Number <span class="urdu">بل نمبر</span>: <strong>${bill.bill_number}</strong></p>
      <p>Date <span class="urdu">تاریخ</span>: ${new Date(bill.date).toLocaleDateString()}</p>
    </div>
    <div class="info-section">
      <div class="info-box">
        <h3>Customer Information <span class="urdu">کسٹمر کی معلومات</span></h3>
        <p><strong>Name <span class="urdu">نام</span>:</strong> ${bill.customer?.name || 'N/A'}</p>
        <p><strong>Phone <span class="urdu">فون</span>:</strong> ${bill.customer?.phone || 'N/A'}</p>
        <p><strong>Address <span class="urdu">پتہ</span>:</strong> ${bill.customer?.address || 'N/A'}</p>
        <p><strong>City <span class="urdu">شہر</span>:</strong> ${bill.customer?.city || 'N/A'}</p>
      </div>
      <div class="info-box">
        <h3>Payment Details <span class="urdu">ادائیگی کی تفصیلات</span></h3>
        <p><strong>Payment Method <span class="urdu">ادائیگی کا طریقہ</span>:</strong> ${bill.payment_method}</p>
        <p><strong>Description <span class="urdu">تفصیل</span>:</strong> ${bill.description || 'N/A'}</p>
      </div>
    </div>
    <table class="products-table">
      <thead>
        <tr>
          <th>Product Name <span class="urdu">پروڈکٹ کا نام</span></th>
          <th>Meters <span class="urdu">میٹر</span></th>
          <th>Meter Price <span class="urdu">فی میٹر قیمت</span></th>
          <th>Amount <span class="urdu">رقم</span></th>
        </tr>
      </thead>
      <tbody>
        ${bill.products.map(p => `
          <tr>
            <td>${p.product_name}</td>
            <td>${p.meters || 'N/A'}</td>
            <td>Rs. ${parseFloat(p.meter_price || 0).toFixed(2)}</td>
            <td>Rs. ${parseFloat(p.price || 0).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="summary-section">
      <div class="summary-row">
        <span>Total Amount <span class="urdu">کل رقم</span>:</span>
        <span>Rs. ${bill.total_amount.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Paid Amount <span class="urdu">ادا شدہ رقم</span>:</span>
        <span style="color: green;">Rs. ${bill.credit.toFixed(2)}</span>
      </div>
      <div class="summary-row total">
        <span>Remaining Amount <span class="urdu">باقی رقم</span>:</span>
        <span style="color: red;">Rs. ${bill.debit.toFixed(2)}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Customer Name': 'John Doe',
        'Customer Phone': '03001234567',
        'Bill Number': 'BILL-202401-001',
        'Bill Date': '2024-01-15',
        'Product Name': 'Product 1',
        'Meters': '7',
        'Price': '1000',
        'Quantity': '1',
        'Total Amount': '1000',
        'Credit (Paid)': '500',
        'Payment Method': 'Cash',
        'Description': 'Sample bill'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bills Template');
    XLSX.writeFile(wb, 'bills-upload-template.xlsx');
  };

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  return (
    <Layout>
        <div className="space-y-4 md:space-y-6 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Generate Bill</h1>

        {message.text && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Dashboard Section */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Billing Dashboard</h2>
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={handleOpenReminderModal}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm md:text-base flex items-center gap-2"
              >
                🔔 Send Reminders
              </button>
            </div>
            <div className="w-full md:w-auto">
              <label className="block text-xs text-gray-600 mb-1">Filter by Customer</label>
              <select
                className="w-full md:w-64 px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                value={searchCustomerId}
                onChange={(e) => {
                  setSearchCustomerId(e.target.value);
                  setSearchBillNumber('');
                  fetchBills();
                }}
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {dashboardStats.customerStats ? (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm font-semibold text-blue-800">
                Viewing stats for: <strong>{dashboardStats.customerStats.customer_name}</strong>
              </p>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-500">
              <p className="text-sm font-semibold text-gray-800">
                Viewing stats for: <strong>All Customers</strong>
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm md:text-base opacity-90">Total Bills</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1">{dashboardStats.totalBills}</p>
                </div>
                <div className="text-3xl md:text-4xl opacity-80">📊</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm md:text-base opacity-90">Total Purchase</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">Rs. {dashboardStats.totalPurchase?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="text-3xl md:text-4xl opacity-80">💰</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm md:text-base opacity-90">Total Received</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">Rs. {dashboardStats.totalReceived.toFixed(2)}</p>
                </div>
                <div className="text-3xl md:text-4xl opacity-80">✅</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm md:text-base opacity-90">Total Remaining</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">Rs. {dashboardStats.totalRemaining.toFixed(2)}</p>
                </div>
                <div className="text-3xl md:text-4xl opacity-80">⏳</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <form onSubmit={handleGenerateBill}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={selectedCustomer}
                  onChange={(e) => {
                    setSelectedCustomer(e.target.value);
                    setCreditAmount(0);
                  }}
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
                {selectedCustomerData && (
                  <p className="text-xs text-gray-500 mt-1">
                    Address: {selectedCustomerData.address || 'N/A'} | 
                    City: {selectedCustomerData.city || 'N/A'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="Auto-generated"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value === 'Bank Transfer') {
                      setShowTransactionModal(true);
                    }
                  }}
                >
                  <option value="Cash">Cash</option>
                  <option value="Pending">Pending</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                </select>
              </div>

              {paymentMethod === 'Cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Received By <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Enter name of person who received payment"
                  />
                </div>
              )}
            </div>

            <div className="mb-4 md:mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 md:mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Products <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addProduct}
                  className="px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm md:text-base"
                >
                  + Add Product
                </button>
              </div>

              <div className="space-y-3 md:space-y-4">
                {products.map((product, index) => (
                  <div key={index} className="grid grid-cols-6 md:grid-cols-12 gap-2 md:gap-4 items-end">
                    <div className="col-span-6 md:col-span-3">
                      <label className="block text-xs text-gray-600 mb-1">Product Name</label>
                      <input
                        type="text"
                        className="w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={product.product_name}
                        onChange={(e) => handleProductChange(index, 'product_name', e.target.value)}
                        placeholder="Product name"
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Meters</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={product.meters}
                        onChange={(e) => handleProductChange(index, 'meters', e.target.value)}
                        placeholder="7"
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Meter Price</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={product.meter_price}
                        onChange={(e) => handleProductChange(index, 'meter_price', e.target.value)}
                        placeholder="1000"
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Price (Auto)</label>
                      <input
                        type="text"
                        readOnly
                        className="w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                        value={`Rs. ${(parseFloat(product.price || 0)).toFixed(2)}`}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Subtotal</label>
                      <input
                        type="text"
                        readOnly
                        className="w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                        value={`Rs. ${(parseFloat(product.price || 0)).toFixed(2)}`}
                      />
                    </div>
                    <div className="col-span-1">
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProduct(index)}
                          className="w-full px-2 md:px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm md:text-base"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  placeholder="Additional notes or description"
                />
              </div>

              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Amount (Rs.)
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-bold text-lg"
                    value={`Rs. ${totalAmount.toFixed(2)}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credit (What Customer Gave) (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalAmount}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={creditAmount}
                    onChange={(e) => {
                      const credit = parseFloat(e.target.value || 0);
                      setCreditAmount(credit > totalAmount ? totalAmount : credit);
                    }}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Debit (Remaining Amount) (Rs.)
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-red-50 font-bold text-lg text-red-700"
                    value={`Rs. ${debitAmount.toFixed(2)}`}
                  />
                </div>

                {selectedCustomer && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Bill for Customer
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-blue-50 font-bold text-lg text-blue-700"
                      value={`Rs. ${totalAmount.toFixed(2)}`}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 md:gap-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer('');
                  setProducts([{ product_name: '', meters: '', meter_price: '', price: '' }]);
                  setCreditAmount(0);
                  setPaymentMethod('Cash');
                  setDescription('');
                  setTransactionId('');
                  setReceivedBy('');
                  setShowTransactionModal(false);
                  fetchNextBillNumber();
                }}
                className="px-4 md:px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm md:text-base"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 md:px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm md:text-base"
              >
                {loading ? 'Generating...' : 'Generate Bill'}
              </button>
              {lastGeneratedBill && (
                <>
                  <button
                    type="button"
                    onClick={handlePrintBill}
                    className="px-4 md:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base"
                  >
                    🖨️ Print
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    className="px-4 md:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm md:text-base"
                  >
                    📄 PDF
                  </button>
                  {selectedCustomerData && selectedCustomerData.phone && (
                    <div className="flex gap-2 items-center">
                      <select
                        value={whatsappLanguage}
                        onChange={(e) => setWhatsappLanguage(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                        title="Select WhatsApp message language"
                      >
                        <option value="both">English + Urdu</option>
                        <option value="english">English</option>
                        <option value="urdu">Urdu</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(whatsappLanguage)}
                        className="px-4 md:px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm md:text-base"
                      >
                        💬 WhatsApp
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </form>
        </div>

        {/* Search and Actions */}
        <div className="bg-white rounded-lg shadow p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 md:gap-4 flex-1">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Select Customer</label>
                <select
                  className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={searchCustomerId}
                  onChange={(e) => {
                    setSearchCustomerId(e.target.value);
                    setSearchBillNumber('');
                    // fetchBills will be called by useEffect
                  }}
                >
                  <option value="">All Customers</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Search Bill Number</label>
                <input
                  type="text"
                  placeholder="Bill Number"
                  className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={searchBillNumber}
                  onChange={(e) => setSearchBillNumber(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      fetchBills();
                    }
                  }}
                />
              </div>
              <div className="self-end sm:self-auto">
                <button
                  onClick={fetchBills}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base"
                >
                  Search
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={downloadTemplate}
                className="px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm md:text-base"
              >
                📥 Template
              </button>
              <button
                onClick={() => setShowBulkUpload(true)}
                className="px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm md:text-base"
              >
                📤 Upload
              </button>
            </div>
          </div>
        </div>

        {/* Bills List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500 text-sm">
                      No bills found. Select a customer to view their bills.
                    </td>
                  </tr>
                ) : (
                  bills.map((bill) => {
                    const total = parseFloat(bill.order_total || 0);
                    const received = parseFloat(bill.credit || 0);
                    const remaining = Math.max(0, total - received);
                    const isPaid = remaining <= 0;
                    
                    return (
                      <tr key={bill.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bill.bill_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(bill.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          Rs. {total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          Rs. {received.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          Rs. {remaining.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.payment_method || 'Cash'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {isPaid ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                              ✅ Paid
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePaymentClick(bill)}
                              className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold hover:bg-yellow-200"
                            >
                              ⏳ Unpaid
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleViewBill(bill)}
                              className="text-blue-600 hover:text-blue-900 text-sm px-2 py-1 rounded hover:bg-blue-50"
                              title="View Bill"
                            >
                              👁️ View
                            </button>
                            <button
                              onClick={() => handleDeleteBill(bill)}
                              className="text-red-600 hover:text-red-900 text-sm px-2 py-1 rounded hover:bg-red-50"
                              title="Delete Bill"
                            >
                              🗑️ Delete
                            </button>
                            <button
                              onClick={() => handleDownloadBillPDF(bill.bill_number)}
                              className="text-green-600 hover:text-green-900 text-sm px-2 py-1 rounded hover:bg-green-50"
                              title="Download PDF"
                            >
                              📄 PDF
                            </button>
                            {bill.customer_phone && (
                              <button
                                onClick={() => handleSendBillWhatsApp(bill)}
                                className="text-green-500 hover:text-green-700 text-sm px-2 py-1 rounded hover:bg-green-50"
                                title="Send WhatsApp"
                              >
                                💬 WhatsApp
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View - Data in Rows */}
          <div className="md:hidden">
            {bills.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No bills found. Select a customer to view their bills.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {bills.map((bill) => {
                  const total = parseFloat(bill.order_total || 0);
                  const received = parseFloat(bill.credit || 0);
                  const remaining = Math.max(0, total - received);
                  const isPaid = remaining <= 0;
                  
                  return (
                    <div key={bill.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{bill.bill_number}</p>
                          <p className="text-xs text-gray-500 mt-1">{bill.customer_name}</p>
                          <p className="text-xs text-gray-500">{new Date(bill.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          {isPaid ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                              ✅ Paid
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePaymentClick(bill)}
                              className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold hover:bg-yellow-200"
                            >
                              ⏳ Unpaid
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-semibold text-gray-900">Rs. {total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Received:</span>
                          <span className="font-semibold text-green-600">Rs. {received.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Remaining:</span>
                          <span className="font-semibold text-red-600">Rs. {remaining.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Method:</span>
                          <span className="text-gray-500">{bill.payment_method || 'Cash'}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleViewBill(bill)}
                          className="w-full px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 text-left"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => handleDeleteBill(bill)}
                          className="w-full px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 text-left"
                        >
                          🗑️ Delete
                        </button>
                        <button
                          onClick={() => handleDownloadBillPDF(bill.bill_number)}
                          className="w-full px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 text-left"
                        >
                          📄 PDF
                        </button>
                        {bill.customer_phone && (
                          <button
                            onClick={() => handleSendBillWhatsApp(bill)}
                            className="w-full px-3 py-1.5 bg-green-50 text-green-600 rounded text-xs font-medium hover:bg-green-100 text-left"
                          >
                            💬 WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bill View Modal */}
        {showBillViewModal && selectedBillForView && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-lg p-6 max-w-6xl w-full my-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Bill Details - {selectedBillForView.bill_number}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(selectedBillForView.html);
                      printWindow.document.close();
                      setTimeout(() => printWindow.print(), 500);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    🖨️ Print
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([selectedBillForView.html], { type: 'text/html' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `bill-${selectedBillForView.bill_number}.html`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-black-700"
                  >
                    📄 Download PDF
                  </button>
                  {selectedBillForView.customer_phone && (
                    <button
                      onClick={() => handleSendBillWhatsApp(selectedBillForView)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      💬 WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowBillViewModal(false);
                      setSelectedBillForView(null);
                      setPaymentHistory([]);
                      setPaymentHistoryFilter('all');
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
              
              {/* Bill HTML View */}
              <div 
                className="border rounded-lg p-4 overflow-auto max-h-[50vh] mb-4"
                dangerouslySetInnerHTML={{ __html: selectedBillForView.html }}
              />

              {/* Payment History Section */}
              <div className="mt-6 border-t pt-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                  <div className="flex gap-2">
                    <select
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={paymentHistoryFilter}
                      onChange={(e) => {
                        setPaymentHistoryFilter(e.target.value);
                        fetchPaymentHistory(selectedBillForView.bill_number, e.target.value);
                      }}
                    >
                      <option value="all">All Payments</option>
                      <option value="paid">Paid Bills</option>
                      <option value="unpaid">Unpaid Bills</option>
                    </select>
                    <button
                      onClick={() => fetchPaymentHistory(selectedBillForView.bill_number, paymentHistoryFilter)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      disabled={loadingPaymentHistory}
                    >
                      {loadingPaymentHistory ? '🔄' : '🔄 Refresh'}
                    </button>
                  </div>
                </div>

                {loadingPaymentHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading payment history...</p>
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No payment records found.
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Number</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received By</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paymentHistory.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {new Date(payment.date || payment.created_at).toLocaleString('en-US', { 
                                  dateStyle: 'short', 
                                  timeStyle: 'short' 
                                })}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                                {payment.bill_number || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {payment.customers?.name || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                                Rs. {parseFloat(payment.credit || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {payment.payment_method || 'Cash'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {payment.transaction_id || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {payment.received_by || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {payment.description || 'Payment received'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {paymentHistory.map((payment) => (
                        <div key={payment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-semibold text-blue-600">{payment.bill_number || 'N/A'}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(payment.date || payment.created_at).toLocaleString('en-US', { 
                                  dateStyle: 'short', 
                                  timeStyle: 'short' 
                                })}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-green-600">
                              Rs. {parseFloat(payment.credit || 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Customer:</span>
                              <span>{payment.customers?.name || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Method:</span>
                              <span>{payment.payment_method || 'Cash'}</span>
                            </div>
                            {payment.transaction_id && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Transaction ID:</span>
                                <span className="font-mono text-xs">{payment.transaction_id}</span>
                              </div>
                            )}
                            {payment.received_by && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Received By:</span>
                                <span>{payment.received_by}</span>
                              </div>
                            )}
                            {payment.description && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-gray-500 text-xs">{payment.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedBillForPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-lg p-4 md:p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Record Payment</h3>
              
              <div className="space-y-4 mb-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Bill Number: <strong>{selectedBillForPayment.bill_number}</strong></p>
                  <p className="text-sm text-gray-600">Total Amount: <strong>Rs. {parseFloat(selectedBillForPayment.order_total || 0).toFixed(2)}</strong></p>
                  <p className="text-sm font-semibold text-blue-600 border-b border-blue-200 pb-1 mb-1">Received So Far: <strong>Rs. {parseFloat(selectedBillForPayment.credit || 0).toFixed(2)}</strong></p>
                  <p className="text-sm text-green-600">Received: <strong>Rs. {parseFloat(selectedBillForPayment.credit || 0).toFixed(2)}</strong></p>
                  <p className="text-sm text-red-600">Remaining: <strong>Rs. {Math.max(0, parseFloat(selectedBillForPayment.order_total || 0) - parseFloat(selectedBillForPayment.credit || 0)).toFixed(2)}</strong></p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount (Rs.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={Math.max(0, parseFloat(selectedBillForPayment.order_total || 0) - parseFloat(selectedBillForPayment.credit || 0))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={paymentAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value || 0);
                      const total = parseFloat(selectedBillForPayment.order_total || 0);
                      const received = parseFloat(selectedBillForPayment.credit || 0);
                      const max = Math.max(0, total - received);
                      setPaymentAmount(val > max ? max : val);
                    }}
                    placeholder="Enter payment amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: Rs. {Math.max(0, parseFloat(selectedBillForPayment.order_total || 0) - parseFloat(selectedBillForPayment.credit || 0)).toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={paymentMethodForPayment}
                    onChange={(e) => {
                      setPaymentMethodForPayment(e.target.value);
                      if (e.target.value === 'Bank Transfer') {
                        setReceivedByForPayment('');
                      } else if (e.target.value === 'Cash') {
                        setTransactionIdForPayment('');
                      }
                    }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                  </select>
                </div>

                {paymentMethodForPayment === 'Cash' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Received By <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={receivedByForPayment}
                      onChange={(e) => setReceivedByForPayment(e.target.value)}
                      placeholder="Enter name of person who received payment"
                    />
                  </div>
                )}

                {paymentMethodForPayment === 'Bank Transfer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={transactionIdForPayment}
                      onChange={(e) => setTransactionIdForPayment(e.target.value)}
                      placeholder="Enter transaction ID"
                    />
                  </div>
                )}

                {paymentAmount > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>After Payment:</strong>
                    </p>
                    <p className="text-sm text-green-600">
                      New Received: Rs. {(parseFloat(selectedBillForPayment.credit || 0) + paymentAmount).toFixed(2)}
                    </p>
                    <p className="text-sm text-red-600">
                      New Remaining: Rs. {Math.max(0, (parseFloat(selectedBillForPayment.order_total || 0) - parseFloat(selectedBillForPayment.credit || 0) - paymentAmount)).toFixed(2)}
                    </p>
                    {paymentAmount >= Math.max(0, parseFloat(selectedBillForPayment.order_total || 0) - parseFloat(selectedBillForPayment.credit || 0)) && (
                      <p className="text-sm text-green-700 font-semibold mt-2">
                        ✅ Bill will be fully cleared!
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedBillForPayment(null);
                    setPaymentAmount(0);
                    setPaymentMethodForPayment('Cash');
                    setReceivedByForPayment('');
                    setTransactionIdForPayment('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && billToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4 text-red-600">Confirm Delete</h3>
              <p className="text-sm text-gray-700 mb-4">
                Are you sure you want to delete bill <strong>{billToDelete.bill_number}</strong>? 
                This action cannot be undone and will delete all entries for this bill.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setBillToDelete(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteBill}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Transaction ID Modal for Bank Transfer */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Transaction ID Required</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please enter the transaction ID for Bank Transfer payment
              </p>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 mb-4"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction ID"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransactionModal(false);
                    setPaymentMethod('Cash');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (transactionId.trim()) {
                      setShowTransactionModal(false);
                    } else {
                      setMessage({ type: 'error', text: 'Transaction ID is required' });
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Upload Modal */}
        {showBulkUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Bulk Upload Bills</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload Excel file with columns: Customer Name, Customer Phone, Bill Number, Bill Date, 
                Product Name, Meters, Price, Quantity, Total Amount, Credit (Paid), Payment Method, Description
              </p>
              <form onSubmit={handleBulkUpload}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="mb-4 w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {uploadFile && (
                  <div className="mb-4 p-2 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">📄 File: {uploadFile.name}</p>
                  </div>
                )}
                {uploading && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-blue-700">Uploading...</p>
                    </div>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkUpload(false);
                      setUploadFile(null);
                    }}
                    disabled={uploading}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadFile || uploading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reminder Modal */}
        {showReminderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">🔔 Send Payment Reminders</h3>
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Reminder Rules:</strong><br />
                  • Customers with balance ≥ Rs. 1,00,000: Daily reminder<br />
                  • Customers with last bill 7+ days ago: Weekly reminder
                </p>
              </div>

              {reminderCustomers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No customers need reminders at this time.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reminderCustomers.map((customer) => {
                    const isHighBalance = customer.balance >= 100000;
                    const reminderType = isHighBalance ? 'Daily (High Balance)' : 'Weekly';
                    
                    return (
                      <div
                        key={customer.id}
                        className={`border rounded-lg p-4 ${
                          isHighBalance ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{customer.name}</h4>
                            <p className="text-sm text-gray-600">📞 {customer.phone}</p>
                            <p className="text-sm text-gray-600">
                              {customer.daysSinceLastBill !== null
                                ? `Last bill: ${customer.daysSinceLastBill} days ago`
                                : 'No bills yet'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${
                              isHighBalance ? 'text-red-700' : 'text-orange-700'
                            }`}>
                              Rs. {customer.balance.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-600">{reminderType}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSendReminder(customer, 'both')}
                            className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          >
                            💬 Send (Both)
                          </button>
                          <button
                            onClick={() => handleSendReminder(customer, 'english')}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            💬 Send (English)
                          </button>
                          <button
                            onClick={() => handleSendReminder(customer, 'urdu')}
                            className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                          >
                            💬 Send (Urdu)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={fetchReminderCustomers}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  🔄 Refresh List
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GenerateBill;

