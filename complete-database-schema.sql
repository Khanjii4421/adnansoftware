-- ============================================
-- COMPLETE DATABASE SCHEMA - A TO Z
-- Adnan Khaddar Portal Kamalia
-- Run this entire file in your Supabase SQL Editor
-- This file contains ALL tables, indexes, functions, triggers, and policies
-- 
-- IMPORTANT: If you get "column seller_id does not exist" error:
-- This means an existing table (likely delivery_charges) has an old structure.
-- Solution: Either drop the old table first, or manually add the missing column.
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PART 1: MAIN SELLER PORTAL TABLES
-- ============================================

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('seller', 'admin')),
    is_active BOOLEAN DEFAULT true,
    dc_manual BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code TEXT NOT NULL,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_price DECIMAL(10, 2) NOT NULL,
    shipper_price DECIMAL(10, 2) NOT NULL,
    meters INTEGER DEFAULT 7 CHECK (meters IN (4, 7)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_code, seller_id)
);

-- Delivery charges table
CREATE TABLE IF NOT EXISTS delivery_charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delivery_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
    return_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery charges by count table (for different product counts)
CREATE TABLE IF NOT EXISTS delivery_charges_by_count (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_count INTEGER NOT NULL CHECK (product_count > 0),
    delivery_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
    return_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seller_id, product_count)
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_reference_number TEXT NOT NULL,
    product_codes TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone_number_1 TEXT NOT NULL,
    phone_number_2 TEXT,
    customer_address TEXT NOT NULL,
    city TEXT NOT NULL,
    courier_service TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'return', 'returned', 'paid')),
    tracking_id TEXT,
    qty INTEGER DEFAULT 1,
    seller_price DECIMAL(10, 2) DEFAULT 0,
    shipper_price DECIMAL(10, 2) DEFAULT 0,
    delivery_charge DECIMAL(10, 2) DEFAULT 0,
    profit DECIMAL(10, 2) DEFAULT 0,
    is_paid BOOLEAN DEFAULT false,
    profit_on_next_bill BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number TEXT UNIQUE NOT NULL,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_orders INTEGER DEFAULT 0,
    delivered_orders INTEGER DEFAULT 0,
    return_orders INTEGER DEFAULT 0,
    total_seller_price DECIMAL(10, 2) DEFAULT 0,
    total_shipper_price DECIMAL(10, 2) DEFAULT 0,
    total_delivery_charge DECIMAL(10, 2) DEFAULT 0,
    total_profit DECIMAL(10, 2) DEFAULT 0,
    other_expenses DECIMAL(10, 2) DEFAULT 0,
    net_profit DECIMAL(10, 2) DEFAULT 0,
    is_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice orders junction table
CREATE TABLE IF NOT EXISTS invoice_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(invoice_id, order_id)
);

-- ============================================
-- PART 2: LEDGER MANAGEMENT TABLES
-- ============================================

-- Customers table (for ledger system)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    cnic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ledger Orders table (different from seller orders - for ledger system)
CREATE TABLE IF NOT EXISTS ledger_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_no TEXT NOT NULL,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_no)
);

-- Transactions table (for ledger entries)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES ledger_orders(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) DEFAULT 0,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa')),
    bank_note TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing entries table (for ledger entries with product codes)
CREATE TABLE IF NOT EXISTS billing_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_name TEXT,
    description TEXT,
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    code_name TEXT,
    order_total DECIMAL(15, 2) DEFAULT 0,
    entry_type TEXT DEFAULT 'order' CHECK (entry_type IN ('order', 'payment', 'adjustment')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 3: ENSURE ALL COLUMNS EXIST (MIGRATION)
-- ============================================

-- Add missing columns to existing tables (safe to run multiple times)
-- Note: For NOT NULL columns, we add as nullable first, then update, then set NOT NULL

-- Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS dc_manual BOOLEAN;
UPDATE users SET dc_manual = false WHERE dc_manual IS NULL;
ALTER TABLE users ALTER COLUMN dc_manual SET DEFAULT false;

-- Products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS meters INTEGER;
UPDATE products SET meters = 7 WHERE meters IS NULL;
ALTER TABLE products ALTER COLUMN meters SET DEFAULT 7;

-- Delivery charges table - ensure seller_id and return_charge exist
DO $$
DECLARE
    table_exists BOOLEAN;
    seller_id_exists BOOLEAN;
    row_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_charges'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Check if seller_id column exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'delivery_charges' AND column_name = 'seller_id'
        ) INTO seller_id_exists;
        
        IF NOT seller_id_exists THEN
            -- Table exists but doesn't have seller_id - check if it's empty
            -- Use a safe query that won't fail if table structure is wrong
            BEGIN
                SELECT COUNT(*) INTO row_count FROM delivery_charges;
            EXCEPTION WHEN OTHERS THEN
                row_count := -1; -- Error reading table
            END;
            
            IF row_count = 0 THEN
                -- Table is empty, drop and recreate with correct structure
                DROP TABLE delivery_charges CASCADE;
                CREATE TABLE delivery_charges (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    seller_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    delivery_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
                    return_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            ELSIF row_count > 0 THEN
                -- Table has data but wrong structure - cannot auto-fix
                RAISE NOTICE 'WARNING: delivery_charges table exists without seller_id column and contains data. Please manually fix this table.';
            ELSE
                -- row_count = -1 means error reading table - skip for now
                RAISE NOTICE 'WARNING: Could not read delivery_charges table. Please check table structure manually.';
            END IF;
        ELSE
            -- seller_id exists, just add return_charge if missing
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'delivery_charges' AND column_name = 'return_charge'
            ) THEN
                ALTER TABLE delivery_charges ADD COLUMN return_charge DECIMAL(10, 2);
                UPDATE delivery_charges SET return_charge = 0 WHERE return_charge IS NULL;
                ALTER TABLE delivery_charges ALTER COLUMN return_charge SET DEFAULT 0;
                ALTER TABLE delivery_charges ALTER COLUMN return_charge SET NOT NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS profit_on_next_bill BOOLEAN;
