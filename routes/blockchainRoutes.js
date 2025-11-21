const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchainController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Register project on blockchain
router.post('/register/:projectId', blockchainController.registerProject);

// Retire carbon credits
router.post('/retire/:projectId', blockchainController.retireCredits);

// Update project status on blockchain
router.put('/status/:projectId', blockchainController.updateProjectStatus);

// Get project data from blockchain
router.get('/project/:projectId', blockchainController.getProjectFromBlockchain);

// Get blockchain statistics
router.get('/statistics', blockchainController.getBlockchainStatistics);

// Get all blockchain registered projects
router.get('/projects', blockchainController.getBlockchainProjects);

// Verify project exists on blockchain
router.get('/verify/:projectId', blockchainController.verifyProjectOnBlockchain);

// Get token URI for a project
router.get('/token-uri/:projectId', blockchainController.getTokenURI);

// Get token/contract info for frontend (MetaMask)
router.get('/token-info', blockchainController.getTokenInfo);

// Sync project with blockchain data
router.post('/sync/:projectId', blockchainController.syncProjectWithBlockchain);

module.exports = router;
