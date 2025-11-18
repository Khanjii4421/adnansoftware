import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Invoices from './pages/Invoices';
import Sellers from './pages/Sellers';
import Automation from './pages/Automation';
import ReturnManagement from './pages/ReturnManagement';
import ReturnScan from './pages/ReturnScan';
import LedgerDashboard from './pages/LedgerDashboard';
import LedgerCustomers from './pages/LedgerCustomers';
import LedgerEntries from './pages/LedgerEntries';
import GenerateBill from './pages/GenerateBill';
import OutOfStock from './pages/OutOfStock';
import InvoiceMatch from './pages/InvoiceMatch';
import Settings from './pages/Settings';
import Suppliers from './pages/Suppliers';
import PurchaseEntry from './pages/PurchaseEntry';
import PurchaseDashboard from './pages/PurchaseDashboard';
import ExpensesTracker from './pages/ExpensesTracker';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/seller"
            element={
              <PrivateRoute>
                <SellerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <Orders />
              </PrivateRoute>
            }
          />
          <Route
            path="/products"
            element={
              <PrivateRoute>
                <Products />
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <PrivateRoute>
                <Inventory />
              </PrivateRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <PrivateRoute>
                <Invoices />
              </PrivateRoute>
            }
          />
          <Route
            path="/sellers"
            element={
              <PrivateRoute>
                <Sellers />
              </PrivateRoute>
            }
          />
          <Route
            path="/automation"
            element={
              <PrivateRoute>
                <Automation />
              </PrivateRoute>
            }
          />
          <Route
            path="/return-management"
            element={
              <PrivateRoute>
                <ReturnManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/return-scan"
            element={
              <PrivateRoute>
                <ReturnScan />
              </PrivateRoute>
            }
          />
          <Route
            path="/ledger"
            element={
              <PrivateRoute>
                <LedgerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/ledger/customers"
            element={
              <PrivateRoute>
                <LedgerCustomers />
              </PrivateRoute>
            }
          />
          <Route
            path="/ledger/entries"
            element={
              <PrivateRoute>
                <LedgerEntries />
              </PrivateRoute>
            }
          />
          <Route
            path="/generate-bill"
            element={
              <PrivateRoute>
                <GenerateBill />
              </PrivateRoute>
            }
          />
          <Route
            path="/invoice-match"
            element={
              <PrivateRoute>
                <InvoiceMatch />
              </PrivateRoute>
            }
          />
          <Route
            path="/purchasing"
            element={
              <PrivateRoute>
                <PurchaseDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/purchasing/suppliers"
            element={
              <PrivateRoute>
                <Suppliers />
              </PrivateRoute>
            }
          />
          <Route
            path="/purchasing/entry"
            element={
              <PrivateRoute>
                <PurchaseEntry />
              </PrivateRoute>
            }
          />
          <Route
            path="/purchasing/dashboard"
            element={
              <PrivateRoute>
                <PurchaseDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/expenses-tracker"
            element={
              <PrivateRoute>
                <ExpensesTracker />
              </PrivateRoute>
            }
          />
          <Route
            path="/out-of-stock"
            element={
              <PrivateRoute>
                <OutOfStock />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

