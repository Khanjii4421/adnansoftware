-- Migration: Add meters to products and update delivery_charges structure
-- Run this in your Supabase SQL Editor

-- Add meters column to products table (7 or 4 meters)
ALTER TABLE products ADD COLUMN IF NOT EXISTS meters INTEGER DEFAULT 7 CHECK (meters IN (4, 7));

-- Create new table for delivery charges per product count
CREATE TABLE IF NOT EXISTS delivery_charges_by_count (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_count INTEGER NOT NULL CHECK (product_count > 0),
    delivery_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seller_id, product_count)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_charges_by_count_seller_id ON delivery_charges_by_count(seller_id);
CREATE INDEX IF NOT EXISTS idx_delivery_charges_by_count_product_count ON delivery_charges_by_count(product_count);

-- Create trigger for updated_at
CREATE TRIGGER update_delivery_charges_by_count_updated_at BEFORE UPDATE ON delivery_charges_by_count
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE delivery_charges_by_count ENABLE ROW LEVEL SECURITY;

-- Migrate existing delivery_charges to delivery_charges_by_count for product_count = 1
INSERT INTO delivery_charges_by_count (seller_id, product_count, delivery_charge)
SELECT seller_id, 1, delivery_charge
FROM delivery_charges
ON CONFLICT (seller_id, product_count) DO NOTHING;

-- Note: You may want to add more product_count entries (2, 3, 4, etc.) manually through the UI
-- or run additional INSERT statements for common product counts

