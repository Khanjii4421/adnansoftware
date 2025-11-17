-- Add profit_on_next_bill flag to orders table for return management
-- Run this in your Supabase SQL Editor

ALTER TABLE orders ADD COLUMN IF NOT EXISTS profit_on_next_bill BOOLEAN DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_profit_on_next_bill ON orders(profit_on_next_bill);

-- Update existing return orders to not have profit on next bill by default
UPDATE orders SET profit_on_next_bill = false WHERE profit_on_next_bill IS NULL;

