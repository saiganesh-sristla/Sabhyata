const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Razorpay = require('razorpay');

const Booking = require('../models/Booking');
const ShowSeatLayout = require('../models/ShowSeatLayout');
const AbandonedCart = require('../models/AbandonedCart');

let razorpay = null;
const getRazorpay = () => {
  if (razorpay) return razorpay;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  razorpay = new Razorpay({ key_id, key_secret });
  return razorpay;
};

// Create Razorpay Order
exports.createOrder = async (req, res) => {
  try {
    const { amount, bookingId, currency = 'INR', contactInfo, specialNotes } = req.body;

    console.log('=== CREATE RAZORPAY ORDER ===');
    console.log('Booking ID:', bookingId);
    console.log('Amount:', amount);

    if (!amount) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      if (booking.paymentStatus === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Booking already paid'
        });
      }

      if (contactInfo) {
        booking.contactInfo = contactInfo;
      }
      if (specialNotes) {
        booking.notes = specialNotes;
      }
      await booking.save();
    }

    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency,
      receipt: bookingId || `order_${Date.now()}`,
      payment_capture: 1,
    };

    const rp = getRazorpay();
    if (!rp) {
      return res.status(500).json({ 
        success: false, 
        message: 'Payment gateway not configured on server' 
      });
    }

    const order = await rp.orders.create(options);

    console.log('✓ Razorpay order created:', order.id);

    res.json({ 
      success: true, 
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create order', 
      error: err.message 
    });
  }
};

// ✅ FIXED: Verify Payment with PROPER TICKET GENERATION
exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      bookingId,
      contactInfo,
      specialNotes
    } = req.body;
    
    console.log('=== PAYMENT VERIFICATION STARTED ===');
    
    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment signature' 
      });
    }

    const booking = await Booking.findById(bookingId).populate('event');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update contact info
    if (contactInfo) {
      booking.contactInfo = {
        name: contactInfo.name,
        email: contactInfo.email,
        phone: contactInfo.phone,
        altPhone: contactInfo.altPhone
      };
    }
    
    if (specialNotes) {
      booking.notes = specialNotes;
    }

    // Update booking to confirmed (NO TICKET GENERATION)
    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpayOrderId = razorpay_order_id;
    booking.razorpaySignature = razorpay_signature;
    booking.expiresAt = null;
    
    await booking.save();

    console.log('✓ Booking confirmed:', booking.bookingReference);
    console.log('✓ Tickets will be generated on-the-fly by frontend');
    console.log('=== PAYMENT VERIFICATION COMPLETED ===\n');

    return res.json({ 
      success: true, 
      message: 'Payment verified and booking confirmed',
      data: {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        paymentId: razorpay_payment_id
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Verification failed', 
      error: error.message 
    });
  }
};


// Verify Ticket (QR Scan) - Simplified without tickets array
exports.verifyTicket = async (req, res) => {
  try {
    const { bookingId, ticketId } = req.params;
    
    console.log('=== TICKET VERIFICATION STARTED ===');
    console.log('URL params received:', { bookingId, ticketId });

    if (!bookingId || !ticketId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing booking ID or ticket ID' 
      });
    }

    // Find booking by bookingReference or _id
    let booking;
    const mongoose = require('mongoose');
    
    const isValidObjectId = mongoose.Types.ObjectId.isValid(bookingId) && bookingId.length === 24;
    
    if (isValidObjectId) {
      console.log('Searching by MongoDB _id...');
      booking = await Booking.findById(bookingId).populate('event').populate('user', 'name email phone');
    } else {
      console.log('Searching by bookingReference...');
      booking = await Booking.findOne({ bookingReference: bookingId }).populate('event').populate('user', 'name email phone');
    }

    if (!booking) {
      console.log('ERROR: Booking not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found'
      });
    }

    console.log('✓ Booking found:', booking.bookingReference);
    console.log('  - Payment Status:', booking.paymentStatus);
    console.log('  - Status:', booking.status);

    if (booking.paymentStatus !== 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment not completed' 
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking not confirmed' 
      });
    }

    // ===== VALIDATE TICKET ID FORMAT =====
    // Expected format: TKT-{bookingRef}-{seatLabel}-{index}
    const expectedPrefix = `TKT-${booking.bookingReference}`;
    
    if (!ticketId.startsWith(expectedPrefix)) {
      console.log('ERROR: Invalid ticket ID format');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ticket ID - does not match booking reference',
        details: {
          expectedPrefix: expectedPrefix,
          receivedTicketId: ticketId
        }
      });
    }

    // ===== TRACK USED TICKETS =====
    // Initialize usedTickets array if not exists
    if (!booking.usedTickets) {
      booking.usedTickets = [];
    }

    // Check if ticket already used
    const isAlreadyUsed = booking.usedTickets.some(ut => ut.ticketId === ticketId);
    
    if (isAlreadyUsed) {
      const usedTicket = booking.usedTickets.find(ut => ut.ticketId === ticketId);
      return res.status(400).json({ 
        success: false, 
        message: 'Ticket already used',
        data: {
          usedAt: usedTicket.usedAt,
          verifiedBy: usedTicket.verifiedBy
        }
      });
    }

    // ===== PARSE TICKET INFO =====
    // Extract seat/participant info from ticketId
    const ticketParts = ticketId.replace(expectedPrefix + '-', '').split('-');
    const seatLabel = ticketParts[0]; // e.g., "A1" or "adult"
    const ticketIndex = parseInt(ticketParts[1]) - 1; // Convert to 0-indexed

    // Get seat info if available
    const seatInfo = booking.seats && booking.seats[ticketIndex] 
      ? [booking.seats[ticketIndex]] 
      : [];

    // Determine ticket type
    let ticketType = 'adult';
    if (ticketIndex >= (booking.adults || 0)) {
      ticketType = 'child';
    }

    // ===== MARK TICKET AS USED =====
    booking.usedTickets.push({
      ticketId: ticketId,
      seatLabel: seatLabel,
      type: ticketType,
      isUsed: true,
      usedAt: new Date(),
      verifiedBy: req.user?.name || req.user?.email || 'Scanner'
    });

    await booking.save();

    console.log('✓ Ticket verified and marked as used');
    console.log(`  - Ticket: ${ticketId}`);
    console.log(`  - Total used tickets: ${booking.usedTickets.length}`);
    console.log('=== VERIFICATION COMPLETED ===\n');

    res.json({
      success: true,
      message: 'Ticket verified - Entry granted',
      data: {
        bookingReference: booking.bookingReference,
        ticketId: ticketId,
        seatLabel: seatLabel,
        eventName: booking.event?.name,
        venue: booking.event?.venue,
        date: booking.date,
        time: booking.time,
        seats: seatInfo,
        contactInfo: booking.contactInfo,
        ticketType: ticketType,
        ticketCount: 1,
        totalAmount: booking.totalAmount,
        verifiedAt: booking.usedTickets[booking.usedTickets.length - 1].usedAt,
        verifiedBy: booking.usedTickets[booking.usedTickets.length - 1].verifiedBy
      }
    });

  } catch (error) {
    console.error('Ticket verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Verification failed', 
      error: error.message 
    });
  }
};


module.exports = exports;
