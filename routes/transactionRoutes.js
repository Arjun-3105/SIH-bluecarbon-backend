const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @route GET /api/transactions/:address
 * @desc Get transaction history for a specific address
 * @access Private
 */
router.get('/:address', authMiddleware, transactionController.getTransactionHistory);

/**
 * @route GET /api/transactions/details/:hash
 * @desc Get detailed information about a specific transaction
 * @access Private
 */
router.get('/details/:hash', authMiddleware, transactionController.getTransactionDetails);

/**
 * @route GET /api/transactions/stats/:address
 * @desc Get transaction statistics for an address
 * @access Private
 */
router.get('/stats/:address', authMiddleware, transactionController.getTransactionStats);

module.exports = router;
