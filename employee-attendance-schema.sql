-- ============================================
-- EMPLOYEE ATTENDANCE SYSTEM - Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT,
    department TEXT,
    profile_image_url TEXT, -- URL to stored profile image
    profile_image_base64 TEXT, -- Base64 encoded profile image for matching
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ATTENDANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE,
    exit_time TIMESTAMP WITH TIME ZONE,
    entry_image_url TEXT, -- URL to stored entry selfie
    entry_image_base64 TEXT, -- Base64 encoded entry image
    exit_image_url TEXT, -- URL to stored exit selfie
    exit_image_base64 TEXT, -- Base64 encoded exit image
    total_hours DECIMAL(10, 2) DEFAULT 0, -- Calculated hours worked
    status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, attendance_date);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate hours worked
CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.entry_time IS NOT NULL AND NEW.exit_time IS NOT NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.exit_time - NEW.entry_time)) / 3600.0;
    ELSIF NEW.entry_time IS NOT NULL AND NEW.exit_time IS NULL THEN
        NEW.total_hours = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to auto-update updated_at for employees
DROP TRIGGER IF EXISTS trigger_update_employees_updated_at ON employees;
CREATE TRIGGER trigger_update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at for attendance
DROP TRIGGER IF EXISTS trigger_update_attendance_updated_at ON attendance;
CREATE TRIGGER trigger_update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to calculate hours when exit_time is set
DROP TRIGGER IF EXISTS trigger_calculate_attendance_hours ON attendance;
CREATE TRIGGER trigger_calculate_attendance_hours
    BEFORE INSERT OR UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION calculate_attendance_hours();

-- ============================================
-- SAMPLE DATA (Optional - Remove if not needed)
-- ============================================
-- You can add sample employees here if needed

