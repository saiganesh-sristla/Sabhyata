const mongoose = require('mongoose');

const abandonedCartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  tickets: [{
    type: {
      type: String,
      enum: ['adult', 'child'],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalAmount: {
    type: Number, 
    required: true,
    min: 0
  },
  contactInfo: {
    name: String,
    email: String,
    phone: String
  },
  sessionId: String,
  status: {
    type: String,
    enum: ['active', 'pending', 'recovered', 'abandoned'], 
    default: 'active'
  },
  remindersSent: {
    type: Number,
    default: 0
  },
  lastReminderSent: Date,
  recoveredAt: Date,
  recoveredBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }
  },
  metadata: {
    browserInfo: String,
    deviceInfo: String,
    referrer: String,
    utm: {
      source: String,
      medium: String,
      campaign: String
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
abandonedCartSchema.index({ user: 1 });
abandonedCartSchema.index({ event: 1 });
abandonedCartSchema.index({ status: 1 });
abandonedCartSchema.index({ expiresAt: 1 });
abandonedCartSchema.index({ createdAt: -1 });

// Auto-expire abandoned carts
abandonedCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Update status based on expiration
abandonedCartSchema.pre('save', function(next) {
  if (this.expiresAt < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  this.updatedAt = new Date();
  next();
});

// Calculate total tickets
abandonedCartSchema.virtual('totalTickets').get(function() {
  return this.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
});

// Check if cart is expired
abandonedCartSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

module.exports = mongoose.model('AbandonedCart', abandonedCartSchema);