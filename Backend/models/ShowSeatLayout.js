const mongoose = require('mongoose');

const seatDataSchema = new mongoose.Schema({
  seatId: { type: String, required: true },
  row: { type: String, required: true },
  number: { type: Number, required: true },
  section: { type: String, required: true, default: 'Main' },
  category: { type: String, enum: ['VIP','Premium', 'Gold', 'Silver', 'Bronze'], required: true },
  price: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['available','booked','locked','blocked'], default: 'available' },
  lockedBy: { type: String },
  lockedAt: { type: Date },
  coords: { x: { type: Number, required: true }, y: { type: Number, required: true } }
}, { _id: false });

const showSeatLayoutSchema = new mongoose.Schema({
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  language: { type: String, default: '' },
  layout_data: [seatDataSchema],
  stage: {
    x: { type: Number },
    y: { type: Number },
    width: { type: Number },
    height: { type: Number },
    label: { type: String }
  },
  total_seats: { type: Number, default: 0 },
  available_seats: { type: Number, default: 0 },
  booked_seats: { type: Number, default: 0 },
}, { timestamps: true });

// Unique index per show instance
showSeatLayoutSchema.index({ event_id: 1, date: 1, time: 1, language: 1 }, { unique: true });

showSeatLayoutSchema.pre('save', function(next) {
  this.total_seats = this.layout_data.length;
  this.available_seats = this.layout_data.filter(seat => seat.status === 'available').length;
  this.booked_seats = this.layout_data.filter(seat => seat.status === 'booked').length;
  next();
});

// Reuse atomic methods similar to SeatLayout but on the show-scoped document
showSeatLayoutSchema.methods.bookSeats = async function(seatIds, lockedBy = null, lockTimeoutMinutes = 5) {
  const timeoutMs = lockTimeoutMinutes * 60 * 1000;
  const expiryDate = new Date(Date.now() - timeoutMs);

  const conflict = await this.constructor.findOne({
    _id: this._id,
    layout_data: { $elemMatch: { seatId: { $in: seatIds }, $or: [ { status: 'booked' }, { status: 'locked', lockedBy: { $ne: lockedBy }, lockedAt: { $gt: expiryDate } } ] } }
  });

  if (conflict) {
    const latest = await this.constructor.findById(this._id).lean();
    const conflicted = latest.layout_data
      .filter(s => seatIds.includes(s.seatId) && (s.status === 'booked' || (s.status === 'locked' && s.lockedBy !== lockedBy && new Date(s.lockedAt) > expiryDate)))
      .map(s => s.seatId);
    return { success: false, conflicted };
  }

  const updated = await this.constructor.findOneAndUpdate(
    { _id: this._id },
    { $set: { 'layout_data.$[elem].status': 'booked', 'layout_data.$[elem].lockedBy': null, 'layout_data.$[elem].lockedAt': null } },
    { arrayFilters: [{ 'elem.seatId': { $in: seatIds } }], new: true }
  ).lean();

  if (updated) {
    await this.constructor.updateOne({ _id: this._id }, {
      $set: {
        total_seats: updated.layout_data.length,
        available_seats: updated.layout_data.filter(s => s.status === 'available').length,
        booked_seats: updated.layout_data.filter(s => s.status === 'booked').length
      }
    });
    return { success: true, seatLayout: updated };
  }

  return { success: false, message: 'Failed to book seats' };
};

showSeatLayoutSchema.methods.lockSeats = async function(seatIds, lockedBy, lockTimeoutMinutes = 5) {
  const timeoutMs = lockTimeoutMinutes * 60 * 1000;
  const expiryDate = new Date(Date.now() - timeoutMs);

  const conflict = await this.constructor.findOne({
    _id: this._id,
    layout_data: { $elemMatch: { seatId: { $in: seatIds }, $or: [ { status: 'booked' }, { status: 'locked', lockedBy: { $ne: lockedBy }, lockedAt: { $gt: expiryDate } } ] } }
  });

  if (conflict) {
    const latest = await this.constructor.findById(this._id).lean();
    const conflicted = latest.layout_data
      .filter(s => seatIds.includes(s.seatId) && (s.status === 'booked' || (s.status === 'locked' && s.lockedBy !== lockedBy && new Date(s.lockedAt) > expiryDate)))
      .map(s => s.seatId);
    return { success: false, conflicted };
  }

  const now = new Date();
  const updated = await this.constructor.findOneAndUpdate(
    { _id: this._id },
    { $set: { 'layout_data.$[elem].status': 'locked', 'layout_data.$[elem].lockedBy': lockedBy, 'layout_data.$[elem].lockedAt': now } },
    { arrayFilters: [{ 'elem.seatId': { $in: seatIds } }], new: true }
  ).lean();

  if (updated) {
    await this.constructor.updateOne({ _id: this._id }, {
      $set: {
        total_seats: updated.layout_data.length,
        available_seats: updated.layout_data.filter(s => s.status === 'available').length,
        booked_seats: updated.layout_data.filter(s => s.status === 'booked').length
      }
    });
    return { success: true, seatLayout: updated };
  }

  return { success: false, message: 'Failed to lock seats' };
};

