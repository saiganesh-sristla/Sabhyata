const express = require('express');
const router = express.Router();
const {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  bulkDeleteBookings,
  exportBookingsCSV,
  getBookingAnalytics,
  getMyBookings
} = require('../../controllers/admin/bookingController');

const { protect, optionalAuth } = require('../../middleware/auth');

// Booking routes
router.get('/', getAllBookings);
router.get('/mine', protect, getMyBookings);
router.get('/export', exportBookingsCSV);
router.get('/analytics', getBookingAnalytics);

// ✅ Use optionalAuth for getBookingById (allows both logged-in and guest users)
router.get('/:id', optionalAuth, getBookingById);

router.post('/', createBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);
router.post('/bulk-delete', bulkDeleteBookings);

module.exports = router;
