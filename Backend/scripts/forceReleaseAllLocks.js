/**
 * Emergency script to force-release ALL locked seats
 * Run this with: node scripts/forceReleaseAllLocks.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ShowSeatLayout = require('../models/ShowSeatLayout');

async function forceReleaseAllLocks() {
  try {
    console.log('🚨 FORCE RELEASING ALL LOCKED SEATS...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all layouts with locked seats
    const layouts = await ShowSeatLayout.find({
      'layout_data.status': 'locked'
    });

    console.log(`Found ${layouts.length} layouts with locked seats`);

    let totalSeatsReleased = 0;

    for (const layout of layouts) {
      const lockedSeats = layout.layout_data.filter(s => s.status === 'locked');
      console.log(`\nLayout ${layout._id}:`);
      console.log(`  - Event: ${layout.event_id}`);
      console.log(`  - Date: ${layout.date}`);
      console.log(`  - Time: ${layout.time}`);
      console.log(`  - Locked seats: ${lockedSeats.length}`);

      // Show sample timestamps
      if (lockedSeats.length > 0) {
        console.log(`  - Sample locked seats:`);
        lockedSeats.slice(0, 3).forEach(s => {
          const lockedAtDate = s.lockedAt ? new Date(s.lockedAt) : null;
          const ageMinutes = lockedAtDate ? Math.floor((Date.now() - lockedAtDate.getTime()) / 60000) : 'N/A';
          console.log(`    • ${s.seatId}: lockedAt=${s.lockedAt} (${ageMinutes} minutes ago)`);
        });
      }

      // Force release ALL locked seats (no time check)
      const result = await ShowSeatLayout.updateOne(
        { _id: layout._id },
        {
          $set: { 'layout_data.$[elem].status': 'available' },
          $unset: { 'layout_data.$[elem].lockedBy': '', 'layout_data.$[elem].lockedAt': '' }
        },
        {
          arrayFilters: [{ 'elem.status': 'locked' }]
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`  ✅ Released ${lockedSeats.length} seats`);
        totalSeatsReleased += lockedSeats.length;

        // Update counters
        const updatedLayout = await ShowSeatLayout.findById(layout._id);
        await ShowSeatLayout.updateOne(
          { _id: layout._id },
          {
            $set: {
              total_seats: updatedLayout.layout_data.length,
              available_seats: updatedLayout.layout_data.filter(s => s.status === 'available').length,
              booked_seats: updatedLayout.layout_data.filter(s => s.status === 'booked').length
            }
          }
        );
      } else {
        console.log(`  ❌ Failed to release seats`);
      }
    }

    console.log(`\n🎉 COMPLETE: Released ${totalSeatsReleased} seats across ${layouts.length} layouts`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

forceReleaseAllLocks();
