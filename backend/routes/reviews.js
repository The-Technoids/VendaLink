const express = require('express');
const router = express.Router();
const { supabase } = require('../db');

// POST /api/reviews
router.post('/', async (req, res) => {
  try {
    const { vendorId, rating, comment, isVerifiedVisit } = req.body;

    if (!vendorId || !rating) {
      return res.status(400).json({ error: 'vendorId and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }

    const { data: review, error } = await supabase
      .from('customer_reviews')
      .insert([{
        vendor_id: vendorId,
        rating,
        comment: comment || null,
        is_verified_visit: isVerifiedVisit || false
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      ReviewID: review.review_id,
      VendorID: review.vendor_id,
      Rating: review.rating,
      Comment: review.comment,
      IsVerifiedVisit: review.is_verified_visit,
      CreatedAt: review.created_at
    });

  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

module.exports = router;