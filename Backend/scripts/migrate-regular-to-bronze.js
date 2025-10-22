#!/usr/bin/env node
require('dotenv').config();
const connectDB = require('../config/database');
const mongoose = require('mongoose');
const SeatLayout = require('../models/SeatLayout');
const ShowSeatLayout = require('../models/ShowSeatLayout');
const Booking = require('../models/Booking');

// Replacement values for Bronze (should match models/SeatLayout default)
const BRONZE_CATEGORY = { name: 'Bronze', color: '#CD7F32', price: 90 };

async function migrate({ apply = false } = {}) {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Please set MONGODB_URI in your environment before running this script.');
      process.exit(1);
    }

    await connectDB();

    // SeatLayout documents
    const seatLayouts = await SeatLayout.find({
      $or: [
        { 'categories.name': 'Regular' },
        { 'layout_data.category': 'Regular' }
      ]
    });

    console.log(`Found ${seatLayouts.length} SeatLayout documents to examine.`);

    let slChanges = 0;
    for (const doc of seatLayouts) {
      let changed = false;

      // Replace category entries
      if (Array.isArray(doc.categories)) {
        doc.categories = doc.categories.map(cat => {
          if (cat && cat.name === 'Regular') {
            changed = true;
            return { ...BRONZE_CATEGORY };
          }
          return cat;
        });
      }

      // Replace seat entries
      if (Array.isArray(doc.layout_data)) {
        doc.layout_data = doc.layout_data.map(seat => {
          if (seat && seat.category === 'Regular') {
            changed = true;
            return { ...seat.toObject ? seat.toObject() : seat, category: 'Bronze', price: BRONZE_CATEGORY.price };
          }
          return seat;
        });
      }

      if (changed) {
        slChanges++;
        console.log(`SeatLayout ${doc._id} will be updated.`);
        if (apply) {
          await doc.save();
          console.log(`SeatLayout ${doc._id} updated.`);
        }
      }
    }

    // ShowSeatLayout documents
    const showLayouts = await ShowSeatLayout.find({ 'layout_data.category': 'Regular' });
    console.log(`Found ${showLayouts.length} ShowSeatLayout documents to examine.`);
    let shChanges = 0;
    for (const doc of showLayouts) {
      let changed = false;
      if (Array.isArray(doc.layout_data)) {
        doc.layout_data = doc.layout_data.map(seat => {
          if (seat && seat.category === 'Regular') {
            changed = true;
            return { ...seat.toObject ? seat.toObject() : seat, category: 'Bronze', price: BRONZE_CATEGORY.price };
          }
          return seat;
        });
      }
      if (changed) {
        shChanges++;
        console.log(`ShowSeatLayout ${doc._id} will be updated.`);
        if (apply) {
          await doc.save();
          console.log(`ShowSeatLayout ${doc._id} updated.`);
        }
      }
    }

    // Booking documents (seat records in bookings)
    const bookings = await Booking.find({ 'seats.category': 'Regular' });
    console.log(`Found ${bookings.length} Booking documents to examine.`);
    let bkChanges = 0;
    for (const doc of bookings) {
      let changed = false;
      if (Array.isArray(doc.seats)) {
        doc.seats = doc.seats.map(seat => {
          if (seat && seat.category === 'Regular') {
            changed = true;
            return { ...seat.toObject ? seat.toObject() : seat, category: 'Bronze', price: BRONZE_CATEGORY.price };
          }
          return seat;
        });
      }
      if (changed) {
        bkChanges++;
        console.log(`Booking ${doc._id} will be updated.`);
        if (apply) {
          await doc.save();
          console.log(`Booking ${doc._id} updated.`);
        }
      }
    }

    console.log('Migration summary:');
    console.log(`  SeatLayouts to change: ${slChanges}`);
    console.log(`  ShowSeatLayouts to change: ${shChanges}`);
    console.log(`  Bookings to change: ${bkChanges}`);

    if (!apply) {
      console.log('\nDry-run complete. No documents were modified. To apply changes, re-run with --apply');
    } else {
      console.log('\nApply complete. All changes saved.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const apply = args.includes('--apply');

migrate({ apply });
