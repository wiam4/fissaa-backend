const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate, isClient } = require('../middleware/auth.middleware');

// Routes publiques
router.get('/artisan/:artisanId', reviewController.getArtisanReviews);

// Routes CLIENT
router.post('/', authenticate, isClient, reviewController.createReview);
router.get('/my-reviews', authenticate, isClient, reviewController.getMyReviews);
router.put('/:id', authenticate, isClient, reviewController.updateReview);
router.delete('/:id', authenticate, isClient, reviewController.deleteReview);

module.exports = router;