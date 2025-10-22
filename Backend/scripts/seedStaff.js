const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config(); // Load environment variables

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Staff user data
const staffUser = {
  name: 'Staff User',
  email: 'staff@gmail.com',
  password: '123456789', // Will be hashed by User schema
  role: 'staff',
  phone: '1234567890',
  isActive: true,
  isBlocked: false,
};

// Seed function
const seedStaff = async () => {
  try {
    // Connect to database
    await connectDB();

    // Check if staff user already exists
    const existingUser = await User.findOne({
      $or: [{ email: staffUser.email }, { phone: staffUser.phone }],
    });

    if (existingUser) {
      console.log('Staff user already exists with this email or phone');
      await mongoose.connection.close();
      return;
    }

    // Create new staff user
    const user = new User(staffUser);
    await user.save();
    console.log('Staff user created successfully:', {
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    // Close connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error seeding staff user:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedStaff();