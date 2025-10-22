const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  toggleUserBlock,
  updateUser,
  deleteUser,
  exportUsersCSV,
  getUserStats
} = require('../../controllers/admin/userController');

// User routes
router.get('/', getAllUsers);
router.get('/export', exportUsersCSV);
router.get('/stats', getUserStats);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.post('/:id/block', toggleUserBlock);
router.delete('/:id', deleteUser);

module.exports = router;