const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { authenticate, isArtisan, isClient } = require('../middleware/auth.middleware');

// Routes CLIENT
router.post('/', authenticate, isClient, bookingController.createBooking);
router.delete('/:id', authenticate, isClient, bookingController.cancelBooking);

// Routes ARTISAN
router.patch('/:id/status', authenticate, isArtisan, bookingController.updateBookingStatus);
router.patch('/:id/price', authenticate, isArtisan, bookingController.updateFinalPrice);

// Routes partagées (CLIENT + ARTISAN)
router.get('/my-bookings', authenticate, bookingController.getMyBookings);
router.get('/:id', authenticate, bookingController.getBookingById);

module.exports = router;