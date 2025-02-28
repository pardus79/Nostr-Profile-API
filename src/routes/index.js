const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Profile endpoint
router.get('/profile/:npub', profileController.getLightningAddress);

// Relay status endpoint
router.get('/relays', (req, res) => {
  const relayStatus = req.relayManager.getRelayStatus();
  res.json(relayStatus);
});

module.exports = router;