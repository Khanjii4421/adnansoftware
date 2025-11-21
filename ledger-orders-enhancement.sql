-- ============================================
-- LEDGER ORDERS ENHANCEMENT
-- Add product details, quantity, and payment tracking columns
-- ============================================

-- Add product details columns to ledger_orders
ALTER TABLE ledger_orders ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE ledger_orders ADD COLUMN IF NOT EXISTS product_description TEXT;
ALTER TABLE ledger_orders ADD COLUMN IF NOT EXISTS quantity DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE ledger_orders ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Meter' CHECK (unit IN ('Meter', 'Unit', 'Piece', 'Kg', 'Litre'));
ALTER TABLE ledger_orders ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE ledger_orders ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE ledger_orders ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE;

-- Update remaining_balance to be calculated as total_amount - paid_amount
-- This will be maintained by triggers or application logic
UPDATE ledger_orders SET remaining_balance = total_amount - paid_amount WHERE remaining_balance IS NULL OR remaining_balance = 0;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ledger_orders_product_name ON ledger_orders(product_name);
CREATE INDEX IF NOT EXISTS idx_ledger_orders_order_date ON ledger_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_ledger_orders_remaining_balance ON ledger_orders(remaining_balance);

-- Add comment for documentation
COMMENT ON COLUMN ledger_orders.product_name IS 'Product name or description for the order';
COMMENT ON COLUMN ledger_orders.product_description IS 'Detailed product description';
COMMENT ON COLUMN ledger_orders.quantity IS 'Quantity of products ordered';
COMMENT ON COLUMN ledger_orders.unit IS 'Unit of measurement (Meter, Unit, Piece, Kg, Litre)';
COMMENT ON COLUMN ledger_orders.paid_amount IS 'Total amount paid against this order';
COMMENT ON COLUMN ledger_orders.remaining_balance IS 'Remaining balance (total_amount - paid_amount)';
COMMENT ON COLUMN ledger_orders.order_date IS 'Date when the order was placed';

-- ============================================
-- FUNCTION: Update order remaining balance when payment is made
-- ============================================
CREATE OR REPLACE FUNCTION update_order_remaining_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a payment transaction linked to an order
    IF NEW.order_id IS NOT NULL AND NEW.credit > 0 THEN
        -- Update the order's paid_amount and remaining_balance
        UPDATE ledger_orders
        SET 
            paid_amount = COALESCE(paid_amount, 0) + NEW.credit,
            remaining_balance = total_amount - (COALESCE(paid_amount, 0) + NEW.credit),
            updated_at = NOW()
        WHERE id = NEW.order_id;
        
        -- Update status to 'completed' if remaining_balance becomes 0 or negative
        UPDATE ledger_orders
        SET status = 'completed'
        WHERE id = NEW.order_id 
        AND (total_amount - (COALESCE(paid_amount, 0) + NEW.credit)) <= 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update order balance on payment
DROP TRIGGER IF EXISTS trigger_update_order_balance ON transactions;
CREATE TRIGGER trigger_update_order_balance
    AFTER INSERT ON transactions
    FOR EACH ROW
    WHEN (NEW.order_id IS NOT NULL AND NEW.credit > 0)
    EXECUTE FUNCTION update_order_remaining_balance();

-- ============================================
-- VIEW: Order summary with payment details
-- ============================================
CREATE OR REPLACE VIEW order_payment_summary AS
SELECT 
    lo.id,
    lo.order_no,
    lo.customer_id,
    c.name as customer_name,
    c.phone as customer_phone,
    lo.product_name,
    lo.product_description,
    lo.quantity,
    lo.unit,
    lo.total_amount,
    lo.paid_amount,
    lo.remaining_balance,
    lo.status,
    lo.order_date,
    lo.created_at,
    COUNT(t.id) as payment_count,
    MAX(t.date) as last_payment_date
FROM ledger_orders lo
LEFT JOIN customers c ON lo.customer_id = c.id
LEFT JOIN transactions t ON t.order_id = lo.id AND t.credit > 0
GROUP BY lo.id, lo.order_no, lo.customer_id, c.name, c.phone, 
         lo.product_name, lo.product_description, lo.quantity, lo.unit,
         lo.total_amount, lo.paid_amount, lo.remaining_balance, 
         lo.status, lo.order_date, lo.created_at;

