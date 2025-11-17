-- ============================================
-- DELETE ALL TABLES - BULK DROP
-- Run this to delete ALL existing tables before running complete-database-schema.sql
-- WARNING: This will DELETE ALL DATA! Use with caution!
-- ============================================

-- Disable foreign key checks temporarily (PostgreSQL doesn't have this, so we use CASCADE)
-- CASCADE will automatically drop all dependent objects (views, triggers, functions, etc.)

-- Drop all tables in correct order (CASCADE handles dependencies)
DROP TABLE IF EXISTS billing_entries CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS ledger_orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

DROP TABLE IF EXISTS invoice_orders CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS delivery_charges_by_count CASCADE;
DROP TABLE IF EXISTS delivery_charges CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop all views
DROP VIEW IF EXISTS customer_balances CASCADE;
DROP VIEW IF EXISTS daily_transaction_summary CASCADE;
DROP VIEW IF EXISTS billing_customers CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS recalculate_all_balances() CASCADE;
DROP FUNCTION IF EXISTS get_transaction_stats(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS calculate_customer_balance(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop all sequences (if any)
DROP SEQUENCE IF EXISTS customers_id_seq CASCADE;
DROP SEQUENCE IF EXISTS orders_id_seq CASCADE;
DROP SEQUENCE IF EXISTS transactions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS billing_entries_id_seq CASCADE;

-- Drop all types (if any custom types exist)
-- DROP TYPE IF EXISTS order_status_type CASCADE;
-- DROP TYPE IF EXISTS payment_method_type CASCADE;

-- ============================================
-- VERIFICATION - Check what's left
-- ============================================
-- After running, verify all tables are deleted:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_type = 'BASE TABLE'
-- ORDER BY table_name;

-- ============================================
-- NEXT STEPS
-- ============================================
-- 1. After running this file, wait 5-10 seconds
-- 2. Run complete-database-schema.sql to create fresh tables
-- 3. All your data will be gone - make sure you have backups if needed!
-- ============================================

