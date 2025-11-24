# Employee Attendance System - Setup Guide

## Overview

This system allows employees to mark their daily attendance using live selfie verification. The system includes:

- **Employee Management**: Admin can add/edit/delete employees with profile images
- **Live Selfie Attendance**: Employees can mark entry/exit with real-time camera capture
- **Image Matching**: System verifies employee identity by matching selfie with profile image
- **Hours Calculation**: Automatic calculation of working hours
- **Attendance View**: View attendance records for individual or all employees

## Database Setup

### Step 1: Run Database Schema

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Open the file `employee-attendance-schema.sql` from your project
5. Copy all the SQL code
6. Paste it into the SQL Editor
7. Click **"Run"** or press `Ctrl+Enter`
8. You should see "Success. No rows returned"

### Step 2: Verify Tables Created

The following tables should be created:
- `employees` - Stores employee information and profile images
- `attendance` - Stores daily attendance records with entry/exit times and images

## Features

### 1. Employee Management (Admin Only)

**Location**: `/employee-management`

**Features**:
- Add new employees with employee code, name, email, phone, position, department
- Capture profile image using live camera (for attendance verification)
- Edit employee information
- Activate/deactivate employees
- Delete employees

**How to Use**:
1. Navigate to "Employee Management" from admin menu
2. Click "Add Employee"
3. Fill in employee details
4. Click "Capture Profile Image" to take a photo (this will be used for attendance verification)
5. Click "Create Employee"

### 2. Employee Attendance (All Users)

**Location**: `/employee-attendance`

**Features**:
- Search employee by code
- Mark entry with live selfie
- Mark exit with live selfie
- View today's attendance status
- Automatic hours calculation

**How to Use**:
1. Navigate to "Employee Attendance"
2. Enter employee code and click "Search"
3. Click "Start Camera" to activate front camera
4. Click "Capture Selfie" to take photo
5. Click "Mark Entry" or "Mark Exit"
6. System will verify image match and mark attendance

**Image Verification**:
- System compares captured selfie with employee's profile image
- If images match, attendance is marked successfully
- If images don't match, attendance is rejected

### 3. Attendance View (All Users)

**Location**: `/attendance-view`

**Features**:
- View attendance for all employees or filter by specific employee
- Filter by date range
- View entry/exit times and total hours
- See today's summary (total employees, present, absent)
- View statistics (total records, total hours, average hours/day)

**How to Use**:
1. Navigate to "Attendance View"
2. Select employee (or "All Employees")
3. Select start and end date
4. Click "Search"
5. View attendance records in table format

## API Endpoints

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/code/:code` - Get employee by code
- `POST /api/employees` - Create employee (Admin only)
- `PUT /api/employees/:id` - Update employee (Admin only)
- `DELETE /api/employees/:id` - Delete employee (Admin only)

### Attendance
- `POST /api/attendance/mark` - Mark attendance (entry/exit)
- `GET /api/attendance` - Get attendance records (with filters)
- `GET /api/attendance/summary` - Get today's attendance summary

## Image Matching

The system uses a basic image comparison algorithm. For production use, consider:

1. **Face Recognition Libraries**: 
   - `face-api.js` (JavaScript)
   - `@tensorflow-models/face-landmarks-detection`
   - `face-recognition` (Node.js)

2. **Cloud Services**:
   - AWS Rekognition
   - Google Cloud Vision API
   - Azure Face API

3. **Current Implementation**:
   - Basic image hash comparison
   - Simple similarity scoring
   - Works for basic verification but may need enhancement for production

## Database Schema

### Employees Table
- `id` (UUID) - Primary key
- `employee_code` (TEXT) - Unique employee code
- `name` (TEXT) - Employee name
- `email` (TEXT) - Email address
- `phone` (TEXT) - Phone number
- `position` (TEXT) - Job position
- `department` (TEXT) - Department
- `profile_image_base64` (TEXT) - Base64 encoded profile image
- `is_active` (BOOLEAN) - Active status
- `created_at`, `updated_at` - Timestamps

### Attendance Table
- `id` (UUID) - Primary key
- `employee_id` (UUID) - Foreign key to employees
- `attendance_date` (DATE) - Date of attendance
- `entry_time` (TIMESTAMP) - Entry time
- `exit_time` (TIMESTAMP) - Exit time
- `entry_image_base64` (TEXT) - Base64 encoded entry selfie
- `exit_image_base64` (TEXT) - Base64 encoded exit selfie
- `total_hours` (DECIMAL) - Calculated hours worked
- `status` (TEXT) - present/absent/late/half_day
- `notes` (TEXT) - Optional notes
- `created_at`, `updated_at` - Timestamps

## Important Notes

1. **Camera Permissions**: Users must allow camera access in browser
2. **HTTPS Required**: Camera access requires HTTPS in production
3. **Image Storage**: Images are stored as base64 in database (consider using file storage for production)
4. **Image Matching**: Current implementation is basic - enhance for production use
5. **Hours Calculation**: Automatically calculated when exit time is set
6. **Unique Constraint**: One attendance record per employee per day

## Troubleshooting

### Camera Not Working
- Check browser permissions
- Ensure HTTPS is enabled (required for camera access)
- Try different browser (Chrome, Firefox, Edge)

### Image Matching Fails
- Ensure profile image is captured clearly
- Ensure selfie is taken in good lighting
- Consider enhancing image matching algorithm

### Database Errors
- Verify schema is run correctly
- Check Supabase connection
- Verify environment variables are set

## Future Enhancements

1. **Advanced Face Recognition**: Implement proper face recognition
2. **File Storage**: Store images in cloud storage instead of database
3. **Geolocation**: Add location verification
4. **Reports**: Generate attendance reports (PDF/Excel)
5. **Notifications**: Email/SMS notifications for attendance
6. **Leave Management**: Add leave request and approval system
7. **Shift Management**: Support multiple shifts
8. **Overtime Calculation**: Automatic overtime calculation

