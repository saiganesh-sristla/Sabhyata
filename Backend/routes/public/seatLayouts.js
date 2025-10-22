const express = require('express');
const router = express.Router();

const {
  createSeatLayout,
  getSeatLayout,
  updateSeatLayout,
  deleteSeatLayout,
  holdSeats,
  releaseSeats,
  publishSeatLayout,
  getSeatAvailability,
  bookSeats,
  lockSeatsUser,
  unlockSeatsUser
} = require('../../controllers/admin/seatLayoutController');

// Admin routes
router.post('/', createSeatLayout);
router.get('/:event_id', getSeatLayout);
router.put('/:event_id', updateSeatLayout);
router.delete('/:event_id', deleteSeatLayout);
router.post('/:event_id/hold-seats', holdSeats);
router.post('/:event_id/release-seats', releaseSeats);
router.post('/:event_id/publish', publishSeatLayout);
router.get('/:event_id/availability', getSeatAvailability);

// User-facing routes
router.post('/:id/book', bookSeats);
router.post('/:event_id/lock-seats', lockSeatsUser);
router.post('/:event_id/unlock-seats', unlockSeatsUser);

module.exports = router;