# Complete Ledger System - Implementation Guide

## Overview

This document describes the complete ledger management system with customer management, order tracking, payment processing, and reporting capabilities.

## Features Implemented

### 1. Customer Management ✅
- **Individual Customer Addition**: Add customers with name, phone, address, city, and CNIC
- **Bulk Upload**: Import customers via CSV/Excel files
- **Search**: Search customers by name or phone number
- **Customer List**: View all customers with their current balance

**Location**: `/ledger/customers`

### 2. Order Management ✅
- **Order Creation**: Create orders with:
  - Customer ID (linked from customer table)
  - Order Number (unique per customer)
  - Product Name and Description
  - Quantity and Unit (Meter, Unit, Piece, Kg, Litre)
  - Total Bill Amount
  - Payment Received (initial payment)
  - Remaining Balance (auto-calculated)
  - Order Date
- **Bulk Upload**: Import orders via CSV/Excel with automatic customer linking
- **Search & Filters**: 
  - Search by Order ID or Product Name
  - Filter by Customer
  - Filter by Status (Pending, Confirmed, Completed, Cancelled)
  - Filter by Cleared/Pending orders
- **Payment Tracking**: Add partial payments to orders
- **Order Status**: Automatically updates to "Completed" when remaining balance reaches 0

**Location**: `/ledger/orders`

### 3. Payment Tracking ✅
- **Partial Payments**: Record multiple payments against the same order
- **Auto-calculation**: Remaining balance automatically updates after each payment
- **Payment History**: View all payments for each order with:
  - Payment date
  - Amount paid
  - Payment method (Cash, Bank Transfer, JazzCash, EasyPaisa)
  - Remaining balance after payment
- **Transaction Linking**: All payments are linked to orders and customers

**Location**: Integrated in Order Management page and `/ledger/entries`

### 4. Dashboard Summary ✅
- **Total Customers**: Count of all customers
- **Total Orders**: Count of all orders
- **Total Received Amount**: Sum of all payments
- **Total Pending Amount**: Sum of all remaining balances
- **Cleared vs Pending**: Breakdown of cleared and pending orders
- **Analytics**: Charts showing debit/credit trends and balance over time

**Location**: `/ledger`

### 5. Reports & PDF Generation ✅
- **Customer Reports**: Generate PDF reports per customer showing:
  - All orders
  - All payments
  - Remaining balances
  - Cleared orders
  - Payment methods and dates
- **Summary**: Total orders amount, total paid, remaining balance, status

**Location**: Available from customer detail pages

### 6. Bulk Upload ✅
- **Customer Bulk Upload**: Upload customers via Excel/CSV
- **Order Bulk Upload**: Upload orders via Excel/CSV with:
  - Automatic customer creation if not exists
  - Automatic order linking
  - Auto-calculation of totals and balances
  - Data validation (missing fields, invalid data)

**Location**: Available in Customer and Order management pages

### 7. Search and Filters ✅
- **Customer Search**: By name or contact number
- **Order Search**: By Order number or Product name
- **Filters**: 
  - Cleared orders (remaining balance <= 0)
  - Pending balances (remaining balance > 0)
  - Status filter
  - Customer filter

## Database Schema

### Tables

1. **customers**: Customer information
   - id (UUID, Primary Key)
   - name, phone, address, city, cnic
   - created_at, updated_at

2. **ledger_orders**: Order records
   - id (UUID, Primary Key)
   - customer_id (UUID, Foreign Key → customers)
   - order_no (TEXT, Unique)
   - product_name, product_description
   - quantity, unit
   - total_amount, paid_amount, remaining_balance
   - order_date, status
   - created_at, updated_at

3. **transactions**: Payment/transaction records
   - id (UUID, Primary Key)
   - order_id (UUID, Foreign Key → ledger_orders, nullable)
   - customer_id (UUID, Foreign Key → customers)
   - date, description
   - debit, credit, balance
   - payment_method, bank_note, attachment_url
   - created_at, updated_at

### Database Migration

Run the SQL file `ledger-orders-enhancement.sql` to add the necessary columns and triggers:

```sql
-- This adds:
-- - Product details columns (product_name, product_description, quantity, unit)
-- - Payment tracking columns (paid_amount, remaining_balance)
-- - Auto-update trigger for remaining balance on payments
-- - Indexes for performance
```

