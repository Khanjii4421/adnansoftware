-- ============================================
-- Comprehensive Ledger Khata System Migration
-- Complete ledger system with all required columns
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Add balance column to billing_entries for running balance
ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS balance DECIMAL(15, 2) DEFAULT 0;

-- Step 2: Add amount_received column (for tracking received amount separately)
ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS amount_received DECIMAL(15, 2) DEFAULT 0;

-- Step 3: Ensure all required columns exist
ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS bill_number TEXT;

ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('Cash', 'Pending', 'Bank Transfer', 'JazzCash', 'EasyPaisa'));

ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS meters DECIMAL(10, 2);

ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

ALTER TABLE billing_entries 
ADD COLUMN IF NOT EXISTS received_by TEXT;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_billing_entries_bill_number ON billing_entries(bill_number);
CREATE INDEX IF NOT EXISTS idx_billing_entries_customer_bill ON billing_entries(customer_id, bill_number);
CREATE INDEX IF NOT EXISTS idx_billing_entries_date ON billing_entries(date);
CREATE INDEX IF NOT EXISTS idx_billing_entries_customer_date ON billing_entries(customer_id, date);

-- Step 5: Add comments for documentation
COMMENT ON COLUMN billing_entries.balance IS 'Running balance after this entry. Calculated as: previous_balance + credit - debit';
COMMENT ON COLUMN billing_entries.amount_received IS 'Amount received from customer for this entry';
COMMENT ON COLUMN billing_entries.bill_number IS 'Bill number generated from billing system';
COMMENT ON COLUMN billing_entries.date IS 'Date and time of the entry (daily updated)';

-- Step 6: Create function to recalculate balances for a customer
CREATE OR REPLACE FUNCTION recalculate_customer_ledger_balance(p_customer_id UUID)
RETURNS void AS $$
DECLARE
    entry_record RECORD;
    running_balance DECIMAL(15, 2) := 0;
BEGIN
    -- Recalculate balance for all entries of this customer
    FOR entry_record IN 
        SELECT id, debit, credit, date, created_at
        FROM billing_entries
        WHERE customer_id = p_customer_id
        ORDER BY date ASC, created_at ASC
    LOOP
        running_balance := running_balance + COALESCE(entry_record.credit, 0) - COALESCE(entry_record.debit, 0);
        
        UPDATE billing_entries
        SET balance = running_balance
        WHERE id = entry_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to auto-update balance on insert/update
CREATE OR REPLACE FUNCTION update_billing_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    prev_balance DECIMAL(15, 2) := 0;
    new_balance DECIMAL(15, 2);
BEGIN
    -- Get the previous balance for this customer
    SELECT COALESCE(balance, 0) INTO prev_balance
    FROM billing_entries
    WHERE customer_id = NEW.customer_id
      AND id != NEW.id
      AND (date < NEW.date OR (date = NEW.date AND created_at < NEW.created_at))
    ORDER BY date DESC, created_at DESC
    LIMIT 1;
    
    -- Calculate new balance
    new_balance := prev_balance + COALESCE(NEW.credit, 0) - COALESCE(NEW.debit, 0);
    NEW.balance := new_balance;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_billing_entry_balance ON billing_entries;
CREATE TRIGGER trigger_update_billing_entry_balance
    BEFORE INSERT OR UPDATE ON billing_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_billing_entry_balance();

-- Step 8: Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'billing_entries' 
AND column_name IN ('balance', 'amount_received', 'bill_number', 'payment_method', 'transaction_id', 'received_by', 'meters', 'date')
ORDER BY column_name;

-- ============================================
-- Expected Result: All columns should exist
-- ============================================

