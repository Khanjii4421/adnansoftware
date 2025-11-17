-- ============================================
-- REMOVE LEDGER ORDERS FROM DATABASE
-- Run this in Supabase SQL Editor to remove all order-related tables and objects
-- ============================================

-- Step 1: Drop the trigger that updates order balance
DROP TRIGGER IF EXISTS trigger_update_order_balance ON transactions;

-- Step 2: Drop the function that updates order balance
DROP FUNCTION IF EXISTS update_order_remaining_balance();

-- Step 3: Drop the view for order payment summary
DROP VIEW IF EXISTS order_payment_summary;

-- Step 4: Remove order_id foreign key constraint from transactions table
-- First, set all order_id to NULL in transactions
UPDATE transactions SET order_id = NULL WHERE order_id IS NOT NULL;

-- Step 5: Drop the foreign key constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_order_id_fkey;

-- Step 6: Drop the ledger_orders table (this will also drop all indexes)
DROP TABLE IF EXISTS ledger_orders CASCADE;

-- Step 7: Remove order_id column from transactions table (optional - you can keep it as nullable)
-- ALTER TABLE transactions DROP COLUMN IF EXISTS order_id;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify everything is removed:

-- Check if table exists (should return 0 rows):
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name = 'ledger_orders';

-- Check if trigger exists (should return 0 rows):
-- SELECT trigger_name FROM information_schema.triggers 
-- WHERE trigger_name = 'trigger_update_order_balance';

-- Check if function exists (should return 0 rows):
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_name = 'update_order_remaining_balance';

-- Check if view exists (should return 0 rows):
-- SELECT table_name FROM information_schema.views 
-- WHERE table_name = 'order_payment_summary';

-- ============================================
-- DONE!
-- ============================================
