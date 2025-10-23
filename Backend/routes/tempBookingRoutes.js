// routes/tempBookingRoutes.js
const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const {
  createTempBooking,
  getTempBooking,
  convertTempToRealBooking, // NEW
  cancelTempBooking,
  testCleanup,
} = require('../controllers/tempBookingController');

// Create temporary booking (lock seats)
router.post('/create', optionalAuth, createTempBooking);

// Get temporary booking details
router.get('/:tempBookingId', optionalAuth, getTempBooking);

// Convert temp to real booking (after payment verification)
router.post('/:tempBookingId/convert-to-real', optionalAuth, convertTempToRealBooking);

// Cancel temporary booking
router.post('/:tempBookingId/cancel', optionalAuth, cancelTempBooking);

// ✅ Test cleanup endpoint
router.post('/test-cleanup', testCleanup);

module.exports = router;
