const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Apply authentication and admin role check
router.use(authMiddleware);
router.use(roleMiddleware(['Admin']));

// Get all pending projects
router.get('/pending-projects', adminController.getPendingProjects);

// Get all approved projects with minting details
router.get('/approved-projects', adminController.getApprovedProjects);

// Get admin statistics
router.get('/statistics', adminController.getAdminStatistics);

module.exports = router;

