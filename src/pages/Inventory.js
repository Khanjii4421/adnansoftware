import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';

import { API_URL } from '../utils/api';

const Inventory = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    sku: '',
    qty: 0,
    box_number: '',
    line_number: '',
    row_number: '',
    color: '',
    category: '',
    seller_id: '',
  });

  useEffect(() => {
    fetchInventory();
    if (user?.role === 'admin') {
      fetchSellers();
    }
  }, [user]);

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

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventory(response.data.inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/inventory`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Inventory item added successfully!');
      setShowModal(false);
      setFormData({
        product_code: '',
        product_name: '',
        sku: '',
        qty: 0,
        box_number: '',
        line_number: '',
        row_number: '',
        color: '',
        category: '',
        seller_id: '',
      });
      fetchInventory();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add inventory item');
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    if (user?.role === 'admin' && !formData.seller_id) {
      alert('Please select a seller');
      return;
    }

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', uploadFile);
    if (user?.role === 'admin' && formData.seller_id) {
      uploadFormData.append('seller_id', formData.seller_id);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/inventory/bulk-upload`, uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        timeout: 600000, // 10 minutes
      });

      const { total, added, updated, skipped, errors } = response.data;

      let message = `✅ Upload Complete!\n\n`;
      message += `Total Processed: ${total}\n`;
      message += `Successfully Added: ${added}\n`;
      message += `Updated: ${updated}\n`;
      message += `Skipped: ${skipped}\n`;

      if (errors && errors.length > 0) {
        message += `\nErrors (${errors.length}):\n`;
        errors.slice(0, 5).forEach((err, idx) => {
          message += `${idx + 1}. Row ${err.row}: ${err.error}\n`;
        });
        if (errors.length > 5) {
          message += `... and ${errors.length - 5} more errors. Check console for full details.`;
        }
        console.error('Upload errors:', errors);
      }

      alert(message);
      setShowBulkUploadModal(false);
      setUploadFile(null);
      fetchInventory();
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Product Code': 'KS1',
        'Product Name': 'Kids Shirt Size 1',
        'SKU': 'KS1-RED-001',
        'Quantity': '100',
        'Box Number': 'B1',
        'Line Number': 'L1',
        'Row Number': 'R1',
        'Color': 'Red',
        'Category': 'Shirts'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, 'inventory-bulk-upload-template.xlsx');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setShowBulkUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              📤 Bulk Upload
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              + Add Inventory Item
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Box/Line/Row
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {item.product_code}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.product_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.qty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.box_number}/{item.line_number}/{item.row_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.color}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.is_in_stock
                          ? item.qty <= 100
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.is_in_stock ? (item.qty <= 100 ? 'Low Stock' : 'In Stock') : 'Out of Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Inventory Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add Inventory Item</h3>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  {user?.role === 'admin' && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Seller <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={formData.seller_id}
                        onChange={(e) =>
                          setFormData({ ...formData, seller_id: e.target.value })
                        }
                      >
                        <option value="">Select Seller</option>
                        {sellers.map((seller) => (
                          <option key={seller.id} value={seller.id}>
                            {seller.name} ({seller.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Product Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.product_code}
                      onChange={(e) =>
                        setFormData({ ...formData, product_code: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.product_name}
                      onChange={(e) =>
                        setFormData({ ...formData, product_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.qty}
                      onChange={(e) =>
                        setFormData({ ...formData, qty: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Box Number
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.box_number}
                      onChange={(e) =>
                        setFormData({ ...formData, box_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Line Number
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.line_number}
                      onChange={(e) =>
                        setFormData({ ...formData, line_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Row Number
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.row_number}
                      onChange={(e) =>
                        setFormData({ ...formData, row_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Color</label>
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Upload Modal */}
        {showBulkUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Bulk Upload Inventory</h3>
              <form onSubmit={handleBulkUpload}>
                {user?.role === 'admin' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seller <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.seller_id}
                      onChange={(e) =>
                        setFormData({ ...formData, seller_id: e.target.value })
                      }
                    >
                      <option value="">Select Seller</option>
                      {sellers.map((seller) => (
                        <option key={seller.id} value={seller.id}>
                          {seller.name} ({seller.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Excel/CSV File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: .xlsx, .xls, .csv
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Required columns:</strong> Product Code, Product Name, SKU, Quantity
                  </p>
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Optional columns:</strong> Box Number, Line Number, Row Number, Color, Category
                  </p>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    📥 Download Template
                  </button>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkUploadModal(false);
                      setUploadFile(null);
                    }}
                    className="px-4 py-2 border rounded-lg"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={uploading || !uploadFile}
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
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

export default Inventory;

