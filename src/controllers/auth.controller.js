const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Inscription
exports.register = async (req, res) => {
    try {
        const { phone, name, email, password, userType } = req.body;

        // Validation
        if (!phone || !name || !password || !userType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['client', 'artisan'].includes(userType)) {
            return res.status(400).json({ error: 'userType must be client or artisan' });
        }

        // Vérifie si le téléphone existe déjà
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE phone = $1',
            [phone]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Phone number already registered' });
        }

        // Hash le password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crée l'utilisateur
        const result = await pool.query(
            'INSERT INTO users (phone, name, email, password_hash, user_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, phone, name, email, user_type, created_at',
            [phone, name, email, hashedPassword, userType]
        );

        const user = result.rows[0];

        // Génère JWT token
        const token = jwt.sign(
            { userId: user.id, userType: user.user_type },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: '✅ User registered successfully',
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                email: user.email,
                userType: user.user_type,
                createdAt: user.created_at
            },
            token
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        // Validation
        if (!phone || !password) {
            return res.status(400).json({ error: 'Phone and password required' });
        }

        // Trouve l'utilisateur
        const result = await pool.query(
            'SELECT * FROM users WHERE phone = $1',
            [phone]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Vérifie le password
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Génère JWT token
        const token = jwt.sign(
            { userId: user.id, userType: user.user_type },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            message: '✅ Login successful',
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                email: user.email,
                userType: user.user_type
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
};

// Get current user info
exports.getMe = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, phone, name, email, user_type, created_at FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        res.json({
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                email: user.email,
                userType: user.user_type,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
};