const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * API key authentication middleware
 */
function apiKeyAuth(req, res, next) {
  // Skip auth for health check endpoint
  if (req.path === '/api/v1/health') {
    return next();
  }
  
  // Get API key from headers or query params
  const apiKey = 
    req.headers['x-api-key'] || 
    req.headers.authorization || 
    req.query.api_key;
  
  if (!apiKey) {
    logger.warn('API key missing');
    return res.status(401).json({
      error: {
        message: 'API key is required'
      }
    });
  }
  
  // Get allowed API keys from env
  const allowedApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
  
  // If no API keys are configured, warn but allow in dev mode
  if (allowedApiKeys.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('No API keys configured in production mode');
      return res.status(500).json({
        error: {
          message: 'Server configuration error'
        }
      });
    } else {
      logger.warn('No API keys configured, allowing request in development mode');
      return next();
    }
  }
  
  // Time-constant comparison to prevent timing attacks
  const validKey = allowedApiKeys.some(key => 
    crypto.timingSafeEqual(
      Buffer.from(key),
      Buffer.from(apiKey.length > key.length ? apiKey.slice(0, key.length) : apiKey)
    )
  );
  
  if (validKey) {
    // Record API key usage for analytics (without logging the actual key)
    logger.debug(`API request authenticated: ${req.method} ${req.path}`);
    return next();
  } else {
    logger.warn(`Invalid API key: ${req.method} ${req.path}`);
    return res.status(403).json({
      error: {
        message: 'Invalid API key'
      }
    });
  }
}

module.exports = {
  apiKeyAuth
};