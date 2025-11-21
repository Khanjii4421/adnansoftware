# 📦 Inventory Setup - Complete Guide

## ⚠️ Error Fix: seller_id column missing

### Problem:
```
Error: column "seller_id" does not exist
```

### Solution: SQL Run Karo

**Step 1: Supabase SQL Editor Mein Jao**
1. Supabase dashboard kholo
2. **SQL Editor** pe click karo
3. **New Query** button pe click karo

**Step 2: Ye SQL Code Copy/Paste Karo:**

```sql
-- Add seller_id column to inventory table
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_seller_id ON inventory(seller_id);
CREATE INDEX IF NOT EXISTS idx_inventory_seller_product ON inventory(seller_id, product_code);

-- Add unique constraint (same product code can exist for different sellers)
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_seller_product_unique;
ALTER TABLE inventory ADD CONSTRAINT inventory_seller_product_unique UNIQUE (seller_id, product_code);
```

**Step 3: Run Button Pe Click Karo**

✅ **Done!** Ab seller_id column add ho gaya!

---

## 📤 Bulk Upload Feature

### Features:
- ✅ Excel/CSV file se bulk upload
- ✅ Multiple products ek saath add
- ✅ Existing products update ho jayenge (quantity add hogi)
- ✅ Template download available

### How to Use:

#### Step 1: Template Download Karo
1. Inventory page pe jao
2. **"Bulk Upload"** button pe click karo
3. **"Download Template"** pe click karo
4. Excel file download hogi

#### Step 2: Excel File Fill Karo
**Required Columns:**
- `Product Code` - Order mein jo use hoga (jaise: KS1)
- `Product Name` - Product ka naam
- `SKU` - Unique identifier
- `Quantity` - Kitni quantity hai

**Optional Columns:**
- `Box Number`
- `Line Number`
- `Row Number`
- `Color`
- `Category`

#### Step 3: Upload Karo
1. **"Bulk Upload"** button pe click karo
2. Seller select karo (admin ke liye)
3. Excel file select karo
4. **"Upload"** button pe click karo
5. Wait karo (large files ke liye time lagega)

#### Step 4: Results Check Karo
Upload complete hone ke baad:
- Total Processed
- Successfully Added
- Updated (agar product already exists)
- Skipped (agar koi error hai)

---

## 📝 Example Excel Template

| Product Code | Product Name | SKU | Quantity | Box Number | Line Number | Row Number | Color | Category |
|--------------|--------------|-----|----------|------------|-------------|------------|-------|----------|
| KS1 | Kids Shirt Size 1 | KS1-RED-001 | 100 | B1 | L1 | R1 | Red | Shirts |
| GS1 | Girls Shirt Size 1 | GS1-BLUE-001 | 50 | B2 | L1 | R1 | Blue | Shirts |

---

## ✅ Complete SQL Schema

Agar pehle se inventory table nahi hai, to ye complete SQL run karo:

File: `inventory-schema-complete.sql` - Ye file already create ki hai, use karo!

---

## 🎯 Important Points

1. **seller_id Required:** Har inventory item ke liye seller_id zaruri hai
   - Admin: Seller select karein
   - Seller: Automatically aapki ID use hogi

2. **Unique Constraint:** Same product code different sellers ke liye ho sakta hai
   - Example: Seller A ke liye KS1 aur Seller B ke liye bhi KS1

3. **Update Behavior:** Agar same product code already exists:
   - New quantity existing quantity mein **add** ho jayegi
   - Other fields update ho jayenge

4. **File Format:** 
   - Excel (.xlsx, .xls)
   - CSV (.csv)

---

## 🆘 Troubleshooting

### Error: "Seller ID is required"
**Solution:** Admin ke liye seller select karna zaruri hai

### Error: "Product Code is required"
**Solution:** Excel mein Product Code column check karo

### Error: "Invalid quantity"
**Solution:** Quantity number honi chahiye (text nahi)

---

**Ab aap inventory bulk upload kar sakte ho! 🎉**

