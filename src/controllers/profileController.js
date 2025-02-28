const logger = require('../utils/logger');
const cacheManager = require('../services/cacheManager');
const { validateNpub } = require('../utils/nostrHelpers');

/**
 * Get Lightning address for an npub
 */
async function getLightningAddress(req, res, next) {
  try {
    const { npub } = req.params;
    
    // Validate npub format
    if (!validateNpub(npub)) {
      return res.status(400).json({
        error: {
          message: 'Invalid npub format',
        },
      });
    }
    
    // Check cache first
    const cachedData = cacheManager.getProfile(npub);
    if (cachedData) {
      logger.debug(`Cache hit for ${npub}`);
      return res.json({
        npub,
        lightning_address: cachedData.lightningAddress,
        relay_source: cachedData.relaySource,
        cached: true,
        cache_age: Math.floor((Date.now() - cachedData.timestamp) / 1000)
      });
    }
    
    // Not in cache, query relays
    logger.debug(`Cache miss for ${npub}, querying relays`);
    const relayManager = req.relayManager;
    
    // Set timeout for the request
    const timeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS) || 5000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
    });
    
    // Query relays for profile
    const profilePromise = relayManager.queryProfile(npub);
    
    // Race between timeout and profile query
    const result = await Promise.race([profilePromise, timeoutPromise]);
    
    if (!result || !result.lightningAddress) {
      return res.status(404).json({
        error: {
          message: 'Lightning address not found for this npub',
        },
      });
    }
    
    // Cache the result
    cacheManager.setProfile(npub, result);
    
    // Return the result
    return res.json({
      npub,
      lightning_address: result.lightningAddress,
      relay_source: result.relaySource,
      cached: false,
      cache_age: 0
    });
    
  } catch (error) {
    logger.error(`Error fetching lightning address: ${error.message}`);
    next(error);
  }
}

module.exports = {
  getLightningAddress,
};