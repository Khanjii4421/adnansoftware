-- ============================================
-- DATABASE DIAGNOSTIC QUERIES
-- Run this FIRST to identify the exact problem
-- ============================================

-- 1. Check which tables exist
SELECT 
    'TABLE EXISTS' as check_type,
    table_name,
    'YES' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'users', 'products', 'delivery_charges', 'delivery_charges_by_count',
    'inventory', 'orders', 'invoices', 'invoice_orders'
)
ORDER BY table_name;

-- 2. Check seller_id column in each table that should have it
SELECT 
    'SELLER_ID COLUMN CHECK' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t.table_name 
            AND column_name = 'seller_id'
        ) THEN 'EXISTS ✓'
        ELSE 'MISSING ✗'
    END as seller_id_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t.table_name 
            AND column_name = 'seller_id'
        ) THEN 
            (SELECT data_type || ' ' || 
             CASE WHEN is_nullable = 'NO' THEN 'NOT NULL' ELSE 'NULL' END
             FROM information_schema.columns 
             WHERE table_name = t.table_name AND column_name = 'seller_id')
        ELSE 'N/A'
    END as column_details
FROM (
    SELECT unnest(ARRAY[
        'products',
        'delivery_charges',
        'delivery_charges_by_count',
        'orders',
        'invoices'
    ]) as table_name
) t
ORDER BY table_name;

-- 3. Check all columns in delivery_charges table (most likely culprit)
SELECT 
    'DELIVERY_CHARGES COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'delivery_charges'
ORDER BY ordinal_position;

-- 4. Check row count in delivery_charges (to see if we can safely drop/recreate)
SELECT 
    'DELIVERY_CHARGES DATA' as check_type,
    COUNT(*) as row_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'EMPTY - Safe to drop/recreate'
        ELSE 'HAS DATA - Manual fix needed'
    END as recommendation
FROM delivery_charges;

-- 5. Check all columns in orders table
SELECT 
    'ORDERS COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- 6. Check all columns in invoices table
SELECT 
    'INVOICES COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- 7. Check all columns in products table
SELECT 
    'PRODUCTS COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- 8. Check existing indexes that reference seller_id
SELECT 
    'EXISTING INDEXES' as check_type,
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE indexdef LIKE '%seller_id%'
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- 9. Check for any views that might reference seller_id
SELECT 
    'VIEWS WITH SELLER_ID' as check_type,
    table_name as view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND view_definition LIKE '%seller_id%';

-- 10. Summary - Tables missing seller_id
SELECT 
    'SUMMARY - MISSING SELLER_ID' as check_type,
    table_name,
    'ACTION NEEDED: Add seller_id column or drop/recreate table' as recommendation
FROM (
    SELECT 'products' as table_name
    UNION SELECT 'delivery_charges'
    UNION SELECT 'delivery_charges_by_count'
    UNION SELECT 'orders'
    UNION SELECT 'invoices'
) t
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = t.table_name 
    AND column_name = 'seller_id'
)
AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = t.table_name
);

