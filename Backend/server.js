const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
// Load environment from the Backend folder explicitly so running the file
// from a different working directory still picks up the right .env
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const paymentRoutes = require('./routes/payments');
const swaggerRoutes = require('./routes/swagger');
const partnerRoutes = require('./routes/partners');
const partnerEvents = require('./routes/partnerEvents');
const tempBookingRoutes = require('./routes/tempBookingRoutes');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173', // Vite default
  'http://127.0.0.1:5173',
  'https://sabhyata-foundation-v1.netlify.app',
  'https://admin-sabhyata-foundation-v1.netlify.app',
  'http://localhost:8080',
  'http://127.0.0.1:8080', // CRA or other dev servers
  process.env.FRONTEND_URL,
].filter(Boolean);

// Explicit OPTIONS handler - MUST be before CORS middleware
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin like curl, mobile apps, or server-to-server
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    console.warn('CORS blocked for origin:', origin);
    return callback(null, false); // Don't throw error, just block
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', cors(corsOptions), express.static('uploads'));
// Logging
app.use(morgan('combined'));

// Server health monitoring middleware
app.use((req, res, next) => {
  // Log memory usage periodically
  if (Math.random() < 0.01) { // 1% of requests
    const memUsage = process.memoryUsage();
    console.log('Memory:', {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
    });
  }
  next();
});

// Database connection
const mongoUri = process.env.MONGODB_URI;

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected to', mongoUri))
.catch(err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});

// Routes
app.use('/api', swaggerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/', publicRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/partner-events', partnerEvents);
app.use('/api/temp-bookings', tempBookingRoutes);

// Run cleanup every 30 seconds for better testing
const { cleanupExpiredBookings } = require('./controllers/tempBookingController');
setInterval(cleanupExpiredBookings, 30 * 1000);


// Health check
app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
    },
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 404 handler with CORS headers
app.use('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(404).json({ message: 'Route not found' });
});

const PORT = parseInt(process.env.PORT, 10) || 5000;

// Memory monitoring to detect leaks
setInterval(() => {
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB threshold
    console.warn('High memory usage detected:', {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
    });
  }
}, 60000); // Check every minute

// Graceful error handling for unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  // It's safer to exit after an uncaught exception in Node.js
  process.exit(1);
});

// Try starting the server and if the port is in use, attempt the next port
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Health check available at http://localhost:${port}/health`);
  });

  // Graceful shutdown handlers
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      mongoose.connection.close(false, () => {
        console.log('Server and database connections closed.');
        process.exit(0);
      });
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      mongoose.connection.close(false, () => {
        console.log('Server and database connections closed.');
        process.exit(0);
      });
    });
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying port ${port + 1}...`);
      // Give a short delay before retrying
      setTimeout(() => startServer(port + 1), 500);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  return server;
}

const server = startServer(PORT);

module.exports = app;
