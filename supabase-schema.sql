-- Supabase Database Schema for Seller Portal
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('seller', 'admin')),
    is_active BOOLEAN DEFAULT true,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON orders(tracking_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_inventory_product_code ON inventory(product_code);
CREATE INDEX IF NOT EXISTS idx_inventory_qty ON inventory(qty);
CREATE INDEX IF NOT EXISTS idx_invoices_seller_id ON invoices(seller_id);
CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON invoices(bill_number);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_charges_updated_at BEFORE UPDATE ON delivery_charges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create admin user (password: admin123 - hash it in application)
-- Note: You'll need to create the admin user through the application or manually hash the password

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_orders ENABLE ROW LEVEL SECURITY;

-- Policies will be managed through Supabase Auth or application-level
-- For now, we'll handle access control in the application layer

