const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class CacheManager {
  constructor() {
    const ttl = parseInt(process.env.CACHE_TTL) || 3600; // Default: 1 hour
    const maxKeys = parseInt(process.env.PROFILE_CACHE_SIZE) || 1000;
    
    this.cache = new NodeCache({
      stdTTL: ttl,
      checkperiod: ttl * 0.2,
      maxKeys
    });
    
    this.cache.on('expired', (key) => {
      logger.debug(`Cache entry expired: ${key}`);
    });
    
    logger.info(`Cache initialized with TTL: ${ttl}s, max entries: ${maxKeys}`);
  }
  
  /**
   * Get profile from cache
   * @param {string} npub - The npub to look up
   * @returns {Object|null} - The cached profile data or null if not found
   */
  getProfile(npub) {
    return this.cache.get(npub);
  }
  
  /**
   * Set profile in cache
   * @param {string} npub - The npub to cache
   * @param {Object} data - The profile data to cache
   */
  setProfile(npub, data) {
    this.cache.set(npub, data);
    logger.debug(`Cached profile for ${npub}`);
  }
  
  /**
   * Get cache stats
   * @returns {Object} - Cache statistics
   */
  getStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      ksize: this.cache.getStats().ksize,
      vsize: this.cache.getStats().vsize
    };
  }
  
  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.flushAll();
    logger.info('Cache cleared');
  }
}

// Singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;