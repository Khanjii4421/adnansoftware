-- ============================================
-- Ledger Khata Management System - Database Schema
-- Complete Updated Version with All Features
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CLEANUP (Drop existing objects if they exist)
-- CASCADE will automatically drop all dependent objects
-- ============================================

-- Drop tables first (CASCADE will drop all dependent objects: views, triggers, policies, etc.)
DROP TABLE IF EXISTS billing_entries CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Drop functions (in case they exist independently)
DROP FUNCTION IF EXISTS recalculate_all_balances() CASCADE;
DROP FUNCTION IF EXISTS get_transaction_stats(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS calculate_customer_balance(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- STEP 1: CREATE TABLES
-- ============================================

-- CUSTOMERS TABLE
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    cnic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORDERS TABLE (depends on customers)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_no TEXT NOT NULL,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_no)
);

-- TRANSACTIONS TABLE (depends on customers and orders)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) DEFAULT 0,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa')),
    bank_note TEXT,
    attachment_url TEXT,
    order_no TEXT,
    product TEXT,
    product_description TEXT,
    total_amount DECIMAL(15, 2),
    paid_amount DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BILLING_ENTRIES TABLE (for ledger entries with product codes and order tracking)
CREATE TABLE billing_entries (
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
-- STEP 2: CREATE INDEXES
-- ============================================

-- Customer indexes
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_city ON customers(city);
CREATE INDEX idx_customers_created_at ON customers(created_at);

-- Order indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Transaction indexes
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_order_no ON transactions(order_no);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX idx_transactions_balance ON transactions(balance);
CREATE INDEX idx_transactions_date_customer ON transactions(date, customer_id);
CREATE INDEX idx_transactions_product ON transactions(product);

-- Billing entries indexes
CREATE INDEX idx_billing_entries_customer_id ON billing_entries(customer_id);
CREATE INDEX idx_billing_entries_date ON billing_entries(date);
CREATE INDEX idx_billing_entries_code_name ON billing_entries(code_name);
CREATE INDEX idx_billing_entries_entry_type ON billing_entries(entry_type);
CREATE INDEX idx_billing_entries_created_at ON billing_entries(created_at);
CREATE INDEX idx_billing_entries_date_customer ON billing_entries(date, customer_id);

-- ============================================
-- STEP 3: CREATE FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate balance for a customer
CREATE FUNCTION calculate_customer_balance(p_customer_id UUID)
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

-- Function to get transaction statistics for a date range
CREATE FUNCTION get_transaction_stats(
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

-- Function to recalculate all customer balances
CREATE FUNCTION recalculate_all_balances()
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
-- STEP 4: CREATE TRIGGERS
-- ============================================

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_entries_updated_at 
    BEFORE UPDATE ON billing_entries
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 5: CREATE VIEWS
-- ============================================

-- View for customer balances
CREATE VIEW customer_balances AS
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

-- View for daily transaction summary
CREATE VIEW daily_transaction_summary AS
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
-- STEP 6: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on customers" ON customers
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on orders" ON orders
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on transactions" ON transactions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on billing_entries" ON billing_entries
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- STEP 7: ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE customers IS 'Stores customer information. Supports bulk import via Excel/CSV with columns: Name, Phone, Address, City, CNIC';
COMMENT ON TABLE orders IS 'Stores order records. Each order has a unique order number and is linked to a customer';
COMMENT ON TABLE transactions IS 'Stores all ledger entries (debit/credit). Balance is auto-calculated: balance = previous_balance + credit - debit';
COMMENT ON TABLE billing_entries IS 'Stores billing/ledger entries with product codes, order tracking, and entry types (order/payment/adjustment)';

COMMENT ON COLUMN transactions.debit IS 'Amount given out (money going out)';
COMMENT ON COLUMN transactions.credit IS 'Amount received (money coming in)';
COMMENT ON COLUMN transactions.balance IS 'Running balance after this transaction. Calculated automatically';
COMMENT ON COLUMN transactions.payment_method IS 'Payment method: Cash, Bank Transfer, JazzCash, or EasyPaisa';
COMMENT ON COLUMN transactions.bank_note IS 'Optional account details, transaction reference, or remarks';
COMMENT ON COLUMN transactions.attachment_url IS 'Optional URL to receipt or proof of payment';

-- ============================================
-- VERIFICATION QUERIES
-- Uncomment to verify everything was created
-- ============================================

-- Verify tables:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('customers', 'orders', 'transactions', 'billing_entries');

-- Verify indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('customers', 'orders', 'transactions');

-- Verify functions:
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%balance%';

-- Verify views:
-- SELECT table_name FROM information_schema.views WHERE table_schema = 'public' AND table_name IN ('customer_balances', 'daily_transaction_summary');

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- Uncomment to insert sample data
-- ============================================

/*
-- Sample Customer
INSERT INTO customers (name, phone, address, city, cnic) VALUES
('Ali Khan', '03001234567', '123 Main Street', 'Lahore', '12345-1234567-1');

-- Sample Order
INSERT INTO orders (customer_id, order_no, total_amount, status) VALUES
((SELECT id FROM customers WHERE phone = '03001234567'), 'O#1234', 50000, 'pending');

-- Sample Transactions
INSERT INTO transactions (customer_id, order_id, date, description, debit, credit, balance, payment_method) VALUES
((SELECT id FROM customers WHERE phone = '03001234567'), 
 (SELECT id FROM orders WHERE order_no = 'O#1234'),
 '2025-11-01', 'Order created', 0, 0, 50000, NULL),
((SELECT id FROM customers WHERE phone = '03001234567'), 
 (SELECT id FROM orders WHERE order_no = 'O#1234'),
 '2025-11-02', 'Payment received', 0, 10000, 40000, 'Cash'),
((SELECT id FROM customers WHERE phone = '03001234567'), 
 (SELECT id FROM orders WHERE order_no = 'O#1234'),
 '2025-11-05', 'Return adjustment', 4000, 0, 36000, NULL);
*/

-- ============================================
-- END OF SCHEMA
-- Schema should now run smoothly!
-- ============================================
