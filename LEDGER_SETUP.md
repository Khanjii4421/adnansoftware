# Ledger Khata Management System - Setup Guide

## Database Setup

### Step 1: Run the Database Schema

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `ledger-schema.sql`
4. Execute the SQL script

This will create the following tables:
- `customers` - Stores customer information
- `orders` - Stores order records
- `transactions` - Stores all ledger transactions (debit/credit entries)

### Step 2: Verify Tables

After running the schema, verify that the tables are created:
- Navigate to Table Editor in Supabase
- You should see `customers`, `orders`, and `transactions` tables

## API Endpoints

### Dashboard Endpoints

#### Get Dashboard Stats
```
GET /api/ledger/dashboard/stats
```
Returns overall KPIs including:
- Total Debit
- Total Credit
- Current Balance
- Customer Count
- Transaction Count
- Top Due Customers

#### Get Analytics Data
```
GET /api/ledger/dashboard/analytics?period={period}
```
Parameters:
- `period`: `day`, `3days`, `week`, `month`, `3months`, `6months`, `year`

Returns chart data for the selected time period.

### Customer Management

- `GET /api/ledger/customers` - List all customers (with search)
- `POST /api/ledger/customers` - Create new customer
- `PUT /api/ledger/customers/:id` - Update customer
- `DELETE /api/ledger/customers/:id` - Delete customer

### Transaction Management

- `GET /api/ledger/transactions` - List transactions (with filters)
- `POST /api/ledger/transactions` - Create new transaction

### Order Management

- `GET /api/ledger/orders` - List orders
- `POST /api/ledger/orders` - Create new order

## Frontend Access

The Ledger Dashboard is accessible at:
- Route: `/ledger`
- Menu Item: "Ledger Khata" (📒 icon)

## Features

### Dashboard Features

1. **KPI Cards**
   - Total Debit (all-time and period)
   - Total Credit (all-time and period)
   - Current Balance
   - Total Customers & Transactions

2. **Time Period Selection**
   - Today
   - Last 3 Days
   - Last Week
   - This Month
   - Last 3 Months
   - Last 6 Months
   - This Year

3. **Charts**
   - Debit vs Credit Trend (Area Chart)
   - Daily Comparison (Bar Chart)
   - Balance Trend (Line Chart)

4. **Top Due Customers**
   - Shows customers with outstanding balances

## Transaction Balance Logic

When creating a transaction, the balance is automatically calculated:
```
new_balance = previous_balance + credit - debit
```

## Payment Methods

Supported payment methods:
- Cash
- Bank Transfer
- JazzCash
- EasyPaisa

## Notes

- All amounts are stored as DECIMAL(15, 2) for precision
- Dates are stored in DATE format
- Balance is automatically calculated and maintained per customer
- Transactions can be linked to orders via `order_id`

