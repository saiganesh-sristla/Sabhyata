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
  getBookingAnalytics
} = require('../../controllers/admin/bookingController');

// Booking routes
router.get('/', getAllBookings);
router.get('/export', exportBookingsCSV);
router.get('/analytics', getBookingAnalytics);
router.get('/:id', getBookingById);
router.post('/', createBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);
router.post('/bulk-delete', bulkDeleteBookings);

module.exports = router;