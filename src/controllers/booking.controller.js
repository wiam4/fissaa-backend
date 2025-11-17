const { pool } = require('../config/database');

// Créer une réservation (CLIENT uniquement)
exports.createBooking = async (req, res) => {
  try {
    const clientId = req.user.userId;
    const {
      artisanId,
      serviceType,
      description,
      scheduledDate,
      address,
      estimatedHours,
      estimatedPrice
    } = req.body;

    // Validation
    if (!artisanId || !scheduledDate || !address) {
      return res.status(400).json({ 
        error: 'Artisan, scheduled date, and address are required' 
      });
    }

    // Vérifie que l'artisan existe et est disponible
    const artisan = await pool.query(
      'SELECT * FROM artisans WHERE id = $1',
      [artisanId]
    );

    if (artisan.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan not found' });
    }

    if (!artisan.rows[0].available) {
      return res.status(400).json({ error: 'Artisan is not available' });
    }

    // Crée la réservation
    const result = await pool.query(
      `INSERT INTO bookings 
       (client_id, artisan_id, service_type, description, scheduled_date, address, estimated_hours, estimated_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [clientId, artisanId, serviceType, description, scheduledDate, address, estimatedHours, estimatedPrice]
    );

    res.status(201).json({
      message: '✅ Booking created successfully',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
};

// Obtenir toutes les réservations de l'utilisateur connecté
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;

    let query;
    if (userType === 'client') {
      query = `
        SELECT b.*, 
               a.profession, a.hourly_rate, a.profile_image_url,
               u.name as artisan_name, u.phone as artisan_phone
        FROM bookings b
        JOIN artisans a ON b.artisan_id = a.id
        JOIN users u ON a.user_id = u.id
        WHERE b.client_id = $1
        ORDER BY b.scheduled_date DESC
      `;
    } else {
      // Artisan
      query = `
        SELECT b.*,
               u.name as client_name, u.phone as client_phone
        FROM bookings b
        JOIN users u ON b.client_id = u.id
        JOIN artisans a ON b.artisan_id = a.id
        WHERE a.user_id = $1
        ORDER BY b.scheduled_date DESC
      `;
    }

    const result = await pool.query(query, [userId]);

    res.json({
      count: result.rows.length,
      bookings: result.rows
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
};

// Obtenir une réservation par ID
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT b.*,
              c.name as client_name, c.phone as client_phone, c.email as client_email,
              a.profession, a.hourly_rate,
              u.name as artisan_name, u.phone as artisan_phone
       FROM bookings b
       JOIN users c ON b.client_id = c.id
       JOIN artisans a ON b.artisan_id = a.id
       JOIN users u ON a.user_id = u.id
       WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];

    // Vérifie que l'utilisateur est autorisé à voir cette réservation
    if (booking.client_id !== userId && booking.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to get booking' });
  }
};

// Mettre à jour le statut d'une réservation (ARTISAN uniquement)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!['confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: confirmed, completed, or cancelled' 
      });
    }

    // Vérifie que la réservation appartient à cet artisan
    const check = await pool.query(
      `SELECT b.* FROM bookings b
       JOIN artisans a ON b.artisan_id = a.id
       WHERE b.id = $1 AND a.user_id = $2`,
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }

    // Met à jour le statut
    const result = await pool.query(
      `UPDATE bookings 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    res.json({
      message: `✅ Booking ${status}`,
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
};

// Annuler une réservation (CLIENT uniquement)
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Vérifie que la réservation appartient à ce client
    const check = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND client_id = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }

    const booking = check.rows[0];

    if (booking.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel completed booking' });
    }

    // Annule la réservation
    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({
      message: '✅ Booking cancelled',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

// Mettre à jour le prix final (ARTISAN uniquement)
exports.updateFinalPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalPrice } = req.body;
    const userId = req.user.userId;

    if (!finalPrice || finalPrice <= 0) {
      return res.status(400).json({ error: 'Valid final price is required' });
    }

    // Vérifie que la réservation appartient à cet artisan
    const check = await pool.query(
      `SELECT b.* FROM bookings b
       JOIN artisans a ON b.artisan_id = a.id
       WHERE b.id = $1 AND a.user_id = $2`,
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }

    const result = await pool.query(
      `UPDATE bookings 
       SET final_price = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [finalPrice, id]
    );

    res.json({
      message: '✅ Final price updated',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Update final price error:', error);
    res.status(500).json({ error: 'Failed to update final price' });
  }
};