showSeatLayoutSchema.methods.unlockSeats = async function(seatIds, lockedBy, lockTimeoutMinutes = 5) {
  const timeoutMs = lockTimeoutMinutes * 60 * 1000;
  const expiryDate = new Date(Date.now() - timeoutMs);

  console.log(`🔓 Unlocking seats: ${seatIds.join(', ')}, lockedBy: ${lockedBy}, expiryDate: ${expiryDate.toISOString()}`);

  // ✅ Fix: Use separate arrayFilters for each condition instead of $or
  const updated = await this.constructor.findOneAndUpdate(
    { _id: this._id },
    { 
      $set: { 'layout_data.$[elem].status': 'available' }, 
      $unset: { 'layout_data.$[elem].lockedBy': '', 'layout_data.$[elem].lockedAt': '' } 
    },
    { 
      arrayFilters: [
        { 
          'elem.seatId': { $in: seatIds }, 
          'elem.status': 'locked',
          $or: [
            { 'elem.lockedBy': lockedBy },
            { 'elem.lockedAt': { $lte: expiryDate } }
          ]
        }
      ], 
      new: true 
    }
  ).lean();

  if (updated) {
    const unlockedCount = updated.layout_data.filter(s => 
      seatIds.includes(s.seatId) && s.status === 'available' && !s.lockedBy
    ).length;
    
    console.log(`✅ Unlocked ${unlockedCount} seats`);
    
    await this.constructor.updateOne({ _id: this._id }, {
      $set: {
        total_seats: updated.layout_data.length,
        available_seats: updated.layout_data.filter(s => s.status === 'available').length,
        booked_seats: updated.layout_data.filter(s => s.status === 'booked').length
      }
    });
    return { success: true, seatLayout: updated };
  }

  console.log('❌ Failed to unlock seats - no update performed');
  return { success: false, message: 'Failed to unlock seats' };
};

showSeatLayoutSchema.methods.releaseExpired = async function(lockTimeoutMinutes = 5) {
  const timeoutMs = lockTimeoutMinutes * 60 * 1000;
  const expiryDate = new Date(Date.now() - timeoutMs);

  console.log(`🔓 Releasing expired locks for layout ${this._id}, expiry date: ${expiryDate.toISOString()}`);

  const updated = await this.constructor.findOneAndUpdate(
    { _id: this._id },
    { $set: { 'layout_data.$[elem].status': 'available' }, $unset: { 'layout_data.$[elem].lockedBy': '', 'layout_data.$[elem].lockedAt': '' } },
    { arrayFilters: [{ 'elem.status': 'locked', 'elem.lockedAt': { $lte: expiryDate } }], new: true }
  ).lean();

  if (updated) {
    const releasedCount = updated.layout_data.filter(s => s.status === 'available' && s.lockedAt === undefined).length;
    console.log(`✅ Released ${releasedCount} expired locks in layout ${this._id}`);
    
    await this.constructor.updateOne({ _id: this._id }, {
      $set: {
        total_seats: updated.layout_data.length,
        available_seats: updated.layout_data.filter(s => s.status === 'available').length,
        booked_seats: updated.layout_data.filter(s => s.status === 'booked').length
      }
    });
  }

  return { success: true, seatLayout: updated };
};

// ✅ Static method to cleanup all expired locks across all show layouts
showSeatLayoutSchema.statics.cleanupAllExpiredLocks = async function(lockTimeoutMinutes = 5) {
  try {
    console.log('🧹 Starting global cleanup of expired seat locks...');
    
    const timeoutMs = lockTimeoutMinutes * 60 * 1000;
    const expiryDate = new Date(Date.now() - timeoutMs);
    
    // Find all layouts with expired locks
    const layoutsWithExpiredLocks = await this.find({
      'layout_data.status': 'locked',
      'layout_data.lockedAt': { $lte: expiryDate }
    });

    console.log(`Found ${layoutsWithExpiredLocks.length} layouts with expired locks`);

    let totalReleased = 0;
    for (const layout of layoutsWithExpiredLocks) {
      const result = await layout.releaseExpired(lockTimeoutMinutes);
      if (result && result.success) {
        totalReleased++;
      }
    }

    console.log(`✅ Global cleanup completed: ${totalReleased} layouts processed`);
    return { success: true, processedLayouts: totalReleased };
  } catch (error) {
    console.error('❌ Global cleanup error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = mongoose.model('ShowSeatLayout', showSeatLayoutSchema);
