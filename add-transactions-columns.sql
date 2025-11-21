-- ============================================
-- Migration: Add Missing Columns to Transactions Table
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add order_no column (for storing order number directly in transaction)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS order_no TEXT;

-- Add product column (for storing product name)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS product TEXT;

-- Add product_description column (for storing product description)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS product_description TEXT;

-- Add total_amount column (for storing total order amount)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15, 2);

-- Add paid_amount column (for storing paid amount)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15, 2);

-- Create index on order_no for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_order_no ON transactions(order_no);

-- Create index on product for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product);

-- Add comments for documentation
COMMENT ON COLUMN transactions.order_no IS 'Order number (can be manually entered or generated)';
COMMENT ON COLUMN transactions.product IS 'Product name associated with this transaction';
COMMENT ON COLUMN transactions.product_description IS 'Detailed product description';
COMMENT ON COLUMN transactions.total_amount IS 'Total order amount';
COMMENT ON COLUMN transactions.paid_amount IS 'Amount paid by customer';

-- ============================================
-- Verification Query
-- Run this to verify columns were added
-- ============================================
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'transactions' 
-- ORDER BY ordinal_position;

