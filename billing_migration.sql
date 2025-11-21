-- ============================================
-- Billing System Migration: Add bill_number to billing_entries
-- ============================================
-- This script adds bill_number column to billing_entries table
-- for the Generate Bill feature
-- ============================================

-- Step 1: Add bill_number column to billing_entries
ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS bill_number TEXT;

-- Step 2: Add payment_method column if it doesn't exist
ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('Cash', 'Pending', 'Bank Transfer', 'JazzCash', 'EasyPaisa'));

-- Step 3: Add meters column for product meters
ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS meters DECIMAL(10, 2);

-- Step 3.1: Add transaction_id column for bank transfers
ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Step 3.2: Add received_by column for cash payments
ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS received_by TEXT;

-- Step 4: Create index on bill_number for faster searches
CREATE INDEX IF NOT EXISTS idx_billing_entries_bill_number ON billing_entries(bill_number);

-- Step 5: Create index on customer_id and bill_number for customer bill queries
CREATE INDEX IF NOT EXISTS idx_billing_entries_customer_bill ON billing_entries(customer_id, bill_number);

-- Step 6: Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'billing_entries' 
AND column_name IN ('bill_number', 'payment_method', 'meters');

-- ============================================
-- Expected Result:
-- bill_number: TEXT, nullable
-- payment_method: TEXT with CHECK constraint
-- meters: DECIMAL(10, 2), nullable
-- ============================================

