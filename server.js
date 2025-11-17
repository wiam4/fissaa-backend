require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
pool.query('SELECT NOW()', (err, result) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Connected to Supabase PostgreSQL!');
        console.log('⏰ Server time:', result.rows[0].now);
    }
});

// ==========================================
// ROUTES
// ==========================================
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/artisans', require('./src/routes/artisan.routes'));
app.use('/api/bookings', require('./src/routes/booking.routes'));
app.use('/api/reviews', require('./src/routes/review.routes'));

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            status: 'OK',
            message: '⚡ FissaA API is running!',
            database: 'Connected',
            timestamp: result.rows[0].now
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: error.message
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 FissaA API running on http://localhost:${PORT}`);
    console.log(`⚡ L9a san3tek fissa3!`);
});