require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const routes = require('./routes');
const RelayManager = require('./services/relayManager');
const { apiKeyAuth } = require('./middleware/auth');
const slowDown = require('express-slow-down');

const app = express();
const port = process.env.PORT || 3000;

// Initialize relay manager
const relayManager = new RelayManager();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));
app.use(express.json({ limit: '10kb' })); // Limit JSON payload size

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests, please try again later.'
    }
  }
});

// Speed limiter
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: process.env.SPEED_LIMIT_AFTER || 50, // slow down after 50 requests in window
  delayMs: (hits) => hits * 100, // add 100ms delay per hit above threshold
});

// Apply rate limiting
app.use(limiter);
app.use(speedLimiter);

// Import request logger middleware
const { requestLogger } = require('./middleware/requestLogger');

// Add request logging
app.use(requestLogger);

// API Key Authentication
app.use(apiKeyAuth);

// Pass relay manager to routes
app.use((req, res, next) => {
  req.relayManager = relayManager;
  next();
});

// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Routes
app.use('/api/v1', routes);

// Not found handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Not found'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  
  // Don't expose stack traces in production
  const errorDetails = process.env.NODE_ENV === 'production' 
    ? { message: err.message || 'Internal Server Error' }
    : { message: err.message || 'Internal Server Error', stack: err.stack };
  
  res.status(err.status || 500).json({
    error: errorDetails
  });
});

// Start server
const server = app.listen(port, () => {
  logger.info(`Nostr Profile API listening on port ${port}`);
  
  // Connect to relays
  relayManager.connectToRelays()
    .then(() => {
      logger.info('Connected to relays');
    })
    .catch((err) => {
      logger.error('Failed to connect to relays', err);
    });
});

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  logger.info('Shutting down server...');
  server.close(() => {
    logger.info('Server closed');
    relayManager.closeAllConnections();
    process.exit(0);
  });
}

// Unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error);
  // Gracefully shutdown on critical errors
  shutdown();
});

module.exports = app;