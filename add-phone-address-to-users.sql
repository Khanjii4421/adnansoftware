-- Migration: Add phone and address fields to users table
-- Run this in your Supabase SQL Editor

-- Add phone column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add address column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

