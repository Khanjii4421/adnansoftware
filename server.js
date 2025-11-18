// Server Setup
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const supabase = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration - allow all origins for production
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer configuration for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Check if Supabase is configured
const isSupabaseConfigured = supabase && !supabase.__isStub && supabase.isConfigured;

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
  
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Health check endpoint (no authentication required for basic health check)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: isSupabaseConfigured ? 'connected' : 'not configured',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    host: process.env.HOST || '0.0.0.0'
  });
});

// Test endpoint for connectivity (no authentication required)
app.get('/api/test', (req, res) => {
  console.log('[API Test] Request received:', {
    method: req.method,
    path: req.path,
    url: req.url,
    hostname: req.hostname,
    ip: req.ip,
    origin: req.get('origin')
  });
  
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    host: process.env.HOST || '0.0.0.0',
    database: isSupabaseConfigured ? 'connected' : 'not configured',
    request: {
      method: req.method,
      path: req.path,
      hostname: req.hostname,
      origin: req.get('origin') || 'no origin header'
    }
  });
});

// ============================================
// INVENTORY MANAGEMENT HELPER FUNCTIONS
// ============================================

/**
 * Parse comma-separated product codes from order
 * @param {string} productCodes - Comma-separated product codes (e.g., "ks1,gs1")
 * @returns {Array<string>} Array of product codes
 */
const parseProductCodes = (productCodes) => {
  if (!productCodes) return [];
  return productCodes
    .split(',')
    .map(code => code.trim().toUpperCase())
    .filter(code => code.length > 0);
};

/**
 * Check inventory availability for products
 * @param {string} sellerId - Seller ID
 * @param {Array<string>} productCodes - Array of product codes
 * @param {number} qty - Quantity needed (default: 1)
 * @returns {Object} { available: boolean, unavailable: Array, details: Array }
 */
const checkInventoryAvailability = async (sellerId, productCodes, qty = 1) => {
  if (!sellerId || !productCodes || productCodes.length === 0) {
    return { available: false, unavailable: [], details: [] };
  }

  const details = [];
  const unavailable = [];

  for (const productCode of productCodes) {
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('id, product_code, product_name, qty, seller_id')
      .eq('seller_id', sellerId)
      .eq('product_code', productCode)
      .single();

    if (error || !inventory) {
      unavailable.push({
        product_code: productCode,
        available_qty: 0,
        required_qty: qty,
        reason: 'Product not found in inventory'
      });
      details.push({
        product_code: productCode,
        available_qty: 0,
        required_qty: qty,
        available: false
      });
    } else {
      const availableQty = parseInt(inventory.qty || 0);
      const isAvailable = availableQty >= qty;
      
      if (!isAvailable) {
        unavailable.push({
          product_code: productCode,
          product_name: inventory.product_name,
          available_qty: availableQty,
          required_qty: qty,
          reason: 'Insufficient stock. Available: ' + availableQty + ', Required: ' + qty
        });
      }
      
      details.push({
        product_code: productCode,
        product_name: inventory.product_name,
        available_qty: availableQty,
        required_qty: qty,
        available: isAvailable
      });
    }
  }

  return {
    available: unavailable.length === 0,
    unavailable,
    details
  };
};

/**
 * Reduce inventory quantity for products when order is confirmed/delivered
 * @param {string} sellerId - Seller ID
 * @param {Array<string>} productCodes - Array of product codes
 * @param {number} qty - Quantity to reduce (default: 1)
 * @returns {Object} { success: boolean, errors: Array }
 */