## API Endpoints

### Customers
- `GET /api/ledger/customers` - List customers (with search)
- `POST /api/ledger/customers` - Create customer
- `PUT /api/ledger/customers/:id` - Update customer
- `DELETE /api/ledger/customers/:id` - Delete customer
- `POST /api/ledger/customers/bulk-upload` - Bulk upload customers

### Orders
- `GET /api/ledger/orders` - List orders (with filters)
- `POST /api/ledger/orders` - Create order
- `PUT /api/ledger/orders/:id` - Update order
- `DELETE /api/ledger/orders/:id` - Delete order
- `POST /api/ledger/orders/bulk-upload` - Bulk upload orders

### Transactions/Payments
- `GET /api/ledger/transactions` - List transactions (with filters)
- `POST /api/ledger/transactions` - Create transaction/payment
- `DELETE /api/ledger/transactions/:id` - Delete transaction

### Reports
- `GET /api/ledger/customers/:id/pdf` - Generate customer PDF report
- `GET /api/ledger/customers/:id/excel` - Generate customer Excel report

## Usage Examples

### Example Flow: Complete Order with Payments

1. **Add Customer "Ali Khan"**
   - Name: Ali Khan
   - Phone: 03001234567
   - Address: 123 Main St, Lahore

2. **Create Order**
   - Customer: Ali Khan
   - Order No: ORD-001
   - Product: Khaddar Fabric
   - Quantity: 20 Meters
   - Total Bill: 40,000 PKR
   - Payment Received: 30,000 PKR
   - Remaining: 10,000 PKR (auto-calculated)

3. **Add First Payment (5,000 PKR)**
   - Click "💰" button on order
   - Enter amount: 5,000
   - Payment method: Cash
   - Remaining updates to: 5,000 PKR

4. **Add Second Payment (5,000 PKR)**
   - Click "💰" button again
   - Enter amount: 5,000
   - Payment method: Cash
   - Remaining updates to: 0 PKR
   - Status automatically changes to "Completed"

5. **View Dashboard**
   - Shows total orders, received amount, pending amount
   - Filter by customer to see Ali Khan's summary

6. **Generate PDF Report**
   - View customer detail page
   - Click "Generate PDF"
   - Shows all orders, payments, and remaining balances

## Bulk Upload Format

### Customer Upload (CSV/Excel)
Columns:
- Name (required)
- Phone (required)
- Address (optional)
- City (optional)
- CNIC (optional)

### Order Upload (CSV/Excel)
Columns:
- Customer Name (required)
- Phone (required) - used to link/create customer
- Order No (required)
- Total Amount (required)
- Paid Amount (optional, default: 0)
- Product Name (optional)
- Product Description (optional)
- Quantity (optional)
- Unit (optional, default: Meter)
- Order Date (optional, default: today)
- Address (optional, for new customers)
- City (optional, for new customers)

## Technical Notes

### UUID Validation
- All API endpoints validate that UUIDs are not empty strings
- Prevents "invalid input syntax for type uuid" errors
- Empty strings are treated as null/undefined

### Auto-calculation
- Remaining balance = Total Amount - Paid Amount
- Updated automatically when:
  - Order is created
  - Payment is added
  - Order total is updated

### Status Management
- **Pending**: Order created, balance > 0
- **Completed**: Remaining balance <= 0
- **Confirmed**: Manually set
- **Cancelled**: Manually set

## File Structure

```
src/pages/
  - LedgerDashboard.js    # Main dashboard with KPIs
  - LedgerCustomers.js    # Customer management
  - LedgerOrders.js        # Order management (NEW)
  - LedgerEntries.js       # Transaction entries

server.js                  # Backend API endpoints

ledger-orders-enhancement.sql  # Database migration
complete-database-schema.sql    # Full database schema
```

## Next Steps

1. **Run Database Migration**: Execute `ledger-orders-enhancement.sql` in Supabase SQL Editor
2. **Test Order Creation**: Create a test order with product details
3. **Test Payment Tracking**: Add multiple payments to an order
4. **Test Bulk Upload**: Upload sample CSV/Excel files
5. **Generate Reports**: Test PDF generation for customers

## Support

For issues or questions:
1. Check database schema is up to date
2. Verify UUIDs are not empty strings
3. Check browser console for errors
4. Review server logs for API errors

