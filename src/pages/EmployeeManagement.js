import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { API_URL } from '../utils/api';

const EmployeeManagement = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    profile_image_base64: '',
    is_active: true
  });
  const [capturedImage, setCapturedImage] = useState(null);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchEmployees();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch employees';
      console.error('Full error:', error.response?.data);
      
      // Show detailed error message
      if (errorMessage.includes('does not exist')) {
        alert(`Error: ${errorMessage}\n\nPlease run employee-attendance-schema.sql in Supabase SQL Editor to create the employees table.`);
      } else {
        alert(`Error: ${errorMessage}\n\nPlease check:\n1. Database connection is working\n2. Employees table exists in database\n3. You have proper permissions`);
      }
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageBase64);
    setFormData({ ...formData, profile_image_base64: imageBase64 });
    stopCamera();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editingEmployee) {
        await axios.put(`${API_URL}/employees/${editingEmployee.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Employee updated successfully!');
      } else {
        await axios.post(`${API_URL}/employees`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Employee created successfully!');
      }
      
      setShowModal(false);
      setEditingEmployee(null);
      setFormData({
        employee_code: '',
        name: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        profile_image_base64: '',
        is_active: true
      });
      setCapturedImage(null);
      fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save employee');
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      employee_code: employee.employee_code,
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
      department: employee.department || '',
      profile_image_base64: employee.profile_image_base64 || '',
      is_active: employee.is_active !== false
    });
    setCapturedImage(employee.profile_image_base64 || null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Employee deleted successfully!');
      fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete employee');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Access Denied. Only admins can manage employees.
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Employee Management
          </h1>
          <button
            onClick={() => {
              setEditingEmployee(null);
              setFormData({
                employee_code: '',
                name: '',
                email: '',
                phone: '',
                position: '',
                department: '',
                profile_image_base64: '',
                is_active: true
              });
              setCapturedImage(null);
              setShowModal(true);
            }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            ➕ Add Employee
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {employee.employee_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {employee.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {employee.position || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {employee.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            employee.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {employee.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEdit(employee)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(employee.id)}
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
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                {editingEmployee ? 'Edit Employee' : 'Add Employee'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employee Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.employee_code}
                      onChange={(e) => setFormData({ ...formData, employee_code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                      disabled={!!editingEmployee}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Position
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                    />
                  </div>
                </div>

                {/* Profile Image Capture */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Profile Image (for attendance verification)
                  </label>
                  {!stream && !capturedImage && (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      📷 Capture Profile Image
                    </button>
                  )}
                  {stream && (
                    <div className="space-y-2">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full max-w-md rounded-lg border-2 border-indigo-500"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={captureImage}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          📸 Capture
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {capturedImage && (
                    <div className="mt-2">
                      <img
                        src={capturedImage}
                        alt="Profile"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCapturedImage(null);
                          setFormData({ ...formData, profile_image_base64: '' });
                        }}
                        className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                {editingEmployee && (
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                    </label>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingEmployee(null);
                      setCapturedImage(null);
                      stopCamera();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {editingEmployee ? 'Update' : 'Create'} Employee
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

export default EmployeeManagement;