const reduceInventory = async (sellerId, productCodes, qty = 1) => {
  if (!sellerId || !productCodes || productCodes.length === 0) {
    return { success: false, errors: ['Invalid parameters'] };
  }

  const errors = [];
  const updated = [];

  for (const productCode of productCodes) {
    // Get current inventory
    const { data: currentInventory, error: fetchError } = await supabase
      .from('inventory')
      .select('id, qty')
      .eq('seller_id', sellerId)
      .eq('product_code', productCode)
      .single();

    if (fetchError || !currentInventory) {
      errors.push({
        product_code: productCode,
        error: 'Product not found in inventory'
      });
      continue;
    }

    const currentQty = parseInt(currentInventory.qty || 0);
    const newQty = Math.max(0, currentQty - qty);
    const isInStock = newQty > 0;

    // Update inventory
    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        qty: newQty,
        is_in_stock: isInStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentInventory.id);

    if (updateError) {
      errors.push({
        product_code: productCode,
        error: updateError.message
      });
    } else {
      updated.push({
        product_code: productCode,
        old_qty: currentQty,
        new_qty: newQty
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
    updated
  };
};

/**
 * Add inventory quantity back when order is returned
 * @param {string} sellerId - Seller ID
 * @param {Array<string>} productCodes - Array of product codes
 * @param {number} qty - Quantity to add back (default: 1)
 * @returns {Object} { success: boolean, errors: Array }
 */
const addInventoryBack = async (sellerId, productCodes, qty = 1) => {
  if (!sellerId || !productCodes || productCodes.length === 0) {
    return { success: false, errors: ['Invalid parameters'] };
  }

  const errors = [];
  const updated = [];

  for (const productCode of productCodes) {
    // Get current inventory
    const { data: currentInventory, error: fetchError } = await supabase
      .from('inventory')
      .select('id, qty, product_name')
      .eq('seller_id', sellerId)
      .eq('product_code', productCode)
      .single();

    if (fetchError || !currentInventory) {
      // If product doesn't exist in inventory, create it
      // First, try to get product name from products table
      const { data: product } = await supabase
        .from('products')
        .select('product_code')
        .eq('seller_id', sellerId)
        .eq('product_code', productCode)
        .single();

      const { error: createError } = await supabase
        .from('inventory')
        .insert({
          seller_id: sellerId,
          product_code: productCode,
          product_name: productCode, // Use product code as name if not found
          sku: productCode,
          qty: qty,
          is_in_stock: true
        });

      if (createError) {
        errors.push({
          product_code: productCode,
          error: 'Failed to create inventory entry: ' + createError.message
        });
      } else {
        updated.push({
          product_code: productCode,
          action: 'created',
          qty: qty
        });
      }
      continue;
    }

    const currentQty = parseInt(currentInventory.qty || 0);
    const newQty = currentQty + qty;
    const isInStock = newQty > 0;

    // Update inventory
    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        qty: newQty,
        is_in_stock: isInStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentInventory.id);

    if (updateError) {
      errors.push({
        product_code: productCode,
        error: updateError.message
      });
    } else {
      updated.push({
        product_code: productCode,
        old_qty: currentQty,
        new_qty: newQty
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
    updated
  };
};

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password, name, role, is_active')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    res.json({
      access_token: token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    // Send detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? 'Internal server error: ' + error.message
      : 'Internal server error during login';
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get current user endpoint
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const userId = req.user.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, is_active')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DASHBOARD ROUTES
// ============================================

// Get dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Get seller_id from query parameter (optional)
    const { seller_id } = req.query;
    
    // Debug log
    if (seller_id) {
      console.log('[Dashboard Stats] Filtering by seller_id:', seller_id);
    }

    // Get basic stats
    const stats = {
      totalOrders: 0,
      totalProducts: 0,
      totalSellers: 0,
      totalInventory: 0,
      recentOrders: []
    };

    // Get orders count - filter by seller_id if provided
    let ordersQuery = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    if (seller_id) {
      console.log('[Dashboard Stats] Applying seller filter, seller_id:', seller_id, 'type:', typeof seller_id);
      ordersQuery = ordersQuery.eq('seller_id', seller_id);
    }
    
    const { count: ordersCount } = await ordersQuery;
    stats.totalOrders = ordersCount || 0;
    console.log('[Dashboard Stats] Total orders count:', stats.totalOrders, seller_id ? '(filtered by seller_id: ' + seller_id + ')' : '(all sellers)');

    // Get products count
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    stats.totalProducts = productsCount || 0;

    // Get sellers count
    const { count: sellersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'seller');
    stats.totalSellers = sellersCount || 0;

    // Get inventory count
    const { count: inventoryCount } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true });
    stats.totalInventory = inventoryCount || 0;

    // Get recent orders - filter by seller_id if provided
    let recentOrdersQuery = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (seller_id) {
      recentOrdersQuery = recentOrdersQuery.eq('seller_id', seller_id);
    }
    
    const { data: recentOrders } = await recentOrdersQuery;
    stats.recentOrders = recentOrders || [];

    // Get all orders for financial calculations - filter by seller_id if provided
    let totalSale = 0;
    let totalShipperPrice = 0;
    let delivered = 0;
    let returned = 0;
    let pending = 0;
    let confirmed = 0;

    try {
      let allOrdersQuery = supabase
        .from('orders')
        .select('seller_price, shipper_price, status, seller_id');
      
      if (seller_id) {
        allOrdersQuery = allOrdersQuery.eq('seller_id', seller_id);
      }
      
      const { data: allOrders, error: ordersError } = await allOrdersQuery;

      if (ordersError) {
        console.error('Error fetching orders for financial calculations:', ordersError);
      } else if (allOrders && allOrders.length > 0) {
        // Calculate total sale (sum of seller_price from DELIVERED orders only)
        totalSale = allOrders.reduce((sum, order) => {
          const statusLower = String(order.status || '').toLowerCase().trim();
          if (statusLower === 'delivered') {
            return sum + parseFloat(order.seller_price || 0);
          }
          return sum;
        }, 0);

        // Calculate total shipper price (sum of shipper_price from DELIVERED orders only)
        totalShipperPrice = allOrders.reduce((sum, order) => {
          const statusLower = String(order.status || '').toLowerCase().trim();
          if (statusLower === 'delivered') {
            return sum + parseFloat(order.shipper_price || 0);
          }
          return sum;
        }, 0);

        // Get order status counts
        delivered = allOrders.filter(o => {
          const statusLower = String(o.status || '').toLowerCase().trim();
          return statusLower === 'delivered';
        }).length || 0;
        
        returned = allOrders.filter(o => {
          const statusLower = String(o.status || '').toLowerCase().trim();
          return statusLower === 'returned' || statusLower === 'return';
        }).length || 0;
        
        pending = allOrders.filter(o => {
          const statusLower = String(o.status || '').toLowerCase().trim();
          return statusLower === 'pending';
        }).length || 0;
        
        confirmed = allOrders.filter(o => {
          const statusLower = String(o.status || '').toLowerCase().trim();
          return statusLower === 'confirmed';
        }).length || 0;
      }
    } catch (err) {
      console.error('Error processing orders:', err);
    }

    // Get all invoices to calculate seller profit - filter by seller_id if provided
    let sellerProfit = 0;
    try {
      let allInvoicesQuery = supabase
        .from('invoices')
        .select('net_profit, seller_id');
      
      if (seller_id) {
        allInvoicesQuery = allInvoicesQuery.eq('seller_id', seller_id);
      }
      
      const { data: allInvoices, error: invoicesError } = await allInvoicesQuery;

      if (invoicesError) {
        console.error('Error fetching invoices for seller profit:', invoicesError);
      } else if (allInvoices && allInvoices.length > 0) {
        // Calculate seller profit from invoices (sum of net_profit from all invoices)
        sellerProfit = allInvoices.reduce((sum, invoice) => {
          return sum + parseFloat(invoice.net_profit || 0);
        }, 0);
      }
    } catch (err) {
      console.error('Error processing invoices:', err);
    }

    // Calculate admin profit (total sale - total shipper price - seller profit)
    const adminProfit = totalSale - totalShipperPrice - sellerProfit;

    // Calculate delivery ratio
    const deliveryRatio = stats.totalOrders > 0 ? (delivered / stats.totalOrders) * 100 : 0;
    const returnRatio = stats.totalOrders > 0 ? (returned / stats.totalOrders) * 100 : 0;

    // Add financial stats - ensure all values are numbers
    stats.total_sales = Number(totalSale) || 0;
    stats.total_shipper_price = Number(totalShipperPrice) || 0;
    stats.seller_profit = Number(sellerProfit) || 0;
    stats.admin_profit = Number(adminProfit) || 0;
    stats.delivered = Number(delivered) || 0;
    stats.returned = Number(returned) || 0;
    stats.pending = Number(pending) || 0;
    stats.confirmed = Number(confirmed) || 0;
    stats.delivery_ratio = Number(deliveryRatio) || 0;
    stats.return_ratio = Number(returnRatio) || 0;
    // Also set total_orders for consistency (frontend checks both)
    stats.total_orders = stats.totalOrders;

    // Debug log
    console.log('[Dashboard Stats] Financial calculations:', {
      total_sales: stats.total_sales,
      total_shipper_price: stats.total_shipper_price,
      seller_profit: stats.seller_profit,
      admin_profit: stats.admin_profit,
      delivered: stats.delivered,
      returned: stats.returned,
      totalOrders: stats.totalOrders,
      total_orders: stats.total_orders,
      seller_id: seller_id || 'all'
    });

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ============================================
// ORDERS ROUTES
// ============================================

// Get orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { status, seller_id, search, today_only, is_paid } = req.query;

    console.log('[GET /api/orders] User:', { id: req.user.id, role: req.user.role, email: req.user.email });
    console.log('[GET /api/orders] Query params:', { status, seller_id, search, today_only, is_paid });

    // Fetch orders with seller name
    let query = supabase
      .from('orders')
      .select(`
        *,
        seller:users!seller_id(id, name, email)
      `);

    // Filter by seller_id
    if (seller_id) {
      console.log('[GET /api/orders] Filtering by seller_id from query:', seller_id);
      query = query.eq('seller_id', seller_id);
    } else if (req.user.role === 'seller') {
      // Sellers can only see their own orders
      console.log('[GET /api/orders] Filtering by seller user id:', req.user.id);
      query = query.eq('seller_id', req.user.id);
    } else {
      console.log('[GET /api/orders] Admin user - showing all orders (no seller filter)');
    }

    // Filter by status - handle both 'return' and 'returned' for backward compatibility
    if (status) {
      if (status.toLowerCase() === 'returned' || status.toLowerCase() === 'return') {
        // For return/returned, query for both statuses
        query = query.in('status', ['returned', 'return']);
      } else {
        query = query.eq('status', status);
      }
    }

    // Filter by today only
    if (today_only === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('created_at', `${today}T00:00:00.000Z`)
                   .lte('created_at', `${today}T23:59:59.999Z`);
    }

    // Filter by paid status
    // Only apply filter if is_paid is explicitly provided and not empty
    // Empty string means "All" - show both paid and unpaid
    if (is_paid !== undefined && is_paid !== null && is_paid !== '') {
      const isPaidValue = is_paid === 'true' || is_paid === true;
      query = query.eq('is_paid', isPaidValue);
      console.log('[GET /api/orders] Filtering by is_paid:', isPaidValue);
    } else {
      console.log('[GET /api/orders] Showing all orders (paid and unpaid)');
    }

    // Search filter - includes reference number, customer name, phone, and tracking ID
    if (search) {
      const searchTerm = search.trim();
      // Search in reference number (partial match), customer name, phone, and tracking ID
      query = query.or(`seller_reference_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,phone_number_1.ilike.%${searchTerm}%,phone_number_2.ilike.%${searchTerm}%,tracking_id.ilike.%${searchTerm}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data: orders, error } = await query;

    if (error) {
      console.error('[GET /api/orders] Supabase error:', error);
      // If join fails, try without join
      console.log('[GET /api/orders] Retrying without join...');
      const simpleQuery = supabase
        .from('orders')
        .select('*');
      
      // Apply same filters
      if (seller_id) {
        simpleQuery.eq('seller_id', seller_id);
      } else if (req.user.role === 'seller') {
        simpleQuery.eq('seller_id', req.user.id);
      }
      if (status) simpleQuery.eq('status', status);
      if (today_only === 'true') {
        const today = new Date().toISOString().split('T')[0];
        simpleQuery.gte('created_at', `${today}T00:00:00.000Z`)
                   .lte('created_at', `${today}T23:59:59.999Z`);
      }
      // Only apply filter if is_paid is explicitly provided and not empty
      if (is_paid !== undefined && is_paid !== null && is_paid !== '') {
        const isPaidValue = is_paid === 'true' || is_paid === true;
        simpleQuery.eq('is_paid', isPaidValue);
      }
      if (search) {
        const searchTerm = search.trim();
        // Search in reference number (partial match), customer name, phone, and tracking ID
        simpleQuery.or(`seller_reference_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,phone_number_1.ilike.%${searchTerm}%,phone_number_2.ilike.%${searchTerm}%,tracking_id.ilike.%${searchTerm}%`);
      }
      simpleQuery.order('created_at', { ascending: false });
      
      const { data: simpleOrders, error: simpleError } = await simpleQuery;
      if (simpleError) throw simpleError;
      
      // Fetch seller names separately
      const sellerIds = [...new Set((simpleOrders || []).map(o => o.seller_id))];
      const { data: sellers } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', sellerIds);
      
      const sellerMap = {};
      (sellers || []).forEach(seller => {
        sellerMap[seller.id] = seller;
      });
      
      const ordersWithSellerName = (simpleOrders || []).map(order => ({
        ...order,
        seller_name: sellerMap[order.seller_id]?.name || 'Unknown',
        seller_email: sellerMap[order.seller_id]?.email || null
      }));
      
      return res.json({ orders: ordersWithSellerName });
    }

    console.log('[GET /api/orders] Found orders:', orders?.length || 0);
    if (orders && orders.length > 0) {
      console.log('[GET /api/orders] First order sample:', {
        id: orders[0].id,
        seller_id: orders[0].seller_id,
        seller_reference_number: orders[0].seller_reference_number,
        customer_name: orders[0].customer_name,
        seller_name: orders[0].seller?.name || 'N/A'
      });
    }

    // Map orders to include seller_name
    const ordersWithSellerName = (orders || []).map(order => ({
      ...order,
      seller_name: order.seller?.name || 'Unknown',
      seller_email: order.seller?.email || null
    }));

    res.json({ orders: ordersWithSellerName });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create order
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const {
      seller_reference_number,
      product_codes,
      customer_name,
      phone_number_1,
      phone_number_2,
      customer_address,
      city,
      courier_service,
      qty,
      seller_id,
      seller_price,
      shipper_price,
      delivery_charge
    } = req.body;

    // Validate required fields
    if (!seller_reference_number || !product_codes || !customer_name || !phone_number_1 || !customer_address || !city) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine seller_id
    let finalSellerId = seller_id;
    if (req.user.role === 'seller') {
      finalSellerId = req.user.id;
    } else if (!finalSellerId) {
      return res.status(400).json({ error: 'Seller ID is required' });
    }

    console.log('[POST /api/orders] Creating order:', {
      user_role: req.user.role,
      user_id: req.user.id,
      provided_seller_id: seller_id,
      final_seller_id: finalSellerId,
      seller_reference_number: seller_reference_number
    });

    // Check if order with same reference number already exists for this seller
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('seller_reference_number', seller_reference_number)
      .eq('seller_id', finalSellerId)
      .single();

    if (existingOrder) {
      return res.status(400).json({ error: `Order with reference number ${seller_reference_number} already exists for this seller` });
    }

    // Parse product codes (comma-separated)
    const productCodesArray = parseProductCodes(product_codes);
    if (productCodesArray.length === 0) {
      return res.status(400).json({ error: 'Invalid product codes' });
    }

    // Orders are independent of inventory - no inventory check required
    const orderQty = parseInt(qty) || 1;

    // Calculate profit
    const sellerPriceNum = parseFloat(seller_price || 0);
    const shipperPriceNum = shipper_price ? parseFloat(shipper_price) : 0;
    const deliveryChargeNum = parseFloat(delivery_charge || 0);
    const totalCost = shipperPriceNum + deliveryChargeNum;
    const profit = sellerPriceNum - totalCost;

    // Create order
    const orderData = {
      seller_id: finalSellerId,
      seller_reference_number: seller_reference_number,
      product_codes: product_codes.toUpperCase(),
      customer_name: customer_name,
      phone_number_1: phone_number_1,
      phone_number_2: phone_number_2 || null,
      customer_address: customer_address,
      city: city,
      courier_service: courier_service || null,
      qty: orderQty,
      seller_price: sellerPriceNum,
      shipper_price: shipper_price ? shipperPriceNum : null,
      delivery_charge: deliveryChargeNum,
      profit: profit,
      status: 'pending',
      is_paid: false
    };

    console.log('[POST /api/orders] Inserting order data:', orderData);

    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/orders] Error creating order:', insertError);
      return res.status(500).json({ error: insertError.message || 'Failed to create order' });
    }

    // Note: Inventory will be reduced when order status changes to 'confirmed' or 'delivered'
    // This allows for pending orders without immediately reducing inventory

    console.log('[POST /api/orders] Order created successfully:', {
      id: order.id,
      seller_id: order.seller_id,
      seller_reference_number: order.seller_reference_number
    });

    res.json({ 
      order, 
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order
app.put('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Get the order first to check permissions
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (findError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Sellers can only update their own orders
    if (req.user.role === 'seller' && order.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get current order to check status changes
    const { data: currentOrder, error: currentOrderError } = await supabase
      .from('orders')
      .select('status, seller_id, product_codes, qty')
      .eq('id', id)
      .single();

    if (currentOrderError || !currentOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = (currentOrder.status || '').toLowerCase().trim();
    const newStatus = updateData.status ? updateData.status.toLowerCase().trim() : oldStatus;

    // Prepare update object
    const updateFields = {};
    
    if (updateData.status !== undefined) {
      updateFields.status = updateData.status;
    }
    
    if (updateData.tracking_id !== undefined) {
      updateFields.tracking_id = updateData.tracking_id || null;
    }
    
    if (updateData.is_paid !== undefined) {
      updateFields.is_paid = updateData.is_paid;
    }

    if (updateData.seller_price !== undefined) {
      updateFields.seller_price = parseFloat(updateData.seller_price || 0);
    }

    if (updateData.delivery_charge !== undefined) {
      updateFields.delivery_charge = parseFloat(updateData.delivery_charge || 0);
    }

    // Recalculate profit if prices changed
    if (updateData.seller_price !== undefined || updateData.delivery_charge !== undefined) {
      const { data: orderForProfit } = await supabase
        .from('orders')
        .select('seller_price, shipper_price, delivery_charge')
        .eq('id', id)
        .single();

      const sellerPrice = updateData.seller_price !== undefined 
        ? parseFloat(updateData.seller_price || 0)
        : parseFloat(orderForProfit?.seller_price || 0);
      
      const shipperPrice = parseFloat(orderForProfit?.shipper_price || 0);
      
      const deliveryCharge = updateData.delivery_charge !== undefined
        ? parseFloat(updateData.delivery_charge || 0)
        : parseFloat(orderForProfit?.delivery_charge || 0);

      const totalCost = shipperPrice + deliveryCharge;
      updateFields.profit = sellerPrice - totalCost;
    }

    updateFields.updated_at = new Date().toISOString();

    // Handle inventory changes based on status transitions
    const productCodesArray = parseProductCodes(currentOrder.product_codes || '');
    const orderQty = parseInt(currentOrder.qty || 1);
    let inventoryUpdate = null;

    // Status changed from non-confirmed/delivered to confirmed/delivered - reduce inventory
    if (oldStatus !== newStatus && 
        !['confirmed', 'delivered'].includes(oldStatus) && 
        ['confirmed', 'delivered'].includes(newStatus)) {
      inventoryUpdate = await reduceInventory(currentOrder.seller_id, productCodesArray, orderQty);
      console.log('[PUT /api/orders/:id] Inventory reduced:', inventoryUpdate);
    }
    
    // Status changed from confirmed/delivered to return/returned - add inventory back
    if (oldStatus !== newStatus && 
        ['confirmed', 'delivered'].includes(oldStatus) && 
        ['return', 'returned'].includes(newStatus)) {
      inventoryUpdate = await addInventoryBack(currentOrder.seller_id, productCodesArray, orderQty);
      console.log('[PUT /api/orders/:id] Inventory added back:', inventoryUpdate);
    }
    
    // Status changed from return/returned back to confirmed/delivered - reduce inventory again
    if (oldStatus !== newStatus && 
        ['return', 'returned'].includes(oldStatus) && 
        ['confirmed', 'delivered'].includes(newStatus)) {
      inventoryUpdate = await reduceInventory(currentOrder.seller_id, productCodesArray, orderQty);
      console.log('[PUT /api/orders/:id] Inventory reduced again:', inventoryUpdate);
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return res.status(500).json({ error: updateError.message || 'Failed to update order' });
    }

    const response = { 
      order: updatedOrder, 
      message: 'Order updated successfully' 
    };

    if (inventoryUpdate) {
      response.inventory_update = inventoryUpdate;
    }

    res.json(response);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Bulk upload orders
app.post('/api/orders/bulk-upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const sellerId = req.body.seller_id || (req.user.role === 'seller' ? req.user.id : null);
    
    if (!sellerId) {
      return res.status(400).json({ error: 'Seller ID is required' });
    }

    // Parse Excel/CSV file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'No data found in file' });
    }

    let totalProcessed = 0;
    let totalCreated = 0;
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      totalProcessed++;

      try {
        // Extract data from row (support multiple column name formats)
        const sellerRef = row['Reference Number'] || row['ref_number'] || row['Ref #'] || row['Seller Reference Number'] || row['Order Number'] || '';
        const productCodes = row['Product Codes'] || row['product_codes'] || row['Product Code'] || row['Products'] || '';
        const customerName = row['Customer Name'] || row['customer_name'] || row['Name'] || '';
        const phone1 = row['Phone Number 1'] || row['phone_number_1'] || row['Phone'] || row['Phone 1'] || '';
        const phone2 = row['Phone Number 2'] || row['phone_number_2'] || row['Phone 2'] || '';
        const address = row['Customer Address'] || row['customer_address'] || row['Address'] || '';
        const city = row['City'] || row['city'] || '';
        const courier = row['Courier Service'] || row['courier_service'] || row['Courier'] || '';
        const qty = row['Qty'] || row['qty'] || row['Quantity'] || '1';
        const sellerPrice = row['Seller Price'] || row['seller_price'] || row['Price'] || '0';
        const shipperPrice = row['Shipper Price'] || row['shipper_price'] || '';
        const deliveryCharge = row['Delivery Charge'] || row['delivery_charge'] || row['DC'] || '0';

        // Validate required fields
        if (!sellerRef || !productCodes || !customerName || !phone1 || !address || !city) {
          errors.push({ row: i + 2, error: 'Missing required fields' });
          continue;
        }

        // Check if order already exists
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('seller_reference_number', String(sellerRef))
          .eq('seller_id', sellerId)
          .single();

        if (existingOrder) {
          errors.push({ row: i + 2, error: `Order ${sellerRef} already exists` });
          continue;
        }

        // Calculate profit
        const sellerPriceNum = parseFloat(sellerPrice || 0);
        const shipperPriceNum = shipperPrice ? parseFloat(shipperPrice) : 0;
        const deliveryChargeNum = parseFloat(deliveryCharge || 0);
        const totalCost = shipperPriceNum + deliveryChargeNum;
        const profit = sellerPriceNum - totalCost;

        // Create order
        const { error: insertError } = await supabase
          .from('orders')
          .insert({
            seller_id: sellerId,
            seller_reference_number: String(sellerRef),
            product_codes: productCodes.toUpperCase(),
            customer_name: customerName,
            phone_number_1: phone1,
            phone_number_2: phone2 || null,
            customer_address: address,
            city: city,
            courier_service: courier || null,
            qty: parseInt(qty) || 1,
            seller_price: sellerPriceNum,
            shipper_price: shipperPrice ? shipperPriceNum : null,
            delivery_charge: deliveryChargeNum,
            profit: profit,
            status: 'pending',
            is_paid: false
          });

        if (insertError) {
          errors.push({ row: i + 2, error: insertError.message });
        } else {
          totalCreated++;
        }
      } catch (error) {
        errors.push({ row: i + 2, error: error.message || 'Unknown error' });
      }
    }

    res.json({
      total_processed: totalProcessed,
      total_created: totalCreated,
      total_errors: errors.length,
      errors: errors.slice(0, 100) // Limit to first 100 errors
    });
  } catch (error) {
    console.error('Error bulk uploading orders:', error);
    res.status(500).json({ error: 'Failed to bulk upload orders' });
  }
});

// Get bulk upload template
app.get('/api/orders/bulk-upload-template', authenticateToken, (req, res) => {
  try {
    const template = [
      {
        'Reference Number': '1',
        'Product Codes': 'KS1,KS2',
        'Customer Name': 'John Doe',
        'Phone Number 1': '03001234567',
        'Phone Number 2': '03001234568',
        'Customer Address': '123 Main St',
        'City': 'Lahore',
        'Courier Service': 'TCS',
        'Qty': '2',
        'Seller Price': '5000',
        'Shipper Price': '3000',
        'Delivery Charge': '200'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders Template');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=bulk-upload-template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Return scan (mark order as return by tracking ID)
app.post('/api/orders/return-scan', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { tracking_id } = req.body;

    if (!tracking_id) {
      return res.status(400).json({ error: 'Tracking ID is required' });
    }

    // Find order by tracking_id
    let query = supabase
      .from('orders')
      .select('id, seller_id')
      .eq('tracking_id', tracking_id.trim());

    // Sellers can only scan their own orders
    if (req.user.role === 'seller') {
      query = query.eq('seller_id', req.user.id);
    }

    const { data: order, error: findError } = await query.single();

    if (findError || !order) {
      return res.status(404).json({ error: 'Order not found with this tracking ID' });
    }

    // Get order details for inventory update
    const { data: orderDetails } = await supabase
      .from('orders')
      .select('status, seller_id, product_codes, qty')
      .eq('id', order.id)
      .single();

    const oldStatus = (orderDetails?.status || '').toLowerCase().trim();
    
    // Update order status to returned
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'returned',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order status:', updateError);
      return res.status(500).json({ error: 'Failed to update order status' });
    }

    // Add inventory back if order was previously confirmed/delivered
    let inventoryUpdate = null;
    if (orderDetails && ['confirmed', 'delivered'].includes(oldStatus)) {
      const productCodesArray = parseProductCodes(orderDetails.product_codes || '');
      const orderQty = parseInt(orderDetails.qty || 1);
      inventoryUpdate = await addInventoryBack(orderDetails.seller_id, productCodesArray, orderQty);
      console.log('[POST /api/orders/return-scan] Inventory added back:', inventoryUpdate);
    }

    console.log('[POST /api/orders/return-scan] Order status updated successfully:', {
      id: updatedOrder.id,
      status: updatedOrder.status,
      tracking_id: updatedOrder.tracking_id
    });

    const response = { 
      message: 'Order marked as return successfully',
      order: updatedOrder
    };

    if (inventoryUpdate) {
      response.inventory_update = inventoryUpdate;
    }

    res.json(response);
  } catch (error) {
    console.error('Error processing return scan:', error);
    res.status(500).json({ error: 'Failed to process return scan' });
  }
});

// ============================================
// SELLERS ROUTES
// ============================================

// Get next reference number for a seller (MUST come before /api/sellers to avoid route conflicts)
app.get('/api/sellers/:seller_id/next-reference', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { seller_id } = req.params;

    // Get the last order for this seller
    const { data: lastOrder, error } = await supabase
      .from('orders')
      .select('seller_reference_number')
      .eq('seller_id', seller_id)
      .order('seller_reference_number', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1;
    if (lastOrder && lastOrder.length > 0) {
      const lastRef = lastOrder[0].seller_reference_number;
      // Try to parse as number
      const lastNum = parseInt(lastRef);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }

    res.json({ next_reference_number: nextNumber });
  } catch (error) {
    console.error('Error fetching next reference number:', error);
    res.status(500).json({ error: 'Failed to fetch next reference number' });
  }
});

// Get sellers
app.get('/api/sellers', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Only admin can access sellers
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Try to select with phone and address, fallback if columns don't exist
    try {
      // Try with phone and address first
      const { data: sellers, error } = await supabase
        .from('users')
        .select('id, email, name, role, is_active, created_at, phone, address')
        .eq('role', 'seller')
        .order('created_at', { ascending: false });

      if (!error) {
        return res.json({ sellers: sellers || [] });
      }
    } catch (err) {
      // If phone/address columns don't exist, fetch without them
      console.log('Phone/address columns may not exist, fetching without them');
    }
    
    // Fallback: fetch without phone and address
    const { data: sellers, error } = await supabase
      .from('users')
      .select('id, email, name, role, is_active, created_at')
      .eq('role', 'seller')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Add empty phone and address if they don't exist
    const sellersWithDefaults = (sellers || []).map(seller => ({
      ...seller,
      phone: seller.phone || null,
      address: seller.address || null
    }));

    res.json({ sellers: sellersWithDefaults });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
});

// Create seller/shipper
app.post('/api/sellers', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Only admin can create shippers
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can create shippers' });
    }

    const { name, email, password, phone, address } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare user data - start with required fields only
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'seller',
      is_active: true
    };

    // Create shipper (role = 'seller') - first try without phone/address
    let seller;
    let insertError;
    
    try {
      const result = await supabase
        .from('users')
        .insert(userData)
        .select('id, email, name, role, is_active, created_at')
        .single();
      
      seller = result.data;
      insertError = result.error;
    } catch (err) {
      insertError = err;
    }

    if (insertError) {
      console.error('Error creating shipper:', insertError);
      throw insertError;
    }

    // If phone or address provided, try to update (only if columns exist)
    if ((phone && phone.trim()) || (address && address.trim())) {
      try {
        const updateData = {};
        if (phone && phone.trim()) {
          updateData.phone = phone.trim();
        }
        if (address && address.trim()) {
          updateData.address = address.trim();
        }
        
        if (Object.keys(updateData).length > 0) {
          const { data: updatedSeller } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', seller.id)
            .select('id, email, name, role, is_active, created_at, phone, address')
            .single();
          
          if (updatedSeller) {
            seller = updatedSeller;
          }
        }
      } catch (err) {
        // Ignore if phone/address columns don't exist - shipper is still created
        console.log('Phone/address columns may not exist, shipper created without them');
      }
    }

    res.json({
      message: 'Shipper created successfully',
      shipper: seller,
      seller: seller // Keep for backward compatibility
    });
  } catch (error) {
    console.error('Error creating shipper:', error);
    res.status(500).json({ error: error.message || 'Failed to create shipper' });
  }
});

// ============================================
// PRODUCTS ROUTES
// ============================================

// Get products
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ products: products || [] });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ============================================
// INVENTORY ROUTES
// ============================================

// Get inventory
app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Determine seller_id - sellers see only their inventory, admins can see all or filter by seller_id
    let sellerId = null;
    if (req.user.role === 'seller') {
      sellerId = req.user.id;
    } else if (req.query.seller_id) {
      sellerId = req.query.seller_id;
    }

    let query = supabase
      .from('inventory')
      .select('*, seller:users(id, name, email)');

    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }

    query = query.order('created_at', { ascending: false });

    const { data: inventory, error } = await query;

    if (error) throw error;

    // Map inventory to include seller_name
    const inventoryWithSeller = (inventory || []).map(item => ({
      ...item,
      seller_name: item.seller?.name || 'Unknown',
      seller_email: item.seller?.email || null
    }));

    res.json({ inventory: inventoryWithSeller });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Get low stock inventory
app.get('/api/inventory/low-stock', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const threshold = parseInt(req.query.threshold) || 10;

    // Determine seller_id - sellers see only their inventory, admins can see all or filter by seller_id
    let sellerId = null;
    if (req.user.role === 'seller') {
      sellerId = req.user.id;
    } else if (req.query.seller_id) {
      sellerId = req.query.seller_id;
    }

    let query = supabase
      .from('inventory')
      .select('*, seller:users(id, name, email)')
      .lt('qty', threshold);

    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }

    query = query.order('qty', { ascending: true });

    const { data: inventory, error } = await query;

    if (error) throw error;

    // Map inventory to include seller_name
    const inventoryWithSeller = (inventory || []).map(item => ({
      ...item,
      seller_name: item.seller?.name || 'Unknown',
      seller_email: item.seller?.email || null
    }));

    res.json({ inventory: inventoryWithSeller });
  } catch (error) {
    console.error('Error fetching low stock inventory:', error);
    res.status(500).json({ error: 'Failed to fetch low stock inventory' });
  }
});

// Get out of stock products with seller information
app.get('/api/inventory/out-of-stock', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Determine seller_id - sellers see only their inventory, admins can see all or filter by seller_id
    let sellerId = null;
    if (req.user.role === 'seller') {
      sellerId = req.user.id;
    } else if (req.query.seller_id) {
      sellerId = req.query.seller_id;
    }

    let query = supabase
      .from('inventory')
      .select('id, product_code, product_name, qty, seller_id, seller:users(id, name, email)')
      .or('qty.eq.0,qty.lt.1,is_in_stock.eq.false');

    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }

    query = query.order('qty', { ascending: true });

    const { data: inventory, error } = await query;

    if (error) throw error;

    // Map to include seller information
    const outOfStock = (inventory || []).map(item => ({
      product_code: item.product_code,
      product_name: item.product_name || item.product_code,
      qty_left: parseInt(item.qty || 0),
      seller_id: item.seller_id,
      seller_name: item.seller?.name || 'Unknown',
      seller_email: item.seller?.email || null
    }));

    res.json({ 
      out_of_stock: outOfStock,
      count: outOfStock.length
    });
  } catch (error) {
    console.error('Error fetching out of stock inventory:', error);
    res.status(500).json({ error: 'Failed to fetch out of stock inventory' });
  }
});

// Get managed out of stock products (from out_of_stock_products table)
app.get('/api/inventory/out-of-stock-managed', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Determine seller_id - sellers see only their products, admins can see all
    let sellerId = null;
    if (req.user.role === 'seller') {
      sellerId = req.user.id;
    }

    let query = supabase
      .from('out_of_stock_products')
      .select('*, seller:users(id, name, email)')
      .order('created_at', { ascending: false });

    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }

    const { data: products, error } = await query;

    if (error) throw error;

    const productsWithSeller = (products || []).map(item => ({
      id: item.id,
      product_code: item.product_code,
      category: item.category,
      seller_id: item.seller_id,
      seller_name: item.seller?.name || 'Unknown',
      seller_email: item.seller?.email || null,
      created_at: item.created_at
    }));

    res.json({ products: productsWithSeller });
  } catch (error) {
    console.error('Error fetching managed out of stock products:', error);
    res.status(500).json({ error: 'Failed to fetch out of stock products' });
  }
});

// Add product to out of stock list (admin only)
app.post('/api/inventory/out-of-stock', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can add out of stock products' });
    }

    const { product_code, category, seller_id } = req.body;

    if (!product_code || !seller_id) {
      return res.status(400).json({ error: 'Product code and seller_id are required' });
    }

    // Check if already exists
    const { data: existing, error: checkError } = await supabase
      .from('out_of_stock_products')
      .select('id')
      .eq('product_code', product_code.toUpperCase().trim())
      .eq('seller_id', seller_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Product already marked as out of stock for this seller' });
    }

    // Insert new out of stock product
    const { data: product, error: insertError } = await supabase
      .from('out_of_stock_products')
      .insert([{
        product_code: product_code.toUpperCase().trim(),
        category: category || null,
        seller_id: seller_id
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({ product, message: 'Product marked as out of stock successfully' });
  } catch (error) {
    console.error('Error adding out of stock product:', error);
    res.status(500).json({ error: 'Failed to add out of stock product' });
  }
});

// Remove product from out of stock list (admin only)
app.delete('/api/inventory/out-of-stock/:id', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can remove out of stock products' });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('out_of_stock_products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Product removed from out of stock list' });
  } catch (error) {
    console.error('Error removing out of stock product:', error);
    res.status(500).json({ error: 'Failed to remove out of stock product' });
  }
});

// Create inventory item (seller-specific)
app.post('/api/inventory', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const {
      product_code,
      product_name,
      sku,
      qty,
      box_number,
      line_number,
      row_number,
      color,
      category,
      seller_id
    } = req.body;

    // Validate required fields
    if (!product_code || !product_name || !sku) {
      return res.status(400).json({ error: 'Product code, product name, and SKU are required' });
    }

    // Determine seller_id
    let finalSellerId = seller_id;
    if (req.user.role === 'seller') {
      finalSellerId = req.user.id;
    } else if (!finalSellerId) {
      return res.status(400).json({ error: 'Seller ID is required' });
    }

    // Check if inventory item already exists for this seller and product code
    const { data: existingInventory } = await supabase
      .from('inventory')
      .select('id')
      .eq('seller_id', finalSellerId)
      .eq('product_code', product_code.toUpperCase())
      .single();

    if (existingInventory) {
      // Update existing inventory instead of creating duplicate
      const currentQty = parseInt(existingInventory.qty || 0);
      const newQty = currentQty + parseInt(qty || 0);
      
      const { data: updatedInventory, error: updateError } = await supabase
        .from('inventory')
        .update({
          qty: newQty,
          is_in_stock: newQty > 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInventory.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating inventory:', updateError);
        return res.status(500).json({ error: updateError.message || 'Failed to update inventory' });
      }

      return res.json({ 
        inventory: updatedInventory, 
        message: 'Inventory quantity updated successfully',
        action: 'updated'
      });
    }

    // Create new inventory item
    const inventoryData = {
      seller_id: finalSellerId,
      product_code: product_code.toUpperCase(),
      product_name: product_name,
      sku: sku,
      qty: parseInt(qty || 0),
      box_number: box_number || null,
      line_number: line_number || null,
      row_number: row_number || null,
      color: color || null,
      category: category || null,
      is_in_stock: parseInt(qty || 0) > 0
    };

    const { data: inventory, error: insertError } = await supabase
      .from('inventory')
      .insert(inventoryData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating inventory:', insertError);
      return res.status(500).json({ error: insertError.message || 'Failed to create inventory item' });
    }

    res.json({ 
      inventory, 
      message: 'Inventory item created successfully',
      action: 'created'
    });
  } catch (error) {
    console.error('Error creating inventory:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Bulk upload inventory items
app.post('/api/inventory/bulk-upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get seller_id from request (for admin) or use current user (for seller)
    let finalSellerId = req.body.seller_id;
    if (req.user.role === 'seller') {
      finalSellerId = req.user.id;
    } else if (!finalSellerId) {
      return res.status(400).json({ error: 'Seller ID is required' });
    }

    // Parse Excel/CSV file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'No data found in file' });
    }

    let totalAdded = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      try {
        // Extract data from row (support multiple column name formats)
        const product_code = (row['Product Code'] || row['product_code'] || row['ProductCode'] || row['Code'] || row['code'] || '').toString().trim().toUpperCase();
        const product_name = row['Product Name'] || row['product_name'] || row['ProductName'] || row['Name'] || row['name'] || '';
        const sku = (row['SKU'] || row['sku'] || row['Sku'] || '').toString().trim();
        const qty = parseInt(row['Quantity'] || row['quantity'] || row['Qty'] || row['qty'] || row['QTY'] || 0);
        const box_number = row['Box Number'] || row['box_number'] || row['Box'] || row['box'] || null;
        const line_number = row['Line Number'] || row['line_number'] || row['Line'] || row['line'] || null;
        const row_number = row['Row Number'] || row['row_number'] || row['Row'] || row['row'] || null;
        const color = row['Color'] || row['color'] || null;
        const category = row['Category'] || row['category'] || null;

        // Validate required fields
        if (!product_code || !product_name || !sku) {
          errors.push({ row: i + 2, error: 'Product Code, Product Name, and SKU are required' });
          totalSkipped++;
          continue;
        }

        if (isNaN(qty) || qty < 0) {
          errors.push({ row: i + 2, error: 'Invalid quantity' });
          totalSkipped++;
          continue;
        }

        // Check if inventory item already exists for this seller and product code
        const { data: existingInventory } = await supabase
          .from('inventory')
          .select('id, qty')
          .eq('seller_id', finalSellerId)
          .eq('product_code', product_code)
          .single();

        if (existingInventory) {
          // Update existing inventory - add to existing quantity
          const currentQty = parseInt(existingInventory.qty || 0);
          const newQty = currentQty + qty;
          
          const { error: updateError } = await supabase
            .from('inventory')
            .update({
              qty: newQty,
              product_name: product_name,
              sku: sku,
              box_number: box_number,
              line_number: line_number,
              row_number: row_number,
              color: color,
              category: category,
              is_in_stock: newQty > 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingInventory.id);

          if (updateError) {
            errors.push({ row: i + 2, error: updateError.message });
            totalSkipped++;
          } else {
            totalUpdated++;
          }
        } else {
          // Insert new inventory item
          const inventoryData = {
            seller_id: finalSellerId,
            product_code: product_code,
            product_name: product_name,
            sku: sku,
            qty: qty,
            box_number: box_number,
            line_number: line_number,
            row_number: row_number,
            color: color,
            category: category,
            is_in_stock: qty > 0
          };

          const { error: insertError } = await supabase
            .from('inventory')
            .insert(inventoryData);

          if (insertError) {
            errors.push({ row: i + 2, error: insertError.message });
            totalSkipped++;
          } else {
            totalAdded++;
          }
        }
      } catch (error) {
        errors.push({ row: i + 2, error: error.message || 'Unknown error' });
        totalSkipped++;
      }
    }

    res.json({
      total: jsonData.length,
      added: totalAdded,
      updated: totalUpdated,
      skipped: totalSkipped,
      errors: errors.slice(0, 50) // Limit errors to first 50
    });
  } catch (error) {
    console.error('Error bulk uploading inventory:', error);
    res.status(500).json({ error: 'Failed to bulk upload inventory' });
  }
});

// Get orders KPIs
app.get('/api/orders/kpis', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Get seller_id from query parameter (optional)
    const { seller_id } = req.query;
    
    // Debug log
    if (seller_id) {
      console.log('[Orders KPIs] Filtering by seller_id:', seller_id);
    }

    // Get all orders - filter by seller_id if provided
    let ordersQuery = supabase
      .from('orders')
      .select('*');
    
    if (seller_id) {
      console.log('[Orders KPIs] Applying seller filter, seller_id:', seller_id, 'type:', typeof seller_id);
      ordersQuery = ordersQuery.eq('seller_id', seller_id);
    }
    
    const { data: orders, error: ordersError } = await ordersQuery;
    
    if (seller_id && orders) {
      console.log('[Orders KPIs] Filtered orders count:', orders.length, 'for seller_id:', seller_id);
      // Verify filtering worked
      const uniqueSellerIds = [...new Set(orders.map(o => o.seller_id))];
      if (uniqueSellerIds.length > 1 || (uniqueSellerIds.length === 1 && uniqueSellerIds[0] !== seller_id)) {
        console.warn('[Orders KPIs] WARNING: Filtering may not be working correctly. Found seller_ids:', uniqueSellerIds);
      }
    }

    if (ordersError) throw ordersError;

    // Calculate KPIs - normalize status for consistent checking
    const totalOrders = orders?.length || 0;
    const delivered = orders?.filter(o => {
      const statusLower = String(o.status || '').toLowerCase().trim();
      return statusLower === 'delivered';
    }).length || 0;
    const returned = orders?.filter(o => {
      const statusLower = String(o.status || '').toLowerCase().trim();
      return statusLower === 'returned' || statusLower === 'return';
    }).length || 0;
    const pending = orders?.filter(o => {
      const statusLower = String(o.status || '').toLowerCase().trim();
      return statusLower === 'pending';
    }).length || 0;
    const confirmed = orders?.filter(o => {
      const statusLower = String(o.status || '').toLowerCase().trim();
      return statusLower === 'confirmed';
    }).length || 0;

    // Group by product code
    const productKpis = {};
    orders?.forEach(order => {
      // Handle both product_code (singular) and product_codes (plural, comma-separated)
      let codes = [];
      if (order.product_codes) {
        // Split comma-separated product codes
        codes = order.product_codes.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
      } else if (order.product_code) {
        codes = [order.product_code.toUpperCase()];
      }
      
      // If no codes found, use UNKNOWN
      if (codes.length === 0) {
        codes = ['UNKNOWN'];
      }
      
      // Count each product code in the order
      codes.forEach(code => {
        if (!productKpis[code]) {
          productKpis[code] = { code, total: 0, delivered: 0, returned: 0 };
        }
        productKpis[code].total++;
        const statusLower = String(order.status || '').toLowerCase().trim();
        if (statusLower === 'delivered') {
          productKpis[code].delivered++;
        } else if (statusLower === 'returned' || statusLower === 'return') {
          productKpis[code].returned++;
        }
      });
    });

    // Group by city
    const cityKpis = {};
    const returnCityKpis = {};
    const deliveredCityKpis = {};
    orders?.forEach(order => {
      const city = order.city || 'UNKNOWN';
      const statusLower = String(order.status || '').toLowerCase().trim();
      
      if (!cityKpis[city]) {
        cityKpis[city] = { city, total: 0, delivered: 0, returned: 0, count: 0 };
      }
      cityKpis[city].total++;
      cityKpis[city].count++;
      
      if (statusLower === 'delivered') {
        cityKpis[city].delivered++;
        // Track delivered cities separately
        if (!deliveredCityKpis[city]) {
          deliveredCityKpis[city] = { city, count: 0 };
        }
        deliveredCityKpis[city].count++;
      } else if (statusLower === 'returned' || statusLower === 'return') {
        cityKpis[city].returned++;
        // Track return cities separately
        if (!returnCityKpis[city]) {
          returnCityKpis[city] = { city, count: 0 };
        }
        returnCityKpis[city].count++;
      }
    });

    // Convert product KPIs to array format with count and sort by count
    const productKpisArray = Object.values(productKpis)
      .map(p => ({
        product_code: p.code,
        count: p.total,
        total: p.total,
        delivered: p.delivered,
        returned: p.returned
      }))
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .filter(p => p.count > 0); // Only include products with count > 0

    // Convert city KPIs to array format with count and sort by count
    const cityKpisArray = Object.values(cityKpis)
      .map(c => ({
        city: c.city,
        count: c.count,
        total: c.total,
        delivered: c.delivered,
        returned: c.returned
      }))
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .filter(c => c.count > 0); // Only include cities with count > 0

    // Convert return city KPIs to array and sort by count
    const returnCityKpisArray = Object.values(returnCityKpis)
      .map(c => ({ city: c.city, count: c.count }))
      .filter(c => c.count > 0) // Only include cities with return count > 0
      .sort((a, b) => b.count - a.count);

    // Convert delivered city KPIs to array and sort by count
    const deliveredCityKpisArray = Object.values(deliveredCityKpis)
      .map(c => ({ city: c.city, count: c.count }))
      .filter(c => c.count > 0) // Only include cities with delivered count > 0
      .sort((a, b) => b.count - a.count);

    res.json({
      product_kpis: productKpisArray,
      city_kpis: cityKpisArray,
      return_city_kpis: returnCityKpisArray,
      delivered_city_kpis: deliveredCityKpisArray,
      summary: {
        total_orders: totalOrders,
        delivered,
        returned,
        pending,
        confirmed,
        delivery_ratio: totalOrders > 0 ? (delivered / totalOrders) * 100 : 0,
        return_ratio: totalOrders > 0 ? (returned / totalOrders) * 100 : 0
      },
      delivered_data: [],
      returned_data: []
    });
  } catch (error) {
    console.error('Error fetching orders KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch orders KPIs' });
  }
});

// Get invoices
app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    let query = supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    // If seller, only show their invoices
    if (req.user.role === 'seller') {
      query = query.eq('seller_id', req.user.id);
    }

    const { data: invoices, error } = await query;

    if (error) throw error;

    res.json({ invoices: invoices || [] });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Match invoices with seller's CSV bill (MUST come before /api/invoices/:id route)
app.post('/api/invoices/match', authenticateToken, async (req, res) => {
  console.log('[POST /api/invoices/match] Request received');
  try {
    if (!isSupabaseConfigured) {
      console.log('[POST /api/invoices/match] Database not configured');
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Only admin can match invoices
    if (req.user.role !== 'admin') {
      console.log('[POST /api/invoices/match] Unauthorized - user role:', req.user.role);
      return res.status(403).json({ error: 'Only admin can match invoices' });
    }

    const { csv_data } = req.body;
    console.log('[POST /api/invoices/match] CSV data received:', csv_data?.length || 0, 'records');

    if (!csv_data || !Array.isArray(csv_data) || csv_data.length === 0) {
      return res.status(400).json({ error: 'CSV data is required and must be an array' });
    }

    // Process each CSV record
    const matched = [];
    const profitMismatch = [];
    const alreadyPaid = [];
    const notFound = [];
    const notDelivered = [];

    for (const csvRecord of csv_data) {
      const sellerReference = String(csvRecord.seller_reference || '').trim();
      const invoiceNumber = String(csvRecord.invoice_number || '').trim();
      const sellerProfit = parseFloat(csvRecord.profit || 0);

      if (!sellerReference || !invoiceNumber) {
        continue; // Skip invalid records
      }

      // Find order by seller_reference_number
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_reference_number', sellerReference);

      if (ordersError) {
        console.error('Error fetching order:', ordersError);
        continue;
      }

      // Find invoice by bill_number
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('bill_number', invoiceNumber);

      if (invoicesError) {
        console.error('Error fetching invoice:', invoicesError);
        continue;
      }

      const order = orders && orders.length > 0 ? orders[0] : null;
      const invoice = invoices && invoices.length > 0 ? invoices[0] : null;

      // Check if order exists
      if (!order) {
        notFound.push({
          seller_reference: sellerReference,
          invoice_number: invoiceNumber,
          seller_profit: sellerProfit,
        });
        continue;
      }

      // Check if invoice exists
      if (!invoice) {
        notFound.push({
          seller_reference: sellerReference,
          invoice_number: invoiceNumber,
          seller_profit: sellerProfit,
          system_reference: order.seller_reference_number,
        });
        continue;
      }

      // Check if order is linked to this invoice
      const { data: invoiceOrderLinks } = await supabase
        .from('invoice_orders')
        .select('*')
        .eq('invoice_id', invoice.id)
        .eq('order_id', order.id);

      const isLinkedToInvoice = invoiceOrderLinks && invoiceOrderLinks.length > 0;

      if (!isLinkedToInvoice) {
        notFound.push({
          seller_reference: sellerReference,
          invoice_number: invoiceNumber,
          seller_profit: sellerProfit,
          system_reference: order.seller_reference_number,
        });
        continue;
      }

      // Get system profit from order
      const systemProfit = parseFloat(order.profit || 0);
      const orderStatus = String(order.status || '').toLowerCase().trim();

      // Check if order is already paid
      if (order.is_paid === true) {
        alreadyPaid.push({
          seller_reference: sellerReference,
          system_reference: order.seller_reference_number,
          invoice_number: invoiceNumber,
          seller_profit: sellerProfit,
          system_profit: systemProfit,
          order_status: order.status || '',
        });
        continue;
      }

      // Check if order is not delivered
      const isDelivered = orderStatus === 'delivered';
      const isReturned = orderStatus === 'returned' || orderStatus === 'return';
      
      if (!isDelivered && !isReturned) {
        notDelivered.push({
          seller_reference: sellerReference,
          system_reference: order.seller_reference_number,
          invoice_number: invoiceNumber,
          seller_profit: sellerProfit,
          system_profit: systemProfit,
          order_status: order.status || '',
        });
        continue;
      }

      // Compare profits (allow small difference for floating point issues)
      const profitDifference = Math.abs(sellerProfit - systemProfit);
      const tolerance = 0.01; // 1 paisa tolerance

      if (profitDifference > tolerance) {
        profitMismatch.push({
          seller_reference: sellerReference,
          system_reference: order.seller_reference_number,
          invoice_number: invoiceNumber,
          seller_profit: sellerProfit,
          system_profit: systemProfit,
          order_status: order.status || '',
        });
      } else {
        // Perfect match
        matched.push({
          seller_reference: sellerReference,
          system_reference: order.seller_reference_number,
          invoice_number: invoiceNumber,
          seller_profit: sellerProfit,
          system_profit: systemProfit,
          order_status: order.status || '',
        });
      }
    }

    // Calculate summary
    const summary = {
      total: csv_data.length,
      matched: matched.length,
      profit_mismatch: profitMismatch.length,
      already_paid: alreadyPaid.length,
      not_found: notFound.length,
      not_delivered: notDelivered.length,
      issues: profitMismatch.length + alreadyPaid.length + notFound.length + notDelivered.length,
    };

    res.json({
      summary,
      matched,
      profit_mismatch: profitMismatch,
      already_paid: alreadyPaid,
      not_found: notFound,
      not_delivered: notDelivered,
    });
  } catch (error) {
    console.error('Error matching invoices:', error);
    res.status(500).json({ error: error.message || 'Failed to match invoices' });
  }
});

// Search invoices by tracking ID or reference number
app.get('/api/invoices/search', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { tracking_id, reference_number } = req.query;

    if (!tracking_id && !reference_number) {
      return res.status(400).json({ error: 'Please provide tracking_id or reference_number' });
    }

    // Build query to find orders matching the search criteria
    let ordersQuery = supabase
      .from('orders')
      .select('id, seller_reference_number, tracking_id, seller_id');

    if (tracking_id) {
      ordersQuery = ordersQuery.ilike('tracking_id', `%${tracking_id}%`);
    }

    if (reference_number) {
      ordersQuery = ordersQuery.ilike('seller_reference_number', `%${reference_number}%`);
    }

    const { data: matchingOrders, error: ordersError } = await ordersQuery;

    if (ordersError) throw ordersError;

    if (!matchingOrders || matchingOrders.length === 0) {
      return res.json({ invoiceIds: [], orderDetails: [] });
    }

    const orderIds = matchingOrders.map(o => o.id);

    // Get seller names for these orders
    const sellerIds = [...new Set(matchingOrders.map(o => o.seller_id).filter(Boolean))];
    let sellersMap = {};
    if (sellerIds.length > 0) {
      const { data: sellers } = await supabase
        .from('users')
        .select('id, name')
        .in('id', sellerIds);
      
      if (sellers) {
        sellersMap = sellers.reduce((acc, seller) => {
          acc[seller.id] = seller.name;
          return acc;
        }, {});
      }
    }

    // Prepare order details with seller names
    const orderDetails = matchingOrders.map(order => ({
      order_id: order.id,
      reference_number: order.seller_reference_number,
      tracking_id: order.tracking_id,
      seller_name: sellersMap[order.seller_id] || 'Unknown'
    }));

    // Find invoices that contain these orders
    const { data: invoiceOrders, error: invoiceOrdersError } = await supabase
      .from('invoice_orders')
      .select('invoice_id')
      .in('order_id', orderIds);

    if (invoiceOrdersError) throw invoiceOrdersError;

    // Get unique invoice IDs
    const invoiceIds = [...new Set((invoiceOrders || []).map(io => io.invoice_id))];

    res.json({ invoiceIds, orderDetails });
  } catch (error) {
    console.error('Error searching invoices:', error);
    res.status(500).json({ error: 'Failed to search invoices' });
  }
});

// Get invoice details
app.get('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError) throw invoiceError;

    // Get seller info
    const { data: seller } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', invoice.seller_id)
      .single();

    // Check if it's Affan seller
    const isAffanSeller = seller && (
      (seller.name && seller.name.toLowerCase().includes('affan')) ||
      (seller.email && seller.email.toLowerCase().includes('affan'))
    );

    // Affan seller DC calculation function based on product count
    const calculateAffanDC = (productCount) => {
      if (productCount <= 2) return -200;      // 1-2 products
      if (productCount <= 5) return -350;      // 3-5 products
      if (productCount <= 11) return -550;     // 6-11 products
      if (productCount <= 19) return -850;     // 12-19 products
      return -1000;                            // 20+ products
    };

    // Get orders for this invoice using invoice_orders junction table
    const { data: invoiceOrders, error: invoiceOrdersError } = await supabase
      .from('invoice_orders')
      .select('order_id')
      .eq('invoice_id', id);

    if (invoiceOrdersError) throw invoiceOrdersError;

    const orderIds = (invoiceOrders || []).map(io => io.order_id);

    let orders = [];
    if (orderIds.length > 0) {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      
      // For Affan seller: Recalculate DC based on product count (ONLY for returned orders)
      // Delivered orders keep original DC and profit
      if (isAffanSeller && ordersData) {
        orders = ordersData.map(order => {
          const statusLower = String(order.status || '').toLowerCase().trim();
          const isReturned = statusLower === 'returned' || statusLower === 'return';
          
          // Only recalculate DC for returned orders
          if (isReturned) {
            const productCodesArray = parseProductCodes(order.product_codes || '');
            const productCount = productCodesArray.length;
            const calculatedDC = calculateAffanDC(productCount);
            
            return {
              ...order,
              delivery_charge: calculatedDC // Update DC to calculated value for returns only
            };
          } else {
            // Delivered orders: keep original DC and profit
            return order;
          }
        });
      } else {
        orders = ordersData || [];
      }
    }

    res.json({
      invoice: {
        ...invoice,
        seller_name: seller?.name || 'Unknown'
      },
      orders: orders || []
    });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

// Update invoice paid status
app.put('/api/invoices/:id/paid', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_paid } = req.body;

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Only admin can update invoice paid status
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can update invoice paid status' });
    }

    // Check if invoice exists
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Update invoice paid status
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({ 
        is_paid: is_paid === true || is_paid === 'true',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating invoice paid status:', updateError);
      throw updateError;
    }

    // If marking invoice as paid, also mark all linked orders as paid
    // If unmarking invoice as unpaid, also mark all linked orders as unpaid
    if (is_paid === true || is_paid === 'true') {
      // Get all order IDs linked to this invoice
      const { data: invoiceOrders } = await supabase
        .from('invoice_orders')
        .select('order_id')
        .eq('invoice_id', id);

      if (invoiceOrders && invoiceOrders.length > 0) {
        const orderIds = invoiceOrders.map(io => io.order_id);
        
        // Mark all linked orders as paid
        const { error: ordersUpdateError } = await supabase
          .from('orders')
          .update({ 
            is_paid: true,
            updated_at: new Date().toISOString()
          })
          .in('id', orderIds);

        if (ordersUpdateError) {
          console.error('Error updating orders paid status:', ordersUpdateError);
          // Don't fail the request, but log the error
        } else {
          console.log(`Marked ${orderIds.length} orders as paid for invoice ${updatedInvoice.bill_number}`);
        }
      }
    } else {
      // If unmarking as unpaid, also unmark orders
      const { data: invoiceOrders } = await supabase
        .from('invoice_orders')
        .select('order_id')
        .eq('invoice_id', id);

      if (invoiceOrders && invoiceOrders.length > 0) {
        const orderIds = invoiceOrders.map(io => io.order_id);
        
        // Mark all linked orders as unpaid
        const { error: ordersUpdateError } = await supabase
          .from('orders')
          .update({ 
            is_paid: false,
            updated_at: new Date().toISOString()
          })
          .in('id', orderIds);

        if (ordersUpdateError) {
          console.error('Error updating orders paid status:', ordersUpdateError);
          // Don't fail the request, but log the error
        } else {
          console.log(`Marked ${orderIds.length} orders as unpaid for invoice ${updatedInvoice.bill_number}`);
        }
      }
    }

    res.json({ 
      message: `Invoice ${updatedInvoice.bill_number} ${is_paid ? 'marked as paid' : 'marked as unpaid'} successfully`,
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error updating invoice paid status:', error);
    res.status(500).json({ error: 'Failed to update invoice paid status' });
  }
});

// Get invoice PDF
app.get('/api/invoices/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get seller info
    const { data: seller } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', invoice.seller_id)
      .single();

    // Check if it's Affan seller
    const isAffanSeller = seller && (
      (seller.name && seller.name.toLowerCase().includes('affan')) ||
      (seller.email && seller.email.toLowerCase().includes('affan'))
    );

    // Affan seller DC calculation function based on product count
    const calculateAffanDC = (productCount) => {
      if (productCount <= 2) return -200;      // 1-2 products
      if (productCount <= 5) return -350;      // 3-5 products
      if (productCount <= 11) return -550;     // 6-11 products
      if (productCount <= 19) return -850;     // 12-19 products
      return -1000;                            // 20+ products
    };

    // Helper function to parse product codes
    const parseProductCodes = (productCodes) => {
      if (!productCodes) return [];
      return productCodes
        .split(',')
        .map(code => code.trim().toUpperCase())
        .filter(code => code.length > 0);
    };

    // Get orders for this invoice using invoice_orders junction table
    const { data: invoiceOrders, error: invoiceOrdersError } = await supabase
      .from('invoice_orders')
      .select('order_id')
      .eq('invoice_id', id);

    if (invoiceOrdersError) throw invoiceOrdersError;

    const orderIds = (invoiceOrders || []).map(io => io.order_id);

    let orders = [];
    if (orderIds.length > 0) {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      
      // For Affan seller: Recalculate DC based on product count (ONLY for returned orders)
      // Delivered orders keep original DC and profit
      if (isAffanSeller && ordersData) {
        orders = ordersData.map(order => {
          const statusLower = String(order.status || '').toLowerCase().trim();
          const isReturned = statusLower === 'returned' || statusLower === 'return';
          
          // Only recalculate DC for returned orders
          if (isReturned) {
            const productCodesArray = parseProductCodes(order.product_codes || '');
            const productCount = productCodesArray.length;
            const calculatedDC = calculateAffanDC(productCount);
            
            return {
              ...order,
              delivery_charge: calculatedDC // Update DC to calculated value for returns only
            };
          } else {
            // Delivered orders: keep original DC and profit
            return order;
          }
        });
      } else {
        orders = ordersData || [];
      }
    }

    const invoiceDate = invoice.invoice_date || invoice.created_at;
    const sellerName = seller?.name || 'Unknown';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${invoice.bill_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4F46E5; padding-bottom: 20px; }
    .header h1 { color: #4F46E5; font-size: 32px; margin-bottom: 10px; }
    .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-section { flex: 1; }
    .info-section h3 { color:rgb(27, 216, 52); margin-bottom: 10px; font-size: 18px; }
    .info-section p { margin: 5px 0; color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #4F46E5; color: white; padding: 12px; text-align: left; font-weight: bold; }
    td { padding: 10px; border-bottom: 1px solid #e0e0e0; }
    tr:nth-child(even) { background: #f9f9f9; }
    .summary { background: #f0f0f0; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
    .summary-row:last-child { border-bottom: none; font-weight: bold; font-size: 18px; color: #4F46E5; }
    .summary-label { font-weight: 600; }
    .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
    .status-paid { background: #10B981; color: white; }
    .status-unpaid { background: #EF4444; color: white; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 20px; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #1e40af 0%, #10b981 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="color: white; font-size: 32px; font-weight: bold;">AK</div>
        </div>
        <div>
          <h1 style="color: #1e40af; font-size: 32px; margin: 0;">ADNAN KHADAR HOUSE</h1>
          <p style="color: #10b981; font-size: 14px; margin: 5px 0 0 0; font-weight: 600;">High Quality</p>
        </div>
      </div>
      <h2 style="color: #4F46E5; font-size: 24px; margin-top: 15px;">INVOICE</h2>
      <p style="font-size: 16px; color: #666;">Bill Number: ${invoice.bill_number}</p>
    </div>
    
    <div class="invoice-info">
      <div class="info-section">
        <h3>Seller Information</h3>
        <p><strong>Name:</strong> ${sellerName}</p>
        ${seller?.email ? `<p><strong>Email:</strong> ${seller.email}</p>` : ''}
        <p><strong>Invoice Date:</strong> ${new Date(invoiceDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p><strong>Status:</strong> <span class="status ${invoice.is_paid ? 'status-paid' : 'status-unpaid'}">${invoice.is_paid ? 'Paid' : 'Unpaid'}</span></p>
      </div>
      <div class="info-section">
        <h3>Invoice Summary</h3>
        <p><strong>Total Orders:</strong> ${invoice.total_orders || 0}</p>
        <p><strong>Delivered:</strong> ${invoice.delivered_orders || 0}</p>
        <p><strong>Returns:</strong> ${invoice.return_orders || 0}</p>
      </div>
    </div>

    ${orders.length > 0 ? `
    <h3 style="color: #4F46E5; margin-bottom: 15px;">Order Details</h3>
    <table>
      <thead>
        <tr>
          <th>Reference #</th>
          <th>Tracking ID</th>
          <th>Customer</th>
          <th>Product</th>
          <th>Status</th>
          <th>Seller Price</th>
          <th>Shipper Price</th>
          <th>Delivery Charge</th>
          <th>Profit</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => {
          const statusLower = String(order.status || '').toLowerCase().trim();
          // Handle both "return" and "returned" for backward compatibility
          const isReturned = statusLower === 'returned' || statusLower === 'return';
          
          // Calculate profit based on status
          let displayProfit = 0;
          if (isReturned) {
            // For return orders: negative profit (minus delivery charge or effective_profit)
            if (order.effective_profit !== undefined && order.effective_profit !== null) {
              displayProfit = parseFloat(order.effective_profit);
            } else {
              displayProfit = -parseFloat(order.delivery_charge || 0);
            }
          } else {
            // For delivered orders: use profit from order table
            displayProfit = parseFloat(order.profit || 0);
          }
          
          const profitColor = displayProfit >= 0 ? '#10B981' : '#EF4444';
          const profitSign = displayProfit >= 0 ? '' : '-';
          
          // Count products (comma-separated)
          const productCodesArray = parseProductCodes(order.product_codes || '');
          const productCount = productCodesArray.length;
          const products = productCodesArray.join(', ');
          
          return `
          <tr>
            <td>${order.seller_reference_number || '-'}</td>
            <td>${order.tracking_id || '-'}</td>
            <td>${order.customer_name || '-'}</td>
            <td>${products} ${productCount > 0 ? `(${productCount})` : ''}</td>
            <td>${(order.status || '').toUpperCase()}</td>
            <td>Rs. ${parseFloat(order.seller_price || 0).toFixed(2)}</td>
            <td>Rs. ${parseFloat(order.shipper_price || 0).toFixed(2)}</td>
            <td style="color: ${parseFloat(order.delivery_charge || 0) < 0 ? '#EF4444' : '#333'}; font-weight: ${parseFloat(order.delivery_charge || 0) < 0 ? 'bold' : 'normal'};">Rs. ${parseFloat(order.delivery_charge || 0).toFixed(2)}</td>
            <td style="color: ${profitColor}; font-weight: bold;">${profitSign}Rs. ${Math.abs(displayProfit).toFixed(2)}</td>
          </tr>
        `;
        }).join('')}
      </tbody>
    </table>
    ` : '<p>No orders found for this invoice.</p>'}

    ${(() => {
      const deliveredCount = invoice.delivered_orders || 0;
      const returnedCount = invoice.return_orders || 0;
      const totalCount = deliveredCount + returnedCount;
      
      if (totalCount === 0) return '';
      
      // Calculate percentages
      const deliveredPercent = (deliveredCount / totalCount) * 100;
      const returnedPercent = (returnedCount / totalCount) * 100;
      
      // SVG Pie Chart (Smaller size)
      const radius = 60;
      const centerX = 80;
      const centerY = 80;
      const circumference = 2 * Math.PI * radius;
      
      const deliveredOffset = circumference - (deliveredPercent / 100) * circumference;
      const returnedOffset = circumference - (returnedPercent / 100) * circumference;
      
      return `
      <div style="margin-top: 30px; padding: 15px; border: 2px solid #4F46E5; border-radius: 8px; background: #f9f9f9;">
        <h3 style="color: #4F46E5; margin-bottom: 15px; text-align: center; font-size: 16px;">Order Status Distribution</h3>
        <div style="display: flex; align-items: center; justify-content: center; gap: 30px;">
          <div>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#e0e0e0" stroke-width="20"/>
              ${deliveredCount > 0 ? `
              <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#10B981" stroke-width="20"
                stroke-dasharray="${circumference}" stroke-dashoffset="${deliveredOffset}"
                transform="rotate(-90 ${centerX} ${centerY})" />
              ` : ''}
              ${returnedCount > 0 ? `
              <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#EF4444" stroke-width="20"
                stroke-dasharray="${circumference}" stroke-dashoffset="${returnedOffset}"
                transform="rotate(${-90 + (deliveredPercent / 100) * 360} ${centerX} ${centerY})" />
              ` : ''}
              <text x="${centerX}" y="${centerY - 8}" text-anchor="middle" font-size="18" font-weight="bold" fill="#4F46E5">${totalCount}</text>
              <text x="${centerX}" y="${centerY + 12}" text-anchor="middle" font-size="12" fill="#666">Total Orders</text>
            </svg>
          </div>
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 30px; height: 30px; background: #10B981; border-radius: 4px;"></div>
              <div>
                <div style="font-weight: bold; color: #10B981;">Delivered: ${deliveredCount}</div>
                <div style="font-size: 14px; color: #666;">${deliveredPercent.toFixed(1)}%</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 30px; height: 30px; background: #EF4444; border-radius: 4px;"></div>
              <div>
                <div style="font-weight: bold; color: #EF4444;">Returned: ${returnedCount}</div>
                <div style="font-size: 14px; color: #666;">${returnedPercent.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      `;
    })()}

    <div class="summary">
      <div class="summary-row">
        <span class="summary-label">Total Seller Price:</span>
        <span>Rs. ${parseFloat(invoice.total_seller_price || 0).toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Total Shipper Price:</span>
        <span>Rs. ${parseFloat(invoice.total_shipper_price || 0).toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Total Delivery Charge:</span>
        <span>Rs. ${parseFloat(invoice.total_delivery_charge || 0).toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Total Profit:</span>
        <span>Rs. ${parseFloat(invoice.total_profit || 0).toFixed(2)}</span>
      </div>
      ${parseFloat(invoice.other_expenses || 0) > 0 ? `
      <div class="summary-row">
        <span class="summary-label">Other Expenses:</span>
        <span>Rs. ${parseFloat(invoice.other_expenses || 0).toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="summary-row">
        <span class="summary-label">Net Profit:</span>
        <span>Rs. ${parseFloat(invoice.net_profit || 0).toFixed(2)}</span>
      </div>
    </div>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
      <p>Generated on: ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</p>
    </div>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).send('Internal server error');
  }
});

