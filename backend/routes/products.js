const express = require('express');
const router = express.Router();
const { supabase } = require('../db');
const { authenticateToken } = require('./auth');

// GET /api/products
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        product_id,
        product_name,
        price,
        is_available,
        updated_at,
        categories(category_id, category_name)
      `)
      .eq('vendor_id', req.vendor.vendorId)
      .order('product_name');

    if (error) throw error;

    const formatted = products.map(p => ({
      ProductID: p.product_id,
      ProductName: p.product_name,
      Price: parseFloat(p.price),
      IsAvailable: p.is_available,
      UpdatedAt: p.updated_at,
      CategoryID: p.categories?.category_id,
      CategoryName: p.categories?.category_name
    }));

    res.json(formatted);

  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/products
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { productName, price, categoryId, isAvailable } = req.body;

    if (!productName || !price) {
      return res.status(400).json({ error: 'Product name and price are required' });
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        vendor_id: req.vendor.vendorId,
        product_name: productName,
        price,
        category_id: categoryId || null,
        is_available: isAvailable !== false
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      ProductID: product.product_id,
      ProductName: product.product_name,
      Price: parseFloat(product.price),
      IsAvailable: product.is_available,
      CategoryID: product.category_id
    });

  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, price, categoryId, isAvailable } = req.body;

    // Verify ownership
    const { data: existing } = await supabase
      .from('products')
      .select('product_id')
      .eq('product_id', id)
      .eq('vendor_id', req.vendor.vendorId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    const { data: updated, error } = await supabase
      .from('products')
      .update({
        product_name: productName,
        price,
        category_id: categoryId || null,
        is_available: isAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('product_id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      ProductID: updated.product_id,
      ProductName: updated.product_name,
      Price: parseFloat(updated.price),
      IsAvailable: updated.is_available,
      CategoryID: updated.category_id
    });

  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('product_id', id)
      .eq('vendor_id', req.vendor.vendorId);

    if (error) throw error;

    res.json({ message: 'Product deleted successfully' });

  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;