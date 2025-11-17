import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

import { API_URL } from '../utils/api';

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [formData, setFormData] = useState({
    product_code: '',
    seller_id: user?.role === 'seller' ? user.id : '',
    seller_price: '',
    shipper_price: '',
    meters: 7,
  });

  useEffect(() => {
    fetchProducts();
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
      setSellers(response.data.sellers);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const sellerId = user?.role === 'seller' ? user.id : null;
      const url = sellerId
        ? `${API_URL}/products?seller_id=${sellerId}`
        : `${API_URL}/products`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveSellerName = (sellerId) => {
    const s = sellers.find(x => String(x.id) === String(sellerId));
    return s?.name || sellerId || '-';
  };

  const openAddModal = () => {
    setIsEdit(false);
    setEditingProductId(null);
    setFormData({
      product_code: '',
      seller_id: user?.role === 'seller' ? user.id : '',
      seller_price: '',
      shipper_price: '',
      meters: 7,
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setIsEdit(true);
    setEditingProductId(product.id);
    setFormData({
      product_code: product.product_code || '',
      seller_id: product.seller_id,
      seller_price: String(product.seller_price ?? ''),
      shipper_price: String(product.shipper_price ?? ''),
      meters: product.meters || 7,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (isEdit && editingProductId) {
        await axios.put(`${API_URL}/products/${editingProductId}`, {
          product_code: formData.product_code,
          seller_price: formData.seller_price,
          shipper_price: formData.shipper_price,
          meters: formData.meters,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Product updated successfully!');
      } else {
        await axios.post(`${API_URL}/products`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Product created successfully!');
      }
      setShowModal(false);
      setIsEdit(false);
      setEditingProductId(null);
      fetchProducts();
    } catch (error) {
      alert(error.response?.data?.error || (isEdit ? 'Failed to update product' : 'Failed to create product'));
    }
  };

  const handleDuplicate = async (product) => {
    try {
      const token = localStorage.getItem('token');

      // Ask for starting code, allow empty to auto-generate
      const userInput = window.prompt('Enter new product code (leave blank to auto-generate):', `${product.product_code}-COPY`);

      const base = (userInput && userInput.trim()) || `${product.product_code}-COPY`;
      let suffix = 0; // 0 => base, 1 => base2, etc.

      const tryCreate = async (code) => {
        await axios.post(`${API_URL}/products`, {
          product_code: code,
          seller_id: product.seller_id,
          seller_price: product.seller_price,
          shipper_price: product.shipper_price,
          meters: product.meters || 7,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      };

      // Try up to 20 variants to guarantee a quick success
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const candidate = suffix === 0 ? base : `${base}${suffix + 1}`;
        try {
          await tryCreate(candidate);
          alert(`Product duplicated successfully as ${candidate}`);
          fetchProducts();
          return;
        } catch (err) {
          const msg = err.response?.data?.error || err.message || '';
          // If the error is due to existing code, try next suffix; else rethrow
          if (String(msg).toLowerCase().includes('already exists')) {
            suffix += 1;
            continue;
          }
          throw err;
        }
      }

      alert('Unable to find a unique product code automatically. Please try again with a different code.');
    } catch (error) {
      console.error('Duplicate product error:', error);
      alert(error.response?.data?.error || error.message || 'Failed to duplicate product');
    }
  };

  const handleFileUpload = async (e) => {
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
      const response = await axios.post(`${API_URL}/products/bulk-upload`, uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        timeout: 600000,
      });
      
      const { total_processed, total_created, total_errors, errors } = response.data;
      
      let message = `✅ Upload Complete!\n\n`;
      message += `Total Processed: ${total_processed}\n`;
      message += `Successfully Created: ${total_created}\n`;
      message += `Errors: ${total_errors}\n`;
      
      if (total_errors > 0 && errors && errors.length > 0) {
        message += `\nFirst ${Math.min(errors.length, 5)} errors:\n`;
        errors.slice(0, 5).forEach((err, idx) => {
          message += `${idx + 1}. Row ${err.row}: ${err.error}\n`;
        });
        if (errors.length > 5) {
          message += `... and ${errors.length - 5} more errors. Check console for full details.`;
        }
        console.error('Upload errors:', errors);
      }
      
      alert(message);
      
      setShowUploadModal(false);
      setUploadFile(null);
      fetchProducts();
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.error || error.message || 'Upload failed. Please check the file format and try again.');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/products/bulk-upload-template`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products-bulk-upload-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading template:', err);
      alert('Failed to download template. Please try again.');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Products</h2>
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📥 Download Template
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              📤 Bulk Upload
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add Product
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
                {user?.role === 'admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Seller
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Seller Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Shipper Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Meters
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {product.product_code}
                  </td>
                  {user?.role === 'admin' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {resolveSellerName(product.seller_id)}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Rs. {parseFloat(product.seller_price || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Rs. {parseFloat(product.shipper_price || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      product.meters === 7 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {product.meters || 7}m
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button
                      onClick={() => openEditModal(product)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(product)}
                      className="text-green-600 hover:text-green-800"
                      title="Duplicate product"
                    >
                      Duplicate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Product Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">{isEdit ? 'Edit Product' : 'Add Product'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Product Code
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
                  {user?.role === 'admin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Seller</label>
                      <select
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={formData.seller_id}
                        onChange={(e) =>
                          setFormData({ ...formData, seller_id: e.target.value })
                        }
                        disabled={isEdit}
                      >
                        <option value="">Select Seller</option>
                        {sellers.map((seller) => (
                          <option key={seller.id} value={seller.id}>
                            {seller.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Seller Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.seller_price}
                      onChange={(e) =>
                        setFormData({ ...formData, seller_price: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Shipper Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.shipper_price}
                      onChange={(e) =>
                        setFormData({ ...formData, shipper_price: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Meters
                    </label>
                    <select
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.meters}
                      onChange={(e) =>
                        setFormData({ ...formData, meters: parseInt(e.target.value) })
                      }
                    >
                      <option value={7}>7 meters</option>
                      <option value={4}>4 meters</option>
                    </select>
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
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Bulk Upload Products (CSV/Excel)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload a CSV or Excel file with columns: Product Code, Seller Price, Shipper Price, Meters
              </p>
              <p className="text-xs text-blue-600 mb-2 bg-blue-50 p-2 rounded">
                ✅ Download the template first to see the correct format with examples
              </p>
              <form onSubmit={handleFileUpload}>
                {user?.role === 'admin' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Seller *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.seller_id}
                      onChange={(e) => setFormData({ ...formData, seller_id: e.target.value })}
                    >
                      <option value="">Select Seller</option>
                      {sellers.map((seller) => (
                        <option key={seller.id} value={seller.id}>
                          {seller.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                {uploadFile && (
                  <div className="mb-4 p-2 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">
                      📄 File: {uploadFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Size: {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
                {uploading && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-blue-700">
                        Uploading and processing...
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
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
      </div>
    </Layout>
  );
};

export default Products;

