const User = require('../models/User');
const { generateTokenResponse } = require('../utils/jwt');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const otps = new Map(); // In-memory OTP storage (expires in 5 min)

const auth0Client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
});

// Register user
exports.register = async (req, res) => {
  try {
    console.log('Register payload received:', req.body);
    const { name, email, password, phone, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role
    });

    // Generate token response
    const tokenResponse = generateTokenResponse(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: tokenResponse
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// Login user (admin only)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Restrict manual login to admins only
    if (user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Please use Google or phone to login'
      });
    }

    // Check if user is active and not blocked
    if (!user.isActive || user.isBlocked) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive or blocked'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token response
    const tokenResponse = generateTokenResponse(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: tokenResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Staff login
exports.staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Restrict manual login to staff only
    if (user.role !== 'staff') {
      return res.status(401).json({
        success: false,
        message: 'Please use the appropriate login page for your role'
      });
    }

    // Check if user is active and not blocked
    if (!user.isActive || user.isBlocked) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive or blocked'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token response
    const tokenResponse = generateTokenResponse(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: tokenResponse
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Send OTP
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit phone required' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = Date.now() + 5 * 60 * 1000;
    otps.set(phone, { otp, expires });

    const authorization = process.env.FAST2SMS_API_KEY;
    
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${authorization}&route=dlt&sender_id=CNSLGM&message=190669&variables_values=${otp}&flash=0&numbers=${phone}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to send OTP');
    }

    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const stored = otps.get(phone);

    if (!stored || Date.now() > stored.expires) {
      return res.status(400).json({ success: false, message: 'OTP expired or invalid' });
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      user = await User.create({
        name: `${phone}`,
        phone,
        password: await bcrypt.hash(randomPassword, 12),
        role: 'user'
      });
    }

    if (!user.isActive || user.isBlocked) {
      return res.status(401).json({ success: false, message: 'Account is inactive or blocked' });
    }

    user.lastLogin = new Date();
    await user.save();

    const tokenResponse = generateTokenResponse(user);
    otps.delete(phone);

    res.json({
      success: true,
      message: 'Login successful',
      data: tokenResponse
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

// Google Login (Auth0)
exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ success: false, message: 'ID token required' });
  }

  function getKey(header, callback) {
    auth0Client.getSigningKey(header.kid, (err, key) => {
      const signingKey = key?.publicKey || key?.rsaPublicKey;
      callback(null, signingKey);
    });
  }

  jwt.verify(
    idToken,
    getKey,
    {
      audience: process.env.AUTH0_CLIENT_ID,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256'],
    },
    async (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }

      let user = await User.findOne({ auth0Id: decoded.sub });
      if (!user) {
        const randomPassword = crypto.randomBytes(16).toString('hex');
        user = await User.create({
          name: decoded.name || 'User',
          email: decoded.email,
          auth0Id: decoded.sub,
          password: await bcrypt.hash(randomPassword, 12),
          role: 'user'
        });
      }

      if (!user.isActive || user.isBlocked) {
        return res.status(401).json({ success: false, message: 'Account is inactive or blocked' });
      }

      user.lastLogin = new Date();
      await user.save();

      const tokenResponse = generateTokenResponse(user);

      res.json({
        success: true,
        message: 'Login successful',
        data: tokenResponse
      });
    }
  );
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information',
      error: error.message
    });
  }
};

// Logout (client-side token removal)
exports.logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};