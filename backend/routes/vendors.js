const express = require('express');
const router = express.Router();
const { supabase } = require('../db');
const { authenticateToken } = require('./auth');

// Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function validateCoordinates(lat, lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// GET /api/vendors
router.get('/', async (req, res) => {
  try {
    const { category, openOnly, search, lat, lng } = req.query;

    let query = supabase
      .from('vendors')
      .select(`
        vendor_id,
        business_name,
        owner_name,
        phone_number,
        latitude,
        longitude,
        location_description,
        is_open,
        payment_types,
        created_at,
        products!inner(category_id, categories(category_name))
      `);

    if (category && category !== 'all') {
      query = query.eq('products.categories.category_name', category);
    }

    if (openOnly === 'true') {
      query = query.eq('is_open', true);
    }

    if (search && search.trim().length > 0) {
      const sanitized = search.trim().substring(0, 100); // Max length
      query = query.or(`business_name.ilike.%${sanitized}%`);
    }

    const { data: vendors, error } = await query;

    if (error) throw error;

    // Remove duplicates and calculate stats
    const uniqueVendors = [];
    const seen = new Set();

    for (const vendor of vendors) {
      if (!seen.has(vendor.vendor_id)) {
        seen.add(vendor.vendor_id);

        // Get review stats
        const { data: reviews } = await supabase
          .from('customer_reviews')
          .select('rating')
          .eq('vendor_id', vendor.vendor_id);

        const avgRating = reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : null;

        uniqueVendors.push({
          VendorID: vendor.vendor_id,
          BusinessName: vendor.business_name,
          OwnerName: vendor.owner_name,
          PhoneNumber: vendor.phone_number,
          Latitude: parseFloat(vendor.latitude),
          Longitude: parseFloat(vendor.longitude),
          LocationDescription: vendor.location_description,
          IsOpen: vendor.is_open,
          PaymentTypes: vendor.payment_types,
          AvgRating: avgRating,
          ReviewCount: reviews ? reviews.length : 0
        });
      }
    }

    // Calculate distance if provided
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      if (!validateCoordinates(userLat, userLng)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      uniqueVendors.forEach(vendor => {
        vendor.Distance = calculateDistance(userLat, userLng, vendor.Latitude, vendor.Longitude);
        vendor.DistanceDisplay = formatDistance(vendor.Distance);
      });

      uniqueVendors.sort((a, b) => a.Distance - b.Distance);
    }

    res.json(uniqueVendors);

  } catch (err) {
    console.error('Error fetching vendors:', err);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// GET /api/vendors/:id/products
router.get('/:id/products', async (req, res) => {
  try {
    const { id } = req.params;

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
      .eq('vendor_id', id)
      .order('is_available', { ascending: false })
      .order('product_name');

    if (error) throw error;

    const formatted = products.map(p => ({
      ProductID: p.product_id,
      ProductName: p.product_name,
      Price: parseFloat(p.price),
      IsAvailable: p.is_available,
      UpdatedAt: p.updated_at,
      CategoryName: p.categories?.category_name || null
    }));

    res.json(formatted);

  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/vendors/:id/reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: reviews, error } = await supabase
      .from('customer_reviews')
      .select('*')
      .eq('vendor_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = reviews.map(r => ({
      ReviewID: r.review_id,
      Rating: r.rating,
      Comment: r.comment,
      IsVerifiedVisit: r.is_verified_visit,
      CreatedAt: r.created_at
    }));

    res.json(formatted);

  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// PATCH /api/vendors/:id/status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isOpen } = req.body;

    if (parseInt(id) !== req.vendor.vendorId) {
      return res.status(403).json({ error: 'You can only update your own status' });
    }

    const { data: updated, error } = await supabase
      .from('vendors')
      .update({ is_open: isOpen })
      .eq('vendor_id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      VendorID: updated.vendor_id,
      BusinessName: updated.business_name,
      IsOpen: updated.is_open
    });

  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PUT /api/vendors/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { 
      businessName, 
      ownerName, 
      phoneNumber,
      locationDescription,
      latitude,
      longitude,
      paymentTypes 
    } = req.body;

    const { data: updated, error } = await supabase
      .from('vendors')
      .update({
        business_name: businessName,
        owner_name: ownerName,
        phone_number: phoneNumber,
        location_description: locationDescription,
        latitude,
        longitude,
        payment_types: paymentTypes
      })
      .eq('vendor_id', req.vendor.vendorId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      VendorID: updated.vendor_id,
      BusinessName: updated.business_name,
      OwnerName: updated.owner_name,
      PhoneNumber: updated.phone_number,
      LocationDescription: updated.location_description,
      Latitude: updated.latitude,
      Longitude: updated.longitude,
      PaymentTypes: updated.payment_types,
      IsOpen: updated.is_open
    });

  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;