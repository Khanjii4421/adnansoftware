-- Migration: Add dc_manual field to users table
-- Run this in your Supabase SQL Editor

-- Add dc_manual column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS dc_manual BOOLEAN DEFAULT false;

-- Update existing sellers: Set dc_manual=true for sellers with "ahsan" in name (for backward compatibility)
UPDATE users 
SET dc_manual = true 
WHERE LOWER(name) LIKE '%ahsan%' AND role = 'seller';

-- Add comment to column
COMMENT ON COLUMN users.dc_manual IS 'If true, seller wants to enter Delivery Charge manually. If false, DC is auto-calculated from delivery_charges table.';

