const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protect, optionalAuth } = require('../../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/events/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

const {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  toggleEventStatus,
  getEventCategories,
  toggleInterest,
  getRemainingCapacity
} = require('../../controllers/admin/eventController');

// Public routes with optional authentication (to check userInterested status)
router.get('/', optionalAuth, getAllEvents);
router.get('/categories', getEventCategories);
router.get('/:id', optionalAuth, getEventById);

// Admin routes (require authentication)
router.post('/', protect, upload.array('images', 10), createEvent);
router.put('/:id', protect, upload.array('images', 10), updateEvent);
router.delete('/:id', protect, deleteEvent);
router.patch('/:id/status', protect, toggleEventStatus);

// User route (requires authentication)
router.patch('/:id/interest', protect, toggleInterest);

router.get('/:id/remaining-capacity', getRemainingCapacity);

module.exports = router;
