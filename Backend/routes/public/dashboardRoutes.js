const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getRevenueAnalytics
} = require('../../controllers/admin/dashboardController');

// Dashboard routes
router.get('/stats', getDashboardStats);
router.get('/revenue-analytics', getRevenueAnalytics);

module.exports = router;