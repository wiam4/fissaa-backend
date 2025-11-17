const jwt = require('jsonwebtoken');

// Middleware pour vérifier le JWT token
const authenticate = (req, res, next) => {
    try {
        // Récupère le token du header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Vérifie le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Ajoute les infos user à la requête
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Middleware pour vérifier que l'user est un artisan
const isArtisan = (req, res, next) => {
    if (req.user.userType !== 'artisan') {
        return res.status(403).json({ error: 'Access denied. Artisans only.' });
    }
    next();
};

// Middleware pour vérifier que l'user est un client
const isClient = (req, res, next) => {
    if (req.user.userType !== 'client') {
        return res.status(403).json({ error: 'Access denied. Clients only.' });
    }
    next();
};

module.exports = { authenticate, isArtisan, isClient };