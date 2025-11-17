const { pool } = require('../config/database');

// Créer un avis (CLIENT uniquement, booking doit être complété)
exports.createReview = async (req, res) => {
  try {
    const clientId = req.user.userId;
    const { bookingId, rating, comment } = req.body;

    // Validation
    if (!bookingId || !rating) {
      return res.status(400).json({ error: 'Booking ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Vérifie que le booking existe, appartient au client, et est complété
    const booking = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND client_id = $2`,
      [bookingId, clientId]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }

    if (booking.rows[0].status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed bookings' });
    }

    // Vérifie si un avis existe déjà pour ce booking
    const existingReview = await pool.query(
      'SELECT * FROM reviews WHERE booking_id = $1',
      [bookingId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({ error: 'Review already exists for this booking' });
    }

    // Crée l'avis
    const result = await pool.query(
      `INSERT INTO reviews (booking_id, client_id, artisan_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [bookingId, clientId, booking.rows[0].artisan_id, rating, comment]
    );

    res.status(201).json({
      message: '✅ Review created successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review', details: error.message });
  }
};

// Obtenir tous les avis d'un artisan
exports.getArtisanReviews = async (req, res) => {
  try {
    const { artisanId } = req.params;

    const result = await pool.query(
      `SELECT r.*, 
              u.name as client_name,
              b.service_type
       FROM reviews r
       JOIN users u ON r.client_id = u.id
       JOIN bookings b ON r.booking_id = b.id
       WHERE r.artisan_id = $1
       ORDER BY r.created_at DESC`,
      [artisanId]
    );

    // Calcule les stats
    const stats = await pool.query(
      `SELECT 
         COUNT(*) as total_reviews,
         ROUND(AVG(rating)::numeric, 1) as average_rating,
         COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
         COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
         COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
         COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
         COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM reviews
       WHERE artisan_id = $1`,
      [artisanId]
    );

    res.json({
      stats: stats.rows[0],
      reviews: result.rows
    });
  } catch (error) {
    console.error('Get artisan reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
};

// Obtenir tous les avis laissés par le client connecté
exports.getMyReviews = async (req, res) => {
  try {
    const clientId = req.user.userId;

    const result = await pool.query(
      `SELECT r.*,
              a.profession,
              u.name as artisan_name,
              b.service_type
       FROM reviews r
       JOIN artisans a ON r.artisan_id = a.id
       JOIN users u ON a.user_id = u.id
       JOIN bookings b ON r.booking_id = b.id
       WHERE r.client_id = $1
       ORDER BY r.created_at DESC`,
      [clientId]
    );

    res.json({
      count: result.rows.length,
      reviews: result.rows
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
};

// Mettre à jour un avis (CLIENT uniquement)
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user.userId;
    const { rating, comment } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Vérifie que l'avis appartient au client
    const check = await pool.query(
      'SELECT * FROM reviews WHERE id = $1 AND client_id = $2',
      [id, clientId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or access denied' });
    }

    // Met à jour
    const result = await pool.query(
      `UPDATE reviews 
       SET rating = COALESCE($1, rating), 
           comment = COALESCE($2, comment)
       WHERE id = $3
       RETURNING *`,
      [rating, comment, id]
    );

    res.json({
      message: '✅ Review updated successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
};

// Supprimer un avis (CLIENT uniquement)
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user.userId;

    // Vérifie que l'avis appartient au client
    const check = await pool.query(
      'SELECT * FROM reviews WHERE id = $1 AND client_id = $2',
      [id, clientId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or access denied' });
    }

    await pool.query('DELETE FROM reviews WHERE id = $1', [id]);

    res.json({
      message: '✅ Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};