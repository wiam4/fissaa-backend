const express = require('express');
const router = express.Router();
const artisanController = require('../controllers/artisan.controller');
const { authenticate, isArtisan } = require('../middleware/auth.middleware');

// Routes publiques (pas besoin d'auth)
router.get('/', artisanController.getAllArtisans);
router.get('/:id', artisanController.getArtisanById);

// Routes protégées (artisans seulement)
router.post('/profile', authenticate, isArtisan, artisanController.createOrUpdateProfile);
router.put('/profile', authenticate, isArtisan, artisanController.createOrUpdateProfile);
router.get('/me/profile', authenticate, isArtisan, artisanController.getMyProfile);
router.patch('/availability', authenticate, isArtisan, artisanController.toggleAvailability);

module.exports = router;