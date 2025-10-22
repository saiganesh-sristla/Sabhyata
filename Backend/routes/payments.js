const express = require('express');
const router = express.Router();
const { verifyPayment, verifyTicket } = require('../controllers/admin/bookingController');
const { createOrder } = require('../controllers/paymentsController');

// Create a Razorpay order for an existing booking
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/verify-ticket/:bookingId/:ticketId', verifyTicket);

module.exports = router;