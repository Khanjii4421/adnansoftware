-- ============================================
-- OUT OF STOCK PRODUCTS TABLE
-- This table stores products marked as out of stock for specific sellers
-- ============================================

-- Create out_of_stock_products table
CREATE TABLE IF NOT EXISTS out_of_stock_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code TEXT NOT NULL,
    category TEXT,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_code, seller_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_out_of_stock_products_seller_id ON out_of_stock_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_out_of_stock_products_product_code ON out_of_stock_products(product_code);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_out_of_stock_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_out_of_stock_products_updated_at
    BEFORE UPDATE ON out_of_stock_products
    FOR EACH ROW
    EXECUTE FUNCTION update_out_of_stock_products_updated_at();

