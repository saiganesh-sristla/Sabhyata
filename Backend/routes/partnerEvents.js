const express = require('express');
const router = express.Router();
const { validateToken } = require('../middleware/auth'); // Reuse auth middleware
const {
  getAllEvents,
  getEventById,
  getEventCategories  // Optional: Expose categories if partners need them
} = require('../controllers/admin/eventController');  // Reuse your controller

// Other controllers reused for partner APIs
const {
  getAllMonuments,
  getMonumentById,
  getMonumentFilters,
  getEventsForMonument
} = require('../controllers/admin/monumentController');

const {
  getSeatLayout,
  lockSeatsUser
} = require('../controllers/admin/seatLayoutController');

const { createOrder } = require('../controllers/paymentsController');
const { verifyPayment, getBookingById } = require('../controllers/admin/bookingController');

// Partner-only: Read events (no auth middleware here—applied at mount level)
// Basic health check for partner API
router.get('/check', validateToken, (req, res) => {
  res.json({ message: 'API working' });
});

// Events (provide both singular and plural for compatibility)
router.get('/', validateToken, getAllEvents);
router.get('/events', validateToken, getAllEvents);
router.get('/event/:id', validateToken, getEventById);
router.get('/events/:id', validateToken, getEventById);
router.get('/categories', validateToken, getEventCategories);

// Monuments
router.get('/monuments', validateToken, getAllMonuments);
router.get('/monuments/filters', validateToken, getMonumentFilters);
router.get('/monuments/:id', validateToken, getMonumentById);
router.get('/monuments/:id/events', validateToken, getEventsForMonument);

// Seat layout (for a given event) and locking seats
router.get('/seat-layout/:event_id', validateToken, getSeatLayout);
// alias with singular id param
router.get('/seat-layout', validateToken, getSeatLayout);
router.post('/seat-layout/:event_id/lock-seats', validateToken, lockSeatsUser);

// Payments (create order and verify)
router.post('/payments/create-order', validateToken, createOrder);
router.post('/payments/verify', validateToken, verifyPayment);

// Bookings - expose booking details to partners
router.get('/bookings/:id', validateToken, getBookingById);

module.exports = router;