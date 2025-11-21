-- Migration: Create delivery_charges_by_count table and add return_charge column
-- Run this in your Supabase SQL Editor

-- Create delivery_charges_by_count table if it doesn't exist
CREATE TABLE IF NOT EXISTS delivery_charges_by_count (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_count INTEGER NOT NULL,
    delivery_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
    return_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seller_id, product_count)
);

-- Add return_charge column if it doesn't exist (for existing tables)
ALTER TABLE delivery_charges_by_count 
ADD COLUMN IF NOT EXISTS return_charge DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Update existing rows to have return_charge = 0 if they don't have it set
UPDATE delivery_charges_by_count 
SET return_charge = 0 
WHERE return_charge IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_charges_by_count_seller_id ON delivery_charges_by_count(seller_id);
CREATE INDEX IF NOT EXISTS idx_delivery_charges_by_count_product_count ON delivery_charges_by_count(product_count);

-- Create trigger for updated_at
CREATE TRIGGER update_delivery_charges_by_count_updated_at 
BEFORE UPDATE ON delivery_charges_by_count
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

