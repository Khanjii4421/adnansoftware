import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

import { API_URL } from '../utils/api';

const PurchaseEntry = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [items, setItems] = useState([{ product_name: '', description: '', quantity: 1, unit: 'pcs', unit_price: 0, total_price: 0 }]);
  const [lastGeneratedBill, setLastGeneratedBill] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [debitAmount, setDebitAmount] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Credit');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [searchBillNumber, setSearchBillNumber] = useState('');
  const [searchSupplierId, setSearchSupplierId] = useState('');
  const [selectedPurchaseForView, setSelectedPurchaseForView] = useState(null);
  const [showBillViewModal, setShowBillViewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodForPayment, setPaymentMethodForPayment] = useState('Cash');
  const [receivedByForPayment, setReceivedByForPayment] = useState('');
  const [transactionIdForPayment, setTransactionIdForPayment] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSuppliers();
    fetchNextBillNumber();
    fetchPurchases();
  }, []);

  useEffect(() => {
    if (searchSupplierId || searchBillNumber) {
      fetchPurchases();
    }
  }, [searchSupplierId, searchBillNumber]);

  useEffect(() => {
    calculateTotals();
  }, [items]);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/purchasing/suppliers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(response.data.suppliers || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setMessage({ type: 'error', text: 'Failed to load suppliers' });
    }
  };

  const fetchNextBillNumber = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/purchasing/next-bill-number`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBillNumber(response.data.bill_number || '');
    } catch (error) {
      console.error('Error fetching next bill number:', error);
      setBillNumber(`PUR-${Date.now()}`);
    }
  };

  const fetchPurchases = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchSupplierId) {
        params.append('supplier_id', searchSupplierId);
      }
      const response = await axios.get(`${API_URL}/purchasing/purchases?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let purchasesList = response.data.purchases || [];
      
      if (searchBillNumber) {
        purchasesList = purchasesList.filter(p => 
          p.bill_number.toLowerCase().includes(searchBillNumber.toLowerCase())
        );
      }
      
      setPurchases(purchasesList);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      setMessage({ type: 'error', text: 'Failed to load purchases' });
    }
  };

  const calculateTotals = () => {
    let total = 0;
    items.forEach(item => {
      const qty = parseFloat(item.quantity || 0);
      const unitPrice = parseFloat(item.unit_price || 0);
      const itemTotal = qty * unitPrice;
      total += itemTotal;
      // Update item total_price
      const updatedItems = [...items];
      updatedItems[items.indexOf(item)] = { ...item, total_price: itemTotal };
      if (JSON.stringify(updatedItems) !== JSON.stringify(items)) {
        setItems(updatedItems);
      }
    });
    setTotalAmount(total);
    setDebitAmount(total);
    setCreditAmount(0);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    // Auto-calculate total_price when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const qty = parseFloat(updatedItems[index].quantity || 0);
      const unitPrice = parseFloat(updatedItems[index].unit_price || 0);
      updatedItems[index].total_price = qty * unitPrice;
    }
    
    setItems(updatedItems);
  };

  const addItem = () => {
    setItems([...items, { product_name: '', description: '', quantity: 1, unit: 'pcs', unit_price: 0, total_price: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) {
      setMessage({ type: 'error', text: 'Please select a supplier' });
      return;
    }
    if (totalAmount <= 0) {
      setMessage({ type: 'error', text: 'Total amount must be greater than 0' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const purchaseData = {
        supplier_id: selectedSupplier,
        bill_number: billNumber,
        bill_date: billDate,
        description: description,
        items: items.filter(item => item.product_name && item.quantity > 0),
        debit_amount: debitAmount,
        credit_amount: creditAmount,
        payment_method: paymentMethod
      };

      const response = await axios.post(`${API_URL}/purchasing/purchases`, purchaseData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Purchase bill generated successfully!' });
      
      // Store last generated bill
      const supplier = suppliers.find(s => s.id === selectedSupplier);
      setLastGeneratedBill({
        ...response.data.purchase,
        supplier: supplier
      });
      
      // Reset form
      setSelectedSupplier('');
      setItems([{ product_name: '', description: '', quantity: 1, unit: 'pcs', unit_price: 0, total_price: 0 }]);
      setDebitAmount(0);
      setCreditAmount(0);
      setPaymentMethod('Credit');
      setDescription('');
      fetchNextBillNumber();
      fetchPurchases();
      
    } catch (error) {
      console.error('Error generating purchase bill:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to generate purchase bill' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewBill = async (purchase) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/purchasing/purchases/${purchase.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedPurchaseForView(response.data.purchase);
      setShowBillViewModal(true);
    } catch (error) {
      console.error('Error fetching purchase:', error);
      setMessage({ type: 'error', text: 'Failed to load purchase details' });
    }
  };

  const handleDownloadPDF = async (purchase) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/purchasing/purchases/${purchase.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Purchase-${purchase.bill_number}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      // Fallback: open in new window
      const printWindow = window.open('', '_blank');
      const token = localStorage.getItem('token');
      axios.get(`${API_URL}/purchasing/purchases/${purchase.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(response => {
        printWindow.document.write(response.data);
        printWindow.document.close();
      });
    }
  };

  const handlePrintBill = async (purchase) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/purchasing/purchases/${purchase.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(response.data);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (error) {
      console.error('Error printing bill:', error);
      setMessage({ type: 'error', text: 'Failed to print bill' });
    }
  };

  const handleAddPayment = (purchase) => {
    setSelectedPurchaseForPayment(purchase);
    setPaymentAmount(purchase.remaining_amount || 0);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedPurchaseForPayment) return;
    if (paymentAmount <= 0) {
      setMessage({ type: 'error', text: 'Payment amount must be greater than 0' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const paymentData = {
        purchase_id: selectedPurchaseForPayment.id,
        supplier_id: selectedPurchaseForPayment.supplier_id,
        payment_date: paymentDate,
        amount: paymentAmount,
        payment_method: paymentMethodForPayment,
        transaction_id: transactionIdForPayment,
        received_by: receivedByForPayment,
        notes: paymentNotes
      };

      await axios.post(`${API_URL}/purchasing/payments`, paymentData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Payment added successfully!' });
      setShowPaymentModal(false);
      setSelectedPurchaseForPayment(null);
      setPaymentAmount(0);
      setTransactionIdForPayment('');
      setReceivedByForPayment('');
      setPaymentNotes('');
      fetchPurchases();
      
      // Refresh the purchase view if modal is open
      if (selectedPurchaseForView) {
        const purchaseResponse = await axios.get(`${API_URL}/purchasing/purchases/${selectedPurchaseForView.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedPurchaseForView(purchaseResponse.data.purchase);
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to add payment' });
    } finally {
      setLoading(false);
    }
  };

  const selectedSupplierData = suppliers.find(s => s.id === selectedSupplier);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Purchase Entry <span className="text-lg text-gray-600">خریداری</span></h1>

        {message.text && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Purchase Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Create Purchase Bill</h2>
            <form onSubmit={handleGenerateBill}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select
                    required
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} {supplier.company_name ? `(${supplier.company_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
                    <input
                      type="text"
                      required
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date</label>
                    <input
                      type="date"
                      required
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Credit">Credit</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                  {items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-12 gap-2 mb-2">
                        <div className="col-span-6">
                          <input
                            type="text"
                            placeholder="Product Name"
                            value={item.product_name}
                            onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-6">
                          <input
                            type="text"
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-3">
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Unit"
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            placeholder="Unit Price"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="px-2 py-1 text-sm font-semibold">
                            Rs. {parseFloat(item.total_price || 0).toFixed(2)}
                          </div>
                        </div>
                        <div className="col-span-1">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
                  >
                    + Add Item
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="font-bold text-lg">Rs. {parseFloat(totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Debit Amount:</span>
                    <span className="font-semibold">Rs. {parseFloat(debitAmount).toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Purchase Bill'}
                </button>
              </div>
            </form>
          </div>

          {/* Purchase History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Purchase History</h2>
            
            <div className="mb-4 space-y-2">
              <input
                type="text"
                placeholder="Search by bill number..."
                value={searchBillNumber}
                onChange={(e) => setSearchBillNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={searchSupplierId}
                onChange={(e) => setSearchSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {purchases.map(purchase => (
                <div key={purchase.id} className="border rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{purchase.bill_number}</div>
                      <div className="text-sm text-gray-600">
                        {purchase.suppliers?.name || 'N/A'} | {new Date(purchase.bill_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">Rs. {parseFloat(purchase.debit_amount || 0).toFixed(2)}</div>
                      <div className={`text-xs ${purchase.is_paid ? 'text-green-600' : 'text-red-600'}`}>
                        {purchase.is_paid ? 'Paid' : `Remaining: Rs. ${parseFloat(purchase.remaining_amount || 0).toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleViewBill(purchase)}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handlePrintBill(purchase)}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Print
                    </button>
                    {!purchase.is_paid && (
                      <button
                        onClick={() => handleAddPayment(purchase)}
                        className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                      >
                        Add Payment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bill View Modal */}
        {showBillViewModal && selectedPurchaseForView && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Purchase Bill: {selectedPurchaseForView.bill_number}</h2>
                <button
                  onClick={() => setShowBillViewModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Supplier:</strong> {selectedPurchaseForView.suppliers?.name || 'N/A'}
                  </div>
                  <div>
                    <strong>Date:</strong> {new Date(selectedPurchaseForView.bill_date).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Payment Method:</strong> {selectedPurchaseForView.payment_method || 'Credit'}
                  </div>
                  <div>
                    <strong>Status:</strong> {selectedPurchaseForView.is_paid ? 'Paid' : 'Unpaid'}
                  </div>
                </div>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2">Product</th>
                      <th className="border border-gray-300 px-4 py-2">Description</th>
                      <th className="border border-gray-300 px-4 py-2">Qty</th>
                      <th className="border border-gray-300 px-4 py-2">Unit Price</th>
                      <th className="border border-gray-300 px-4 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchaseForView.purchase_items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-300 px-4 py-2">{item.product_name}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.description || '-'}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.quantity} {item.unit}</td>
                        <td className="border border-gray-300 px-4 py-2">Rs. {parseFloat(item.unit_price || 0).toFixed(2)}</td>
                        <td className="border border-gray-300 px-4 py-2">Rs. {parseFloat(item.total_price || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex justify-between">
                    <strong>Total Amount:</strong>
                    <strong>Rs. {parseFloat(selectedPurchaseForView.debit_amount || 0).toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid Amount:</span>
                    <span>Rs. {parseFloat(selectedPurchaseForView.paid_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining Amount:</span>
                    <span>Rs. {parseFloat(selectedPurchaseForView.remaining_amount || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment History Section */}
                <div className="mt-6">
                  <h3 className="text-lg font-bold mb-3">Payment History <span className="text-sm font-normal text-gray-600">ادائیگی کی تاریخ</span></h3>
                  {selectedPurchaseForView.purchase_payments && selectedPurchaseForView.purchase_payments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-emerald-100">
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm">#</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm">Date & Time <span className="text-xs text-gray-600">تاریخ و وقت</span></th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm">Amount <span className="text-xs text-gray-600">رقم</span></th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm">Method <span className="text-xs text-gray-600">طریقہ</span></th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm">Transaction ID</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm">Received By <span className="text-xs text-gray-600">وصول کنندہ</span></th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm">Notes <span className="text-xs text-gray-600">نوٹس</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPurchaseForView.purchase_payments
                            .sort((a, b) => new Date(b.created_at || b.payment_date) - new Date(a.created_at || a.payment_date))
                            .map((payment, idx) => {
                              const paymentDateTime = payment.created_at 
                                ? new Date(payment.created_at).toLocaleString('en-GB', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })
                                : new Date(payment.payment_date).toLocaleDateString('en-GB');
                              return (
                                <tr key={payment.id || idx} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-3 py-2 text-sm">{idx + 1}</td>
                                  <td className="border border-gray-300 px-3 py-2 text-sm">{paymentDateTime}</td>
                                  <td className="border border-gray-300 px-3 py-2 text-sm font-semibold">Rs. {parseFloat(payment.amount || 0).toFixed(2)}</td>
                                  <td className="border border-gray-300 px-3 py-2 text-sm">{payment.payment_method || 'N/A'}</td>
                                  <td className="border border-gray-300 px-3 py-2 text-sm">{payment.transaction_id || '-'}</td>
                                  <td className="border border-gray-300 px-3 py-2 text-sm">{payment.received_by || '-'}</td>
                                  <td className="border border-gray-300 px-3 py-2 text-sm">{payment.notes || '-'}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-blue-50 font-bold">
                            <td colSpan="2" className="border border-gray-300 px-3 py-2 text-sm">
                              Total Payments <span className="text-xs font-normal text-gray-600">کل ادائیگیاں</span>:
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-sm">
                              Rs. {selectedPurchaseForView.purchase_payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2)}
                            </td>
                            <td colSpan="4" className="border border-gray-300"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 italic">
                      <p>No payments found <span className="text-sm">کوئی ادائیگی نہیں ملی</span></p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => handlePrintBill(selectedPurchaseForView)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                  >
                    Print
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(selectedPurchaseForView)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedPurchaseForPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add Payment</h2>
              <form onSubmit={handleSubmitPayment}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min="0"
                      step="0.01"
                      max={selectedPurchaseForPayment.remaining_amount}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Remaining: Rs. {parseFloat(selectedPurchaseForPayment.remaining_amount || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      required
                      value={paymentMethodForPayment}
                      onChange={(e) => setPaymentMethodForPayment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  {(paymentMethodForPayment === 'Bank Transfer' || paymentMethodForPayment === 'JazzCash' || paymentMethodForPayment === 'EasyPaisa') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                      <input
                        type="text"
                        value={transactionIdForPayment}
                        onChange={(e) => setTransactionIdForPayment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Received By</label>
                    <input
                      type="text"
                      value={receivedByForPayment}
                      onChange={(e) => setReceivedByForPayment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Payment'}
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

export default PurchaseEntry;

