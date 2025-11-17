-- Migration: Add notes field to orders table
-- Run this in your Supabase SQL Editor if the notes field doesn't exist

-- Add notes column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for seller_reference_number for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_orders_seller_reference_number ON orders(seller_reference_number);

