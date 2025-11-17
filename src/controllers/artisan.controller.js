const { pool } = require('../config/database');

// Créer ou mettre à jour le profil artisan
exports.createOrUpdateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      profession,
      bio,
      hourlyRate,
      experienceYears,
      city,
      address,
      profileImageUrl
    } = req.body;

    // Validation
    if (!profession || !city) {
      return res.status(400).json({ error: 'Profession and city are required' });
    }

    // Vérifie si le profil existe déjà
    const existing = await pool.query(
      'SELECT * FROM artisans WHERE user_id = $1',
      [userId]
    );

    let result;

    if (existing.rows.length > 0) {
      // UPDATE
      result = await pool.query(
        `UPDATE artisans 
         SET profession = $1, bio = $2, hourly_rate = $3, experience_years = $4,
             city = $5, address = $6, profile_image_url = $7, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $8
         RETURNING *`,
        [profession, bio, hourlyRate, experienceYears, city, address, profileImageUrl, userId]
      );
    } else {
      // INSERT
      result = await pool.query(
        `INSERT INTO artisans (user_id, profession, bio, hourly_rate, experience_years, city, address, profile_image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, profession, bio, hourlyRate, experienceYears, city, address, profileImageUrl]
      );
    }

    res.json({
      message: '✅ Artisan profile saved successfully',
      artisan: result.rows[0]
    });
  } catch (error) {
    console.error('Create/Update artisan error:', error);
    res.status(500).json({ error: 'Failed to save artisan profile', details: error.message });
  }
};

// Lister tous les artisans (avec filtres)
exports.getAllArtisans = async (req, res) => {
  try {
    const { profession, city, minRating, available } = req.query;

    let query = `
      SELECT a.*, u.name, u.phone, u.email
      FROM artisans a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (profession) {
      query += ` AND a.profession = $${paramCount}`;
      params.push(profession);
      paramCount++;
    }

    if (city) {
      query += ` AND a.city = $${paramCount}`;
      params.push(city);
      paramCount++;
    }

    if (minRating) {
      query += ` AND a.rating >= $${paramCount}`;
      params.push(minRating);
      paramCount++;
    }

    if (available === 'true') {
      query += ` AND a.available = true`;
    }

    query += ' ORDER BY a.rating DESC, a.total_reviews DESC';

    const result = await pool.query(query, params);

    res.json({
      count: result.rows.length,
      artisans: result.rows
    });
  } catch (error) {
    console.error('Get artisans error:', error);
    res.status(500).json({ error: 'Failed to get artisans' });
  }
};

// Obtenir un artisan par ID
exports.getArtisanById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT a.*, u.name, u.phone, u.email
       FROM artisans a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan not found' });
    }

    res.json({
      artisan: result.rows[0]
    });
  } catch (error) {
    console.error('Get artisan error:', error);
    res.status(500).json({ error: 'Failed to get artisan' });
  }
};

// Obtenir le profil de l'artisan connecté
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT a.*, u.name, u.phone, u.email
       FROM artisans a
       JOIN users u ON a.user_id = u.id
       WHERE a.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan profile not found' });
    }

    res.json({
      artisan: result.rows[0]
    });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Toggle disponibilité
exports.toggleAvailability = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `UPDATE artisans 
       SET available = NOT available
       WHERE user_id = $1
       RETURNING *`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan profile not found' });
    }

    res.json({
      message: '✅ Availability updated',
      available: result.rows[0].available
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
};