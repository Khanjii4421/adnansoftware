-- Inventory Management Migration
-- Add seller_id to inventory table for seller-specific inventory management
-- Run this in your Supabase SQL Editor

-- Add seller_id column to inventory table if it doesn't exist
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_seller_id ON inventory(seller_id);
CREATE INDEX IF NOT EXISTS idx_inventory_seller_product ON inventory(seller_id, product_code);

-- Update existing inventory records (optional - set to a default seller or NULL)
-- You may want to manually update existing records based on your data
-- UPDATE inventory SET seller_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1) WHERE seller_id IS NULL;

-- Add constraint to ensure product_code and seller_id combination is unique
-- This ensures each seller has separate inventory for the same product code
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_seller_product_unique;
ALTER TABLE inventory ADD CONSTRAINT inventory_seller_product_unique UNIQUE (seller_id, product_code);

-- Update the updated_at trigger if it exists
-- (Assuming you have a trigger function already)