// Delete invoice
app.delete('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Only admin can delete invoices
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete invoices' });
    }

    // Get invoice to check if it exists
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get order IDs that were linked to this invoice BEFORE deleting
    const { data: invoiceOrders } = await supabase
      .from('invoice_orders')
      .select('order_id')
      .eq('invoice_id', id);

    const orderIds = (invoiceOrders || []).map(io => io.order_id);

    // Delete invoice_orders junction table entries
    const { error: junctionError } = await supabase
      .from('invoice_orders')
      .delete()
      .eq('invoice_id', id);

    if (junctionError) {
      console.error('Error deleting invoice_orders:', junctionError);
      // Continue even if this fails
    }

    // Mark orders as unpaid again (if they were marked as paid)
    if (orderIds.length > 0) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ is_paid: false })
        .in('id', orderIds);

      if (updateError) {
        console.error('Error updating orders:', updateError);
        // Continue even if this fails
      }
    }

    // Delete the invoice
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting invoice:', deleteError);
      throw deleteError;
    }

    res.json({ message: `Invoice ${invoice.bill_number} deleted successfully` });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// Generate invoice
app.post('/api/invoices/generate', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { seller_id, bill_number, other_expenses, include_return_profit } = req.body;

    // Validate required fields
    if (!seller_id) {
      return res.status(400).json({ error: 'Seller ID is required' });
    }

    // Only admin can generate invoices
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can generate invoices' });
    }

    console.log('[POST /api/invoices/generate] Generating invoice:', {
      seller_id,
      bill_number,
      other_expenses,
      include_return_profit
    });

    // Get all unpaid orders for this seller (not linked to any invoice)
    // First, get all order IDs that are already in invoices
    const { data: invoicedOrders } = await supabase
      .from('invoice_orders')
      .select('order_id');

    const invoicedOrderIds = (invoicedOrders || []).map(io => io.order_id);

    // Get all unpaid orders for this seller
    // Include delivered, returned, and return status orders
    // First get all unpaid orders for this seller
    let ordersQuery = supabase
      .from('orders')
      .select('*')
      .eq('seller_id', seller_id)
      .eq('is_paid', false);

    const { data: allUnpaidOrders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('[POST /api/invoices/generate] Error fetching orders:', ordersError);
      throw ordersError;
    }

    console.log('[POST /api/invoices/generate] All unpaid orders for seller:', allUnpaidOrders?.length || 0);
    if (allUnpaidOrders && allUnpaidOrders.length > 0) {
      console.log('[POST /api/invoices/generate] Sample unpaid order:', {
        id: allUnpaidOrders[0].id,
        status: allUnpaidOrders[0].status,
        is_paid: allUnpaidOrders[0].is_paid,
        seller_id: allUnpaidOrders[0].seller_id
      });
    }

    // Filter orders: only include delivered or returned status
    // Exclude pending and other statuses
    // Handle both "return" and "returned" for backward compatibility with existing data
    const eligibleOrders = (allUnpaidOrders || []).filter(order => {
      const statusLower = String(order.status || '').toLowerCase().trim();
      const isDelivered = statusLower === 'delivered';
      // Accept both "return" and "returned" for backward compatibility
      const isReturned = statusLower === 'returned' || statusLower === 'return';
      return isDelivered || isReturned;
    });

    console.log('[POST /api/invoices/generate] Eligible orders (delivered/returned):', eligibleOrders.length);
    
    // Debug: Log status breakdown of eligible orders
    if (eligibleOrders.length > 0) {
      const statusBreakdown = {};
      eligibleOrders.forEach(order => {
        const status = order.status || 'unknown';
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });
      console.log('[POST /api/invoices/generate] Eligible orders status breakdown:', statusBreakdown);
    }

    // Filter out orders that are already in invoices
    const unpaidOrders = eligibleOrders.filter(order => 
      !invoicedOrderIds.includes(order.id)
    );

    console.log('[POST /api/invoices/generate] Unpaid orders (not in invoices):', unpaidOrders.length);
    console.log('[POST /api/invoices/generate] Already invoiced order IDs:', invoicedOrderIds.length);
    
    if (unpaidOrders.length === 0 && eligibleOrders.length > 0) {
      console.log('[POST /api/invoices/generate] Warning: All eligible orders are already in invoices');
      console.log('[POST /api/invoices/generate] Eligible order IDs:', eligibleOrders.map(o => o.id));
      console.log('[POST /api/invoices/generate] Already invoiced IDs:', invoicedOrderIds);
    }

    if (!unpaidOrders || unpaidOrders.length === 0) {
      // Provide more detailed error message
      const statusCounts = {};
      (allUnpaidOrders || []).forEach(order => {
        const status = order.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      return res.status(400).json({ 
        error: 'No unpaid orders found for this seller',
        details: {
          total_unpaid: allUnpaidOrders?.length || 0,
          eligible_statuses: eligibleOrders.length,
          already_invoiced: eligibleOrders.length - unpaidOrders.length,
          status_breakdown: statusCounts
        }
      });
    }

    console.log('[POST /api/invoices/generate] Found unpaid orders:', unpaidOrders.length);

    // Get seller info to check if it's Affan
    const { data: sellerInfo } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', seller_id)
      .single();
    
    const isAffanSeller = sellerInfo && (
      (sellerInfo.name && sellerInfo.name.toLowerCase().includes('affan')) ||
      (sellerInfo.email && sellerInfo.email.toLowerCase().includes('affan'))
    );

    // Affan seller DC calculation function based on product count
    // Formula: 1=-200, 2=-200, 3=-350, 6=-550, 12=-850, 20=-1000
    const calculateAffanDC = (productCount) => {
      if (productCount <= 2) return -200;      // 1-2 products
      if (productCount <= 5) return -350;      // 3-5 products
      if (productCount <= 11) return -550;     // 6-11 products
      if (productCount <= 19) return -850;     // 12-19 products
      return -1000;                            // 20+ products
    };

    // Calculate totals
    let totalProfit = 0;
    let totalSellerPrice = 0;
    let totalShipperPrice = 0;
    let totalDeliveryCharge = 0;
    let deliveredCount = 0;
    let returnCount = 0;
    const orderIds = [];

    unpaidOrders.forEach(order => {
      const statusLower = String(order.status || '').toLowerCase().trim();
      // Handle both "return" and "returned" for backward compatibility
      const isReturned = statusLower === 'returned' || statusLower === 'return';

      // Always include return orders - don't skip them
      // They will show with negative profit (minus delivery charge)
      
      // Accumulate totals
      totalSellerPrice += parseFloat(order.seller_price || 0);
      totalShipperPrice += parseFloat(order.shipper_price || 0);
      
      // For Affan seller: Calculate DC based on product count (ONLY for returned orders)
      // Delivered orders keep original DC, only return orders get calculated DC
      let orderDeliveryCharge = parseFloat(order.delivery_charge || 0);
      if (isAffanSeller && isReturned) {
        // Count products in order
        const productCodesArray = parseProductCodes(order.product_codes || '');
        const productCount = productCodesArray.length;
        // Calculate DC based on product count (only for returns)
        const calculatedDC = calculateAffanDC(productCount);
        orderDeliveryCharge = calculatedDC;
        console.log(`[Invoice Generate] Affan seller - RETURN Order ${order.seller_reference_number}: ${productCount} products, Original DC: ${order.delivery_charge}, Calculated DC: ${calculatedDC}`);
      }
      
      // Calculate profit based on order status
      let orderProfit = 0;
      if (isReturned) {
        // For returned orders: profit displayed is ZERO, but DC (delivery charge) is subtracted from total profit
        // User requirement: "PROFITE ZERO HO JAYA GA OR DC RETURN MINUS MAIN A JAYA GI"
        // Total profit calculation: Delivered Profit - Return DC
        // IMPORTANT: For Affan seller, use calculated DC (based on product count), not original DC
        orderProfit = 0; // Profit displayed is zero for returned orders
        // Subtract returned DC from total profit (this will be subtracted from delivered profit)
        // Use the calculated DC (for Affan) or original DC (for others)
        const dcToSubtract = isAffanSeller ? Math.abs(orderDeliveryCharge) : Math.abs(parseFloat(order.delivery_charge || 0));
        totalProfit -= dcToSubtract; // Subtract DC from total profit
        // Delivery charge for returned orders is negative (will be subtracted in total)
        totalDeliveryCharge -= dcToSubtract; // Subtract DC for returns
      } else {
        // For delivered orders: use original profit from order table (DC remains original)
        // No recalculation needed for delivered orders
        orderProfit = parseFloat(order.profit || 0);
        totalProfit += orderProfit; // Add delivered profit to total
        // Add delivery charge normally for delivered orders (original DC)
        totalDeliveryCharge += parseFloat(order.delivery_charge || 0);
      }
      
      if (isReturned) {
        returnCount++;
      } else {
        deliveredCount++;
      }
      
      orderIds.push(order.id);
    });

    // Deduct other expenses
    const otherExpensesAmount = parseFloat(other_expenses || 0);
    const netProfit = totalProfit - otherExpensesAmount;

    // Generate bill number if not provided
    let finalBillNumber = bill_number;
    if (!finalBillNumber || finalBillNumber.trim() === '') {
      // Get last invoice number for this seller
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('bill_number')
        .eq('seller_id', seller_id)
        .order('created_at', { ascending: false })
        .limit(1);

      let invoiceNum = 1;
      if (lastInvoice && lastInvoice.length > 0) {
        const lastBillNum = lastInvoice[0].bill_number;
        // Extract number from bill number (e.g., "INV-001" -> 1)
        const match = lastBillNum.match(/(\d+)/);
        if (match) {
          invoiceNum = parseInt(match[1]) + 1;
        }
      }
      finalBillNumber = `INV-${String(invoiceNum).padStart(3, '0')}`;
    }

    // Create invoice
    const invoiceData = {
      seller_id: seller_id,
      bill_number: finalBillNumber,
      invoice_date: new Date().toISOString(),
      total_orders: orderIds.length,
      delivered_orders: deliveredCount,
      return_orders: returnCount,
      total_seller_price: totalSellerPrice,
      total_shipper_price: totalShipperPrice,
      total_delivery_charge: totalDeliveryCharge,
      total_profit: totalProfit,
      other_expenses: otherExpensesAmount,
      net_profit: netProfit,
      is_paid: false
    };

    console.log('[POST /api/invoices/generate] Creating invoice:', invoiceData);

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError) {
      console.error('[POST /api/invoices/generate] Error creating invoice:', invoiceError);
      throw invoiceError;
    }

    // Link orders to invoice using invoice_orders junction table
    // IMPORTANT: DO NOT mark orders as paid automatically during invoice generation
    // Orders will be marked as paid ONLY when the invoice is marked as paid (in /api/invoices/:id/paid endpoint)
    // This ensures orders are only marked as paid when payment is actually received
    if (orderIds.length > 0) {
      const invoiceOrderEntries = orderIds.map(orderId => ({
        invoice_id: invoice.id,
        order_id: orderId
      }));

      const { error: junctionError } = await supabase
        .from('invoice_orders')
        .insert(invoiceOrderEntries);

      if (junctionError) {
        console.error('[POST /api/invoices/generate] Error linking orders to invoice:', junctionError);
        // Don't fail the request, but log the error
      }
    }

    console.log('[POST /api/invoices/generate] Invoice created successfully:', {
      id: invoice.id,
      bill_number: invoice.bill_number,
      total_profit: invoice.total_profit,
      order_count: invoice.order_count
    });

    res.json({
      invoice,
      message: 'Invoice generated successfully',
      orders_processed: orderIds.length
    });
  } catch (error) {
    console.error('[POST /api/invoices/generate] Error generating invoice:', error);
    res.status(500).json({ error: error.message || 'Failed to generate invoice' });
  }
});

