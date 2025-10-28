const Booking = require('../../models/Booking');
const Event = require('../../models/Event');
const SeatLayout = require('../../models/SeatLayout');
const ShowSeatLayout = require('../../models/ShowSeatLayout');
const AbandonedCart = require('../../models/AbandonedCart');
const TempBooking = require('../tempBookingController');
const { exportBookings } = require('../../utils/csvExport');
const { v4: uuidv4 } = require('uuid');
const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpay = null;
const getRazorpay = () => {
  if (razorpay) return razorpay;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  razorpay = new Razorpay({ key_id, key_secret });
  return razorpay;
};

// Helper to validate date/time against event schedule
const validateSchedule = (event, date, time) => {
  const bookingDate = new Date(date);
  if (event.recurrence === 'daily' && event.dailySchedule) {
    const start = new Date(event.dailySchedule.startDate);
    const end = new Date(event.dailySchedule.endDate);
    if (bookingDate < start || bookingDate > end) return false;
    return event.dailySchedule.timeSlots.some(slot => slot.time === time);
  } else if (event.recurrence === 'specific' && event.specificSchedules) {
    const specific = event.specificSchedules.find(s => new Date(s.date).toDateString() === bookingDate.toDateString());
    if (!specific) return false;
    return specific.timeSlots.some(slot => slot.time === time);
  }
  return false;
};

