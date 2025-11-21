# Customer Bulk Import Template - Complete Guide

## ✅ What's Been Added

### 1. Template Download Endpoint
**GET `/api/ledger/customers/bulk-upload-template`**
- Generates Excel template with all supported columns
- Includes 3 sample rows with example data
- Properly formatted with column widths
- Admin/authenticated users only

### 2. Enhanced Bulk Upload
**POST `/api/ledger/customers/bulk-upload`**
- Supports multiple column name variations
- Better error messages
- Returns detailed import statistics
- Validates required fields

### 3. Frontend Improvements
- **Download Template** button in bulk import form
- Clear column information display
- Better success/error messages
- Shows skipped count in import results

## 📋 Template Columns (All Supported)

### Required Columns (Must have data)
1. **Name** - Customer full name
   - Supported variations: `Name`, `name`, `Customer Name`, `customer_name`, `Customer`, `customer`, `Full Name`, `full_name`
   
2. **Phone** - Contact number
   - Supported variations: `Phone`, `phone`, `Phone Number`, `phone_number`, `Mobile`, `mobile`, `Contact`, `contact`, `Phone No`, `phone_no`

### Optional Columns
3. **Address** - Customer address
   - Supported variations: `Address`, `address`, `Customer Address`, `customer_address`, `Street`, `street`, `Location`, `location`

4. **City** - City name
   - Supported variations: `City`, `city`, `Town`, `town`

5. **CNIC** - National ID card number
   - Supported variations: `CNIC`, `cnic`, `CNIC Number`, `cnic_number`, `NIC`, `nic`, `ID Card`, `id_card`, `National ID`, `national_id`

## 📥 How to Use

### Step 1: Download Template
1. Go to **Ledger Customers** page
2. Click **📥 Bulk Import** button
3. Click **📥 Download Template** button
4. Template file will download: `customer-bulk-upload-template.xlsx`

### Step 2: Fill Template
Open the downloaded Excel file and:
- Keep the header row (Name, Phone, Address, City, CNIC)
- Fill in your customer data
- **Required**: Name and Phone must have values
- **Optional**: Address, City, CNIC can be empty
- Delete sample rows or add your own data

### Step 3: Upload
1. Click **Upload Excel/CSV File**
2. Select your filled template
3. Wait for import to complete
4. See results: "Successfully imported X customers (Y skipped)"

## 📊 Template Format

The template includes 3 sample rows:

| Name | Phone | Address | City | CNIC |
|------|-------|---------|------|------|
| Ahmed Khan | 03001234567 | 123 Main Street, Gulberg | Lahore | 35202-1234567-1 |
| Fatima Ali | 03009876543 | 456 Model Town | Karachi | 42101-9876543-2 |
| Hassan Raza | 03111234567 | 789 Faisalabad Road | Faisalabad | |

## 🔧 Supported File Formats
- ✅ Excel (.xlsx, .xls)
- ✅ CSV (.csv)

## ⚠️ Important Notes

### Column Names
- Column names are **case-insensitive**
- Multiple variations supported (see above)
- Use exact column names from template for best results

### Data Validation
- **Name** and **Phone** are required - rows without these will be skipped
- Duplicate phone numbers will be skipped (customers already exist)
- Empty rows are automatically ignored
- Invalid data shows in error list

### Import Results
Response includes:
```json
{
  "success": true,
  "added": 10,        // New customers added
  "skipped": 2,       // Skipped (duplicates or errors)
  "total": 12,        // Total rows in file
  "errors": [],       // List of errors (first 10)
  "message": "Imported 10 customers, 2 skipped"
}
```

## 🎯 Example Usage

### Example 1: Basic Import
```
Name,Phone,Address,City,CNIC
John Doe,03001234567,123 Main St,Lahore,
Jane Smith,03009876543,456 Park Ave,Karachi,35202-1234567-1
```

### Example 2: With All Fields
```
Name,Phone,Address,City,CNIC
Ahmed Khan,03001234567,123 Main Street Gulberg,Lahore,35202-1234567-1
Fatima Ali,03009876543,456 Model Town,Karachi,42101-9876543-2
```

### Example 3: Minimal (Required Only)
```
Name,Phone
Customer 1,03001234567
Customer 2,03009876543
```

## 🚀 API Endpoints

### Download Template
```bash
GET /api/ledger/customers/bulk-upload-template
Headers: Authorization: Bearer YOUR_JWT_TOKEN
Response: Excel file download
```

### Upload Customers
```bash
POST /api/ledger/customers/bulk-upload
Headers: 
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: multipart/form-data
Body: file (Excel/CSV)
Response: { added, skipped, total, errors, message }
```

## 📝 Frontend Changes

**File**: `src/pages/LedgerCustomers.js`

### New Function
- `handleDownloadTemplate()` - Downloads template from API

### UI Updates
- Added "Download Template" button
- Column information display box
- Better success messages with skip count
- Clearer file format instructions

## ✅ Benefits

1. **Easy to Use** - Download ready-made template
2. **Flexible** - Supports multiple column name variations
3. **Clear** - Shows exactly what columns are needed
4. **Robust** - Handles errors gracefully
5. **Informative** - Detailed import statistics
6. **User-Friendly** - Sample data included in template

---
**Ready to use!** Download the template and start importing customers in bulk.
