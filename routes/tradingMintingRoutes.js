const express = require('express');
const router = express.Router();
const tradingMintingController = require('../controllers/tradingMintingController');

// Public routes - no authentication required for viewing activities

// Get all minting events
router.get('/minting', tradingMintingController.getMintingEvents);

// Get all trading events
router.get('/trading', tradingMintingController.getTradingEvents);

// Get all activities (minting + trading)
router.get('/activities', tradingMintingController.getAllActivities);

// Get statistics
router.get('/statistics', tradingMintingController.getStatistics);

// Get activities for a specific address
router.get('/address/:address', tradingMintingController.getAddressActivities);

module.exports = router;

