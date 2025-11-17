-- ============================================
-- FIX: Add seller_id to inventory table
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add seller_id column if it doesn't exist
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_seller_id ON inventory(seller_id);
CREATE INDEX IF NOT EXISTS idx_inventory_seller_product ON inventory(seller_id, product_code);

-- Step 3: Drop old unique constraint if exists (without seller_id)
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_product_code_key;
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_product_code_key1;

-- Step 4: Add new unique constraint (seller_id + product_code)
-- This allows same product code for different sellers
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_seller_product_unique;
ALTER TABLE inventory ADD CONSTRAINT inventory_seller_product_unique UNIQUE (seller_id, product_code);

-- Step 5: Make seller_id NOT NULL (after updating existing records)
-- First, set a default seller_id for existing records (optional)
-- UPDATE inventory SET seller_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1) WHERE seller_id IS NULL;

-- Or set to NULL for existing records (if you want to handle them manually)
-- UPDATE inventory SET seller_id = NULL WHERE seller_id IS NULL;

-- Done! Now seller_id column exists in inventory table

