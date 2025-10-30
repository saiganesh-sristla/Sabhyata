const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const {
  register,
  login,
  staffLogin,
  getCurrentUser,
  logout,
  changePassword,
  sendOtp,
  verifyOtp,
  googleLogin
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const {
  validateLogin,
  handleValidation
} = require('../middleware/validation');

// Rate limiter for OTP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 min
  message: 'Too many OTP requests, please try again later.'
});

// Public routes
router.post('/register', register);
router.post('/login', validateLogin, handleValidation, login);
router.post('/staff-login', validateLogin, handleValidation, staffLogin);
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/google', googleLogin);

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/me', getCurrentUser);
router.post('/logout', logout);
router.put('/change-password', changePassword);

module.exports = router;