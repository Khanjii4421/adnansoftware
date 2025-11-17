-- Add product column to transactions table
-- This migration adds a product column to store the main product name for each transaction

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS product TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product);

-- Update existing transactions to extract product from bank_note if available
UPDATE transactions 
SET product = SUBSTRING(bank_note FROM 'Product:\s*([^|]+)')
WHERE product IS NULL AND bank_note IS NOT NULL AND bank_note LIKE '%Product:%';

-- Add comment
COMMENT ON COLUMN transactions.product IS 'Main product name for this transaction entry';