// ============================================
// LEDGER ROUTES
// ============================================

// Get ledger customers
app.get('/api/ledger/customers', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { search } = req.query;

    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,address.ilike.%${search}%`);
    }

    const { data: customers, error } = await query;

    if (error) throw error;

    // Calculate balance for each customer
    const customersWithBalance = await Promise.all((customers || []).map(async (customer) => {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('debit, credit')
        .eq('customer_id', customer.id);

      const balance = (transactions || []).reduce((sum, t) => {
        return sum + parseFloat(t.credit || 0) - parseFloat(t.debit || 0);
      }, 0);

      return {
        ...customer,
        balance
      };
    }));

    res.json({ customers: customersWithBalance || [] });
  } catch (error) {
    console.error('Error fetching ledger customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Add ledger customer
app.post('/api/ledger/customers', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { name, phone, address, city, cnic } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Check if customer with same phone already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone.trim())
      .single();

    if (existingCustomer) {
      return res.status(400).json({ error: 'Customer with this phone number already exists' });
    }

    // Insert new customer
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        address: address?.trim() || '',
        city: city?.trim() || '',
        cnic: cnic?.trim() || ''
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding customer:', error);
      throw error;
    }

    res.json({ 
      message: 'Customer added successfully',
      customer: {
        ...customer,
        balance: 0
      }
    });
  } catch (error) {
    console.error('Error adding ledger customer:', error);
    res.status(500).json({ error: error.message || 'Failed to add customer' });
  }
});

// Update ledger customer
app.put('/api/ledger/customers/:id', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const { name, phone, address, city, cnic } = req.body;

    // Check if customer exists
    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // If phone is being changed, check for duplicates
    if (phone && phone !== existingCustomer.phone) {
      const { data: duplicateCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone.trim())
        .neq('id', id)
        .single();

      if (duplicateCustomer) {
        return res.status(400).json({ error: 'Customer with this phone number already exists' });
      }
    }

    // Update customer
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (phone) updateData.phone = phone.trim();
    if (address !== undefined) updateData.address = address?.trim() || '';
    if (city !== undefined) updateData.city = city?.trim() || '';
    if (cnic !== undefined) updateData.cnic = cnic?.trim() || '';

    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating customer:', updateError);
      throw updateError;
    }

    res.json({ 
      message: 'Customer updated successfully',
      customer: updatedCustomer
    });
  } catch (error) {
    console.error('Error updating ledger customer:', error);
    res.status(500).json({ error: error.message || 'Failed to update customer' });
  }
});

// Delete ledger customer
app.delete('/api/ledger/customers/:id', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    // Check if customer has any transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('customer_id', id)
      .limit(1);

    if (transactions && transactions.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with existing transactions. Please delete transactions first.' 
      });
    }

    // Delete customer
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting ledger customer:', error);
    res.status(500).json({ error: error.message || 'Failed to delete customer' });
  }
});

// Bulk upload ledger customers
app.post('/api/ledger/customers/bulk-upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel/CSV file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'No data found in file' });
    }

    let totalAdded = 0;
    let totalSkipped = 0;
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      try {
        // Extract data from row (support multiple column name formats)
        const name = row['Name'] || row['name'] || row['Customer Name'] || row['customer_name'] || '';
        const phone = row['Phone'] || row['phone'] || row['Phone Number'] || row['phone_number'] || '';
        const address = row['Address'] || row['address'] || row['Customer Address'] || row['customer_address'] || '';
        const city = row['City'] || row['city'] || '';
        const cnic = row['CNIC'] || row['cnic'] || row['CNIC Number'] || row['cnic_number'] || '';

        // Validate required fields
        if (!name || !phone) {
          errors.push({ row: i + 2, error: 'Name and phone are required' });
          totalSkipped++;
          continue;
        }

        // Check if customer with same phone already exists
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', phone.trim())
          .single();

        if (existingCustomer) {
          totalSkipped++;
          continue; // Skip duplicate
        }

        // Insert new customer
        const { error: insertError } = await supabase
          .from('customers')
          .insert({
            name: name.trim(),
            phone: phone.trim(),
            address: address?.trim() || '',
            city: city?.trim() || '',
            cnic: cnic?.trim() || ''
          });

        if (insertError) {
          errors.push({ row: i + 2, error: insertError.message });
          totalSkipped++;
        } else {
          totalAdded++;
        }
      } catch (error) {
        errors.push({ row: i + 2, error: error.message || 'Unknown error' });
        totalSkipped++;
      }
    }

    res.json({
      added: totalAdded,
      skipped: totalSkipped,
      total: jsonData.length,
      errors: errors.slice(0, 10) // Return first 10 errors
    });
  } catch (error) {
    console.error('Error bulk uploading customers:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk upload customers' });
  }
});

// Get ledger dashboard stats
app.get('/api/ledger/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Get all transactions
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*');

    if (transError) throw transError;

    // Calculate totals
    const totalDebit = transactions?.reduce((sum, t) => sum + parseFloat(t.debit || 0), 0) || 0;
    const totalCredit = transactions?.reduce((sum, t) => sum + parseFloat(t.credit || 0), 0) || 0;
    const currentBalance = totalCredit - totalDebit;

    // Get customer count
    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // Get top due customers (customers with negative balance)
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      total_debit: totalDebit,
      total_credit: totalCredit,
      current_balance: currentBalance,
      customer_count: customerCount || 0,
      transaction_count: transactions?.length || 0,
      top_due_customers: customers || []
    });
  } catch (error) {
    console.error('Error fetching ledger dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch ledger dashboard stats' });
  }
});

// Get ledger dashboard analytics
app.get('/api/ledger/dashboard/analytics', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { period = 'week' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case '3days':
        startDate.setDate(now.getDate() - 3);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get transactions in date range
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', now.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    // Group by date
    const dailyData = {};
    transactions?.forEach(t => {
      const date = t.date || t.created_at?.split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, debit: 0, credit: 0 };
      }
      dailyData[date].debit += parseFloat(t.debit || 0);
      dailyData[date].credit += parseFloat(t.credit || 0);
    });

    res.json({
      period,
      data: Object.values(dailyData),
      labels: Object.keys(dailyData)
    });
  } catch (error) {
    console.error('Error fetching ledger analytics:', error);
    res.status(500).json({ error: 'Failed to fetch ledger analytics' });
  }
});

// ============================================
// BILLS ROUTES
// ============================================

// Get next bill number
app.get('/api/bills/next-number', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `BILL-${year}${month}-`;

    // Get the last bill number for this month
    const { data: lastBill, error } = await supabase
      .from('billing_entries')
      .select('bill_number')
      .like('bill_number', `${prefix}%`)
      .not('bill_number', 'is', null)
      .order('bill_number', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (!error && lastBill && lastBill.length > 0) {
      const lastNumber = lastBill[0].bill_number.split('-').pop();
      nextNumber = parseInt(lastNumber) + 1;
    }

    const billNumber = `${prefix}${String(nextNumber).padStart(3, '0')}`;

    res.json({ bill_number: billNumber });
  } catch (error) {
    console.error('Error generating next bill number:', error);
    res.status(500).json({ error: 'Failed to generate bill number' });
  }
});

// Get bills
app.get('/api/bills', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { customer_id, bill_number } = req.query;

    let query = supabase
      .from('billing_entries')
      .select('*, customers!inner(id, name, phone, address, city)')
      .not('bill_number', 'is', null)
      .order('date', { ascending: false });

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    if (bill_number) {
      query = query.eq('bill_number', bill_number);
    }

    const { data: entries, error } = await query;

    if (error) throw error;

    // Group by bill number
    const billsMap = {};
    (entries || []).forEach(entry => {
      if (!billsMap[entry.bill_number]) {
        billsMap[entry.bill_number] = {
          id: entry.id,
          bill_number: entry.bill_number,
          customer_id: entry.customer_id,
          customer_name: entry.customers?.name || 'Unknown',
          customer_phone: entry.customers?.phone || '',
          date: entry.date,
          order_total: 0,
          credit: 0,
          debit: 0,
          payment_method: entry.payment_method || 'Cash'
        };
      }
      if (entry.order_total) {
        billsMap[entry.bill_number].order_total += parseFloat(entry.order_total || 0);
      }
      if (entry.credit) {
        billsMap[entry.bill_number].credit += parseFloat(entry.credit || 0);
      }
    });

    // Convert to array and calculate remaining
    const bills = Object.values(billsMap).map(bill => {
      const remaining = Math.max(0, bill.order_total - bill.credit);
      return {
        ...bill,
        debit: remaining
      };
    });

    res.json({ bills });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Create bill
app.post('/api/bills', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const {
      customer_id,
      bill_number,
      bill_date,
      products,
      total_amount,
      credit,
      debit,
      payment_method,
      description,
      transaction_id,
      received_by
    } = req.body;

    // Validate required fields
    if (!customer_id || !bill_number || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: customer_id, bill_number, and products are required' });
    }

    // Check if bill number already exists
    const { data: existingBill } = await supabase
      .from('billing_entries')
      .select('id')
      .eq('bill_number', bill_number)
      .not('bill_number', 'is', null)
      .limit(1);

    if (existingBill && existingBill.length > 0) {
      return res.status(400).json({ error: `Bill number ${bill_number} already exists` });
    }

    const billDate = bill_date || new Date().toISOString();
    const entries = [];

    // Create order entries for each product
    products.forEach(product => {
      const meterPrice = parseFloat(product.meter_price || 0);
      const meters = parseFloat(product.meters || 0);
      const orderTotal = meterPrice * meters;

      entries.push({
        customer_id: customer_id,
        bill_number: bill_number,
        date: billDate,
        product_name: product.product_name || '',
        description: description || `Bill ${bill_number}`,
        entry_type: 'order',
        order_total: orderTotal,
        credit: 0,
        debit: 0,
        payment_method: payment_method || 'Cash',
        transaction_id: transaction_id || null,
        received_by: received_by || null,
        meters: meters || null
      });
    });

    // Create payment entry if credit > 0
    if (credit && parseFloat(credit) > 0) {
      entries.push({
        customer_id: customer_id,
        bill_number: bill_number,
        date: billDate,
        description: description || `Payment received for bill ${bill_number}`,
        entry_type: 'payment',
        order_total: 0,
        credit: parseFloat(credit),
        debit: 0,
        payment_method: payment_method || 'Cash',
        transaction_id: transaction_id || null,
        received_by: received_by || null
      });
    }

    // Insert all entries
    const { data: insertedEntries, error: insertError } = await supabase
      .from('billing_entries')
      .insert(entries)
      .select();

    if (insertError) {
      console.error('Error creating bill:', insertError);
      return res.status(500).json({ error: insertError.message || 'Failed to create bill' });
    }

    res.json({
      message: 'Bill created successfully',
      bill_number: bill_number,
      entries: insertedEntries
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

// Bulk upload bills
app.post('/api/bills/bulk-upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel/CSV file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'No data found in file' });
    }

    let totalCreated = 0;
    const errors = [];

    // Group by bill number
    const billsMap = {};
    jsonData.forEach((row, index) => {
      const billNumber = row['Bill Number'] || row['bill_number'] || row['Bill #'] || '';
      if (!billNumber) {
        errors.push({ row: index + 2, error: 'Bill number is required' });
        return;
      }

      if (!billsMap[billNumber]) {
        billsMap[billNumber] = {
          bill_number: billNumber,
          customer_name: row['Customer Name'] || row['customer_name'] || '',
          customer_phone: row['Customer Phone'] || row['customer_phone'] || row['Phone'] || '',
          bill_date: row['Bill Date'] || row['bill_date'] || new Date().toISOString().split('T')[0],
          products: [],
          description: row['Description'] || `Bill ${billNumber}`,
          payment_method: row['Payment Method'] || row['payment_method'] || 'Cash',
          transaction_id: row['Transaction ID'] || row['transaction_id'] || null,
          received_by: row['Received By'] || row['received_by'] || null
        };
      }

      // Add product to bill
      billsMap[billNumber].products.push({
        product_name: row['Product Name'] || row['product_name'] || '',
        meters: row['Meters'] || row['meters'] || '0',
        meter_price: row['Price'] || row['price'] || row['Meter Price'] || '0'
      });
    });

    // Create bills
    for (const [billNumber, billData] of Object.entries(billsMap)) {
      try {
        // Find or create customer
        let customerId;
        if (billData.customer_phone) {
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', billData.customer_phone)
            .single();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            // Create new customer
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert({
                name: billData.customer_name,
                phone: billData.customer_phone,
                address: '',
                city: ''
              })
              .select()
              .single();

            if (customerError) {
              errors.push({ row: billNumber, error: `Failed to create customer: ${customerError.message}` });
              continue;
            }
            customerId = newCustomer.id;
          }
        } else {
          errors.push({ row: billNumber, error: 'Customer phone is required' });
          continue;
        }

        // Check if bill already exists
        const { data: existingBill } = await supabase
          .from('billing_entries')
          .select('id')
          .eq('bill_number', billNumber)
          .not('bill_number', 'is', null)
          .limit(1);

        if (existingBill && existingBill.length > 0) {
          errors.push({ row: billNumber, error: `Bill ${billNumber} already exists` });
          continue;
        }

        // Create bill entries
        const entries = [];
        let totalAmount = 0;

        billData.products.forEach(product => {
          const meterPrice = parseFloat(product.meter_price || 0);
          const meters = parseFloat(product.meters || 0);
          const orderTotal = meterPrice * meters;
          totalAmount += orderTotal;

          entries.push({
            customer_id: customerId,
            bill_number: billNumber,
            date: billData.bill_date,
            product_name: product.product_name,
            description: billData.description,
            entry_type: 'order',
            order_total: orderTotal,
            credit: 0,
            debit: 0,
            payment_method: billData.payment_method,
            transaction_id: billData.transaction_id,
            received_by: billData.received_by,
            meters: meters || null
          });
        });

        // Add payment entry if credit provided
        const credit = parseFloat(row['Credit (Paid)'] || row['credit'] || row['Credit'] || '0');
        if (credit > 0) {
          entries.push({
            customer_id: customerId,
            bill_number: billNumber,
            date: billData.bill_date,
            description: `Payment received for bill ${billNumber}`,
            entry_type: 'payment',
            order_total: 0,
            credit: credit,
            debit: 0,
            payment_method: billData.payment_method,
            transaction_id: billData.transaction_id,
            received_by: billData.received_by
          });
        }

        // Insert entries
        const { error: insertError } = await supabase
          .from('billing_entries')
          .insert(entries);

        if (insertError) {
          errors.push({ row: billNumber, error: insertError.message });
        } else {
          totalCreated++;
        }
      } catch (error) {
        errors.push({ row: billNumber, error: error.message || 'Unknown error' });
      }
    }

    res.json({
      total_created: totalCreated,
      total_errors: errors.length,
      errors: errors.slice(0, 100)
    });
  } catch (error) {
    console.error('Error bulk uploading bills:', error);
    res.status(500).json({ error: 'Failed to bulk upload bills' });
  }
});

// Get unpaid bills PDF for a customer
app.get('/api/bills/customer/:customer_id/unpaid-pdf', authenticateToken, async (req, res) => {
  try {
    const { customer_id } = req.params;

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Fetch customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Fetch all bills for customer
    const { data: allEntries, error: entriesError } = await supabase
      .from('billing_entries')
      .select('*')
      .eq('customer_id', customer_id)
      .not('bill_number', 'is', null)
      .order('date', { ascending: false });

    if (entriesError) throw entriesError;

    // Group by bill number
    const billsMap = {};
    (allEntries || []).forEach(entry => {
      if (!billsMap[entry.bill_number]) {
        billsMap[entry.bill_number] = {
          bill_number: entry.bill_number,
          date: entry.date,
          entries: [],
          order_total: 0,
          credit: 0,
          debit: 0
        };
      }
      billsMap[entry.bill_number].entries.push(entry);
      if (entry.order_total) billsMap[entry.bill_number].order_total += parseFloat(entry.order_total || 0);
      billsMap[entry.bill_number].credit += parseFloat(entry.credit || 0);
    });

    // Calculate remaining and filter unpaid bills
    const unpaidBills = [];
    Object.values(billsMap).forEach(bill => {
      const orderEntries = bill.entries.filter(e => e.entry_type === 'order');
      const paymentAndAdjustmentEntries = bill.entries.filter(e => e.entry_type === 'payment' || e.entry_type === 'adjustment');
      const initialCredit = orderEntries.reduce((sum, e) => sum + parseFloat(e.credit || 0), 0);
      // Include all credits from payment and adjustment entries
      const paymentCredit = paymentAndAdjustmentEntries.reduce((sum, e) => sum + parseFloat(e.credit || 0), 0);
      const totalCredit = initialCredit + paymentCredit;
      const remaining = Math.max(0, bill.order_total - totalCredit);
      
      if (remaining > 0) {
        unpaidBills.push({
          ...bill,
          remaining,
          total_credit: totalCredit
        });
      }
    });

    if (unpaidBills.length === 0) {
      return res.status(404).json({ error: 'No unpaid bills found for this customer' });
    }

    const totalUnpaid = unpaidBills.reduce((sum, b) => sum + b.remaining, 0);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Unpaid Bills - ${customer.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .urdu { font-family: 'Noto Nastaliq Urdu', 'Nori Nastaleeq', 'Jameel Noori Nastaleeq', Arial, sans-serif; direction: rtl; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #EF4444; padding-bottom: 20px; }
    .header h1 { color: #EF4444; font-size: 32px; margin-bottom: 10px; }
    .header h1 .urdu { font-size: 28px; }
    .customer-info { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .bill-section { margin-bottom: 30px; border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; }
    .bill-header { background: #EF4444; color: white; padding: 10px; margin: -20px -20px 20px -20px; border-radius: 8px 8px 0 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #4F46E5; color: white; padding: 10px; text-align: left; }
    th .urdu { font-size: 0.85em; }
    td { padding: 8px; border-bottom: 1px solid #e0e0e0; }
    .summary { background: #fef2f2; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #EF4444; }
    .text-red { color: #EF4444; font-weight: bold; }
    .text-green { color: #10B981; }
    @media print {
      body { background: white; }
      .container { box-shadow: none; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #1e40af 0%, #10b981 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="color: white; font-size: 32px; font-weight: bold;">AK</div>
        </div>
        <div>
          <h1 style="color: #1e40af; font-size: 32px; margin: 0;">ADNAN KHADAR HOUSE</h1>
          <p style="color: #10b981; font-size: 14px; margin: 5px 0 0 0; font-weight: 600;">High Quality</p>
        </div>
      </div>
      <h2 style="color: #EF4444; font-size: 24px; margin-top: 15px;">UNPAID BILLS REPORT <span class="urdu">غیر ادا شدہ بلوں کی رپورٹ</span></h2>
      <p style="font-size: 14px; color: #666; margin-top: 10px;">Generated on <span class="urdu">تاریخ</span>: ${new Date().toLocaleString()}</p>
    </div>
    <div class="customer-info">
      <h3>Customer <span class="urdu">کسٹمر</span>: ${customer.name}</h3>
      <p>Phone <span class="urdu">فون</span>: ${customer.phone || 'N/A'}</p>
      <p>Address <span class="urdu">پتہ</span>: ${customer.address || 'N/A'}, ${customer.city || 'N/A'}</p>
    </div>
    ${unpaidBills.map(bill => {
      const orderEntries = bill.entries.filter(e => e.entry_type === 'order');
      // Include all payment and adjustment entries (adjustments may include bad debts)
      const paymentEntries = bill.entries.filter(e => e.entry_type === 'payment' || e.entry_type === 'adjustment');
      return `
        <div class="bill-section">
          <div class="bill-header">
            <h3>Bill Number <span class="urdu">بل نمبر</span>: ${bill.bill_number}</h3>
            <p>Date <span class="urdu">تاریخ</span>: ${new Date(bill.date).toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product <span class="urdu">پروڈکٹ</span></th>
                <th>Meters <span class="urdu">میٹر</span></th>
                <th>Amount <span class="urdu">رقم</span></th>
              </tr>
            </thead>
            <tbody>
              ${orderEntries.map(e => `
                <tr>
                  <td>${e.product_name || '-'}</td>
                  <td>${e.meters || '-'}</td>
                  <td>Rs. ${parseFloat(e.order_total || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${paymentEntries.length > 0 ? `
            <h4 style="margin-top: 15px; color: #10B981;">Payments Received <span class="urdu">ادائیگیاں وصول شدہ</span>:</h4>
            <table>
              <thead>
                <tr>
                  <th>Date & Time <span class="urdu">تاریخ اور وقت</span></th>
                  <th>Description <span class="urdu">تفصیل</span></th>
                  <th>Amount <span class="urdu">رقم</span></th>
                  <th>Payment Method <span class="urdu">ادائیگی کا طریقہ</span></th>
                  <th>Transaction ID <span class="urdu">ٹرانزیکشن آئی ڈی</span></th>
                  <th>Received By <span class="urdu">وصول کنندہ</span></th>
                </tr>
              </thead>
              <tbody>
                ${paymentEntries.map(p => `
                  <tr>
                    <td>${new Date(p.date || p.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>${p.description || (p.entry_type === 'adjustment' ? 'Adjustment | ایڈجسٹمنٹ' : 'Payment received | ادائیگی موصول')}</td>
                    <td class="text-green">Rs. ${parseFloat(p.credit || 0).toFixed(2)}</td>
                    <td>${p.payment_method || 'Cash | نقد'}</td>
                    <td>${p.transaction_id || 'N/A'}</td>
                    <td>${p.received_by || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          <div class="summary">
            <p><strong>Total Bill <span class="urdu">کل بل</span>:</strong> Rs. ${bill.order_total.toFixed(2)}</p>
            <p><strong>Paid <span class="urdu">ادا شدہ</span>:</strong> <span class="text-green">Rs. ${bill.total_credit.toFixed(2)}</span></p>
            <p><strong>Remaining <span class="urdu">باقی</span>:</strong> <span class="text-red">Rs. ${bill.remaining.toFixed(2)}</span></p>
          </div>
        </div>
      `;
    }).join('')}
    <div class="summary" style="background: #fef2f2; margin-top: 30px;">
      <h3 style="color: #EF4444; margin-bottom: 10px;">Total Unpaid Amount <span class="urdu">کل غیر ادا شدہ رقم</span></h3>
      <p style="font-size: 24px; font-weight: bold; color: #EF4444;">Rs. ${totalUnpaid.toFixed(2)}</p>
    </div>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating unpaid bills PDF:', error);
    res.status(500).send('Internal server error');
  }
});

