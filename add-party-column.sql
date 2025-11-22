-- ============================================
-- Add Party Column to Customers Table
-- ============================================
-- Run this in your Supabase SQL Editor

-- Add party column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS party TEXT;

-- Create index for faster party filtering
CREATE INDEX IF NOT EXISTS idx_customers_party ON customers(party);

-- ============================================
-- VERIFICATION
-- ============================================
-- After running, verify the column exists:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'customers' AND column_name = 'party';

