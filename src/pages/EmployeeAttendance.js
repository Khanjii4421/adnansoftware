import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { API_URL } from '../utils/api';

const EmployeeAttendance = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [attendanceType, setAttendanceType] = useState('entry'); // 'entry' or 'exit'
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null); // 'checking', 'verified', 'failed'
  const [currentLocation, setCurrentLocation] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Office location configuration - Load from localStorage or use default
  const [officeLocation, setOfficeLocation] = useState(() => {
    const saved = localStorage.getItem('officeLocation');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // If parsing fails, use default
      }
    }
    // Default location (will be set to current location on first use)
    return {
      latitude: null,
      longitude: null,
      radius: 100 // Radius in meters (100m = ~328 feet)
    };
  });
  
  const [locationCheckEnabled, setLocationCheckEnabled] = useState(() => {
    const saved = localStorage.getItem('locationCheckEnabled');
    return saved !== null ? saved === 'true' : false; // Default: disabled
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

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

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      showMessage('Failed to load employees list', 'error');
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    const selected = employees.find(emp => emp.id === employeeId);
    if (selected) {
      setEmployee(selected);
      setCapturedImage(null);
      setLocationStatus(null);
      showMessage('Employee selected!', 'success');
    }
  };

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

  // Save office location to localStorage
  useEffect(() => {
    if (officeLocation.latitude && officeLocation.longitude) {
      localStorage.setItem('officeLocation', JSON.stringify(officeLocation));
    }
  }, [officeLocation]);

  // Save location check enabled status
  useEffect(() => {
    localStorage.setItem('locationCheckEnabled', locationCheckEnabled.toString());
  }, [locationCheckEnabled]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Set current location as office location
  const setCurrentLocationAsOffice = () => {
    if (!currentLocation) {
      showMessage('Please get your current location first', 'error');
      return;
    }
    
    setOfficeLocation({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      radius: officeLocation.radius || 100
    });
    setLocationCheckEnabled(true);
    showMessage('Office location set to your current location!', 'success');
  };

  // Check if user is at office location
  const checkLocation = () => {
    return new Promise((resolve, reject) => {
      // If location check is disabled, skip verification
      if (!locationCheckEnabled || !officeLocation.latitude || !officeLocation.longitude) {
        // Just get location for display, but don't verify
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setCurrentLocation({ 
                latitude: position.coords.latitude, 
                longitude: position.coords.longitude, 
                accuracy: position.coords.accuracy 
              });
            },
            () => {} // Ignore errors if location check is disabled
          );
        }
        resolve({ verified: true, skipped: true });
        return;
      }

      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      setLocationStatus('checking');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;
          const accuracy = position.coords.accuracy; // Accuracy in meters

          setCurrentLocation({ latitude: userLat, longitude: userLon, accuracy });

          const distance = calculateDistance(
            userLat,
            userLon,
            officeLocation.latitude,
            officeLocation.longitude
          );

          // Check if within radius (considering GPS accuracy)
          const effectiveRadius = officeLocation.radius + accuracy;
          
          if (distance <= effectiveRadius) {
            setLocationStatus('verified');
            resolve({
              verified: true,
              distance: Math.round(distance),
              accuracy: Math.round(accuracy)
            });
          } else {
            setLocationStatus('failed');
            reject({
              verified: false,
              distance: Math.round(distance),
              required: officeLocation.radius,
              message: `You are ${Math.round(distance)}m away from office. Required: within ${officeLocation.radius}m`
            });
          }
        },
        (error) => {
          setLocationStatus('failed');
          let errorMessage = 'Unable to get your location. ';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Please allow location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
            default:
              errorMessage += 'Unknown error occurred.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const startCamera = async () => {
    try {
      // Check location first (only if enabled)
      if (locationCheckEnabled && officeLocation.latitude && officeLocation.longitude) {
        try {
          await checkLocation();
        } catch (locationError) {
          showMessage(locationError.message || 'Location verification failed. Please ensure you are at the office location.', 'error');
          return;
        }
      } else {
        // Just get location for display
        checkLocation().catch(() => {}); // Ignore errors
      }

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
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.error('Error playing video:', err);
            });
          }
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Unable to access camera. ';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera permissions.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      showMessage(errorMessage, 'error');
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
    if (!videoRef.current || !canvasRef.current) {
      showMessage('Camera not ready. Please wait for camera to load.', 'error');
      return;
    }

    const video = videoRef.current;
    
    if (!video.videoWidth || !video.videoHeight) {
      showMessage('Camera is still loading. Please wait a moment and try again.', 'error');
      return;
    }

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
      showMessage('Please select an employee first', 'error');
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

    // Verify location again before marking (only if enabled)
    if (locationCheckEnabled && officeLocation.latitude && officeLocation.longitude) {
      try {
        const locationResult = await checkLocation();
        if (!locationResult.verified && !locationResult.skipped) {
          showMessage('You are not at the office location. Attendance cannot be marked.', 'error');
          return;
        }
      } catch (locationError) {
        showMessage(locationError.message || 'Location verification failed. Please ensure you are at the office location.', 'error');
        return;
      }
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/attendance/mark`,
        {
          employee_code: employee.employee_code,
          image_base64: capturedImage,
          type: attendanceType,
          latitude: currentLocation?.latitude,
          longitude: currentLocation?.longitude,
          location_verified: true
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      showMessage(response.data.message || 'Attendance marked successfully!', 'success');
      setCapturedImage(null);
      setTodayAttendance(response.data.attendance);
      setLocationStatus(null);
      
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
      <div className="space-y-3 sm:space-y-4 p-2 sm:p-3 md:p-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Employee Attendance
        </h1>

        {/* Message Display */}
        {message && (
          <div className={`p-3 sm:p-4 rounded-lg text-sm sm:text-base ${
            messageType === 'success' 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Location Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100">
            Location Settings
          </h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Enable Location Check
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {locationCheckEnabled 
                    ? 'Attendance will only be accepted at office location' 
                    : 'Location check is disabled - attendance can be marked from anywhere'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-2 sm:mt-0">
                <input
                  type="checkbox"
                  checked={locationCheckEnabled}
                  onChange={(e) => setLocationCheckEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            {locationCheckEnabled && (
              <div className="border-t pt-3 sm:pt-4 space-y-2 sm:space-y-3">
                {officeLocation.latitude && officeLocation.longitude ? (
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <p className="break-words">Office Location: {officeLocation.latitude.toFixed(6)}, {officeLocation.longitude.toFixed(6)}</p>
                    <p>Radius: {officeLocation.radius}m</p>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-yellow-600">Office location not set</p>
                )}
                
                <button
                  onClick={async () => {
                    try {
                      if (!navigator.geolocation) {
                        showMessage('Geolocation not supported', 'error');
                        return;
                      }
                      setLocationStatus('checking');
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setCurrentLocation({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy
                          });
                          setCurrentLocationAsOffice();
                          setLocationStatus('verified');
                        },
                        (error) => {
                          setLocationStatus('failed');
                          showMessage('Failed to get location. Please allow location access.', 'error');
                        }
                      );
                    } catch (error) {
                      showMessage('Error getting location', 'error');
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  📍 Set Current Location as Office
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Employee Selection Dropdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100">
            Select Employee
          </h2>
          <select
            value={selectedEmployeeId}
            onChange={(e) => handleEmployeeSelect(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="">-- Select Employee --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employee_code} - {emp.name} {emp.department ? `(${emp.department})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Employee Info */}
        {employee && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100">
              Employee Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {employee.name}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Employee Code</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {employee.employee_code}
                </p>
              </div>
              {employee.position && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Position</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {employee.position}
                  </p>
                </div>
              )}
              {employee.department && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Department</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {employee.department}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Location Status */}
        {locationStatus && (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 ${
            locationStatus === 'verified' ? 'border-2 border-green-500' :
            locationStatus === 'failed' ? 'border-2 border-red-500' :
            'border-2 border-yellow-500'
          }`}>
            {locationStatus === 'checking' && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-yellow-600"></div>
                <span className="text-sm sm:text-base text-yellow-600">Checking location...</span>
              </div>
            )}
            {locationStatus === 'verified' && currentLocation && (
              <div className="text-sm sm:text-base text-green-600">
                ✅ Location verified! You are at the office location.
                {currentLocation.accuracy && (
                  <p className="text-xs sm:text-sm mt-1">GPS Accuracy: ±{Math.round(currentLocation.accuracy)}m</p>
                )}
              </div>
            )}
            {locationStatus === 'failed' && (
              <div className="text-sm sm:text-base text-red-600">
                ❌ Location verification failed. Please ensure you are at the office location.
              </div>
            )}
          </div>
        )}

        {/* Today's Attendance Status */}
        {todayAttendance && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100">
              Today's Attendance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Entry Time</p>
                <p className="text-base sm:text-lg font-semibold text-green-600">
                  {formatTime(todayAttendance.entry_time)}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Exit Time</p>
                <p className="text-base sm:text-lg font-semibold text-red-600">
                  {formatTime(todayAttendance.exit_time)}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
                <p className="text-base sm:text-lg font-semibold text-blue-600">
                  {formatHours(todayAttendance.total_hours)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Camera Section */}
        {employee && attendanceType !== 'completed' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100">
              {attendanceType === 'entry' ? 'Mark Entry' : 'Mark Exit'}
            </h2>

            <div className="space-y-3 sm:space-y-4">
              {/* Camera Controls */}
              {!stream && !capturedImage && (
                <button
                  onClick={startCamera}
                  className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white text-sm sm:text-base rounded-lg hover:bg-green-700"
                >
                  📷 Start Camera (Location will be checked)
                </button>
              )}

              {/* Video Preview */}
              {stream && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg border-2 sm:border-4 border-indigo-500 bg-gray-900"
                    style={{ transform: 'scaleX(-1)' }} // Mirror effect for selfie
                  />
                  {!videoRef.current?.videoWidth && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg">
                      <p className="text-white text-sm sm:text-base">Loading camera...</p>
                    </div>
                  )}
                  <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
                    <button
                      onClick={captureSelfie}
                      disabled={!videoRef.current?.videoWidth}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 text-white text-sm sm:text-base rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      📸 Capture Selfie
                    </button>
                    <button
                      onClick={stopCamera}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 text-white text-sm sm:text-base rounded-lg hover:bg-red-700"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Captured Image Preview */}
              {capturedImage && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="relative">
                    <img
                      src={capturedImage}
                      alt="Captured selfie"
                      className="w-full rounded-lg border-2 sm:border-4 border-green-500"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
                    <button
                      onClick={() => {
                        setCapturedImage(null);
                        startCamera();
                      }}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-600 text-white text-sm sm:text-base rounded-lg hover:bg-gray-700"
                    >
                      🔄 Retake
                    </button>
                    <button
                      onClick={markAttendance}
                      disabled={loading || (locationCheckEnabled && locationStatus !== 'verified' && locationStatus !== null)}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white text-sm sm:text-base rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Marking...' : `✅ Mark ${attendanceType === 'entry' ? 'Entry' : 'Exit'}`}
                    </button>
                  </div>
                  {locationCheckEnabled && locationStatus !== 'verified' && locationStatus !== null && (
                    <p className="text-xs sm:text-sm text-yellow-600 text-center">
                      ⚠️ Location will be verified again before marking attendance
                    </p>
                  )}
                  {!locationCheckEnabled && (
                    <p className="text-xs sm:text-sm text-gray-500 text-center">
                      ℹ️ Location check is disabled
                    </p>
                  )}
                </div>
              )}

              {/* Hidden canvas for image capture */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          </div>
        )}

        {employee && attendanceType === 'completed' && (
          <div className="bg-green-100 border border-green-400 text-green-700 p-3 sm:p-4 rounded-lg text-sm sm:text-base">
            ✅ Attendance completed for today. Entry and Exit both marked.
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EmployeeAttendance;
