-- ============================================
-- Supabase Migration: Fix shipper_price column
-- ============================================
-- This script will:
-- 1. Remove default value (0) from shipper_price column
-- 2. Allow NULL values in shipper_price column
-- 3. Update existing NULL values to be properly set
-- ============================================

-- Step 1: Remove default value from shipper_price column
-- This ensures no automatic 0 is set when creating new orders
ALTER TABLE orders 
ALTER COLUMN shipper_price DROP DEFAULT;

-- Step 2: Ensure NULL values are allowed (if not already)
-- This allows orders to be created without shipper_price
ALTER TABLE orders 
ALTER COLUMN shipper_price DROP NOT NULL;

-- Step 3: Update any existing 0 values to NULL (optional)
-- Only if you want to convert existing 0 values to NULL
-- Uncomment the line below if needed:
-- UPDATE orders SET shipper_price = NULL WHERE shipper_price = 0;

-- Step 4: Verify the changes
-- Check column properties
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders' 
AND column_name = 'shipper_price';

-- ============================================
-- Expected Result:
-- column_name: shipper_price
-- data_type: numeric (or double precision)
-- is_nullable: YES
-- column_default: NULL (or empty)
-- ============================================

