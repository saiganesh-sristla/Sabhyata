const Booking  = require('../models/Booking');
const ShowSeatLayout = require('../models/ShowSeatLayout');
const Event = require('../models/Event');
const { v4: uuidv4 } = require('uuid'); 

// Create temporary booking and optionally lock seats
exports.createTempBooking = async (req, res) => {
  try {
    const {
      eventId,
      date,
      time,
      language,
      seats,
      adults,
      children,
      isForeigner,
      totalAmount,
      deviceId,
      sessionId,
      paymentMethod
    } = req.body;

    console.log('=== CREATE TEMP BOOKING STARTED ===');

    // Validation
    if (!eventId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (eventId, date, time)'
      });
    }

    if (!deviceId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Device/session information required'
      });
    }

    // Get user ID if logged in
    const userId = req.user?._id || null;

    // Get IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // ===== GENERATE BOOKING REFERENCE (TEMP FORMAT) =====
    const bookingReference = `ID-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    console.log('Generated temp booking reference:', bookingReference);

    // Only check seat layout if seats are provided
    if (seats && seats.length > 0) {
      const seatLayout = await ShowSeatLayout.findOne({
        event_id: eventId,
        date: new Date(date),
        time: time,
        language: language || ''
      });

      if (seatLayout) {
        const seatIds = seats.map(s => s.seatId);
        const unavailableSeats = [];
        
        // Check seat availability
        for (const seatId of seatIds) {
          const seat = seatLayout.layout_data.find(s => s.seatId === seatId);
          if (!seat || seat.status !== 'available') {
            unavailableSeats.push(seatId);
          }
        }

        if (unavailableSeats.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Some seats are no longer available',
            unavailableSeats
          });
        }

        // Check for existing pending bookings
        const existingPendingBookings = await Booking.find({
          event: eventId,
          date: new Date(date),
          time: time,
          status: 'pending',
          expiresAt: { $gt: new Date() }
        });

        for (const pendingBooking of existingPendingBookings) {
          const conflictingSeats = pendingBooking.seats
            .filter(s => seatIds.includes(s.seatId))
            .map(s => s.seatId);
          
          if (conflictingSeats.length > 0) {
            return res.status(400).json({
              success: false,
              message: 'Some seats are currently locked by another user',
              conflictingSeats
            });
          }
        }

        // Lock seats in the layout using the proper method
        const lockResult = await seatLayout.lockSeats(seatIds, sessionId);
        if (lockResult && lockResult.success) {
          console.log(`✓ Locked ${seatIds.length} seats in layout with timestamps`);
        } else {
          console.error('Failed to lock seats:', lockResult);
          return res.status(400).json({
            success: false,
            message: 'Failed to lock seats',
            conflicted: lockResult?.conflicted || []
          });
        }
      } else {
        console.log('No seat layout found - proceeding without locking');
      }
    }

    // ===== CREATE TEMP BOOKING (NO TICKETS YET) =====
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean seat data - remove lockedAt/lockedBy fields from request
    const cleanedSeats = (seats || []).map(seat => ({
      seatId: seat.seatId,
      row: seat.row,
      number: seat.number,
      section: seat.section,
      category: seat.category,
      price: seat.price,
      status: seat.status,
      coords: seat.coords
      // Don't include lockedAt, lockedBy - backend sets these
    }));

    const booking = await Booking.create({
      bookingReference: bookingReference, // ✅ MUST PROVIDE THIS
      event: eventId,
      date: new Date(date),
      time,
      language: language || 'none',
      seats: cleanedSeats,
      tickets: [], // ✅ Empty - tickets generated after payment
      adults: adults || 0,
      children: children || 0,
      isForeigner: isForeigner || false,
      totalAmount,
      user: userId,
      deviceId,
      sessionId,
      ipAddress,
      userAgent,
      paymentMethod,
      expiresAt,
      status: 'pending',
      paymentStatus: 'pending',
      bookingType: userId ? 'user' : 'admin'
    });

    console.log('✓ Created temp booking:', booking.bookingReference, 'ID:', booking._id);

    // Schedule auto-release
    setTimeout(async () => {
      await releaseExpiredBooking(booking._id);
    }, 10 * 60 * 1000);

    res.json({
      success: true,
      message: 'Temporary booking created successfully',
      data: {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        expiresAt: booking.expiresAt,
        expiresIn: 600
      }
    });

  } catch (error) {
    console.error('Create temp booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create temporary booking',
      error: error.message
    });
  }
};

// ✅ Updated release function for unified model
async function releaseExpiredBooking(bookingId) {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.status !== 'pending') return;

    console.log(`Releasing expired booking: ${booking.bookingReference}`);

    // Release seats if locked
    if (booking.seats && booking.seats.length > 0) {
      const showDate = booking.date instanceof Date ? booking.date : new Date(booking.date);
      const seatLayout = await ShowSeatLayout.findOne({
        event_id: booking.event,
        date: showDate,
        time: booking.time,
        language: booking.language || ''
      });

      if (seatLayout) {
        const seatIds = booking.seats.map(s => s.seatId);
        console.log(`Releasing seats: ${seatIds.join(', ')}`);
        
        // Use the proper unlock method
        const unlockResult = await seatLayout.unlockSeats(seatIds, booking.sessionId);
        if (unlockResult && unlockResult.success) {
          console.log(`✅ Released ${seatIds.length} seats for booking ${booking.bookingReference}`);
        } else {
          console.error(`❌ Failed to release seats for booking ${booking.bookingReference}`);
        }
      } else {
        console.log(`No seat layout found for booking ${booking.bookingReference}`);
      }
    }

    booking.status = 'expired';
    await booking.save();
    
    console.log(`✅ Released expired booking: ${booking.bookingReference}`);
  } catch (error) {
    console.error('Error releasing booking:', error);
  }
}

// ✅ Cleanup expired seat locks in all ShowSeatLayouts
async function cleanupExpiredSeatLocks() {
  try {
    console.log('🧹 Starting cleanup of expired seat locks...');
    
    // Call the static method on ShowSeatLayout model to cleanup all expired locks
    const result = await ShowSeatLayout.cleanupAllExpiredLocks(5); // 5 minutes timeout
    
    if (result && result.success) {
      console.log(`✅ Seat lock cleanup completed: ${result.processedLayouts} layouts processed`);
    } else {
      console.error('❌ Seat lock cleanup failed:', result?.error);
    }
  } catch (error) {
    console.error('❌ Seat lock cleanup error:', error);
  }
}

// ✅ Cleanup expired bookings (works with regular Booking model)
exports.cleanupExpiredBookings = async () => {
  try {
    console.log('🧹 Starting cleanup of expired bookings...');
    
    const expiredBookings = await Booking.find({
      status: 'pending',
      expiresAt: { $lt: new Date() }
    });

    console.log(`Found ${expiredBookings.length} expired bookings to clean up`);

    for (const booking of expiredBookings) {
      await releaseExpiredBooking(booking._id);
    }

    // Also cleanup expired seat locks in ShowSeatLayout
    await cleanupExpiredSeatLocks();

    console.log(`✅ Cleanup completed: ${expiredBookings.length} expired bookings processed`);
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
};

// ✅ Test endpoint to manually trigger cleanup
exports.testCleanup = async (req, res) => {
  try {
    console.log('🧪 Manual test cleanup triggered');
    await exports.cleanupExpiredBookings();
    res.json({
      success: true,
      message: 'Test cleanup completed - check server logs for details',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Test cleanup failed',
      error: error.message
    });
  }
};

// Get temporary booking details
exports.getTempBooking = async (req, res) => {
  try {
    const { tempBookingId } = req.params;
    const { deviceId, sessionId } = req.query;

    const tempBooking = await TempBooking.findOne({
      tempBookingId,
      status: 'active'
    }).populate('event');

    if (!tempBooking) {
      return res.status(404).json({
        success: false,
        message: 'Temporary booking not found or expired'
      });
    }

    // Check if expired
    if (new Date() > tempBooking.expiresAt) {
      tempBooking.status = 'expired';
      await tempBooking.save();
      await releaseTempBooking(tempBookingId);
      
      return res.status(410).json({
        success: false,
        message: 'Booking expired'
      });
    } 

    // Verify ownership
    const userId = req.user?._id;
    const isOwner = verifyOwnership(tempBooking, userId, deviceId, sessionId);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - You do not own this booking'
      });
    }

    // Return booking details
    res.json({
      success: true,
      data: {
        tempBookingId: tempBooking.tempBookingId,
        event: {
          _id: tempBooking.event._id,
          name: tempBooking.event.name,
          venue: tempBooking.event.venue
        },
        date: tempBooking.date,
        time: tempBooking.time,
        language: tempBooking.language,
        seats: tempBooking.seats,
        adults: tempBooking.adults,
        children: tempBooking.children,
        isForeigner: tempBooking.isForeigner,
        totalAmount: tempBooking.totalAmount,
        expiresAt: tempBooking.expiresAt,
        expiresIn: Math.max(0, Math.floor((tempBooking.expiresAt - new Date()) / 1000))
      }
    });

  } catch (error) {
    console.error('Get temp booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: error.message
    });
  }
};

// Confirm booking after payment
exports.confirmTempBooking = async (req, res) => {
  try {
    const { tempBookingId } = req.params;
    const { deviceId, sessionId, paymentId, contactInfo } = req.body;

    const tempBooking = await TempBooking.findOne({
      tempBookingId,
      status: 'active'
    }).populate('event');

    if (!tempBooking) {
      return res.status(404).json({
        success: false,
        message: 'Temporary booking not found'
      });
    }

    // Check expiry
    if (new Date() > tempBooking.expiresAt) {
      tempBooking.status = 'expired';
      await tempBooking.save();
      await releaseTempBooking(tempBookingId);
      
      return res.status(410).json({
        success: false,
        message: 'Booking expired'
      });
    }

    // Verify ownership
    const userId = req.user?._id;
    const isOwner = verifyOwnership(tempBooking, userId, deviceId, sessionId);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Create actual booking
    const Booking = require('../models/Booking');
    const { v4: uuidv4 } = require('uuid');

    const tickets = [];
    
    // Generate tickets based on adults and children
    for (let i = 0; i < tempBooking.adults; i++) {
      const ticketPrice = tempBooking.seats && tempBooking.seats[i] 
        ? tempBooking.seats[i].price 
        : Math.round(tempBooking.totalAmount / (tempBooking.adults + tempBooking.children));
      
      tickets.push({
        ticketId: `TKT-${Date.now()}-${uuidv4().slice(0, 8)}`,
        type: 'adult',
        price: ticketPrice
      });
    }
    
    for (let i = 0; i < tempBooking.children; i++) {
      const ticketPrice = tempBooking.seats && tempBooking.seats[tempBooking.adults + i] 
        ? tempBooking.seats[tempBooking.adults + i].price 
        : Math.round(tempBooking.totalAmount / (tempBooking.adults + tempBooking.children));
      
      tickets.push({
        ticketId: `TKT-${Date.now()}-${uuidv4().slice(0, 8)}`,
        type: 'child',
        price: ticketPrice
      });
    }

    const booking = await Booking.create({
  event: eventId,
  date: new Date(date),
  time,
  language: language || 'none',
  seats: seats || [],
  adults: adults || 0,
  children: children || 0,
  isForeigner: isForeigner || false,
  totalAmount,
  userId,
  deviceId,
  sessionId,
  ipAddress,
  userAgent,
  paymentMethod,
  expiresAt,
  status: 'pending', // ✅ This will generate TEMP-XXX reference
  paymentStatus: 'pending',
  user: userId,
  bookingType: userId ? 'user' : 'admin'
});

// Return bookingId (not tempBookingId)
res.json({
  success: true,
  message: 'Booking created successfully',
  data: {
    bookingId: booking._id, // ✅ Use bookingId
    bookingReference: booking.bookingReference, // TEMP-XXX
    expiresAt: booking.expiresAt,
    expiresIn: 600
  }
});

    console.log('Created booking:', booking.bookingReference);

    // Mark seats as booked if seat layout exists
    if (tempBooking.seats && tempBooking.seats.length > 0) {
      const seatLayout = await ShowSeatLayout.findOne({
        event: tempBooking.event._id,
        date: tempBooking.date,
        time: tempBooking.time
      });

      if (seatLayout) {
        for (const seat of tempBooking.seats) {
          const layoutSeat = seatLayout.layoutdata.find(s => s.seatId === seat.seatId);
          if (layoutSeat) {
            layoutSeat.status = 'booked';
          }
        }
        await seatLayout.save();
        console.log('Marked seats as booked');
      }
    }

    // Mark temp booking as confirmed
    tempBooking.status = 'confirmed';
    await tempBooking.save();

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      data: {
        bookingId: booking._id,
        bookingReference: booking.bookingReference
      }
    });

  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm booking',
      error: error.message
    });
  }
};

// Cancel temporary booking
exports.cancelTempBooking = async (req, res) => {
  try {
    const { tempBookingId } = req.params;
    const { deviceId, sessionId } = req.body;

    const tempBooking = await TempBooking.findOne({
      tempBookingId,
      status: 'active'
    });

    if (!tempBooking) {
      return res.status(404).json({
        success: false,
        message: 'Temporary booking not found'
      });
    }

    // Verify ownership
    const userId = req.user?._id;
    const isOwner = verifyOwnership(tempBooking, userId, deviceId, sessionId);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Release seats
    await releaseTempBooking(tempBookingId);

    // Mark as cancelled
    tempBooking.status = 'cancelled';
    await tempBooking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
};

// Helper function to verify ownership
function verifyOwnership(tempBooking, userId, deviceId, sessionId) {
  console.log('Verifying ownership:', {
    tempBooking: {
      userId: tempBooking.userId,
      deviceId: tempBooking.deviceId,
      sessionId: tempBooking.sessionId
    },
    current: {
      userId,
      deviceId,
      sessionId
    }
  });

  // If user is logged in, check userId first
  if (userId) {
    if (tempBooking.userId && tempBooking.userId.toString() === userId.toString()) {
      console.log('✅ Verified by userId');
      return true;
    }
    
    // If user logged in after creating temp booking, check device/session
    if (!tempBooking.userId && tempBooking.deviceId === deviceId && tempBooking.sessionId === sessionId) {
      console.log('✅ Verified by device/session (logged in after creation)');
      return true;
    }
  }
  
  // If guest user (not logged in)
  if (!userId && !tempBooking.userId) {
    const deviceMatch = tempBooking.deviceId === deviceId;
    const sessionMatch = tempBooking.sessionId === sessionId;
    
    console.log('Device match:', deviceMatch, 'Session match:', sessionMatch);
    
    if (deviceMatch && sessionMatch) {
      console.log('✅ Verified by device and session');
      return true;
    }
  }
  
  console.log('❌ Verification failed');
  return false;
}

// Helper function to release seats
async function releaseTempBooking(tempBookingId) {
  try {
    const tempBooking = await TempBooking.findOne({ tempBookingId });
    if (!tempBooking || tempBooking.status !== 'active') return;

    // Only try to release seats if there are seats and a layout exists
    if (tempBooking.seats && tempBooking.seats.length > 0) {
      const seatLayout = await ShowSeatLayout.findOne({
        event: tempBooking.event,
        date: tempBooking.date,
        time: tempBooking.time
      });

      if (seatLayout) {
        for (const seat of tempBooking.seats) {
          const layoutSeat = seatLayout.layoutdata.find(s => s.seatId === seat.seatId);
          if (layoutSeat && layoutSeat.status === 'locked') {
            layoutSeat.status = 'available';
          }
        }
        await seatLayout.save();
        console.log(`Released seats for temp booking: ${tempBookingId}`);
      }
    }

    tempBooking.status = 'expired';
    await tempBooking.save();
    
    console.log(`Released temp booking: ${tempBookingId}`);
  } catch (error) {
    console.error('Error releasing temp booking:', error);
  }
}

// This function is now handled by the main cleanupExpiredBookings function above

// Convert temp booking to real booking (after payment)
exports.convertTempToRealBooking = async (req, res) => {
  try {
    const { tempBookingId } = req.params;
    const { deviceId, sessionId, contactInfo, notes, paymentId } = req.body;

    console.log('Converting temp booking to real:', tempBookingId);

    const tempBooking = await TempBooking.findOne({
      tempBookingId,
      status: 'active'
    }).populate('event');

    if (!tempBooking) {
      return res.status(404).json({
        success: false,
        message: 'Temporary booking not found'
      });
    }

    // Check expiry
    if (new Date() > tempBooking.expiresAt) {
      tempBooking.status = 'expired';
      await tempBooking.save();
      await releaseTempBooking(tempBookingId);
      
      return res.status(410).json({
        success: false,
        message: 'Booking expired'
      });
    }

    // Verify ownership
    const userId = req.user?._id;
    const isOwner = verifyOwnership(tempBooking, userId, deviceId, sessionId);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Create actual booking
    const Booking = require('../models/Booking');
    const { v4: uuidv4 } = require('uuid');

    const tickets = [];
    
    // Generate tickets
    for (let i = 0; i < tempBooking.adults; i++) {
      const ticketPrice = tempBooking.seats && tempBooking.seats[i] 
        ? tempBooking.seats[i].price 
        : Math.round(tempBooking.totalAmount / (tempBooking.adults + tempBooking.children));
      
      tickets.push({
        ticketId: `TKT-${Date.now()}-${uuidv4().slice(0, 8)}`,
        type: 'adult',
        price: ticketPrice
      });
    }
    
    for (let i = 0; i < tempBooking.children; i++) {
      const ticketPrice = tempBooking.seats && tempBooking.seats[tempBooking.adults + i] 
        ? tempBooking.seats[tempBooking.adults + i].price 
        : Math.round(tempBooking.totalAmount / (tempBooking.adults + tempBooking.children));
      
      tickets.push({
        ticketId: `TKT-${Date.now()}-${uuidv4().slice(0, 8)}`,
        type: 'child',
        price: ticketPrice
      });
    }

    const booking = await Booking.create({
      event: tempBooking.event._id,
      date: tempBooking.date,
      time: tempBooking.time,
      language: tempBooking.language,
      seats: tempBooking.seats,
      tickets,
      totalAmount: tempBooking.totalAmount,
      contactInfo,
      paymentMethod: tempBooking.paymentMethod,
      notes,
      status: 'confirmed',
      paymentStatus: 'paid',
      user: userId,
      bookingType: userId ? 'user' : 'admin',
      sessionId: tempBooking.sessionId
    });

    console.log('Created real booking:', booking.bookingReference);

    // Mark seats as booked
    if (tempBooking.seats && tempBooking.seats.length > 0) {
      const seatLayout = await ShowSeatLayout.findOne({
        event: tempBooking.event._id,
        date: tempBooking.date,
        time: tempBooking.time
      });

      if (seatLayout) {
        for (const seat of tempBooking.seats) {
          const layoutSeat = seatLayout.layoutdata.find(s => s.seatId === seat.seatId);
          if (layoutSeat) {
            layoutSeat.status = 'booked';
          }
        }
        await seatLayout.save();
        console.log('Marked seats as booked');
      }
    }

    // Mark temp booking as confirmed and link to real booking
    tempBooking.status = 'confirmed';
    tempBooking.realBookingId = booking._id;
    await tempBooking.save();

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      data: {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        tempBookingId: tempBooking.tempBookingId
      }
    });

  } catch (error) {
    console.error('Convert temp to real booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm booking',
      error: error.message
    });
  }
};