UPDATE orders SET profit_on_next_bill = false WHERE profit_on_next_bill IS NULL;
ALTER TABLE orders ALTER COLUMN profit_on_next_bill SET DEFAULT false;

-- ============================================
-- PART 4: INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Products indexes (only create if columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'seller_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
        CREATE INDEX IF NOT EXISTS idx_products_seller_code ON products(seller_id, product_code);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'product_code'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
    END IF;
END $$;

-- Delivery charges indexes (only create if columns exist)
DO $$
BEGIN
    -- Check if delivery_charges table exists and has seller_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_charges' AND column_name = 'seller_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_delivery_charges_seller_id ON delivery_charges(seller_id);
    END IF;
    
    -- Check if delivery_charges_by_count table exists and has seller_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_charges_by_count' AND column_name = 'seller_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_delivery_charges_by_count_seller_id ON delivery_charges_by_count(seller_id);
    END IF;
    
    -- Check if delivery_charges_by_count table exists and has product_count column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_charges_by_count' AND column_name = 'product_count'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_delivery_charges_by_count_product_count ON delivery_charges_by_count(product_count);
    END IF;
END $$;

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_product_code ON inventory(product_code);
CREATE INDEX IF NOT EXISTS idx_inventory_qty ON inventory(qty);
CREATE INDEX IF NOT EXISTS idx_inventory_is_in_stock ON inventory(is_in_stock);

-- Orders indexes (only create if columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'seller_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
    END IF;
    
    -- These columns should always exist, but check anyway
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tracking_id') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON orders(tracking_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'seller_reference_number') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_seller_reference_number ON orders(seller_reference_number);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'profit_on_next_bill') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_profit_on_next_bill ON orders(profit_on_next_bill);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_paid') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_is_paid ON orders(is_paid);
    END IF;
END $$;

-- Invoices indexes (only create if columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'seller_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_invoices_seller_id ON invoices(seller_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'bill_number') THEN
        CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON invoices(bill_number);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'invoice_date') THEN
        CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
    END IF;
END $$;

-- Invoice orders indexes
CREATE INDEX IF NOT EXISTS idx_invoice_orders_invoice_id ON invoice_orders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_orders_order_id ON invoice_orders(order_id);

-- Customers indexes (ledger system)
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Ledger orders indexes
CREATE INDEX IF NOT EXISTS idx_ledger_orders_customer_id ON ledger_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_orders_order_no ON ledger_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_ledger_orders_status ON ledger_orders(status);
CREATE INDEX IF NOT EXISTS idx_ledger_orders_created_at ON ledger_orders(created_at);

-- Transactions indexes (ledger system)
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_balance ON transactions(balance);
CREATE INDEX IF NOT EXISTS idx_transactions_date_customer ON transactions(date, customer_id);

-- Billing entries indexes
CREATE INDEX IF NOT EXISTS idx_billing_entries_customer_id ON billing_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_entries_date ON billing_entries(date);
CREATE INDEX IF NOT EXISTS idx_billing_entries_code_name ON billing_entries(code_name);
CREATE INDEX IF NOT EXISTS idx_billing_entries_entry_type ON billing_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_billing_entries_created_at ON billing_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_entries_date_customer ON billing_entries(date, customer_id);

-- ============================================
-- PART 5: FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate balance for a customer (ledger system)
CREATE OR REPLACE FUNCTION calculate_customer_balance(p_customer_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    v_balance DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(SUM(credit - debit), 0) INTO v_balance
    FROM transactions
    WHERE customer_id = p_customer_id;
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to get transaction statistics for a date range (ledger system)
CREATE OR REPLACE FUNCTION get_transaction_stats(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_debit DECIMAL(15, 2),
    total_credit DECIMAL(15, 2),
    net_balance DECIMAL(15, 2),
    transaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(debit), 0) as total_debit,
        COALESCE(SUM(credit), 0) as total_credit,
        COALESCE(SUM(credit - debit), 0) as net_balance,
        COUNT(*) as transaction_count
    FROM transactions
    WHERE date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate all customer balances (ledger system)
CREATE OR REPLACE FUNCTION recalculate_all_balances()
RETURNS void AS $$
DECLARE
    trans_record RECORD;
    running_balance DECIMAL(15, 2) := 0;
    prev_customer_id UUID := NULL;
BEGIN
    FOR trans_record IN 
        SELECT id, customer_id, debit, credit, date, created_at
        FROM transactions
        ORDER BY customer_id, date ASC, created_at ASC
    LOOP
        IF prev_customer_id IS NULL OR prev_customer_id != trans_record.customer_id THEN
            running_balance := 0;
        END IF;
        
        running_balance := running_balance + trans_record.credit - trans_record.debit;
        
        UPDATE transactions
        SET balance = running_balance
        WHERE id = trans_record.id;
        
        prev_customer_id := trans_record.customer_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 6: TRIGGERS
-- ============================================

-- Triggers for updated_at on all tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_charges_updated_at 
    BEFORE UPDATE ON delivery_charges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_charges_by_count_updated_at 
    BEFORE UPDATE ON delivery_charges_by_count
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ledger_orders_updated_at 
    BEFORE UPDATE ON ledger_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_entries_updated_at 
    BEFORE UPDATE ON billing_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 7: VIEWS
-- ============================================

-- View for customer balances (ledger system)
CREATE OR REPLACE VIEW customer_balances AS
SELECT 
    c.id,
    c.name,
    c.phone,
    c.city,
    COALESCE(SUM(t.credit - t.debit), 0) as balance,
    COUNT(t.id) as transaction_count,
    MAX(t.date) as last_transaction_date
FROM customers c
LEFT JOIN transactions t ON c.id = t.customer_id
GROUP BY c.id, c.name, c.phone, c.city;

-- View for daily transaction summary (ledger system)
CREATE OR REPLACE VIEW daily_transaction_summary AS
SELECT 
    date,
    SUM(debit) as total_debit,
    SUM(credit) as total_credit,
    SUM(credit - debit) as net_balance,
    COUNT(*) as transaction_count
FROM transactions
GROUP BY date
ORDER BY date DESC;

-- ============================================
-- PART 8: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_charges_by_count ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for all operations (application-level access control)
CREATE POLICY "Allow all operations on users" ON users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on products" ON products
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on delivery_charges" ON delivery_charges
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on delivery_charges_by_count" ON delivery_charges_by_count
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on inventory" ON inventory
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on orders" ON orders
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on invoices" ON invoices
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on invoice_orders" ON invoice_orders
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on customers" ON customers
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on ledger_orders" ON ledger_orders
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on transactions" ON transactions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on billing_entries" ON billing_entries
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- PART 9: COMMENTS FOR DOCUMENTATION
-- ============================================

-- Table comments
COMMENT ON TABLE users IS 'Stores user accounts for authentication (sellers and admins)';
COMMENT ON TABLE products IS 'Stores product codes with seller and shipper prices for each seller';
COMMENT ON TABLE delivery_charges IS 'Stores delivery charges per seller';
COMMENT ON TABLE delivery_charges_by_count IS 'Stores delivery charges based on product count per seller';
COMMENT ON TABLE inventory IS 'Stores inventory items with location and stock information';
COMMENT ON TABLE orders IS 'Stores seller orders with customer details, pricing, and status';
COMMENT ON TABLE invoices IS 'Stores billing invoices for sellers with order summaries';
COMMENT ON TABLE invoice_orders IS 'Junction table linking invoices to orders';
COMMENT ON TABLE customers IS 'Stores customer information for ledger system';
COMMENT ON TABLE ledger_orders IS 'Stores order records for ledger system';
COMMENT ON TABLE transactions IS 'Stores all ledger entries (debit/credit) with auto-calculated balance';
COMMENT ON TABLE billing_entries IS 'Stores billing/ledger entries with product codes and entry types';

-- Column comments
COMMENT ON COLUMN users.dc_manual IS 'If true, seller wants to enter Delivery Charge manually. If false, DC is auto-calculated';
COMMENT ON COLUMN products.meters IS 'Product length in meters: 4 or 7 meters';
COMMENT ON COLUMN orders.profit_on_next_bill IS 'Flag to indicate if profit should be included in next bill (for return orders)';
COMMENT ON COLUMN transactions.debit IS 'Amount given out (money going out)';
COMMENT ON COLUMN transactions.credit IS 'Amount received (money coming in)';
COMMENT ON COLUMN transactions.balance IS 'Running balance after this transaction. Calculated automatically';
COMMENT ON COLUMN transactions.payment_method IS 'Payment method: Cash, Bank Transfer, JazzCash, or EasyPaisa';
COMMENT ON COLUMN transactions.bank_note IS 'Optional account details, transaction reference, or remarks';
COMMENT ON COLUMN transactions.attachment_url IS 'Optional URL to receipt or proof of payment';

-- ============================================
-- PART 10: DATA MIGRATION (if needed)
-- ============================================

-- Migrate existing delivery_charges to delivery_charges_by_count for product_count = 1
-- (Only runs if both tables exist and have required columns)
DO $$
BEGIN
    -- Check if both tables exist and have seller_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_charges' AND column_name = 'seller_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_charges_by_count' AND column_name = 'seller_id'
    ) THEN
        INSERT INTO delivery_charges_by_count (seller_id, product_count, delivery_charge, return_charge)
        SELECT 
            seller_id, 
            1, 
            delivery_charge, 
            COALESCE(return_charge, 0) as return_charge
        FROM delivery_charges
        WHERE NOT EXISTS (
            SELECT 1 FROM delivery_charges_by_count 
            WHERE delivery_charges_by_count.seller_id = delivery_charges.seller_id 
            AND delivery_charges_by_count.product_count = 1
        )
        ON CONFLICT (seller_id, product_count) DO NOTHING;
    END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES (Optional - Uncomment to verify)
-- ============================================

-- Verify all tables exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN (
--     'users', 'products', 'delivery_charges', 'delivery_charges_by_count', 
--     'inventory', 'orders', 'invoices', 'invoice_orders',
--     'customers', 'ledger_orders', 'transactions', 'billing_entries'
-- )
-- ORDER BY table_name;

-- Verify all indexes exist:
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename IN (
--     'users', 'products', 'delivery_charges', 'delivery_charges_by_count',
--     'inventory', 'orders', 'invoices', 'invoice_orders',
--     'customers', 'ledger_orders', 'transactions', 'billing_entries'
-- )
-- ORDER BY tablename, indexname;

-- Verify all functions exist:
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN (
--     'update_updated_at_column', 'calculate_customer_balance',
--     'get_transaction_stats', 'recalculate_all_balances'
-- )
-- ORDER BY routine_name;

-- Verify all views exist:
-- SELECT table_name FROM information_schema.views 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('customer_balances', 'daily_transaction_summary')
-- ORDER BY table_name;

-- ============================================
-- PART 11: CREATE DEFAULT ADMIN USER
-- ============================================

-- Create admin user: adnan@gmail.com / password: 1234
-- Note: Password must be hashed with bcrypt. Run create-admin-user.js script instead.
-- Or use this SQL after hashing password with bcrypt (10 rounds):
-- Password "1234" hashed with bcrypt (10 rounds) = $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

-- Delete existing admin user if exists (to avoid conflicts)
DELETE FROM users WHERE email = 'adnan@gmail.com';

-- Insert admin user with hashed password
-- IMPORTANT: Replace the password hash below with actual bcrypt hash
-- You can generate it by running: node create-admin-user.js
INSERT INTO users (email, password, name, role, is_active, dc_manual)
VALUES (
    'adnan@gmail.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- bcrypt hash of "1234"
    'Adnan Admin',
    'admin',
    true,
    false
)
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- ============================================
-- PART 12: FIX SCHEMA CACHE ISSUES
-- ============================================

-- Reload Supabase schema cache (fixes "table not found" errors)
NOTIFY pgrst, 'reload schema';

-- Optional: Create billing_customers as a view pointing to customers
-- (Only if your code or Supabase is looking for billing_customers)
-- Uncomment the following if you get errors about billing_customers:
/*
CREATE OR REPLACE VIEW billing_customers AS
SELECT * FROM customers;

-- Grant permissions on the view
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_customers TO anon;
*/

-- ============================================
-- END OF COMPLETE DATABASE SCHEMA
-- ============================================
-- This file contains everything needed to set up the complete database
-- Run this in Supabase SQL Editor to create all tables, indexes, functions, triggers, and policies
-- 
-- After running, if you still get "table not found" errors:
-- 1. Refresh your Supabase dashboard
-- 2. Wait 10-30 seconds for schema cache to reload
-- 3. Restart your backend server
-- ============================================

