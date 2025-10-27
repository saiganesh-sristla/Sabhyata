const AbandonedCart = require('../../models/AbandonedCart');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Configure nodemailer (update with your email service credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Configure WhatsApp API (example using a third-party service like Twilio or WhatsApp Business API)
const sendWhatsAppMessage = async (phone, message) => {
  try {
    // Replace with your WhatsApp API provider's endpoint and credentials
    await axios.post('https://api.whatsapp.com/send', {
      phone: phone.replace('+91 ', ''), // Format phone number
      message
    }, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`
      }
    });
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return false;
  }
};

// Create or update abandoned cart
exports.createAbandonedCart = async (req, res) => {
  try {
    const { sessionId, event, tickets, totalAmount, contactInfo } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID required' });
    }

    const cart = await AbandonedCart.findOneAndUpdate(
      { sessionId },
      {
        event,
        tickets,
        totalAmount,
        contactInfo,
        // user: req.user ? req.user._id : undefined // if auth
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log("AbandonedCart returned:", cart);


    res.status(201).json({ success: true, data: cart });
  } catch (error) {
     console.error("AbandonedCart save error", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all abandoned carts
exports.getAllAbandonedCarts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, startDate, endDate } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { 'contactInfo.name': { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
        { 'contactInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const carts = await AbandonedCart.find(query)
      .populate('event', 'name')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const totalCount = await AbandonedCart.countDocuments(query);
    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      limit: parseInt(limit),
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1
    };

    res.json({ success: true, data: { carts, pagination } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get abandoned cart by ID
exports.getAbandonedCartById = async (req, res) => {
  try {
    const cart = await AbandonedCart.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('event', 'title description dateTime location pricing')
      .lean();

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Abandoned cart not found'
      });
    }

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Get abandoned cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch abandoned cart',
      error: error.message
    });
  }
};

// Send reminder for an abandoned cart
exports.sendReminder = async (req, res) => {
  try {
    const cart = await AbandonedCart.findById(req.params.id).populate('event', 'name');
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    if (!cart.contactInfo?.email && !cart.contactInfo?.phone) {
      return res.status(400).json({ success: false, message: 'No contact information available' });
    }

    const cartDetails = `
      Event: ${cart.event?.name || 'Unknown Event'}
      Tickets: ${cart.tickets.map(t => `${t.quantity} ${t.type.charAt(0).toUpperCase() + t.type.slice(1)}${t.quantity > 1 ? (t.type === 'child' ? 'ren' : 's') : ''} @ ₹${t.price.toLocaleString('en-IN')}`).join(', ')}
      Total: ₹${cart.totalAmount.toLocaleString('en-IN')}
    `;
    const checkoutUrl = `${process.env.FRONTEND_URL}/checkout?sessionId=${cart.sessionId}`;

    if (cart.contactInfo.email) {
      // Send email reminder
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: cart.contactInfo.email,
        subject: 'Complete Your Booking with Sabhyata Foundation',
        html: `
          <h3>Hello ${cart.contactInfo.name || 'Customer'},</h3>
          <p>You left some items in your cart! Here are the details:</p>
          <p>${cartDetails}</p>
          <p>Complete your booking now before your cart expires:</p>
          <a href="${checkoutUrl}" style="display: inline-block; padding: 10px 20px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 4px;">Complete Booking</a>
          <p>Thank you,<br>Sabhyata Foundation</p>
        `
      };

      await transporter.sendMail(mailOptions);
    } else if (cart.contactInfo.phone) {
      // Send WhatsApp reminder
      const message = `
Hello ${cart.contactInfo.name || 'Customer'},
You left items in your cart with Sabhyata Foundation!
${cartDetails}
Complete your booking: ${checkoutUrl}
      `.trim();

      const sent = await sendWhatsAppMessage(cart.contactInfo.phone, message);
      if (!sent) {
        return res.status(500).json({ success: false, message: 'Failed to send WhatsApp message' });
      }
    }

    // Update reminders sent count
    cart.remindersSent = (cart.remindersSent || 0) + 1;
    cart.lastReminderSent = new Date();
    await cart.save();

    res.json({ success: true, message: 'Reminder sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete abandoned cart
exports.deleteAbandonedCart = async (req, res) => {
  try {
    const cart = await AbandonedCart.findByIdAndDelete(req.params.id);
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    res.json({ success: true, message: 'Cart deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export abandoned carts as CSV
exports.exportAbandonedCartsCSV = async (req, res) => {
  try {
    const { search, status, startDate, endDate } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { 'contactInfo.name': { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
        { 'contactInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const carts = await AbandonedCart.find(query).populate('event', 'name');
    const csvData = carts.map(cart => ({
      CartID: cart._id,
      CustomerName: cart.contactInfo?.name || 'Anonymous',
      Email: cart.contactInfo?.email || '',
      Phone: cart.contactInfo?.phone || '',
      Event: cart.event?.name || 'Unknown Event',
      Tickets: cart.tickets.map(t => `${t.quantity} ${t.type.charAt(0).toUpperCase() + t.type.slice(1)}${t.quantity > 1 ? (t.type === 'child' ? 'ren' : 's') : ''} @ ₹${t.price.toLocaleString('en-IN')}`).join(', '),
      TotalAmount: `₹${cart.totalAmount.toLocaleString('en-IN')}`,
      Status: cart.status.charAt(0).toUpperCase() + cart.status.slice(1),
      CreatedAt: new Date(cart.createdAt).toLocaleString('en-IN'),
      LastActivity: cart.updatedAt ? new Date(cart.updatedAt).toLocaleString('en-IN') : ''
    }));

    const headers = ['CartID', 'CustomerName', 'Email', 'Phone', 'Event', 'Tickets', 'TotalAmount', 'Status', 'CreatedAt', 'LastActivity'];
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h]?.toString().replace(/"/g, '""') || ''}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=abandoned-carts.csv');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get analytics for abandoned carts
exports.getAbandonedCartAnalytics = async (req, res) => {
  try {
    const totalCarts = await AbandonedCart.countDocuments();
    const activeCarts = await AbandonedCart.countDocuments({ status: 'active' });
    const expiredCarts = await AbandonedCart.countDocuments({ status: 'pending' });
    const recoveredCarts = await AbandonedCart.countDocuments({ status: 'recovered' });
    const totalValue = await AbandonedCart.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalCarts,
        activeCarts,
        expiredCarts,
        recoveredCarts,
        totalActiveValue: totalValue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};