// Get billing dashboard stats
app.get('/api/billing/dashboard', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Get all billing entries
    const { data: allEntries, error: entriesError } = await supabase
      .from('billing_entries')
      .select('*, customers!inner(id, name, phone)')
      .not('bill_number', 'is', null);

    if (entriesError) throw entriesError;

    // Group by customer
    const customerStats = {};
    (allEntries || []).forEach(entry => {
      const customerId = entry.customer_id;
      if (!customerStats[customerId]) {
        customerStats[customerId] = {
          customer_id: customerId,
          customer_name: entry.customers?.name || 'Unknown',
          customer_phone: entry.customers?.phone || '',
          total_purchase: 0,
          total_received: 0,
          total_pending: 0,
          bills: {}
        };
      }

      // Track bills
      if (entry.bill_number) {
        if (!customerStats[customerId].bills[entry.bill_number]) {
          customerStats[customerId].bills[entry.bill_number] = {
            order_total: 0,
            credit: 0
          };
        }
        if (entry.order_total) {
          customerStats[customerId].bills[entry.bill_number].order_total += parseFloat(entry.order_total || 0);
        }
        customerStats[customerId].bills[entry.bill_number].credit += parseFloat(entry.credit || 0);
      }
    });

    // Calculate totals for each customer
    Object.keys(customerStats).forEach(customerId => {
      const stats = customerStats[customerId];
      Object.values(stats.bills).forEach(bill => {
        stats.total_purchase += bill.order_total;
        stats.total_received += bill.credit;
      });
      stats.total_pending = stats.total_purchase - stats.total_received;
    });

    // Convert to array and sort
    const customers = Object.values(customerStats).map(c => ({
      customer_id: c.customer_id,
      customer_name: c.customer_name,
      customer_phone: c.customer_phone,
      total_purchase: c.total_purchase,
      total_received: c.total_received,
      total_pending: Math.max(0, c.total_pending)
    }));

    // Sort by total_received (most received first)
    customers.sort((a, b) => b.total_received - a.total_received);

    // Calculate overall stats
    const overallStats = {
      total_customers: customers.length,
      total_purchase: customers.reduce((sum, c) => sum + c.total_purchase, 0),
      total_received: customers.reduce((sum, c) => sum + c.total_received, 0),
      total_pending: customers.reduce((sum, c) => sum + c.total_pending, 0),
      most_received_customer: customers[0] || null
    };

    res.json({
      overall: overallStats,
      customers: customers.slice(0, 50) // Top 50 customers
    });
  } catch (error) {
    console.error('Error fetching billing dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Record payment for a bill
app.post('/api/bills/:bill_number/payment', authenticateToken, async (req, res) => {
  try {
    const { bill_number } = req.params;
    const { amount, payment_method, received_by, transaction_id } = req.body;

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Get the bill to find customer_id
    const { data: billEntries, error: billError } = await supabase
      .from('billing_entries')
      .select('customer_id')
      .eq('bill_number', bill_number)
      .limit(1);

    if (billError || !billEntries || billEntries.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const customer_id = billEntries[0].customer_id;

    // Create payment entry with all details including date and time
    const { data: paymentEntry, error: insertError } = await supabase
      .from('billing_entries')
      .insert({
        customer_id: customer_id,
        bill_number: bill_number,
        entry_type: 'payment',
        credit: parseFloat(amount || 0),
        debit: 0,
        payment_method: payment_method || 'Cash',
        transaction_id: transaction_id || null,
        received_by: received_by || null,
        date: new Date().toISOString(),
        description: `Payment received for bill ${bill_number}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting payment:', insertError);
      throw insertError;
    }

    res.json({ 
      message: 'Payment recorded successfully',
      payment: paymentEntry
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Get payment history for a bill
app.get('/api/bills/:bill_number/payments', authenticateToken, async (req, res) => {
  try {
    const { bill_number } = req.params;

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: payments, error } = await supabase
      .from('billing_entries')
      .select('*')
      .eq('bill_number', bill_number)
      .eq('entry_type', 'payment')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ payments: payments || [] });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Get all payment history with filters
app.get('/api/payments/history', authenticateToken, async (req, res) => {
  try {
    const { customer_id, bill_number, status } = req.query; // status: 'paid', 'unpaid', or 'all'

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    let query = supabase
      .from('billing_entries')
      .select('*, customers!inner(id, name, phone, address, city)')
      .eq('entry_type', 'payment')
      .order('created_at', { ascending: false });

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    if (bill_number) {
      query = query.eq('bill_number', bill_number);
    }

    const { data: payments, error } = await query;

    if (error) throw error;

    // If status filter is provided, we need to check if the bill is paid or unpaid
    let filteredPayments = payments || [];
    
    if (status && status !== 'all') {
      // Get all bills to check their payment status
      const billNumbers = [...new Set((payments || []).map(p => p.bill_number))];
      
      if (billNumbers.length > 0) {
        const { data: billEntries, error: billError } = await supabase
          .from('billing_entries')
          .select('*')
          .in('bill_number', billNumbers);

        if (!billError && billEntries) {
          // Group by bill number and calculate status
          const billStatus = {};
          billEntries.forEach(entry => {
            if (!billStatus[entry.bill_number]) {
              billStatus[entry.bill_number] = {
                order_total: 0,
                total_credit: 0
              };
            }
            if (entry.order_total) {
              billStatus[entry.bill_number].order_total += parseFloat(entry.order_total || 0);
            }
            if (entry.credit) {
              billStatus[entry.bill_number].total_credit += parseFloat(entry.credit || 0);
            }
          });

          // Filter payments based on bill status
          filteredPayments = (payments || []).filter(payment => {
            const bill = billStatus[payment.bill_number];
            if (!bill) return false;
            
            const remaining = Math.max(0, bill.order_total - bill.total_credit);
            const isPaid = remaining <= 0;
            
            if (status === 'paid') {
              return isPaid;
            } else if (status === 'unpaid') {
              return !isPaid;
            }
            return true;
          });
        }
      }
    }

    res.json({ payments: filteredPayments });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Get bill PDF
app.get('/api/bills/:bill_number/pdf', authenticateToken, async (req, res) => {
  try {
    const { bill_number } = req.params;

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Fetch all entries for this bill
    const { data: entries, error: entriesError } = await supabase
      .from('billing_entries')
      .select('*, customers!inner(id, name, phone, address, city)')
      .eq('bill_number', bill_number)
      .order('created_at', { ascending: true });

    if (entriesError) throw entriesError;

    if (!entries || entries.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const customer = entries[0].customers;
    const orderEntries = entries.filter(e => e.entry_type === 'order');
    // Include all payment and adjustment entries (adjustments may include bad debts)
    const paymentEntries = entries.filter(e => e.entry_type === 'payment' || e.entry_type === 'adjustment');

    // Calculate totals
    const orderTotal = orderEntries.reduce((sum, e) => sum + parseFloat(e.order_total || 0), 0);
    const initialCredit = orderEntries.reduce((sum, e) => sum + parseFloat(e.credit || 0), 0);
    const paymentCredit = paymentEntries.reduce((sum, e) => sum + parseFloat(e.credit || 0), 0);
    const totalCredit = initialCredit + paymentCredit;
    const remaining = Math.max(0, orderTotal - totalCredit);

    const billDate = entries[0].date || entries[0].created_at;
    const paymentMethod = entries[0].payment_method || 'Cash';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bill ${bill_number}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .urdu { font-family: 'Noto Nastaliq Urdu', 'Nori Nastaleeq', 'Jameel Noori Nastaleeq', Arial, sans-serif; direction: rtl; }
    .bill-container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4F46E5; padding-bottom: 20px; }
    .header h1 { color: #4F46E5; font-size: 32px; margin-bottom: 10px; }
    .header h1 .urdu { font-size: 28px; }
    .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; }
    .info-box h3 { color: #4F46E5; font-size: 16px; margin-bottom: 10px; }
    .info-box h3 .urdu { font-size: 14px; }
    .products-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .products-table th { background: #4F46E5; color: white; padding: 12px; text-align: left; }
    .products-table th .urdu { font-size: 0.85em; }
    .products-table td { padding: 10px; border-bottom: 1px solid #e0e0e0; }
    .payment-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .payment-table th { background: #10B981; color: white; padding: 12px; text-align: left; }
    .payment-table th .urdu { font-size: 0.85em; }
    .payment-table td { padding: 10px; border-bottom: 1px solid #e0e0e0; }
    .summary-section { margin-top: 30px; border-top: 2px solid #e0e0e0; padding-top: 20px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .summary-row.total { font-size: 18px; font-weight: bold; border-top: 2px solid #4F46E5; margin-top: 10px; padding-top: 15px; }
    @media print {
      body { background: white; }
      .bill-container { box-shadow: none; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="bill-container">
    <div class="header">
      <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #1e40af 0%, #10b981 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="color: white; font-size: 32px; font-weight: bold;">AK</div>
        </div>
        <div>
          <h1 style="color: #1e40af; font-size: 32px; margin: 0;">ADNAN KHADAR HOUSE</h1>
          <p style="color: #10b981; font-size: 14px; margin: 5px 0 0 0; font-weight: 600;">High Quality</p>
        </div>
      </div>
      <h2 style="color: #4F46E5; font-size: 24px; margin-top: 15px;">BILL <span class="urdu">بل</span></h2>
      <p style="font-size: 16px; color: #666;">Bill Number <span class="urdu">بل نمبر</span>: <strong>${bill_number}</strong></p>
      <p style="font-size: 14px; color: #666;">Date <span class="urdu">تاریخ</span>: ${new Date(billDate).toLocaleDateString()}</p>
    </div>
    <div class="info-section">
      <div class="info-box">
        <h3>Customer Information <span class="urdu">کسٹمر کی معلومات</span></h3>
        <p><strong>Name <span class="urdu">نام</span>:</strong> ${customer?.name || 'N/A'}</p>
        <p><strong>Phone <span class="urdu">فون</span>:</strong> ${customer?.phone || 'N/A'}</p>
        <p><strong>Address <span class="urdu">پتہ</span>:</strong> ${customer?.address || 'N/A'}</p>
        <p><strong>City <span class="urdu">شہر</span>:</strong> ${customer?.city || 'N/A'}</p>
      </div>
      <div class="info-box">
        <h3>Payment Details <span class="urdu">ادائیگی کی تفصیلات</span></h3>
        <p><strong>Payment Method <span class="urdu">ادائیگی کا طریقہ</span>:</strong> ${paymentMethod}</p>
        <p><strong>Total Amount <span class="urdu">کل رقم</span>:</strong> Rs. ${orderTotal.toFixed(2)}</p>
        <p><strong>Received So Far <span class="urdu">اب تک وصول شدہ</span>:</strong> Rs. ${totalCredit.toFixed(2)}</p>
        <p><strong>Remaining <span class="urdu">باقی</span>:</strong> Rs. ${remaining.toFixed(2)}</p>
      </div>
    </div>
    <table class="products-table">
      <thead>
        <tr>
          <th>Product Name <span class="urdu">پروڈکٹ کا نام</span></th>
          <th>Meters <span class="urdu">میٹر</span></th>
          <th>Meter Price <span class="urdu">فی میٹر قیمت</span></th>
          <th>Amount <span class="urdu">رقم</span></th>
        </tr>
      </thead>
      <tbody>
        ${orderEntries.map(e => `
          <tr>
            <td>${e.product_name || 'N/A'}</td>
            <td>${e.meters || 'N/A'}</td>
            <td>Rs. ${parseFloat(e.order_total || 0).toFixed(2)}</td>
            <td>Rs. ${parseFloat(e.order_total || 0).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${paymentEntries.length > 0 ? `
      <h3 style="margin-top: 30px; color: #10B981;">Payment History <span class="urdu">ادائیگی کی تاریخ</span></h3>
      <table class="payment-table">
        <thead>
          <tr>
            <th>Date & Time <span class="urdu">تاریخ اور وقت</span></th>
            <th>Description <span class="urdu">تفصیل</span></th>
            <th>Amount <span class="urdu">رقم</span></th>
            <th>Payment Method <span class="urdu">ادائیگی کا طریقہ</span></th>
            <th>Transaction ID <span class="urdu">ٹرانزیکشن آئی ڈی</span></th>
            <th>Received By <span class="urdu">وصول کنندہ</span></th>
          </tr>
        </thead>
        <tbody>
          ${paymentEntries.map(p => `
            <tr>
              <td>${new Date(p.date || p.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td>${p.description || (p.entry_type === 'adjustment' ? 'Adjustment | ایڈجسٹمنٹ' : 'Payment received | ادائیگی موصول')}</td>
              <td style="color: green; font-weight: bold;">Rs. ${parseFloat(p.credit || 0).toFixed(2)}</td>
              <td>${p.payment_method || 'Cash | نقد'}</td>
              <td>${p.transaction_id || 'N/A'}</td>
              <td>${p.received_by || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    <div class="summary-section">
      <div class="summary-row">
        <span>Total Amount <span class="urdu">کل رقم</span>:</span>
        <span>Rs. ${orderTotal.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Paid Amount <span class="urdu">ادا شدہ رقم</span>:</span>
        <span style="color: green;">Rs. ${totalCredit.toFixed(2)}</span>
      </div>
      <div class="summary-row total">
        <span>Remaining Amount <span class="urdu">باقی رقم</span>:</span>
        <span style="color: red;">Rs. ${remaining.toFixed(2)}</span>
      </div>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating bill PDF:', error);
    res.status(500).json({ error: 'Failed to generate bill PDF' });
  }
});

// Delete a bill
app.delete('/api/bills/:bill_number', authenticateToken, async (req, res) => {
  try {
    const { bill_number } = req.params;

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Delete all entries for this bill
    const { error: deleteError } = await supabase
      .from('billing_entries')
      .delete()
      .eq('bill_number', bill_number);

    if (deleteError) {
      console.error('Error deleting bill:', deleteError);
      throw deleteError;
    }

    res.json({ message: `Bill ${bill_number} deleted successfully` });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

// ============================================
// BULK ORDER UPDATE ROUTES
// ============================================

// Bulk update order status
app.post('/api/orders/bulk-update-status', authenticateToken, async (req, res) => {
  try {
    const { orders, seller_id } = req.body;

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'Orders array is required' });
    }

    if (!seller_id) {
      return res.status(400).json({ error: 'Seller ID is required' });
    }

    const updated = [];
    const errors = [];

    for (const orderUpdate of orders) {
      try {
        const { seller_reference_number, status } = orderUpdate;

        if (!seller_reference_number) {
          errors.push({ ref: seller_reference_number || 'N/A', error: 'Reference number is required' });
          continue;
        }

        // Find order by reference number and seller_id
        const { data: order, error: findError } = await supabase
          .from('orders')
          .select('id')
          .eq('seller_reference_number', seller_reference_number)
          .eq('seller_id', seller_id)
          .single();

        if (findError || !order) {
          errors.push({ ref: seller_reference_number, error: 'Order not found for this seller' });
          continue;
        }

        // Update order status
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: status.toLowerCase() })
          .eq('id', order.id);

        if (updateError) {
          errors.push({ ref: seller_reference_number, error: updateError.message });
        } else {
          updated.push(seller_reference_number);
        }
      } catch (error) {
        errors.push({ ref: orderUpdate.seller_reference_number || 'N/A', error: error.message });
      }
    }

    res.json({ updated, errors });
  } catch (error) {
    console.error('Error bulk updating order status:', error);
    res.status(500).json({ error: 'Failed to bulk update order status' });
  }
});

// Bulk update tracking IDs
app.post('/api/orders/bulk-update-tracking', authenticateToken, async (req, res) => {
  try {
    const { updates, seller_id } = req.body;

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    if (!seller_id) {
      return res.status(400).json({ error: 'Seller ID is required' });
    }

    const updated = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { seller_reference_number, tracking_id } = update;

        if (!seller_reference_number || !tracking_id) {
          errors.push({ ref: seller_reference_number || 'N/A', error: 'Reference number and tracking ID are required' });
          continue;
        }

        // Find order by reference number and seller_id
        const { data: order, error: findError } = await supabase
          .from('orders')
          .select('id')
          .eq('seller_reference_number', seller_reference_number)
          .eq('seller_id', seller_id)
          .single();

        if (findError || !order) {
          errors.push({ ref: seller_reference_number, error: 'Order not found for this seller' });
          continue;
        }

        // Update tracking ID
        const { error: updateError } = await supabase
          .from('orders')
          .update({ tracking_id: tracking_id })
          .eq('id', order.id);

        if (updateError) {
          errors.push({ ref: seller_reference_number, error: updateError.message });
        } else {
          updated.push(seller_reference_number);
        }
      } catch (error) {
        errors.push({ ref: update.seller_reference_number || 'N/A', error: error.message });
      }
    }

    res.json({ updated, errors });
  } catch (error) {
    console.error('Error bulk updating tracking IDs:', error);
    res.status(500).json({ error: 'Failed to bulk update tracking IDs' });
  }
});

// Bulk return scan
app.post('/api/orders/bulk-return-scan', authenticateToken, async (req, res) => {
  try {
    const { tracking_ids, seller_id } = req.body;

    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (!tracking_ids || !Array.isArray(tracking_ids) || tracking_ids.length === 0) {
      return res.status(400).json({ error: 'Tracking IDs array is required' });
    }

    if (!seller_id) {
      return res.status(400).json({ error: 'Seller ID is required' });
    }

    const updated = [];
    const errors = [];

    for (const trackingId of tracking_ids) {
      try {
        if (!trackingId || !trackingId.trim()) {
          continue;
        }

        // Find order by tracking_id and seller_id
        const { data: order, error: findError } = await supabase
          .from('orders')
          .select('id, seller_reference_number, status, product_codes, qty')
          .eq('tracking_id', trackingId.trim())
          .eq('seller_id', seller_id)
          .single();

        if (findError || !order) {
          errors.push({ tracking_id: trackingId, error: 'Order not found for this seller' });
          continue;
        }

        const oldStatus = (order.status || '').toLowerCase().trim();
        
        // Update order status to return
        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update({ 
            status: 'returned',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)
          .select()
          .single();

        if (updateError) {
          errors.push({ tracking_id: trackingId, error: updateError.message });
        } else {
          // Add inventory back if order was previously confirmed/delivered
          if (['confirmed', 'delivered'].includes(oldStatus)) {
            const productCodesArray = parseProductCodes(order.product_codes || '');
            const orderQty = parseInt(order.qty || 1);
            await addInventoryBack(seller_id, productCodesArray, orderQty);
          }
          
          updated.push(order.seller_reference_number || trackingId);
        }
      } catch (error) {
        errors.push({ tracking_id: trackingId || 'N/A', error: error.message });
      }
    }

    res.json({ updated, errors });
  } catch (error) {
    console.error('Error bulk return scan:', error);
    res.status(500).json({ error: 'Failed to process bulk return scan' });
  }
});

// ============================================
// PURCHASING SYSTEM API ENDPOINTS
// ============================================

// Get all suppliers
app.get('/api/purchasing/suppliers', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    // Calculate balance for each supplier
    const suppliersWithBalance = await Promise.all(
      suppliers.map(async (supplier) => {
        const { data: purchases } = await supabase
          .from('purchases')
          .select('debit_amount')
          .eq('supplier_id', supplier.id);

        const { data: payments } = await supabase
          .from('purchase_payments')
          .select('amount')
          .eq('supplier_id', supplier.id);

        const totalPurchases = purchases?.reduce((sum, p) => sum + parseFloat(p.debit_amount || 0), 0) || 0;
        const totalPayments = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
        const balance = totalPurchases - totalPayments;

        return { ...supplier, balance };
      })
    );

    res.json({ suppliers: suppliersWithBalance });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Get single supplier
app.get('/api/purchasing/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json({ supplier });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// Create supplier
app.post('/api/purchasing/suppliers', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const supplierData = req.body;
    
    // Validate required fields
    if (!supplierData.name || !supplierData.phone) {
      return res.status(400).json({ error: 'Name and phone are required fields' });
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert([supplierData])
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      // Return more specific error message
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Supplier with this phone number already exists' });
      }
      return res.status(500).json({ error: error.message || 'Failed to create supplier' });
    }
    res.json({ supplier });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: error.message || 'Failed to create supplier' });
  }
});

// Bulk upload suppliers
app.post('/api/purchasing/suppliers/bulk-upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel/CSV file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'No data found in file' });
    }

    let totalAdded = 0;
    let totalSkipped = 0;
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      try {
        // Extract data from row (support multiple column name formats)
        const name = row['Name'] || row['name'] || row['Supplier Name'] || row['supplier_name'] || '';
        const company_name = row['Company Name'] || row['company_name'] || row['Company'] || row['company'] || '';
        const phone = row['Phone'] || row['phone'] || row['Phone Number'] || row['phone_number'] || row['Contact'] || row['contact'] || '';
        const phone_2 = row['Phone 2'] || row['phone_2'] || row['Phone Number 2'] || row['phone_number_2'] || row['Contact 2'] || row['contact_2'] || '';
        const email = row['Email'] || row['email'] || '';
        const address = row['Address'] || row['address'] || '';
        const city = row['City'] || row['city'] || '';
        const cnic = row['CNIC'] || row['cnic'] || row['CNIC Number'] || row['cnic_number'] || '';
        const ntn = row['NTN'] || row['ntn'] || row['NTN Number'] || row['ntn_number'] || '';
        const bank_account = row['Bank Account'] || row['bank_account'] || row['Account Number'] || row['account_number'] || '';
        const bank_name = row['Bank Name'] || row['bank_name'] || row['Bank'] || row['bank'] || '';
        const notes = row['Notes'] || row['notes'] || row['Note'] || row['note'] || '';
        const is_active = row['Active'] !== undefined ? (row['Active'] === true || row['Active'] === 'Yes' || row['Active'] === 'yes' || row['Active'] === 1 || row['Active'] === '1') : true;

        // Validate required fields
        if (!name || !phone) {
          errors.push({ row: i + 2, error: 'Name and phone are required' });
          totalSkipped++;
          continue;
        }

        // Check if supplier with same phone already exists
        const { data: existingSupplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('phone', phone.trim())
          .single();

        if (existingSupplier) {
          totalSkipped++;
          continue; // Skip duplicate
        }

        // Insert new supplier
        const { error: insertError } = await supabase
          .from('suppliers')
          .insert({
            name: name.trim(),
            company_name: company_name?.trim() || null,
            phone: phone.trim(),
            phone_2: phone_2?.trim() || null,
            email: email?.trim() || null,
            address: address?.trim() || null,
            city: city?.trim() || null,
            cnic: cnic?.trim() || null,
            ntn: ntn?.trim() || null,
            bank_account: bank_account?.trim() || null,
            bank_name: bank_name?.trim() || null,
            notes: notes?.trim() || null,
            is_active: is_active
          });

        if (insertError) {
          errors.push({ row: i + 2, error: insertError.message });
          totalSkipped++;
        } else {
          totalAdded++;
        }
      } catch (error) {
        errors.push({ row: i + 2, error: error.message || 'Unknown error' });
        totalSkipped++;
      }
    }

    res.json({
      added: totalAdded,
      skipped: totalSkipped,
      total: jsonData.length,
      errors: errors.slice(0, 10) // Return first 10 errors
    });
  } catch (error) {
    console.error('Error bulk uploading suppliers:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk upload suppliers' });
  }
});

// Update supplier
app.put('/api/purchasing/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const supplierData = req.body;
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update(supplierData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ supplier });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// Delete supplier
app.delete('/api/purchasing/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

// Get next purchase bill number
app.get('/api/purchasing/next-bill-number', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: lastPurchase, error } = await supabase
      .from('purchases')
      .select('bill_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (!error && lastPurchase?.bill_number) {
      const match = lastPurchase.bill_number.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    const billNumber = `PUR-${String(nextNumber).padStart(6, '0')}`;
    res.json({ bill_number: billNumber });
  } catch (error) {
    console.error('Error getting next bill number:', error);
    res.status(500).json({ error: 'Failed to get next bill number' });
  }
});

