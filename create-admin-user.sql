-- ============================================
-- Create Admin User for Login
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Generate Password Hash First
-- Terminal mein run karo:
-- node -e "const bcrypt=require('bcryptjs');bcrypt.hash('admin123',10).then(h=>console.log(h))"
-- Output copy karo aur neeche paste karo

-- Step 2: Create Admin User
-- Replace 'YOUR_PASSWORD_HASH_HERE' with generated hash

INSERT INTO users (email, password, name, role, is_active)
VALUES (
  'admin@example.com',
  'YOUR_PASSWORD_HASH_HERE', -- Replace with bcrypt hash from Step 1
  'Admin User',
  'admin',
  true
)
ON CONFLICT (email) DO UPDATE
SET 
  password = EXCLUDED.password,
  is_active = true,
  updated_at = NOW();

-- ============================================
-- Verify User Created
-- ============================================

SELECT id, email, name, role, is_active, created_at
FROM users
WHERE email = 'admin@example.com';

-- ============================================
-- Test Credentials
-- ============================================
-- Email: admin@example.com
-- Password: admin123 (ya jo password use kiya)
-- ============================================

