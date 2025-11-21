-- ============================================
-- Purchasing/Supplier Management System - Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SUPPLIERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT NOT NULL,
    phone_2 TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    cnic TEXT,
    ntn TEXT,
    bank_account TEXT,
    bank_name TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PURCHASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    bill_number TEXT UNIQUE NOT NULL,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque', 'Credit')),
    is_paid BOOLEAN DEFAULT false,
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    remaining_amount DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PURCHASE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    description TEXT,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit TEXT DEFAULT 'pcs',
    unit_price DECIMAL(15, 2) DEFAULT 0,
    total_price DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PURCHASE PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque')),
    transaction_id TEXT,
    received_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_bill_number ON purchases(bill_number);
CREATE INDEX IF NOT EXISTS idx_purchases_bill_date ON purchases(bill_date);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase_id ON purchase_payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_supplier_id ON purchase_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_payment_date ON purchase_payments(payment_date);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_items_updated_at BEFORE UPDATE ON purchase_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_payments_updated_at BEFORE UPDATE ON purchase_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate supplier balance
CREATE OR REPLACE FUNCTION calculate_supplier_balance(supplier_uuid UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    total_purchases DECIMAL(15, 2);
    total_payments DECIMAL(15, 2);
BEGIN
    -- Calculate total purchases (debit)
    SELECT COALESCE(SUM(debit_amount), 0) INTO total_purchases
    FROM purchases
    WHERE supplier_id = supplier_uuid;
    
    -- Calculate total payments (credit)
    SELECT COALESCE(SUM(amount), 0) INTO total_payments
    FROM purchase_payments
    WHERE supplier_id = supplier_uuid;
    
    RETURN total_purchases - total_payments;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- View for supplier summary with balance
CREATE OR REPLACE VIEW supplier_summary AS
SELECT 
    s.id,
    s.name,
    s.company_name,
    s.phone,
    s.phone_2,
    s.email,
    s.address,
    s.city,
    s.is_active,
    COALESCE(SUM(p.debit_amount), 0) as total_purchases,
    COALESCE(SUM(pay.amount), 0) as total_payments,
    COALESCE(SUM(p.debit_amount), 0) - COALESCE(SUM(pay.amount), 0) as balance,
    COUNT(DISTINCT p.id) as total_bills,
    MAX(p.bill_date) as last_purchase_date,
    s.created_at,
    s.updated_at
FROM suppliers s
LEFT JOIN purchases p ON s.id = p.supplier_id
LEFT JOIN purchase_payments pay ON s.id = pay.supplier_id
GROUP BY s.id, s.name, s.company_name, s.phone, s.phone_2, s.email, s.address, s.city, s.is_active, s.created_at, s.updated_at;

