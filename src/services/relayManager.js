const { relayInit, nip19 } = require('nostr-tools');
const logger = require('../utils/logger');

class RelayManager {
  constructor() {
    this.relays = new Map();
    this.defaultRelays = (process.env.DEFAULT_RELAYS || 'wss://relay.damus.io,wss://relay.nostr.info').split(',');
  }
  
  /**
   * Connect to all configured relays
   */
  async connectToRelays() {
    const connectionPromises = this.defaultRelays.map(url => this.connectToRelay(url));
    return Promise.allSettled(connectionPromises);
  }
  
  /**
   * Connect to a single relay
   */
  async connectToRelay(url) {
    try {
      // Skip if already connected
      if (this.relays.has(url) && this.relays.get(url).status === 1) {
        return;
      }
      
      logger.info(`Connecting to relay: ${url}`);
      const relay = relayInit(url);
      
      relay.on('connect', () => {
        logger.info(`Connected to ${url}`);
        this.relays.set(url, {
          instance: relay,
          status: 1, // Connected
          lastConnected: Date.now()
        });
      });
      
      relay.on('disconnect', () => {
        logger.warn(`Disconnected from ${url}`);
        if (this.relays.has(url)) {
          const relayInfo = this.relays.get(url);
          relayInfo.status = 0; // Disconnected
          this.relays.set(url, relayInfo);
        }
      });
      
      relay.on('error', () => {
        logger.error(`Error with relay ${url}`);
        if (this.relays.has(url)) {
          const relayInfo = this.relays.get(url);
          relayInfo.status = 2; // Error
          relayInfo.lastError = Date.now();
          this.relays.set(url, relayInfo);
        }
      });
      
      // Connect to the relay
      await relay.connect();
      
      return relay;
    } catch (error) {
      logger.error(`Failed to connect to relay ${url}: ${error.message}`);
      this.relays.set(url, {
        instance: null,
        status: 2, // Error
        lastError: Date.now(),
        errorMessage: error.message
      });
    }
  }
  
  /**
   * Get status of all relays
   */
  getRelayStatus() {
    const status = [];
    this.relays.forEach((value, url) => {
      status.push({
        url,
        status: value.status === 1 ? 'connected' : value.status === 0 ? 'disconnected' : 'error',
        lastConnected: value.lastConnected,
        lastError: value.lastError,
        errorMessage: value.errorMessage
      });
    });
    return status;
  }
  
  /**
   * Query profile metadata for a specific npub
   */
  async queryProfile(npub) {
    try {
      // Convert npub to hex pubkey
      const { data: pubkey } = nip19.decode(npub);
      
      // Find connected relays
      const connectedRelays = [];
      this.relays.forEach((value, url) => {
        if (value.status === 1 && value.instance) {
          connectedRelays.push({ url, instance: value.instance });
        }
      });
      
      if (connectedRelays.length === 0) {
        logger.warn('No connected relays available');
        await this.connectToRelays();
        return this.queryProfile(npub); // Retry after reconnecting
      }
      
      // Create a promise for each relay
      const queryPromises = connectedRelays.map(relay => {
        return new Promise(async (resolve) => {
          try {
            const sub = relay.instance.sub([
              {
                kinds: [0],
                authors: [pubkey],
                limit: 1
              }
            ]);
            
            let timeout;
            
            const cleanup = () => {
              clearTimeout(timeout);
              sub.unsub();
            };
            
            timeout = setTimeout(() => {
              cleanup();
              resolve(null);
            }, 3000); // 3 seconds timeout per relay
            
            sub.on('event', event => {
              cleanup();
              
              try {
                // Parse content to get Lightning address
                const content = JSON.parse(event.content);
                const lightningAddress = content.lud16 || content.lud06;
                
                if (lightningAddress) {
                  resolve({
                    lightningAddress,
                    relaySource: relay.url,
                    receivedAt: Date.now()
                  });
                } else {
                  resolve(null);
                }
              } catch (e) {
                logger.error(`Error parsing content: ${e.message}`);
                resolve(null);
              }
            });
            
            sub.on('eose', () => {
              cleanup();
              resolve(null); // No events found
            });
          } catch (error) {
            logger.error(`Error querying relay ${relay.url}: ${error.message}`);
            resolve(null);
          }
        });
      });
      
      // Wait for first non-null result or all failures
      const results = await Promise.all(queryPromises);
      const validResult = results.find(result => result !== null);
      
      if (validResult) {
        return {
          lightningAddress: validResult.lightningAddress,
          relaySource: validResult.relaySource,
          timestamp: Date.now()
        };
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to query profile: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Close all relay connections
   */
  closeAllConnections() {
    this.relays.forEach((value) => {
      if (value.instance) {
        try {
          value.instance.close();
        } catch (error) {
          logger.error(`Error closing relay: ${error.message}`);
        }
      }
    });
    logger.info('All relay connections closed');
  }
}

module.exports = RelayManager;