// Create purchase with items
app.post('/api/purchasing/purchases', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { supplier_id, bill_number, bill_date, description, items, debit_amount, credit_amount, payment_method } = req.body;

    // Calculate totals from items if not provided
    let calculatedDebit = parseFloat(debit_amount || 0);
    if (!calculatedDebit && items && items.length > 0) {
      calculatedDebit = items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        return sum + (qty * unitPrice);
      }, 0);
    }

    const finalDebitAmount = calculatedDebit;
    const finalCreditAmount = parseFloat(credit_amount || 0);
    const finalPaymentMethod = payment_method || 'Credit';
    const isPaid = finalPaymentMethod !== 'Credit' && finalDebitAmount > 0;
    const paidAmount = isPaid ? finalDebitAmount : 0;
    const remainingAmount = isPaid ? 0 : finalDebitAmount;

    // Create purchase
    const purchaseData = {
      supplier_id,
      bill_number,
      bill_date: bill_date || new Date().toISOString().split('T')[0],
      description: description || '',
      total_amount: finalDebitAmount,
      debit_amount: finalDebitAmount,
      credit_amount: finalCreditAmount,
      payment_method: finalPaymentMethod,
      is_paid: isPaid,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount
    };

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert([purchaseData])
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // Create purchase items
    if (items && items.length > 0) {
      const itemsData = items.map(item => {
        const qty = parseFloat(item.quantity || 1);
        const unitPrice = parseFloat(item.unit_price || 0);
        const calculatedTotal = qty * unitPrice;
        return {
          purchase_id: purchase.id,
          product_name: item.product_name || '',
          description: item.description || '',
          quantity: qty,
          unit: item.unit || 'pcs',
          unit_price: unitPrice,
          total_price: parseFloat(item.total_price || calculatedTotal)
        };
      });

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;
    }

    // If payment is made, create payment record
    if (isPaid && finalDebitAmount > 0) {
      const paymentData = {
        purchase_id: purchase.id,
        supplier_id,
        payment_date: bill_date || new Date().toISOString().split('T')[0],
        amount: finalDebitAmount,
        payment_method: finalPaymentMethod,
        received_by: req.user?.name || req.user?.email || 'Admin'
      };

      const { error: paymentError } = await supabase
        .from('purchase_payments')
        .insert([paymentData]);

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        // Don't throw - purchase is already created
      }
    }

    // Get purchase with items
    const { data: purchaseWithItems, error: fetchError } = await supabase
      .from('purchases')
      .select(`
        *,
        purchase_items (*),
        suppliers (*)
      `)
      .eq('id', purchase.id)
      .single();

    if (fetchError) throw fetchError;

    res.json({ purchase: purchaseWithItems });
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: 'Failed to create purchase' });
  }
});

