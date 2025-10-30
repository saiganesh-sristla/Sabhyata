// routes/adminRoutes.js
const express = require('express');
const router = express.Router();

const { protect, restrictTo } = require('../../middleware/auth');

// Import individual route modules
const dashboardRoutes = require('./dashboardRoutes');
const bookingRoutes = require('./bookingRoutes');
const eventRoutes = require('./eventRoutes');
const userRoutes = require('./userRoutes');
const monumentRoutes = require('./monumentRoutes');
const abandonedCartRoutes = require('./abandonedCartRoutes');
const seatLayoutRoutes = require('./seatLayouts');
const adminPartnerRoutes = require('./adminPartners');

// Apply authentication and admin role restriction to all routes
router.use(protect);
router.use(restrictTo('admin','sub-admin'));

// Mount individual route modules
router.use('/dashboard', dashboardRoutes);
router.use('/bookings', bookingRoutes);
router.use('/events', eventRoutes);
router.use('/seat-layouts', seatLayoutRoutes);
router.use('/users', userRoutes);
router.use('/monuments', monumentRoutes);
router.use('/abandoned-carts', abandonedCartRoutes);
router.use('/partners', adminPartnerRoutes);

module.exports = router;