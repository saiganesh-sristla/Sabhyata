const express = require('express');
const router = express.Router();

const {
  getAllMonuments,
  getMonumentById,
  createMonument,
  updateMonument,
  deleteMonument,
  getMonumentFilters
} = require('../../controllers/admin/monumentController');

// Monument routes
router.get('/', getAllMonuments);
router.get('/filters', getMonumentFilters);
router.get('/:id', getMonumentById);
router.post('/', createMonument);
router.put('/:id', updateMonument);
router.delete('/:id', deleteMonument);

module.exports = router;