// Get all purchases
app.get('/api/purchasing/purchases', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { supplier_id, is_paid } = req.query;

    let query = supabase
      .from('purchases')
      .select(`
        *,
        purchase_items (*),
        suppliers (*)
      `)
      .order('bill_date', { ascending: false });

    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    }

    if (is_paid !== undefined) {
      query = query.eq('is_paid', is_paid === 'true');
    }

    const { data: purchases, error } = await query;

    if (error) throw error;
    res.json({ purchases: purchases || [] });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Get single purchase
app.get('/api/purchasing/purchases/:id', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const { data: purchase, error } = await supabase
      .from('purchases')
      .select(`
        *,
        purchase_items (*),
        suppliers (*),
        purchase_payments (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json({ purchase });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
});

// Add payment to purchase
app.post('/api/purchasing/payments', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { purchase_id, supplier_id, payment_date, amount, payment_method, transaction_id, received_by, notes } = req.body;

    // Validate required fields
    if (!purchase_id || !supplier_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields: purchase_id, supplier_id, amount, payment_method' });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    // Get current purchase status
    const { data: currentPurchase, error: purchaseFetchError } = await supabase
      .from('purchases')
      .select('paid_amount, debit_amount, remaining_amount')
      .eq('id', purchase_id)
      .single();

    if (purchaseFetchError || !currentPurchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Check if payment exceeds remaining amount
    const currentRemaining = parseFloat(currentPurchase.remaining_amount || 0);
    if (paymentAmount > currentRemaining) {
      return res.status(400).json({ error: `Payment amount (${paymentAmount}) exceeds remaining amount (${currentRemaining})` });
    }

    // Create payment
    const paymentData = {
      purchase_id,
      supplier_id,
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      amount: paymentAmount,
      payment_method,
      transaction_id: transaction_id || null,
      received_by: received_by || req.user?.name || req.user?.email || 'Admin',
      notes: notes || null
    };

    const { data: payment, error: paymentError } = await supabase
      .from('purchase_payments')
      .insert([paymentData])
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Update purchase payment status
    const currentPaidAmount = parseFloat(currentPurchase.paid_amount || 0);
    const newPaidAmount = currentPaidAmount + paymentAmount;
    const remainingAmount = Math.max(0, parseFloat(currentPurchase.debit_amount || 0) - newPaidAmount);
    const isPaid = remainingAmount <= 0.01; // Allow small rounding differences

    await supabase
      .from('purchases')
      .update({
        paid_amount: newPaidAmount,
        remaining_amount: Math.max(0, remainingAmount),
        is_paid: isPaid
      })
      .eq('id', purchase_id);

    res.json({ payment });
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ error: 'Failed to add payment' });
  }
});

// Get purchase payments
app.get('/api/purchasing/payments', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { supplier_id, purchase_id } = req.query;

    let query = supabase
      .from('purchase_payments')
      .select(`
        *,
        purchases (*),
        suppliers (*)
      `)
      .order('payment_date', { ascending: false });

    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    }

    if (purchase_id) {
      query = query.eq('purchase_id', purchase_id);
    }

    const { data: payments, error } = await query;

    if (error) throw error;
    res.json({ payments: payments || [] });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get purchasing dashboard stats
app.get('/api/purchasing/dashboard', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Total suppliers
    const { count: totalSuppliers } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Total purchases
    const { data: allPurchases } = await supabase
      .from('purchases')
      .select('debit_amount, paid_amount, remaining_amount, is_paid');

    const totalPurchases = allPurchases?.reduce((sum, p) => sum + parseFloat(p.debit_amount || 0), 0) || 0;
    const totalPaid = allPurchases?.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0) || 0;
    const totalRemaining = allPurchases?.reduce((sum, p) => sum + parseFloat(p.remaining_amount || 0), 0) || 0;

    // Recent purchases
    const { data: recentPurchases } = await supabase
      .from('purchases')
      .select(`
        *,
        suppliers (name, company_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    // Suppliers with balance
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name, company_name')
      .eq('is_active', true);

    const suppliersWithBalance = await Promise.all(
      suppliers.map(async (supplier) => {
        const { data: purchases } = await supabase
          .from('purchases')
          .select('debit_amount')
          .eq('supplier_id', supplier.id);

        const { data: payments } = await supabase
          .from('purchase_payments')
          .select('amount')
          .eq('supplier_id', supplier.id);

        const totalPurchases = purchases?.reduce((sum, p) => sum + parseFloat(p.debit_amount || 0), 0) || 0;
        const totalPayments = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
        const balance = totalPurchases - totalPayments;

        return { ...supplier, balance, totalPurchases, totalPayments };
      })
    );

    res.json({
      totalSuppliers: totalSuppliers || 0,
      totalPurchases,
      totalPaid,
      totalRemaining,
      recentPurchases: recentPurchases || [],
      suppliersWithBalance: suppliersWithBalance.filter(s => s.balance > 0)
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Generate purchase bill PDF (HTML)
app.get('/api/purchasing/purchases/:id/pdf', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const { data: purchase, error } = await supabase
      .from('purchases')
      .select(`
        *,
        purchase_items (*),
        suppliers (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Fetch payment history for this purchase
    const { data: payments, error: paymentsError } = await supabase
      .from('purchase_payments')
      .select('*, created_at')
      .eq('purchase_id', id)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    const supplier = purchase.suppliers || {};
    const items = purchase.purchase_items || [];
    const billDate = purchase.bill_date || purchase.created_at;
    const paymentHistory = payments || [];

    const html = generatePurchaseBillHTML(purchase, supplier, items, billDate, paymentHistory);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Helper function to generate purchase bill HTML
function generatePurchaseBillHTML(purchase, supplier, items, billDate, paymentHistory = []) {
  const brandInfo = {
    name: 'Adnan Khaddar House',
    address: 'Kamalia, Pakistan',
    phone: '+92 300 1234567'
  };

  // Ensure supplier is an object
  const safeSupplier = supplier || {};
  
  // Format date safely
  let formattedDate = 'N/A';
  try {
    if (billDate) {
      formattedDate = new Date(billDate).toLocaleDateString('en-GB');
    }
  } catch (e) {
    formattedDate = String(billDate || 'N/A');
  }

  // Format payment date with time
  const formatPaymentDate = (payment) => {
    try {
      // Use created_at for time if available, otherwise use payment_date
      const dateTimeStr = payment.created_at || payment.payment_date;
      if (dateTimeStr) {
        const date = new Date(dateTimeStr);
        const dateStr = date.toLocaleDateString('en-GB');
        const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `${dateStr} ${timeStr}`;
      }
    } catch (e) {
      // Fallback to just date if time parsing fails
      try {
        if (payment.payment_date) {
          return new Date(payment.payment_date).toLocaleDateString('en-GB');
        }
      } catch (e2) {
        return String(payment.payment_date || 'N/A');
      }
    }
    return 'N/A';
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Bill - ${purchase.bill_number}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; direction: rtl; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #10B981; padding-bottom: 20px; }
    .header h1 { color: #10B981; font-size: 32px; margin-bottom: 10px; }
    .header h2 { color: #059669; font-size: 24px; }
    .bill-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-section { flex: 1; }
    .info-section h3 { color: #10B981; margin-bottom: 10px; font-size: 18px; }
    .info-section p { margin: 5px 0; color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; direction: rtl; }
    th { background: #10B981; color: white; padding: 12px; text-align: right; font-weight: bold; }
    td { padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right; }
    tr:nth-child(even) { background: #f9f9f9; }
    .summary { background: #f0f0f0; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
    .summary-row:last-child { border-bottom: none; font-weight: bold; font-size: 18px; color: #10B981; }
    .urdu { font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Al Qalam Taj Nastaleeq', 'Nafees Web Naskh', Arial, sans-serif; font-weight: 400; }
    .payment-section { margin-top: 30px; }
    .payment-section h3 { color: #10B981; margin-bottom: 15px; font-size: 20px; }
    .payment-table { margin-top: 15px; }
    .no-payments { text-align: center; padding: 20px; color: #666; font-style: italic; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 20px; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #1e40af 0%, #10b981 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="color: white; font-size: 32px; font-weight: bold;">AK</div>
        </div>
        <div>
          <h1 style="color: #1e40af; font-size: 32px; margin: 0;">ADNAN KHADAR HOUSE</h1>
          <p style="color: #10b981; font-size: 14px; margin: 5px 0 0 0; font-weight: 600;">High Quality</p>
        </div>
      </div>
      <h2 style="color: #10B981; font-size: 24px; margin-top: 15px;">PURCHASE BILL <span class="urdu">خریداری کا بل</span></h2>
      <p style="font-size: 14px; color: #666; margin-top: 10px;">${brandInfo.address} | ${brandInfo.phone}</p>
    </div>
    
    <div class="bill-info">
      <div class="info-section">
        <h3>Bill Information <span class="urdu">بل کی معلومات</span></h3>
        <p><strong>Bill Number:</strong> ${purchase.bill_number}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Payment Method:</strong> ${purchase.payment_method || 'Credit'}</p>
        <p><strong>Status:</strong> ${purchase.is_paid ? 'Paid' : 'Unpaid'} <span class="urdu">${purchase.is_paid ? 'ادا شدہ' : 'غیر ادا شدہ'}</span></p>
      </div>
      <div class="info-section">
        <h3>Supplier Information <span class="urdu">فروش کی معلومات</span></h3>
        <p><strong>Name:</strong> ${safeSupplier.name || 'N/A'}</p>
        <p><strong>Company:</strong> ${safeSupplier.company_name || 'N/A'}</p>
        <p><strong>Phone:</strong> ${safeSupplier.phone || 'N/A'}</p>
        <p><strong>Address:</strong> ${safeSupplier.address || 'N/A'}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Product Name <span class="urdu">پروڈکٹ کا نام</span></th>
          <th>Description <span class="urdu">تفصیل</span></th>
          <th>Quantity <span class="urdu">مقدار</span></th>
          <th>Unit Price <span class="urdu">فی اکائی قیمت</span></th>
          <th>Total <span class="urdu">کل</span></th>
        </tr>
      </thead>
      <tbody>
        ${(items || []).map((item, idx) => {
          const qty = parseFloat(item.quantity || 0);
          const unitPrice = parseFloat(item.unit_price || 0);
          const totalPrice = parseFloat(item.total_price || 0) || (qty * unitPrice);
          return `
          <tr>
            <td>${idx + 1}</td>
            <td>${(item.product_name || 'N/A').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            <td>${(item.description || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            <td>${qty} ${item.unit || 'pcs'}</td>
            <td>Rs. ${unitPrice.toFixed(2)}</td>
            <td>Rs. ${totalPrice.toFixed(2)}</td>
          </tr>
        `;
        }).join('')}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row">
        <span>Total Amount <span class="urdu">کل رقم</span>:</span>
        <span>Rs. ${parseFloat(purchase.debit_amount || 0).toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Paid Amount <span class="urdu">ادا شدہ رقم</span>:</span>
        <span>Rs. ${parseFloat(purchase.paid_amount || 0).toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Remaining Amount <span class="urdu">باقی رقم</span>:</span>
        <span>Rs. ${parseFloat(purchase.remaining_amount || 0).toFixed(2)}</span>
      </div>
      ${purchase.description ? `
      <div class="summary-row">
        <span>Description <span class="urdu">تفصیل</span>:</span>
        <span>${(purchase.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
      </div>
      ` : ''}
    </div>

    <div class="payment-section">
      <h3>Payment History <span class="urdu">ادائیگی کی تاریخ</span></h3>
      ${paymentHistory && paymentHistory.length > 0 ? `
      <table class="payment-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Payment Date <span class="urdu">ادائیگی کی تاریخ</span></th>
            <th>Amount <span class="urdu">رقم</span></th>
            <th>Payment Method <span class="urdu">ادائیگی کا طریقہ</span></th>
            <th>Transaction ID <span class="urdu">ٹرانزیکشن آئی ڈی</span></th>
            <th>Received By <span class="urdu">وصول کنندہ</span></th>
            <th>Notes <span class="urdu">نوٹس</span></th>
          </tr>
        </thead>
        <tbody>
          ${paymentHistory.map((payment, idx) => {
            const paymentDate = formatPaymentDate(payment);
            const amount = parseFloat(payment.amount || 0);
            const paymentMethod = payment.payment_method || 'N/A';
            const transactionId = payment.transaction_id || '-';
            const receivedBy = payment.received_by || '-';
            const notes = payment.notes || '-';
            return `
            <tr>
              <td>${idx + 1}</td>
              <td>${paymentDate}</td>
              <td>Rs. ${amount.toFixed(2)}</td>
              <td>${paymentMethod}</td>
              <td>${transactionId}</td>
              <td>${receivedBy}</td>
              <td>${notes}</td>
            </tr>
          `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #e0f2fe; font-weight: bold;">
            <td colspan="2" style="text-align: left;"><span class="urdu">کل ادائیگیاں</span> Total Payments:</td>
            <td>Rs. ${paymentHistory.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2)}</td>
            <td colspan="4"></td>
          </tr>
        </tfoot>
      </table>
      ` : `
      <div class="no-payments">
        <p><span class="urdu">کوئی ادائیگی نہیں ملی</span> No payments found</p>
      </div>
      `}
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================
// EXPENSES TRACKER ROUTES
// ============================================

// Get expenses summary (profit, sales, purchases, expenses)
app.get('/api/expenses/summary', authenticateToken, async (req, res) => {
  console.log('[API] /api/expenses/summary - Request received');
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Only admin can access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { timeRange = 'month' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // 1. Get Total Admin Profit from Dashboard (delivered orders profit)
    const { data: deliveredOrders, error: ordersError } = await supabase
      .from('orders')
      .select('profit, status')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'delivered');

    const totalAdminProfit = !ordersError && deliveredOrders
      ? deliveredOrders.reduce((sum, order) => sum + parseFloat(order.profit || 0), 0)
      : 0;

    // 2. Get Total Received from Generate Bill (billing_entries credit where entry_type = 'order')
    // Group by bill_number to calculate remaining correctly
    let totalReceived = 0;
    let remainingBills = 0;
    try {
      const { data: billEntries, error: billsError } = await supabase
        .from('billing_entries')
        .select('bill_number, order_total, credit')
        .gte('date', startDate.toISOString())
        .eq('entry_type', 'order')
        .not('bill_number', 'is', null);

      if (!billsError && billEntries) {
        // Group by bill_number
        const billsMap = {};
        billEntries.forEach(entry => {
          const billNum = entry.bill_number;
          if (!billsMap[billNum]) {
            billsMap[billNum] = {
              order_total: 0,
              credit: 0
            };
          }
          billsMap[billNum].order_total += parseFloat(entry.order_total || 0);
          billsMap[billNum].credit += parseFloat(entry.credit || 0);
        });

        // Calculate total received and remaining for each bill
        Object.values(billsMap).forEach(bill => {
          totalReceived += bill.credit;
          const remaining = Math.max(0, bill.order_total - bill.credit);
          remainingBills += remaining;
        });
      }
    } catch (e) {
      console.log('billing_entries table not found, skipping bill calculation');
    }

    // 3. Get Purchase Total Paid and Remaining Purchase
    let purchaseTotalPaid = 0;
    let remainingPurchase = 0;
    try {
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchases')
        .select('debit_amount, paid_amount')
        .gte('bill_date', startDate.toISOString().split('T')[0]);

      if (!purchasesError && purchases) {
        purchases.forEach(purchase => {
          const debitAmount = parseFloat(purchase.debit_amount || 0);
          const paidAmount = parseFloat(purchase.paid_amount || 0);
          purchaseTotalPaid += paidAmount;
          const remaining = Math.max(0, debitAmount - paidAmount);
          remainingPurchase += remaining;
        });
      }
    } catch (e) {
      console.log('purchases table not found, skipping purchase calculation');
    }

    // Calculate Total Profit = Admin Profit + Total Received - Purchase Total Paid
    const totalProfit = totalAdminProfit + totalReceived - purchaseTotalPaid;

    // Get total sales (delivered orders seller_price) - for display only
    const { data: salesOrders, error: salesError } = await supabase
      .from('orders')
      .select('seller_price, status')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'delivered');

    const totalSales = !salesError && salesOrders
      ? salesOrders.reduce((sum, order) => sum + parseFloat(order.seller_price || 0), 0)
      : 0;

    // Get total purchases (all purchases debit_amount) - for display only
    let totalPurchases = 0;
    try {
      const { data: allPurchases, error: allPurchasesError } = await supabase
        .from('purchases')
        .select('debit_amount')
        .gte('bill_date', startDate.toISOString().split('T')[0]);

      if (!allPurchasesError && allPurchases) {
        totalPurchases = allPurchases.reduce((sum, purchase) => sum + parseFloat(purchase.debit_amount || 0), 0);
      }
    } catch (e) {
      console.log('purchases table not found, skipping total purchases calculation');
    }

    // Get total expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', startDate.toISOString().split('T')[0]);

    if (expensesError) {
      console.error('Error fetching expenses for summary:', expensesError);
      // Check if table doesn't exist
      if (expensesError.code === '42P01' || expensesError.message?.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Expenses table does not exist. Please run expenses-schema.sql in Supabase SQL Editor.',
          totalProfit,
          totalSales,
          totalPurchases,
          totalExpenses: 0,
          netProfit: totalProfit
        });
      }
    }

    const totalExpenses = !expensesError && expenses
      ? expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
      : 0;

    // Calculate net profit (Total Profit - All Expenses by Categories)
    const netProfit = totalProfit - totalExpenses;

    res.json({
      totalAdminProfit,
      totalReceived,
      purchaseTotalPaid,
      remainingPurchase,
      remainingBills,
      totalProfit, // Calculated: Admin Profit + Received - Purchase Paid
      totalSales,
      totalPurchases,
      totalExpenses,
      netProfit // Final: Total Profit - All Expenses
    });
  } catch (error) {
    console.error('Error fetching expenses summary:', error);
    res.status(500).json({ error: 'Failed to fetch expenses summary' });
  }
});

// Get expenses chart data
app.get('/api/expenses/chart', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { timeRange = 'month' } = req.query;
    
    const now = new Date();
    let startDate = new Date();
    let groupBy = 'day';
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        groupBy = 'day';
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        groupBy = 'day';
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        groupBy = 'week';
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        groupBy = 'week';
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        groupBy = 'month';
        break;
    }

    // Get expenses grouped by date
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('expense_date, amount')
      .gte('expense_date', startDate.toISOString().split('T')[0])
      .order('expense_date', { ascending: true });

    if (expensesError) {
      console.error('Error fetching expenses for chart:', expensesError);
      // Check if table doesn't exist
      if (expensesError.code === '42P01' || expensesError.message?.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Expenses table does not exist. Please run expenses-schema.sql in Supabase SQL Editor.',
          chartData: []
        });
      }
    }

    // Get invoices profit grouped by date
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('invoice_date, net_profit, total_profit')
      .gte('invoice_date', startDate.toISOString())
      .order('invoice_date', { ascending: true });

    // Group data by date
    const chartDataMap = {};

    // Process expenses
    if (!expensesError && expenses) {
      expenses.forEach(expense => {
        const date = new Date(expense.expense_date).toISOString().split('T')[0];
        if (!chartDataMap[date]) {
          chartDataMap[date] = { date, profit: 0, expenses: 0, netProfit: 0 };
        }
        chartDataMap[date].expenses += parseFloat(expense.amount || 0);
      });
    }

    // Process invoices
    if (!invoicesError && invoices) {
      invoices.forEach(invoice => {
        const date = new Date(invoice.invoice_date).toISOString().split('T')[0];
        if (!chartDataMap[date]) {
          chartDataMap[date] = { date, profit: 0, expenses: 0, netProfit: 0 };
        }
        const profit = parseFloat(invoice.net_profit || invoice.total_profit || 0);
        chartDataMap[date].profit += profit;
      });
    }

    // Calculate net profit and format dates
    const chartData = Object.values(chartDataMap).map(item => {
      const netProfit = item.profit - item.expenses;
      return {
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        profit: item.profit,
        expenses: item.expenses,
        netProfit: netProfit
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ chartData });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Get all expenses
app.get('/api/expenses', authenticateToken, async (req, res) => {
  console.log('[API] /api/expenses - Request received');
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { timeRange = 'month' } = req.query;
    
    const now = new Date();
    let startDate = new Date();
    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startDate.toISOString().split('T')[0])
      .order('expense_date', { ascending: false });

    if (error) {
      console.error('Supabase error fetching expenses:', error);
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Expenses table does not exist. Please run expenses-schema.sql in Supabase SQL Editor.' 
        });
      }
      throw error;
    }
    res.json({ expenses: expenses || [] });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch expenses',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get expense categories
app.get('/api/expenses/categories', authenticateToken, async (req, res) => {
  console.log('[API] /api/expenses/categories - Request received');
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('expense_category')
      .order('expense_category', { ascending: true });

    if (error) {
      console.error('Supabase error fetching categories:', error);
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Expenses table does not exist. Please run expenses-schema.sql in Supabase SQL Editor.',
          categories: []
        });
      }
      throw error;
    }

    // Get unique categories
    const categories = [...new Set((expenses || []).map(e => e.expense_category).filter(Boolean))];
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch categories',
      categories: []
    });
  }
});

// Create expense
app.post('/api/expenses', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { expense_name, expense_category, amount, expense_date, description } = req.body;

    if (!expense_name || !expense_category || !amount || !expense_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert([{
        expense_name,
        expense_category,
        amount: parseFloat(amount),
        expense_date,
        description: description || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating expense:', error);
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Expenses table does not exist. Please run expenses-schema.sql in Supabase SQL Editor.' 
        });
      }
      throw error;
    }
    res.json({ expense });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create expense',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update expense
app.put('/api/expenses/:id', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { expense_name, expense_category, amount, expense_date, description } = req.body;

    const { data: expense, error } = await supabase
      .from('expenses')
      .update({
        expense_name,
        expense_category,
        amount: parseFloat(amount),
        expense_date,
        description: description || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ expense });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense
app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Serve static files from React app in production
// Check if build directory exists and NODE_ENV is production
const buildPath = path.join(__dirname, 'build');
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.RAILWAY_PROJECT_ID;
const buildExists = fs.existsSync(buildPath);

console.log('[Server] Production check:', {
  NODE_ENV: process.env.NODE_ENV,
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
  RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID ? 'set' : 'not set',
  isProduction,
  buildPath,
  buildExists
});

if (isProduction && buildExists) {
  console.log(`✅ Production mode detected. Serving static files from: ${buildPath}`);
  
  // IMPORTANT: API routes are already defined above (lines 61-5651)
  // Express matches specific routes (app.get('/api/test')) BEFORE middleware (app.use())
  // So API routes will match first, then static middleware
  
  // Serve static files from the React app - EXCLUDE /api routes
  app.use(express.static(buildPath, {
    // Don't serve index.html for all routes, let API routes handle /api/*
    index: false
  }));
  
  // Handle React routing - return all requests to React app (ONLY for non-API routes)
  // This catch-all route must be AFTER all API routes and static middleware
  app.get('*', (req, res, next) => {
    // Skip API routes - they should have been handled by API routes above
    if (req.path.startsWith('/api/')) {
      // If we reach here, the API route doesn't exist
      console.warn(`[404] API endpoint not found: ${req.method} ${req.path}`);
      return res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.path,
        method: req.method,
        availableEndpoints: [
          '/api/health',
          '/api/test',
          '/api/auth/login',
          '/api/orders',
          // ... other endpoints
        ]
      });
    }
    // Serve React app for all other routes (SPA routing)
    res.sendFile(path.join(buildPath, 'index.html'), (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).send('Error loading application');
      }
    });
  });
} else if (isProduction && !buildExists) {
  console.warn(`⚠️  WARNING: Build directory not found at ${buildPath}`);
  console.warn(`   The React app may not be built. Run 'npm run build' first.`);
  console.warn(`   API endpoints will still work, but frontend will not be served.`);
} else {
  console.log('ℹ️  Development mode. Frontend should be running on separate port (react-scripts).');
  console.log('ℹ️  API endpoints available at: http://localhost:' + PORT + '/api/*');
}

// Start server
// For Railway/cloud deployments, bind to 0.0.0.0 to accept external connections
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`📊 Database: ${isSupabaseConfigured ? '✅ Connected' : '⚠️  Not configured'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET_KEY ? '✅ Set' : '⚠️  Using default'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Listening on: ${HOST}:${PORT}`);
  console.log(`\n✅ Expenses Tracker Routes Registered:`);
  console.log(`   - GET  /api/expenses`);
  console.log(`   - GET  /api/expenses/summary`);
  console.log(`   - GET  /api/expenses/chart`);
  console.log(`   - GET  /api/expenses/categories`);
  console.log(`   - POST /api/expenses`);
  console.log(`   - PUT  /api/expenses/:id`);
  console.log(`   - DELETE /api/expenses/:id\n`);
  if (!isSupabaseConfigured) {
    console.log(`\n⚠️  WARNING: Supabase is not configured!`);
    console.log(`   Please set environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY`);
    console.log(`   See env.example for reference\n`);
  }
});
