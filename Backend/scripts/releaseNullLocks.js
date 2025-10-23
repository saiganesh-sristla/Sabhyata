/**
 * Quick script to release seats with lockedAt=null
 * Run this with: node scripts/releaseNullLocks.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ShowSeatLayout = require('../models/ShowSeatLayout');

async function releaseNullLocks() {
  try {
    console.log('🔧 Releasing seats with lockedAt=null...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Update all locked seats that have null lockedAt
    const result = await ShowSeatLayout.updateMany(
      { 'layout_data.status': 'locked', 'layout_data.lockedAt': null },
      {
        $set: { 'layout_data.$[elem].status': 'available' },
        $unset: { 'layout_data.$[elem].lockedBy': '', 'layout_data.$[elem].lockedAt': '' }
      },
      {
        arrayFilters: [{ 'elem.status': 'locked', 'elem.lockedAt': null }]
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} layouts`);

    // Update counters for all affected layouts
    const layouts = await ShowSeatLayout.find({});
    for (const layout of layouts) {
      await ShowSeatLayout.updateOne(
        { _id: layout._id },
        {
          $set: {
            total_seats: layout.layout_data.length,
            available_seats: layout.layout_data.filter(s => s.status === 'available').length,
            booked_seats: layout.layout_data.filter(s => s.status === 'booked').length
          }
        }
      );
    }

    console.log('✅ Updated seat counters');
    console.log('🎉 Done!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

releaseNullLocks();
