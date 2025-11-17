-- ============================================
-- INVENTORY TABLE - COMPLETE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- INVENTORY TABLE (With seller_id)
-- ============================================
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    qty INTEGER DEFAULT 0,
    box_number TEXT,
    line_number TEXT,
    row_number TEXT,
    color TEXT,
    category TEXT,
    is_in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seller_id, product_code)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_inventory_seller_id ON inventory(seller_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_code ON inventory(product_code);
CREATE INDEX IF NOT EXISTS idx_inventory_seller_product ON inventory(seller_id, product_code);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);

-- ============================================
-- MIGRATION: Add seller_id if table exists without it
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE inventory ADD COLUMN seller_id UUID REFERENCES users(id) ON DELETE CASCADE;
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_inventory_seller_id ON inventory(seller_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_seller_product ON inventory(seller_id, product_code);
        
        -- Add unique constraint
        ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_seller_product_unique;
        ALTER TABLE inventory ADD CONSTRAINT inventory_seller_product_unique UNIQUE (seller_id, product_code);
        
        RAISE NOTICE 'Added seller_id column to inventory table';
    ELSE
        RAISE NOTICE 'seller_id column already exists in inventory table';
    END IF;
END $$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON inventory
    FOR EACH ROW 
    EXECUTE FUNCTION update_inventory_updated_at();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to auto-update is_in_stock based on quantity
CREATE OR REPLACE FUNCTION update_inventory_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_in_stock = (NEW.qty > 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stock status
DROP TRIGGER IF EXISTS update_inventory_stock_status ON inventory;
CREATE TRIGGER update_inventory_stock_status
    BEFORE INSERT OR UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_stock_status();

-- ============================================
-- VIEWS
-- ============================================

-- View for low stock items
CREATE OR REPLACE VIEW inventory_low_stock AS
SELECT 
    i.*,
    u.name as seller_name,
    u.email as seller_email
FROM inventory i
LEFT JOIN users u ON i.seller_id = u.id
WHERE i.qty <= 100 AND i.is_in_stock = true
ORDER BY i.qty ASC;

-- View for out of stock items
CREATE OR REPLACE VIEW inventory_out_of_stock AS
SELECT 
    i.*,
    u.name as seller_name,
    u.email as seller_email
FROM inventory i
LEFT JOIN users u ON i.seller_id = u.id
WHERE i.is_in_stock = false OR i.qty = 0
ORDER BY i.updated_at DESC;

-- ============================================
-- DONE!
-- ============================================
-- This schema creates/updates the inventory table with:
-- 1. seller_id column (required for seller-specific inventory)
-- 2. All necessary indexes for performance
-- 3. Unique constraint on (seller_id, product_code)
-- 4. Auto-update triggers for updated_at and is_in_stock
-- 5. Helper views for low stock and out of stock items

