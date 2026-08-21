require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Import route handlers
const { router: authRouter, authenticateToken } = require('./routes/auth');
const vendorRouter = require('./routes/vendors');
const productRouter = require('./routes/products');

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true
}));

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

// Mount auth routes FIRST (before other middleware that might require auth)
app.use('/api/auth', authRouter);

// Mount other routes
app.use('/api/vendors', vendorRouter);
app.use('/api/products', productRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'supabase' }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 VendaLink API running on http://localhost:${PORT}`));

function authenticateToken(req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const tokenData = JSON.parse(atob(token.split(' ')[1]));
  if (!tokenData || !tokenData.vendorId) return res.status(401).json({ error: 'Unauthorized' });
  req.vendor = tokenData;
  next();
}

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}