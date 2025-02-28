const { nip19 } = require('nostr-tools');

/**
 * Validate an npub string
 * @param {string} npub - The npub to validate
 * @returns {boolean} - Whether the npub is valid
 */
function validateNpub(npub) {
  if (!npub || typeof npub !== 'string' || !npub.startsWith('npub1')) {
    return false;
  }
  
  try {
    const decoded = nip19.decode(npub);
    return decoded.type === 'npub' && decoded.data;
  } catch (error) {
    return false;
  }
}

/**
 * Convert npub to hex pubkey
 * @param {string} npub - The npub to convert
 * @returns {string|null} - Hex pubkey or null if invalid
 */
function npubToHex(npub) {
  try {
    const { data } = nip19.decode(npub);
    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Convert hex pubkey to npub
 * @param {string} hex - The hex pubkey to convert
 * @returns {string|null} - npub or null if invalid
 */
function hexToNpub(hex) {
  try {
    return nip19.npubEncode(hex);
  } catch (error) {
    return null;
  }
}

module.exports = {
  validateNpub,
  npubToHex,
  hexToNpub
};