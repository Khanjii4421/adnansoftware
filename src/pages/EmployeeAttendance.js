import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { API_URL } from '../utils/api';

const EmployeeAttendance = () => {
  const { user } = useAuth();
  const [employeeCode, setEmployeeCode] = useState('');
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [attendanceType, setAttendanceType] = useState('entry'); // 'entry' or 'exit'
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [todayAttendance, setTodayAttendance] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Check today's attendance when employee is loaded
    if (employee) {
      checkTodayAttendance();
    }
    
    return () => {
      // Cleanup camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [employee]);

  const checkTodayAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`${API_URL}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          employee_code: employee.employee_code,
          start_date: today,
          end_date: today
        }
      });
      
      if (response.data.attendance && response.data.attendance.length > 0) {
        setTodayAttendance(response.data.attendance[0]);
        if (response.data.attendance[0].entry_time && !response.data.attendance[0].exit_time) {
          setAttendanceType('exit');
        } else if (response.data.attendance[0].entry_time && response.data.attendance[0].exit_time) {
          setAttendanceType('completed');
        }
      } else {
        setAttendanceType('entry');
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
    }
  };

  const handleSearchEmployee = async () => {
    if (!employeeCode.trim()) {
      showMessage('Please enter employee code', 'error');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/employees/code/${employeeCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEmployee(response.data.employee);
      showMessage('Employee found!', 'success');
    } catch (error) {
      showMessage(error.response?.data?.error || 'Employee not found', 'error');
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Front camera for selfie
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
      showMessage('Unable to access camera. Please allow camera permissions.', 'error');
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
    setCapturedImage(null);
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageBase64);
    
    // Stop camera after capture
    stopCamera();
  };

  const markAttendance = async () => {
    if (!employee) {
      showMessage('Please search for employee first', 'error');
      return;
    }

    if (!capturedImage) {
      showMessage('Please capture a selfie first', 'error');
      return;
    }

    if (attendanceType === 'completed') {
      showMessage('Attendance already completed for today', 'error');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/attendance/mark`,
        {
          employee_code: employee.employee_code,
          image_base64: capturedImage,
          type: attendanceType
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      showMessage(response.data.message || 'Attendance marked successfully!', 'success');
      setCapturedImage(null);
      setTodayAttendance(response.data.attendance);
      
      // Update attendance type
      if (response.data.attendance.exit_time) {
        setAttendanceType('completed');
      } else {
        setAttendanceType('exit');
      }
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to mark attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatHours = (hours) => {
    if (!hours || hours === 0) return '-';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <Layout>
      <div className="space-y-4 p-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Employee Attendance
        </h1>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg ${
            messageType === 'success' 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Employee Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Search Employee
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter Employee Code"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchEmployee()}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
            />
            <button
              onClick={handleSearchEmployee}
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Employee Info */}
        {employee && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Employee Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {employee.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Employee Code</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {employee.employee_code}
                </p>
              </div>
              {employee.position && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Position</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {employee.position}
                  </p>
                </div>
              )}
              {employee.department && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {employee.department}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Today's Attendance Status */}
        {todayAttendance && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Today's Attendance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Entry Time</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatTime(todayAttendance.entry_time)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Exit Time</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatTime(todayAttendance.exit_time)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatHours(todayAttendance.total_hours)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Camera Section */}
        {employee && attendanceType !== 'completed' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              {attendanceType === 'entry' ? 'Mark Entry' : 'Mark Exit'}
            </h2>

            <div className="space-y-4">
              {/* Camera Controls */}
              {!stream && !capturedImage && (
                <button
                  onClick={startCamera}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  📷 Start Camera
                </button>
              )}

              {/* Video Preview */}
              {stream && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-w-md mx-auto rounded-lg border-4 border-indigo-500"
                    style={{ transform: 'scaleX(-1)' }} // Mirror effect for selfie
                  />
                  <div className="mt-4 flex gap-4 justify-center">
                    <button
                      onClick={captureSelfie}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      📸 Capture Selfie
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Captured Image Preview */}
              {capturedImage && (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={capturedImage}
                      alt="Captured selfie"
                      className="w-full max-w-md mx-auto rounded-lg border-4 border-green-500"
                    />
                  </div>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => {
                        setCapturedImage(null);
                        startCamera();
                      }}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      🔄 Retake
                    </button>
                    <button
                      onClick={markAttendance}
                      disabled={loading}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? 'Marking...' : `✅ Mark ${attendanceType === 'entry' ? 'Entry' : 'Exit'}`}
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden canvas for image capture */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          </div>
        )}

        {employee && attendanceType === 'completed' && (
          <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded-lg">
            ✅ Attendance completed for today. Entry and Exit both marked.
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EmployeeAttendance;