// Helper to check seat uniqueness
const checkSeatUniqueness = async (eventId, date, time, newSeats) => {
  const existingBookings = await Booking.find({ event: eventId, date: new Date(date), time });
  const bookedSeats = new Set();
  existingBookings.forEach(booking => {
    booking.seats.forEach(seat => bookedSeats.add(seat.seatId));
  });
  return newSeats.every(seat => !bookedSeats.has(seat));
};

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const {
      event: eventId,
      date,
      time,
      seats = [],
      tickets,
      totalAmount,
      contactInfo,
      paymentMethod,
      notes,
      status = 'pending', 
      paymentStatus = 'pending',
      sessionId,
      bookingType = 'user',
      user,
      adults = 0,      // ADD THIS
      children = 0,    // ADD THIS
      isForeigner = false, // ADD THIS
      language = 'none'    // ADD THIS
    } = req.body;
    
    console.log('Creating booking for user:', user);
    
    // Validate event
    const eventDoc = await Event.findById(eventId);
    if (!eventDoc) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Validate date and time
    if (!validateSchedule(eventDoc, date, time)) {
      return res.status(400).json({ success: false, message: 'Invalid date or time for this event' });
    }

    // Validate tickets and calculate total
    const adultPrice = eventDoc.price;
    const childDiscount = eventDoc.childDiscountPercentage / 100 || 0;
    const childPrice = adultPrice * (1 - childDiscount);
    let calculatedTotal = tickets.reduce((total, ticket) => total + ticket.price, 0);

    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return res.status(400).json({ success: false, message: 'Total amount mismatch' });
    }

    // Capacity and seats validation
    const query = { event: eventId, date: new Date(date), time };
    const existingBookings = await Booking.find(query);
    const bookedTickets = existingBookings.reduce((sum, b) => sum + b.tickets.length, 0);
    const newTicketCount = tickets.length;

    let seatObjects = [];
    let seatIds = [];

    if (eventDoc.type === 'walking') {
      if (seats.length > 0) {
        return res.status(400).json({ success: false, message: 'Seats not applicable for walking events' });
      }
      if (bookedTickets + newTicketCount > eventDoc.capacity) {
        return res.status(400).json({ success: false, message: 'Event capacity exceeded for this slot' });
      }
    } else if (eventDoc.type === 'configure') {
      if (!eventDoc.configureSeats) {
        return res.status(400).json({ success: false, message: 'Seats not configured for this event' });
      }
      if (seats.length !== newTicketCount) {
        return res.status(400).json({ success: false, message: 'Number of seats must match number of tickets' });
      }
      
      // Fetch or create show-scoped seat layout
      const showDate = new Date(date);
      let showLayout = await ShowSeatLayout.findOne({ 
        event_id: eventId, 
        date: showDate, 
        time, 
        language: language || '' 
      });
      
      if (!showLayout) {
        const template = await SeatLayout.findOne({ event_id: eventId });
        if (!template) {
          return res.status(404).json({ success: false, message: 'Seat layout template not found' });
        }
        const cloned = template.layout_data.map(s => ({ 
          ...(s.toObject ? s.toObject() : s), 
          status: 'available', 
          lockedBy: null, 
          lockedAt: null 
        }));
        const stageCopy = template.stage ? { ...template.stage } : undefined;
        showLayout = new ShowSeatLayout({ 
          event_id: eventId, 
          date: showDate, 
          time, 
          language: language || '', 
          layout_data: cloned, 
          stage: stageCopy 
        });
        await showLayout.save();
      }

      await showLayout.releaseExpired();

      seatIds = Array.isArray(seats) ? seats : seats.split(',').filter(s => s);
      seatObjects = showLayout.layout_data.filter(seat => seatIds.includes(seat.seatId));
      
      if (seatObjects.length !== seatIds.length) {
        return res.status(400).json({ success: false, message: 'Some seats are invalid or not found' });
      }

      const unavailableSeats = seatObjects.filter(seat => {
        const isLockedByUser = seat.status === 'locked' && seat.lockedBy === sessionId;
        return !(seat.status === 'available' || isLockedByUser);
      });
      
      if (unavailableSeats.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Some seats are not available', 
          unavailable_seats: unavailableSeats.map(s => s.seatId) 
        });
      }

      // Ensure no other confirmed booking exists for these seats
      if (!(await checkSeatUniqueness(eventId, date, time, seatIds))) {
        return res.status(400).json({ success: false, message: 'Some seats are already booked' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid event type' });
    }

    // Determine user and booking type
    let userId = null;
    if (bookingType === 'user' && user) {
      userId = user;
    } else if (bookingType === 'admin') {
      userId = null;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid booking type' });
    }

    // ===== GENERATE BOOKING REFERENCE FIRST =====
    const bookingReference = `ID-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    console.log('Generated booking reference:', bookingReference);

    // ===== GENERATE TICKETS WITH PROPER FORMAT =====
    let generatedTickets = [];
    
    if (eventDoc.type === 'configure' && seatObjects.length > 0) {
      // For seat-based bookings
      seatObjects.forEach((seat, index) => {
        const seatLabel = seat.seatId || `${seat.row}${seat.number}`;
        const ticketType = tickets[index]?.type || 'adult'; // Get type from request
        const ticketPrice = tickets[index]?.price || seat.price;
        
        generatedTickets.push({
          ticketId: `TKT-${bookingReference}-${seatLabel}-${index + 1}`,
          type: ticketType,
          price: ticketPrice,
          isUsed: false,
          seatLabel: seatLabel
        });
      });
    } else {
      // For walking tours or non-seat events
      let ticketCounter = 1;
      
      // Generate adult tickets
      for (let i = 0; i < adults; i++) {
        generatedTickets.push({
          ticketId: `TKT-${bookingReference}-adult-${ticketCounter}`,
          type: 'adult',
          price: adultPrice,
          isUsed: false,
          seatLabel: `Adult ${ticketCounter}`
        });
        ticketCounter++;
      }
      
      // Generate child tickets
      for (let i = 0; i < children; i++) {
        generatedTickets.push({
          ticketId: `TKT-${bookingReference}-child-${ticketCounter}`,
          type: 'child',
          price: childPrice,
          isUsed: false,
          seatLabel: `Child ${ticketCounter}`
        });
        ticketCounter++;
      }
    }

    console.log('Generated tickets:', generatedTickets.map(t => t.ticketId));
    const event1 = await Event.findById(eventId);
    // ===== CREATE BOOKING WITH GENERATED TICKETS =====
    const booking = new Booking({
      bookingReference: bookingReference, // Use pre-generated reference
      event: event1,
      date: new Date(date),
      time,
      language: language || 'none',
      seats: eventDoc.type === 'configure' ? seatObjects : [],
      tickets: generatedTickets, // Use properly generated tickets
      adults: adults,
      children: children,
      isForeigner: isForeigner,
      totalAmount,
      contactInfo: contactInfo || {},
      paymentMethod: paymentMethod || null,
      notes: notes || null,
      status,
      paymentStatus,
      sessionId,
      deviceId: req.body.deviceId || sessionId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      expiresAt: status === 'pending' ? new Date(Date.now() + 10 * 60 * 1000) : null, // 10 min expiry for pending
      bookingType,
      user: userId
    });

    await booking.save();

    console.log(`✓ Booking created: ${booking.bookingReference} with ${generatedTickets.length} tickets`);

    // Lock seats for this session
    if (eventDoc.type === 'configure' && seatIds.length > 0) {
      const showDate = new Date(date);
      const showLayout = await ShowSeatLayout.findOne({ 
        event_id: eventId, 
        date: showDate, 
        time, 
        language: language || '' 
      });
      
      if (showLayout) {
        await showLayout.lockSeats(seatIds, sessionId);
        console.log(`✓ Locked ${seatIds.length} seats for session ${sessionId}`);
      }
    }

    res.status(201).json({ 
      success: true, 
      message: 'Booking created successfully', 
      data: booking 
    });
    
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      bookingId, 
      tempBookingId,
      // ✅ Walking tour parameters
      eventId,
      adults,
      children,
      date,
      time,
      language,
      isForeigner,
      contactInfo,
      specialNotes
    } = req.body;
    
    console.log('Verifying payment:', { 
      razorpay_order_id, 
      bookingId, 
      tempBookingId, 
      eventId,
      isWalkingTour: !!eventId 
    });
    
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

    console.log('✅ Payment signature verified');

// ✅ WALKING TOUR - Create booking directly
if (eventId && !bookingId && !tempBookingId) {
  console.log('Creating walking tour booking directly for event:', eventId);
  
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Calculate total amount (verify frontend calculation)
  let totalAmount = 0;
  const adultPrice = isForeigner 
    ? event.price * (1 + event.foreignerIncreasePercentage / 100)
    : event.price;
  
  const childPrice = adultPrice * (1 - event.childDiscountPercentage / 100);
  
  totalAmount = (adults * adultPrice) + (children * childPrice);

  // Generate tickets
  const tickets = [];
  
  for (let i = 0; i < adults; i++) {
    tickets.push({
      ticketId: `TKT-${Date.now()}-${uuidv4().slice(0, 8)}`,
      type: 'adult',
      price: Math.round(adultPrice)
    });
  }
  
  for (let i = 0; i < children; i++) {
    tickets.push({
      ticketId: `TKT-${Date.now()}-${uuidv4().slice(0, 8)}`,
      type: 'child',
      price: Math.round(childPrice)
    });
  }

  // ✅ Generate booking reference manually
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  const bookingReference = `BKG-${timestamp}-${random}`;

  // Create booking
  const booking = await Booking.create({
    bookingReference, // ✅ Add this
    event: eventId,
    date: new Date(date),
    time: time,
    language: language || 'none',
    seats: [], // Walking tours don't have seats
    tickets,
    adults: adults,
    children: children,
    totalAmount: Math.round(totalAmount),
    contactInfo: contactInfo || {},
    paymentMethod: 'razorpay',
    notes: specialNotes || '',
    status: 'confirmed',
    paymentStatus: 'paid',
    user: req.user?._id || null,
    bookingType: req.user ? 'user' : 'admin',
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id
  });

  console.log('✅ Created walking tour booking:', booking.bookingReference);

  return res.json({ 
    success: true, 
    message: 'Payment verified and booking confirmed',
    data: {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      paymentId: razorpay_payment_id
    }
  });
}


   // ✅ SEATED EVENT - Handle temp booking conversion (using regular Booking model)
if (tempBookingId) {
  console.log('Converting temp booking to real:', tempBookingId);
  
  // Find the pending booking (temp booking is actually a regular Booking with status 'pending')
  const tempBooking = await Booking.findOne({
    _id: tempBookingId,
    status: 'pending'
  }).populate('event');

  if (!tempBooking) {
    return res.status(404).json({
      success: false,
      message: 'Temporary booking not found'
    });
  }

  // Check expiry
  if (tempBooking.expiresAt && new Date() > tempBooking.expiresAt) {
    tempBooking.status = 'expired';
    await tempBooking.save();
    
    return res.status(410).json({
      success: false,
      message: 'Booking expired'
    });
  }

  // ✅ Generate tickets with proper seat labels
  const tickets = [];
  
  if (tempBooking.seats && tempBooking.seats.length > 0) {
    // For seated events - generate tickets based on seats
    tempBooking.seats.forEach((seat, index) => {
      const seatLabel = seat.seatId || `${seat.row}${seat.number}`;
      const ticketType = index < tempBooking.adults ? 'adult' : 'child';
      
      tickets.push({
        ticketId: `TKT-${Date.now()}-${uuidv4().slice(0, 8)}`,
        type: ticketType,
        price: seat.price,
        isUsed: false,
        seatLabel: seatLabel
      });
    });
  } else {
    // Fallback for non-seated events
    for (let i = 0; i < tempBooking.adults; i++) {
      tickets.push({
        ticketId: `TKT-${Date.now()}-${uuidv4().slice(0, 8)}`,
        type: 'adult',
        price: Math.round(tempBooking.totalAmount / (tempBooking.adults + tempBooking.children)),
        isUsed: false,
        seatLabel: `Adult ${i + 1}`
      });
    }
    
    for (let i = 0; i < tempBooking.children; i++) {
      tickets.push({
        ticketId: `TKT-${Date.now()}-${uuidv4().slice(0, 8)}`,
        type: 'child',
        price: Math.round(tempBooking.totalAmount / (tempBooking.adults + tempBooking.children)),
        isUsed: false,
        seatLabel: `Child ${i + 1}`
      });
    }
  }

  // ✅ Update the existing booking with tickets and payment info
  const updatedBooking = await Booking.findByIdAndUpdate(tempBookingId, {
    tickets: tickets,
    status: 'confirmed',
    paymentStatus: 'paid',
    contactInfo: contactInfo || tempBooking.contactInfo,
    notes: specialNotes || tempBooking.notes,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    expiresAt: null // Remove expiry since it's now confirmed
  }, { new: true });

  console.log('✅ Updated booking with tickets:', updatedBooking.bookingReference);

  // ✅ Mark seats as booked in ShowSeatLayout
  if (tempBooking.seats && tempBooking.seats.length > 0) {
    const showDate = tempBooking.date instanceof Date ? tempBooking.date : new Date(tempBooking.date);
    const showLayout = await ShowSeatLayout.findOne({ 
      event_id: tempBooking.event._id, 
      date: showDate, 
      time: tempBooking.time, 
      language: tempBooking.language || '' 
    });
    
    if (showLayout) {
      const seatIds = tempBooking.seats.map(s => s.seatId);
      const bookResult = await showLayout.bookSeats(seatIds, tempBooking.sessionId);
      
      if (bookResult && bookResult.success) {
        console.log('✅ Seats marked as booked in layout');
      } else {
        console.error('❌ Failed to mark seats as booked:', bookResult?.message);
      }
    }
  }

  return res.json({ 
    success: true, 
    message: 'Payment verified and booking confirmed',
    data: {
      bookingId: updatedBooking._id,
      bookingReference: updatedBooking.bookingReference,
      paymentId: razorpay_payment_id
    }
  });
}


    // Handle existing booking update (legacy flow)
    if (bookingId) {
      console.log('Updating existing booking:', bookingId);
      
      const booking = await Booking.findByIdAndUpdate(bookingId, {
        paymentStatus: 'paid', 
        status: 'confirmed',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id
      }, { new: true }).populate('event');

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // ✅ Book seats if configured event
      if (booking.event.type === 'configure' && booking.seats && booking.seats.length > 0) {
        const showDate = booking.date instanceof Date ? booking.date : new Date(booking.date);
        const showLayout = await ShowSeatLayout.findOne({ 
          event_id: booking.event._id, 
          date: showDate, 
          time: booking.time, 
          language: booking.language || '' 
        });
        
        if (showLayout) {
          await showLayout.releaseExpired();
          const seatIds = booking.seats.map(s => s.seatId);
          const bookResult = await showLayout.bookSeats(seatIds, booking.sessionId);
          
          if (!bookResult || !bookResult.success) {
            console.error('❌ Failed to book seats:', bookResult?.message);
            return res.status(409).json({ 
              success: false, 
              message: 'Failed to finalize seat booking after payment', 
              conflicted: bookResult?.conflicted || [] 
            });
          }
          console.log('✅ Seats marked as booked in layout');
        }
      }

      // Handle abandoned cart recovery
      if (booking.sessionId) {
        await AbandonedCart.findOneAndUpdate(
          { sessionId: booking.sessionId },
          {
            status: 'recovered',
            recoveredAt: new Date(),
            recoveredBookingId: bookingId
          }
        );
      }

      return res.json({ 
        success: true, 
        message: 'Payment verified successfully',
        data: {
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
          paymentId: razorpay_payment_id
        }
      });
    }

    // No booking ID provided
    return res.status(400).json({
      success: false,
      message: 'Missing bookingId, tempBookingId, or eventId'
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

// Verify ticket (for QR scan)
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
    console.log('  - Event Type:', booking.event?.type);
    console.log('  - Event Date:', booking.date);
    console.log('  - Has Seats:', !!booking.seats?.length);
    console.log('  - Has Tickets:', !!booking.tickets?.length);

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

    // ===== CHECK IF EVENT DATE IS TODAY =====
    const today = new Date();
    const eventDate = new Date(booking.date);
    
    // Compare only date parts (ignore time)
    const isSameDay = 
      today.getFullYear() === eventDate.getFullYear() &&
      today.getMonth() === eventDate.getMonth() &&
      today.getDate() === eventDate.getDate();

    if (!isSameDay) {
      // Format dates for better error message
      const todayFormatted = today.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const eventDateFormatted = eventDate.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Check if event is in the past or future
      const isPastEvent = eventDate < today;
      
      console.log('ERROR: Event date mismatch');
      console.log(`  - Today: ${todayFormatted}`);
      console.log(`  - Event Date: ${eventDateFormatted}`);
      console.log(`  - Status: ${isPastEvent ? 'Past event' : 'Future event'}`);

      return res.status(400).json({ 
        success: false, 
        message: isPastEvent 
          ? 'This ticket has expired. The event was scheduled for an earlier date.' 
          : 'This ticket cannot be used yet. The event is scheduled for a future date.',
        data: {
          bookingReference: booking.bookingReference,
          eventDate: eventDateFormatted,
          todayDate: todayFormatted,
          eventName: booking.event?.name,
          venue: booking.event?.venue,
          time: booking.time
        }
      });
    }

    console.log('✓ Event date matches today - Proceeding with verification');

    // ===== VALIDATE TICKET ID =====
    const ticketExists = booking.tickets?.some(t => t.ticketId === ticketId);
    
    if (!ticketExists) {
      console.log('ERROR: Ticket ID not found in booking tickets');
      console.log('  - Looking for:', ticketId);
      console.log('  - Available tickets:', booking.tickets?.map(t => t.ticketId));
      
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ticket ID - ticket not found in this booking',
        data: {
          bookingReference: booking.bookingReference,
          receivedTicketId: ticketId,
          availableTickets: booking.tickets?.length || 0
        }
      });
    }

    // Get ticket details
    const ticket = booking.tickets.find(t => t.ticketId === ticketId);

    // ===== TRACK USED TICKETS =====
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

    // ===== GET SEAT INFO (FOR SEATED EVENTS) =====
    const ticketIndex = booking.tickets.findIndex(t => t.ticketId === ticketId);
    
    let seatInfo = [];
    let seatLabel = null;
    
    if (booking.seats && booking.seats.length > 0 && booking.seats[ticketIndex]) {
      const seat = booking.seats[ticketIndex];
      seatInfo = [seat];
      seatLabel = seat.seatId || `${seat.row}${seat.number}`;
    } else {
      // Walking tour - no seat
      seatLabel = ticket.type === 'adult' ? 'Adult' : 'Child';
    }

    // ===== MARK TICKET AS USED =====
    booking.usedTickets.push({
      ticketId: ticketId,
      seatLabel: seatLabel,
      type: ticket.type,
      isUsed: true,
      usedAt: new Date(),
      verifiedBy: req.user?.name || req.user?.email || 'Scanner'
    });

    await booking.save();

    console.log('✓ Ticket verified and marked as used');
    console.log(`  - Ticket: ${ticketId}`);
    console.log(`  - Type: ${ticket.type}`);
    console.log(`  - Seat: ${seatLabel}`);
    console.log(`  - Total used tickets: ${booking.usedTickets.length}/${booking.tickets.length}`);
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
        eventType: booking.event?.type,
        date: booking.date,
        time: booking.time,
        seats: seatInfo,
        contactInfo: booking.contactInfo,
        ticketType: ticket.type,
        ticketPrice: ticket.price,
        ticketCount: 1,
        totalAmount: booking.totalAmount,
        usedTickets: booking.usedTickets.length,
        totalTickets: booking.tickets.length,
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
 
// Get all bookings with filters
exports.getAllBookings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      paymentStatus,
      event,
      startDate,
      endDate,
      eventDate,
      channel,
      paymentMethod,
      eventDateFilter,
      currentDate,
      bookingType
    } = req.query;

    const query = {};

    // If userId is passed in params, filter bookings by user
    if (req.params.userId) {
      query.user = req.params.userId;
    }

    // Search filter - expanded to include phone, event name
    if (search) {
      // First get matching events
      const matchingEvents = await Event.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { venue: { $regex: search, $options: "i" } }
        ]
      }).select('_id');
      
      const eventIds = matchingEvents.map(e => e._id);
      
      query.$or = [
        { bookingReference: { $regex: search, $options: "i" } },
        { "contactInfo.name": { $regex: search, $options: "i" } },
        { "contactInfo.email": { $regex: search, $options: "i" } },
        { "contactInfo.phone": { $regex: search, $options: "i" } },
        { event: { $in: eventIds } }
      ];
    }

    // Status filters
    if (status) query.status = status.toLowerCase();
    if (paymentStatus) query.paymentStatus = paymentStatus.toLowerCase();
    if (event) query.event = event;
    if (channel) query.bookingType = channel.toLowerCase() === 'manual' ? 'admin' : channel.toLowerCase();
    if (paymentMethod) {
     // Accept synonyms for UPI
     const val = paymentMethod.toLowerCase();
     const allUpiMethods = ['upi', 'razorpay']; // Add more if needed
     if (allUpiMethods.includes(val)) {
     query.paymentMethod = { $in: allUpiMethods };
     } else {
     query.paymentMethod = val;
    }
    }

    if (bookingType) query.bookingType = bookingType.toLowerCase();

    // Date range filter (booking creation date)
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
    }

    // Single event date filter
    if (eventDate) {
      const dateStart = new Date(eventDate);
      const dateEnd = new Date(eventDate);
      dateEnd.setHours(23, 59, 59, 999);
      query.date = {
        $gte: dateStart,
        $lte: dateEnd
      };
    }

    // Event date filter for Upcoming/Past
    if (eventDateFilter && currentDate) {
      const now = new Date(currentDate);
      query.date = eventDateFilter === "future" ? { $gt: now } : { $lte: now };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { createdAt: -1 };

    // Execute queries
    const [bookings, totalCount] = await Promise.all([
      Booking.find(query)
        .populate("event", "name venue")
        .populate("user", "name email") // Populate user details
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Booking.countDocuments(query),
    ]);

    // Pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNextPage,
          hasPrevPage,
        },
      },
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId, sessionId } = req.query;
    
    console.log('Fetching booking:', id, 'deviceId:', deviceId, 'sessionId:', sessionId);
    
    let booking;
    
    // ✅ Try to find by MongoDB _id first
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // Valid MongoDB ObjectId
      booking = await Booking.findById(id)
        .populate('event')
        .populate('user', 'name email')
        .lean();
    }
    
    // ✅ If not found, try bookingReference (BR-XXX or TEMP-XXX)
    if (!booking) {
      booking = await Booking.findOne({ bookingReference: id })
        .populate('event')
        .populate('user', 'name email')
        .lean();
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }
    
    console.log('Booking found:', booking.bookingReference, 'Status:', booking.status);

    // ✅ For pending bookings, verify ownership
    if (booking.status === 'pending') {
      const userId = req.user?._id;
      
      console.log('Verifying ownership for pending booking:', {
        bookingUserId: booking.user,
        requestUserId: userId,
        bookingDeviceId: booking.deviceId,
        requestDeviceId: deviceId,
        bookingSessionId: booking.sessionId,
        requestSessionId: sessionId
      });

      // Check ownership
      const isOwner = verifyOwnership(booking, userId, deviceId, sessionId);
      
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this booking'
        });
      }
    }

    // ✅ Check if expired
    if (booking.status === 'pending' && booking.expiresAt && new Date() > new Date(booking.expiresAt)) {
      return res.status(410).json({
        success: false,
        message: 'Booking has expired'
      });
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: error.message,
    });
  }
};
 
// ✅ Fixed ownership check - handle populated user object
function verifyOwnership(booking, userId, deviceId, sessionId) {
  console.log('=== OWNERSHIP CHECK ===');
  
  // ✅ Extract the actual _id from populated user object
  const bookingUserId = booking.user?._id || booking.user;
  
  console.log('User ID match:', {
    booking: bookingUserId?.toString(),
    request: userId?.toString(),
    match: bookingUserId?.toString() === userId?.toString()
  });
  console.log('Device ID match:', {
    booking: booking.deviceId,
    request: deviceId,
    match: booking.deviceId === deviceId
  });
  console.log('Session ID match:', {
    booking: booking.sessionId,
    request: sessionId,
    match: booking.sessionId === sessionId
  });
  
  // If user is logged in and booking has user - match by userId
  if (userId && bookingUserId) {
    const userMatch = bookingUserId.toString() === userId.toString();
    console.log('✅ User-based auth:', userMatch);
    return userMatch;
  }
  
  // For guest bookings - match by deviceId
  if (!bookingUserId) {
    const deviceMatch = booking.deviceId === deviceId;
    console.log('✅ Device-based auth:', deviceMatch);
    return deviceMatch;
  }
  
  console.log('❌ No match found');
  return false;
}
 
// Update booking
exports.updateBooking = async (req, res) => {
  try {
    const { status, paymentStatus, notes, contactInfo, paymentMethod, user } = req.body;
    const bookingId = req.params.id;

    const updateData = {};
    if (status) updateData.status = status.toLowerCase();
    if (paymentStatus) updateData.paymentStatus = paymentStatus.toLowerCase();
    if (notes) updateData.notes = notes;
    if (contactInfo) updateData.contactInfo = contactInfo;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (user) updateData.user = user;

    // Handle cancellation
    if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = req.body.cancelReason || 'Cancelled by admin';
    }

    const booking = await Booking.findByIdAndUpdate(bookingId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('event', 'name')
      .populate('user', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: booking,
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking',
      error: error.message,
    });
  }
};

// Delete booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    res.json({
      success: true,
      message: 'Booking deleted successfully',
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete booking',
      error: error.message,
    });
  }
};

// Bulk delete bookings
exports.bulkDeleteBookings = async (req, res) => {
  try {
    const { bookingIds } = req.body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid booking IDs',
      });
    }

    const result = await Booking.deleteMany({
      _id: { $in: bookingIds },
    });

    res.json({
      success: true,
      message: `${result.deletedCount} bookings deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bookings',
      error: error.message,
    });
  }
};

