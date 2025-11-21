-- ============================================
-- Add discount and meter_price columns to billing_entries
-- ============================================
-- This script adds discount and meter_price columns to billing_entries table
-- for the Generate Bill feature with discount functionality
-- ============================================

-- Step 1: Add discount column to billing_entries
-- Discount is a monetary value, using DECIMAL(15, 2) to match order_total, credit, debit
-- NULLable to allow for entries without discount
ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS discount DECIMAL(15, 2);

-- Step 2: Add meter_price column to billing_entries if it doesn't exist
-- Meter price is the price per meter, using DECIMAL(10, 2) to match meters column
ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS meter_price DECIMAL(10, 2);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN billing_entries.discount IS 'Discount amount applied to the order. Subtracted from (meter_price * meters) to calculate order_total';
COMMENT ON COLUMN billing_entries.meter_price IS 'Price per meter for the product. Used to calculate order_total: (meter_price * meters) - discount';

-- Step 4: Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'billing_entries' 
AND column_name IN ('discount', 'meter_price', 'meters')
ORDER BY column_name;

-- ============================================
-- Expected Result:
-- discount: DECIMAL(15, 2), nullable (no default)
-- meter_price: DECIMAL(10, 2), nullable
-- meters: DECIMAL(10, 2), nullable (if exists from previous migration)
-- ============================================
-- 
-- How to run this migration:
-- 1. Open your Supabase project dashboard
-- 2. Go to SQL Editor
-- 3. Copy and paste the entire contents of this file
-- 4. Click "Run" to execute the migration
-- 5. Verify the columns were added by checking the verification query results
-- ============================================

