const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @route POST /api/progress/start/:projectId
 * @desc Start project registration with progress tracking
 * @access Private
 */
router.post('/start/:projectId', authMiddleware, progressController.startProjectRegistration);

/**
 * @route GET /api/progress/:sessionId
 * @desc Get registration progress for a session
 * @access Private
 */
router.get('/:sessionId', authMiddleware, progressController.getRegistrationProgress);

module.exports = router;
