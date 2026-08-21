const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase } = require('../db');

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, vendor) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.vendor = vendor;
    next();
  });
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { 
      businessName, 
      ownerName, 
      email, 
      password, 
      phoneNumber,
      latitude,
      longitude,
      locationDescription,
      paymentTypes 
    } = req.body;

    if (!businessName || !ownerName || !email || !password || !phoneNumber) {
      return res.status(400).json({ 
        error: 'Business name, owner name, email, password, and phone are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email exists
    const { data: existing } = await supabase
      .from('vendors')
      .select('vendor_id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert vendor
    const { data: newVendor, error } = await supabase
      .from('vendors')
      .insert([{
        business_name: businessName,
        owner_name: ownerName,
        email,
        password_hash: passwordHash,
        phone_number: phoneNumber,
        latitude: latitude || -25.860100,
        longitude: longitude || 28.189400,
        location_description: locationDescription || '',
        payment_types: paymentTypes || 'Cash',
        is_open: false,
        is_verified: false
      }])
      .select()
      .single();

    if (error) throw error;

    // Generate JWT
    const token = jwt.sign(
      { 
        vendorId: newVendor.vendor_id, 
        email: newVendor.email,
        businessName: newVendor.business_name 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Vendor account created successfully',
      vendor: {
        vendorId: newVendor.vendor_id,
        businessName: newVendor.business_name,
        email: newVendor.email,
        isVerified: newVendor.is_verified
      },
      token
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !vendor) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, vendor.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { 
        vendorId: vendor.vendor_id, 
        email: vendor.email,
        businessName: vendor.business_name 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      vendor: {
        vendorId: vendor.vendor_id,
        businessName: vendor.business_name,
        email: vendor.email,
        isVerified: vendor.is_verified,
        isOpen: vendor.is_open
      },
      token
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('vendor_id, business_name, owner_name, email, phone_number, latitude, longitude, location_description, is_open, payment_types, is_verified')
      .eq('vendor_id', req.vendor.vendorId)
      .single();

    if (error || !vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Convert snake_case to camelCase for frontend
    res.json({
      VendorID: vendor.vendor_id,
      BusinessName: vendor.business_name,
      OwnerName: vendor.owner_name,
      Email: vendor.email,
      PhoneNumber: vendor.phone_number,
      Latitude: vendor.latitude,
      Longitude: vendor.longitude,
      LocationDescription: vendor.location_description,
      IsOpen: vendor.is_open,
      PaymentTypes: vendor.payment_types,
      IsVerified: vendor.is_verified
    });

  } catch (err) {
    console.error('Get vendor error:', err);
    res.status(500).json({ error: 'Failed to fetch vendor info' });
  }
});

// PATCH /api/vendors/:id/status
router.patch('/vendors/:id/status', authenticateToken, async (req, res) => {
  // Verify ownership before updating
  if (req.vendor.vendorId !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { is_open } = req.body;

  const { data: updated, error } = await supabase
    .from('vendors')
    .update({ is_open })
    .eq('vendor_id', req.params.id)
    .single();

  if (error) throw error;

  res.json({ message: 'Vendor status updated successfully', is_open });
});

module.exports = { router, authenticateToken };