// Export bookings to CSV
exports.exportBookingsCSV = async (req, res) => {
  try {
    const {
      search,
      status,
      paymentStatus,
      event,
      startDate,
      endDate,
      channel,
      eventDateFilter,
      currentDate,
      bookingType
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { bookingReference: { $regex: search, $options: 'i' } },
        { 'contactInfo.name': { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.status = status.toLowerCase();
    if (paymentStatus) query.paymentStatus = paymentStatus.toLowerCase();
    if (event) query.event = event;
    if (channel) query.channel = channel.toLowerCase();
    if (bookingType) query.bookingType = bookingType.toLowerCase();

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (eventDateFilter && currentDate) {
      const now = new Date(currentDate);
      query.date = eventDateFilter === 'future' ? { $gt: now } : { $lte: now };
    }

    // Get all bookings for export
    const bookings = await Booking.find(query)
      .populate('event', 'name')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Export to CSV
    const { fileName, filePath } = await exportBookings(bookings);

    // Send file
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to download file',
        });
      }
    });
  } catch (error) {
    console.error('Export bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export bookings',
      error: error.message,
    });
  }
};

// Get booking analytics
exports.getBookingAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const [
      totalRevenue,
      pendingPayments,
      cancelledBookings,
      paymentMethodStats,
      upcomingBookings,
      pastBookings,
      userBookings,
      adminBookings
    ] = await Promise.all([
      // Total revenue
      Booking.aggregate([
        { $match: { paymentStatus: 'paid', ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      // Pending payments
      Booking.countDocuments({ paymentStatus: 'pending', ...dateFilter }),
      // Cancelled bookings
      Booking.countDocuments({ status: 'cancelled', ...dateFilter }),
      // Payment method stats
      Booking.aggregate([
        { $match: { paymentStatus: 'paid', ...dateFilter } },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
      ]),
      // Upcoming bookings
      Booking.countDocuments({
        date: { $gt: new Date() },
        ...dateFilter,
      }),
      // Past bookings
      Booking.countDocuments({
        date: { $lte: new Date() },
        ...dateFilter,
      }),
      // User-initiated bookings
      Booking.countDocuments({ bookingType: 'user', ...dateFilter }),
      // Admin-initiated bookings
      Booking.countDocuments({ bookingType: 'admin', ...dateFilter })
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingPayments,
        cancelledBookings,
        paymentMethodStats,
        upcomingBookings,
        pastBookings,
        userBookings,
        adminBookings
      },
    });
  } catch (error) {
    console.error('Booking analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking analytics',
      error: error.message,
    });
  }
};

// Get bookings for current authenticated user
exports.getMyBookings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      paymentStatus,
      event,
      startDate,
      endDate,
      eventDateFilter,
      currentDate,
    } = req.query;

    const query = { user: req.user.id };

    if (status) query.status = status.toLowerCase();
    if (paymentStatus) query.paymentStatus = paymentStatus.toLowerCase();
    if (event) query.event = event;

    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    if (eventDateFilter && currentDate) {
      const now = new Date(currentDate);
      query.date = eventDateFilter === 'future' ? { $gt: now } : { $lte: now };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bookings, totalCount] = await Promise.all([
      Booking.find(query)
        .populate('event', 'name venue')
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Booking.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user bookings', error: error.message });
  }
};