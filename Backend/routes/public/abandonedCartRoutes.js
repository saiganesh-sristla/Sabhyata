const express = require('express');
const router = express.Router();
const {
  getAllAbandonedCarts,
  getAbandonedCartById,
  createAbandonedCart,
  sendReminder,
  deleteAbandonedCart,
  exportAbandonedCartsCSV,
  getAbandonedCartAnalytics
} = require('../../controllers/admin/abandonedCartController');

// Abandoned cart routes
router.get('/', getAllAbandonedCarts);
router.get('/export', exportAbandonedCartsCSV);
router.get('/analytics', getAbandonedCartAnalytics);
router.get('/:id', getAbandonedCartById);
router.post('/', createAbandonedCart);
router.post('/:id/reminder', sendReminder);
router.delete('/:id', deleteAbandonedCart);

module.exports = router; 