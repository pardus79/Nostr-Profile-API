const logger = require('../utils/logger');

/**
 * Request logging middleware - logs request details without sensitive data
 */
function requestLogger(req, res, next) {
  // Start time to calculate response time
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseDuration: `${duration}ms`,
      userAgent: req.get('user-agent') || 'unknown',
      ip: getClientIp(req),
      referer: req.get('referer') || '-'
    };
    
    // Don't log API keys or authorization headers
    if (req.query && Object.keys(req.query).length > 0) {
      // Create a safe copy of query params without api_key
      const safeParams = { ...req.query };
      delete safeParams.api_key;
      logData.params = safeParams;
    }
    
    // Log level based on status code
    if (res.statusCode >= 500) {
      logger.error('Request error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request warning', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });
  
  next();
}

/**
 * Get client IP address, handling proxies
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         req.connection.socket?.remoteAddress;
}

module.exports = {
  requestLogger
};