-- ============================================
-- QUICK FIX: billing_customers Error
-- Run this if you get "Could not find table 'public.billing_customers'" error
-- ============================================

-- Option 1: Create billing_customers as a VIEW pointing to customers table
-- (This is the safest option - no data duplication)
CREATE OR REPLACE VIEW billing_customers AS
SELECT * FROM customers;

-- Grant permissions on the view (same as customers table)
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_customers TO service_role;

-- OR Option 2: Create billing_customers as a separate table
-- (Uncomment only if you really need a separate table)
/*
CREATE TABLE IF NOT EXISTS billing_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    cnic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copy existing data from customers to billing_customers (if needed)
INSERT INTO billing_customers (id, name, phone, address, city, cnic, created_at, updated_at)
SELECT id, name, phone, address, city, cnic, created_at, updated_at
FROM customers
ON CONFLICT (id) DO NOTHING;
*/

-- Reload Supabase schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this, verify the view exists:
-- SELECT * FROM billing_customers LIMIT 1;

-- ============================================
-- NOTES
-- ============================================
-- 1. VIEW is recommended (Option 1) - it's just an alias to customers table
-- 2. If you use VIEW, all operations on billing_customers will work on customers table
-- 3. After running, wait 10-30 seconds and refresh your Supabase dashboard
-- 4. Restart your backend server if needed
-- ============================================

