/**
 * Trading and Minting Controller
 * Exposes endpoints to view actual trading and minting activities
 */

const tradingMintingService = require('../services/tradingMintingService');

/**
 * Get all minting events
 */
exports.getMintingEvents = async (req, res) => {
  try {
    const fromBlock = parseInt(req.query.fromBlock) || 0;
    const toBlock = req.query.toBlock || 'latest';
    const limit = parseInt(req.query.limit) || 100;

    const events = await tradingMintingService.getMintingEvents(fromBlock, toBlock, limit);

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error getting minting events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get minting events',
      error: error.message
    });
  }
};

/**
 * Get all trading events
 */
exports.getTradingEvents = async (req, res) => {
  try {
    const fromBlock = parseInt(req.query.fromBlock) || 0;
    const toBlock = req.query.toBlock || 'latest';
    const limit = parseInt(req.query.limit) || 100;

    const events = await tradingMintingService.getTradingEvents(fromBlock, toBlock, limit);

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error getting trading events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trading events',
      error: error.message
    });
  }
};

/**
 * Get all activities (minting + trading)
 */
exports.getAllActivities = async (req, res) => {
  try {
    const fromBlock = parseInt(req.query.fromBlock) || 0;
    const toBlock = req.query.toBlock || 'latest';
    const limit = parseInt(req.query.limit) || 100;

    const activities = await tradingMintingService.getAllActivities(fromBlock, toBlock, limit);

    res.json({
      success: true,
      data: activities,
      count: activities.length
    });
  } catch (error) {
    console.error('Error getting activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activities',
      error: error.message
    });
  }
};

/**
 * Get statistics
 */
exports.getStatistics = async (req, res) => {
  try {
    const stats = await tradingMintingService.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
};

/**
 * Get activities for a specific address
 */
exports.getAddressActivities = async (req, res) => {
  try {
    const { address } = req.params;
    const fromBlock = parseInt(req.query.fromBlock) || 0;
    const toBlock = req.query.toBlock || 'latest';
    const limit = parseInt(req.query.limit) || 100;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    const activities = await tradingMintingService.getAddressActivities(address, fromBlock, toBlock, limit);

    res.json({
      success: true,
      address,
      data: activities,
      count: activities.length
    });
  } catch (error) {
    console.error('Error getting address activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get address activities',
      error: error.message
    });
  }
};

