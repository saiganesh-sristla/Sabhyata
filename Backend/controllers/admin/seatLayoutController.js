const mongoose = require('mongoose');
const SeatLayout = require('../../models/SeatLayout');
const ShowSeatLayout = require('../../models/ShowSeatLayout');
const Event = require('../../models/Event');
const Booking = require('../../models/Booking');

// Book seats for an event (user-facing)
exports.bookSeats = async (req, res) => {
  try {
    const { event_id, seats, date, time, contactInfo, paymentMethod, tickets } = req.body;

    // Validate input
    if (!event_id || !seats || !Array.isArray(seats) || seats.length === 0 || !date || !time || !contactInfo || !tickets) {
      return res.status(400).json({ success: false, message: 'Event ID, seats, date, time, contact info, and tickets are required' });
    }

    // Validate contactInfo
    if (!contactInfo.name || !contactInfo.email || !contactInfo.phone) {
      return res.status(400).json({ success: false, message: 'Complete contact information is required' });
    }

    // Validate seat objects
    const requiredSeatFields = ['seatId', 'row', 'number', 'section', 'category', 'price', 'status', 'coords'];
    const invalidSeats = seats.some(seat => 
      !requiredSeatFields.every(field => seat[field] !== undefined) ||
      !seat.coords.x || !seat.coords.y
    );
    if (invalidSeats) {
      return res.status(400).json({ success: false, message: 'Invalid seat data' });
    }

    // Validate tickets
    if (!Array.isArray(tickets) || tickets.length !== seats.length) {
      return res.status(400).json({ success: false, message: 'Number of tickets must match number of seats' });
    }

    // Check seat layout
    const seatLayout = await SeatLayout.findOne({ event_id });
    if (!seatLayout) {
      return res.status(404).json({ success: false, message: 'Seat layout not found' });
    }

    if (!seatLayout.is_published) {
      return res.status(400).json({ success: false, message: 'Seat layout is not published' });
    }

    await seatLayout.releaseExpired();

    // Check availability
    const seatIds = seats.map(seat => seat.seatId);
    const unavailableSeats = seatLayout.layout_data.filter(seat => 
      seatIds.includes(seat.seatId) && seat.status !== 'available'
    );
    if (unavailableSeats.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some seats are not available',
        unavailable_seats: unavailableSeats.map(seat => seat.seatId)
      });
    }

    // Book seats in SeatLayout
    await seatLayout.bookSeats(seatIds);

    // Create booking record
    const booking = new Booking({
      event: event_id,
      date,
      time,
      seats,
      tickets,
      totalAmount: tickets.reduce((total, ticket) => total + ticket.price, 0),
      contactInfo,
      paymentMethod: paymentMethod || null,
      user: req.user._id
    });

    await booking.save();

    res.json({
      success: true,
      message: 'Seats booked successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Book seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book seats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Create seat layout for event (admin only)
exports.createSeatLayout = async (req, res) => {
  try {
    const { event_id, layout_data, layout_name } = req.body;

    // Check if event exists
    const event = await Event.findById(event_id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event is configured for seating
    const isSeated = (event.capacity_type && event.capacity_type === 'seated') || event.configureSeats === true || event.type === 'configure';
    if (!isSeated) {
      return res.status(400).json({ 
        success: false,
        message: 'Seat layout can only be created for configured/seated events'
      });
    }

    // Check if layout already exists
    const existingLayout = await SeatLayout.findOne({ event_id });
    if (existingLayout) {
      return res.status(400).json({
        success: false,
        message: 'Seat layout already exists for this event',
        data: { seatLayout: existingLayout }
      });
    }

    // Create seat layout
    const seatLayout = new SeatLayout({
      event_id,
      layout_data,
      layout_name: layout_name || 'Default Layout',
      stage: req.body.stage || undefined,
      created_by: req.user._id
    });

    await seatLayout.save();

    res.status(201).json({
      success: true,
      message: 'Seat layout created successfully',
      data: { seatLayout }
    });
  } catch (error) {
    console.error('Create seat layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create seat layout',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get seat layout for event (public) — returns template if date/time not provided; otherwise returns/creates show-scoped layout
exports.getSeatLayout = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { date, time, language } = req.query;

    if (!date || !time) {
      // Return template layout for admin/editor usage
      const template = await SeatLayout.findOne({ event_id });
      if (!template) return res.status(404).json({ success: false, message: 'Seat layout template not found for this event' });
      return res.json({ success: true, data: { seatLayout: template } });
    }

    const showDate = new Date(date);
    let showLayout = await ShowSeatLayout.findOne({ event_id, date: showDate, time, language: language || '' });

    if (!showLayout) {
      const template = await SeatLayout.findOne({ event_id });
      if (!template) return res.status(404).json({ success: false, message: 'Seat layout template not found for this event' });
      
      const clonedLayout = template.layout_data.map(s => ({
        seatId: s.seatId,
        row: s.row,
        number: s.number,
        section: s.section,
        category: s.category,
        price: s.price,
        status: 'available',
        lockedBy: null,
        lockedAt: null,
        coords: s.coords
      }));

      const stageCopy = template.stage ? { ...template.stage } : undefined;

      showLayout = new ShowSeatLayout({ event_id, date: showDate, time, language: language || '', layout_data: clonedLayout, stage: stageCopy });
      console.log(template.categories);
      showLayout.categories = template.categories;
      await showLayout.save();
    }

    await showLayout.releaseExpired();
    const template = await SeatLayout.findOne({ event_id });
      if (!template) return res.status(404).json({ success: false, message: 'Seat layout template not found for this event' });
    const result = showLayout.toObject();
    result.categories = template.categories;
    res.json({ success: true, data: { seatLayout: result } });
  } catch (error) {
    console.error('Get seat layout error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch seat layout', error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
  }
};

// Update seat layout for event (admin only)
exports.updateSeatLayout = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { layout_data, layout_name } = req.body;

    const seatLayout = await SeatLayout.findOne({ event_id });

    if (!seatLayout) {
      return res.status(404).json({
        success: false,
        message: 'Seat layout not found for this event'
      });
    }

  // Update layout
  seatLayout.layout_data = layout_data;
  if (req.body.stage) seatLayout.stage = req.body.stage;
    if (layout_name) seatLayout.layout_name = layout_name;
    await seatLayout.save();

    // Propagate template changes into existing show-scoped layouts
    try {
      const templateSeats = seatLayout.layout_data || [];
      const showLayouts = await ShowSeatLayout.find({ event_id });

      for (const show of showLayouts) {
        // Build a map of existing seats by seatId for quick lookup
        const existingMap = new Map();
        (show.layout_data || []).forEach(s => existingMap.set(s.seatId, s));

        // Merge: for each template seat, if the corresponding show seat is booked/locked preserve the entire seat object,
        // otherwise copy the template seat properties and reset status to available
        const merged = templateSeats.map(ts => {
          const existing = existingMap.get(ts.seatId);
          if (existing && (existing.status === 'booked' || existing.status === 'locked')) {
            // Preserve booked/locked seat as-is (do not overwrite coords/category/price/status)
            return existing;
          }
          // Respect template's status (could be 'available', 'blocked', or if admin set 'locked')
          const statusFromTemplate = ts.status || 'available';
          const mergedSeat = {
            seatId: ts.seatId,
            row: ts.row,
            number: ts.number,
            section: ts.section,
            category: ts.category,
            price: ts.price,
            status: statusFromTemplate,
            lockedBy: statusFromTemplate === 'locked' ? (ts.lockedBy || null) : null,
            lockedAt: statusFromTemplate === 'locked' ? (ts.lockedAt || null) : null,
            coords: ts.coords
          };
          return mergedSeat;
        });

        // Include any existing booked/locked seats that no longer exist in the template
        const templateIds = new Set(templateSeats.map(s => s.seatId));
        for (const [id, existing] of existingMap.entries()) {
          if (!templateIds.has(id) && (existing.status === 'booked' || existing.status === 'locked')) {
            merged.push(existing);
          }
        }

        show.layout_data = merged;
        // Update stage on show layouts if template provided a stage (keep existing if not provided)
        if (req.body.stage) show.stage = req.body.stage;
        await show.save();
      }
    } catch (propErr) {
      console.error('Failed to propagate template updates to show layouts:', propErr);
      // Non-fatal: continue and return success for template update, but include a warning
      return res.json({
        success: true,
        message: 'Seat layout updated successfully (but failed to update some show layouts)',
        data: { seatLayout, warning: propErr.message }
      });
    }

    res.json({
      success: true,
      message: 'Seat layout updated successfully',
      data: { seatLayout }
    });
  } catch (error) {
    console.error('Update seat layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update seat layout',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete seat layout for event (admin only)
exports.deleteSeatLayout = async (req, res) => {
  try {
    const { event_id } = req.params;

    const seatLayout = await SeatLayout.findOne({ event_id });

    if (!seatLayout) {
      return res.status(404).json({
        success: false,
        message: 'Seat layout not found for this event'
      });
    }

    // Check if there are any bookings for this event
    const bookingCount = await Booking.countDocuments({ event: event_id });
    if (bookingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete seat layout with existing bookings'
      });
    }

    await SeatLayout.deleteOne({ event_id });

    res.json({
      success: true,
      message: 'Seat layout deleted successfully'
    });
  } catch (error) {
    console.error('Delete seat layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete seat layout',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Hold seats (temporary lock and create temp booking)
exports.holdSeats = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { seat_ids, date, time, session_id } = req.body;

    if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Seat IDs are required'
      });
    }

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Date and time are required'
      });
    }

    // Find or create show-scoped layout
    const showDate = new Date(date);
    let showLayout = await ShowSeatLayout.findOne({ event_id, date: showDate, time, language: '' });

    if (!showLayout) {
      const template = await SeatLayout.findOne({ event_id });
      if (!template) return res.status(404).json({ success: false, message: 'Seat layout template not found for this event' });
      const clonedLayout = template.layout_data.map(s => ({
        seatId: s.seatId,
        row: s.row,
        number: s.number,
        section: s.section,
        category: s.category,
        price: s.price,
        status: 'available',
        lockedBy: null,
        lockedAt: null,
        coords: s.coords
      }));

      const stageCopy = template.stage ? { ...template.stage } : undefined;

      showLayout = new ShowSeatLayout({ event_id, date: showDate, time, language: '', layout_data: clonedLayout, stage: stageCopy });
      await showLayout.save();
    }

    await showLayout.releaseExpired();

    // Attempt to lock seats atomically on the show layout
    const lockResult = await showLayout.lockSeats(seat_ids, session_id);
    if (!lockResult || !lockResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to lock some seats',
        unavailable_seats: lockResult?.conflicted || []
      });
    }

    // Create a temporary booking record (without user)
    const booking = new Booking({
      event: event_id,
      date,
      time,
      seats: showLayout.layout_data.filter(seat => seat_ids.includes(seat.seatId)),
      tickets: seat_ids.map(seatId => {
        const seat = showLayout.layout_data.find(s => s.seatId === seatId);
        return { type: 'adult', price: seat?.price || 0 };
      }),
      totalAmount: showLayout.layout_data
        .filter(seat => seat_ids.includes(seat.seatId))
        .reduce((sum, seat) => sum + seat.price, 0),
      paymentMethod: req.body.paymentMethod || null,
      sessionId: session_id
    });

    await booking.save();

    res.json({
      success: true,
      message: 'Seats held successfully',
      data: {
        held_seats: seat_ids,
        bookingId: booking._id,
        totalAmount: booking.totalAmount,
        booking: booking
      }
    });
  } catch (error) {
    console.error('Hold seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to hold seats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Lock specific seats (user-facing)
exports.lockSeatsUser = async (req, res) => {
  try {
    const { event_id } = req.params;
    let { seat_ids, session_id, date, time, language } = req.body;

    if (!session_id) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }

    if (!Array.isArray(seat_ids)) {
      seat_ids = [seat_ids];
    }

    if (seat_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Seat IDs are required' });
    }

    if (!date || !time) {
      return res.status(400).json({ success: false, message: 'Date and time are required for locking seats' });
    }

    const showDate = new Date(date);
    let showLayout = await ShowSeatLayout.findOne({ event_id, date: showDate, time, language: language || '' });

    if (!showLayout) {
      const template = await SeatLayout.findOne({ event_id });
      if (!template) return res.status(404).json({ success: false, message: 'Seat layout template not found for this event' });
      const clonedLayout = template.layout_data.map(s => ({
        seatId: s.seatId,
        row: s.row,
        number: s.number,
        section: s.section,
        category: s.category,
        price: s.price,
        status: 'available',
        lockedBy: null,
        lockedAt: null,
        coords: s.coords
      }));

      const stageCopy = template.stage ? { ...template.stage } : undefined;

      showLayout = new ShowSeatLayout({ event_id, date: showDate, time, language: language || '', layout_data: clonedLayout, stage: stageCopy });
      await showLayout.save();
    }

    await showLayout.releaseExpired();

    const unavailableSeats = showLayout.layout_data.filter(seat => seat_ids.includes(seat.seatId) && seat.status !== 'available');

    if (unavailableSeats.length > 0) {
      return res.status(400).json({ success: false, message: 'Some seats are not available', unavailable_seats: unavailableSeats.map(seat => seat.seatId) });
    }

    const lockResult = await showLayout.lockSeats(seat_ids, session_id);
    if (!lockResult || !lockResult.success) {
      return res.status(400).json({ success: false, message: 'Failed to lock seats', unavailable_seats: lockResult?.conflicted || [] });
    }

    res.json({ success: true, message: 'Seats locked successfully', data: { seatLayout: lockResult.seatLayout } });
  } catch (error) {
    console.error('Lock seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock seats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Unlock specific seats (user-facing)
exports.unlockSeatsUser = async (req, res) => {
  try {
    const { event_id } = req.params;
    let { seat_ids, session_id, date, time, language } = req.body;

    if (!session_id) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }

    if (!Array.isArray(seat_ids)) {
      seat_ids = [seat_ids];
    }

    if (seat_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Seat IDs are required' });
    }

    if (!date || !time) {
      return res.status(400).json({ success: false, message: 'Date and time are required for unlocking seats' });
    }

    const showDate = new Date(date);
    const showLayout = await ShowSeatLayout.findOne({ event_id, date: showDate, time, language: language || '' });

    if (!showLayout) return res.status(404).json({ success: false, message: 'Show layout not found for this event/date/time' });

    await showLayout.releaseExpired();

    const unlockResult = await showLayout.unlockSeats(seat_ids, session_id);
    if (!unlockResult || !unlockResult.success) {
      return res.status(400).json({ success: false, message: 'Failed to unlock seats' });
    }

    res.json({ success: true, message: 'Seats unlocked successfully', data: { seatLayout: unlockResult.seatLayout } });
  } catch (error) {
    console.error('Unlock seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock seats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Release specific seats (admin only)
exports.releaseSeats = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { seat_ids } = req.body;

    if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Seat IDs are required'
      });
    }

    const { date, time, language } = req.body;

    if (date && time) {
      const showDate = new Date(date);
      const showLayout = await ShowSeatLayout.findOne({ event_id, date: showDate, time, language: language || '' });
      if (!showLayout) return res.status(404).json({ success: false, message: 'Show layout not found for this event/date/time' });
      await showLayout.releaseSeats(seat_ids);
      return res.json({ success: true, message: 'Seats released successfully', data: { released_seats: seat_ids, updated_layout: showLayout } });
    }

    const seatLayout = await SeatLayout.findOne({ event_id });
    if (!seatLayout) return res.status(404).json({ success: false, message: 'Seat layout not found for this event' });
    await seatLayout.releaseSeats(seat_ids);
    res.json({ success: true, message: 'Seats released successfully', data: { released_seats: seat_ids, updated_layout: seatLayout } });
  } catch (error) {
    console.error('Release seats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to release seats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Lock specific seats (admin only)
exports.lockSeatsAdmin = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { seat_ids } = req.body;

    if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Seat IDs are required'
      });
    }

    const { date, time, language } = req.body;
    const lockedBy = req.user._id.toString();

    if (date && time) {
      const showDate = new Date(date);
      let showLayout = await ShowSeatLayout.findOne({ event_id, date: showDate, time, language: language || '' });

      if (!showLayout) {
        const template = await SeatLayout.findOne({ event_id });
        if (!template) return res.status(404).json({ success: false, message: 'Seat layout template not found for this event' });
        const clonedLayout = template.layout_data.map(s => ({
          seatId: s.seatId,
          row: s.row,
          number: s.number,
          section: s.section,
          category: s.category,
          price: s.price,
          status: 'available',
          lockedBy: null,
          lockedAt: null,
          coords: s.coords
        }));
        showLayout = new ShowSeatLayout({ event_id, date: showDate, time, language: language || '', layout_data: clonedLayout });
        await showLayout.save();
      }

      await showLayout.releaseExpired();

      const lockResult = await showLayout.lockSeats(seat_ids, lockedBy);
      if (!lockResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to lock some seats',
          unavailable_seats: lockResult.conflicted || []
        });
      }

      return res.json({ success: true, message: 'Seats locked successfully', data: { locked_seats: seat_ids, updated_layout: showLayout } });
    }

    // Template layout
    const seatLayout = await SeatLayout.findOne({ event_id });
    if (!seatLayout) return res.status(404).json({ success: false, message: 'Seat layout not found for this event' });

    const lockResult = await seatLayout.lockSeats(seat_ids, lockedBy);
    if (!lockResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to lock some seats',
        unavailable_seats: lockResult.conflicted || []
      });
    }

    res.json({ success: true, message: 'Seats locked successfully', data: { locked_seats: seat_ids, updated_layout: seatLayout } });
  } catch (error) {
    console.error('Lock seats admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock seats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Publish seat layout for public use (admin only)
exports.publishSeatLayout = async (req, res) => {
  try {
    const { event_id } = req.params;

    const seatLayout = await SeatLayout.findOne({ event_id });

    if (!seatLayout) {
      return res.status(404).json({
        success: false,
        message: 'Seat layout not found for this event'
      });
    }

    if (seatLayout.is_published) {
      return res.status(400).json({
        success: false,
        message: 'Seat layout is already published'
      });
    }

    await seatLayout.publish();

    res.json({
      success: true,
      message: 'Seat layout published successfully',
      data: { seatLayout }
    });
  } catch (error) {
    console.error('Publish seat layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish seat layout',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get seat availability by category (public)
exports.getSeatAvailability = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { category } = req.query;

    const seatLayout = await SeatLayout.findOne({ event_id });

    if (!seatLayout) {
      return res.status(404).json({
        success: false,
        message: 'Seat layout not found for this event'
      });
    }

    await seatLayout.releaseExpired();

    let seats = seatLayout.layout_data;

    // Filter by category if specified
    if (category) {
      seats = seats.filter(seat => seat.category === category);
    }

    // Group by category
    const availability = {};
    seats.forEach(seat => {
      if (!availability[seat.category]) {
        availability[seat.category] = {
          total: 0,
          available: 0,
          booked: 0,
          locked: 0,
          blocked: 0
        };
      }

      availability[seat.category].total++;
      availability[seat.category][seat.status]++;
    });

    res.json({
      success: true,
      data: {
        availability,
        total_seats: seatLayout.total_seats,
        available_seats: seatLayout.available_seats,
        booked_seats: seatLayout.booked_seats
      }
    });
  } catch (error) {
    console.error('Get seat availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seat availability',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};