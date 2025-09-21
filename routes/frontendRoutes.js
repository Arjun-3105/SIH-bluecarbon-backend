const express = require('express');
const router = express.Router();
const blockchainService = require('../utils/blockchainService');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * Register a project directly from frontend form data
 * POST /api/frontend/register-project
 */
router.post('/register-project', async (req, res) => {
  try {
    const frontendData = req.body;

    // Validate required fields
    const requiredFields = [
      'projectId', 'projectName', 'ecosystemType', 'organizationName',
      'ownerName', 'email', 'area', 'treeCount', 'plantationSpecies'
    ];

    for (const field of requiredFields) {
      if (!frontendData[field]) {
        return res.status(400).json({ 
          error: `Missing required field: ${field}` 
        });
      }
    }

    // Validate plantation species array
    if (!Array.isArray(frontendData.plantationSpecies) || frontendData.plantationSpecies.length === 0) {
      return res.status(400).json({ 
        error: 'At least one plantation species is required' 
      });
    }

    // Validate location data
    if (!frontendData.location || !frontendData.location.lat || !frontendData.location.lng) {
      return res.status(400).json({ 
        error: 'Location data (latitude and longitude) is required' 
      });
    }

    // Calculate CO2 sequestration if not provided
    if (!frontendData.estimatedCO2Sequestration || frontendData.estimatedCO2Sequestration === 0) {
      try {
        const co2Sequestration = await blockchainService.contract.calculateCO2Sequestration(
          frontendData.treeCount,
          frontendData.averageHeight || 1,
          frontendData.averageLength || 1,
          frontendData.averageBreadth || 1,
          frontendData.ecosystemType
        );
        frontendData.estimatedCO2Sequestration = co2Sequestration.toString();
      } catch (error) {
        console.warn('Could not calculate CO2 sequestration:', error.message);
        // Continue without calculation
      }
    }

    // Register project on blockchain
    const result = await blockchainService.registerProjectFromFrontend(frontendData);

    res.json({
      success: true,
      message: 'Project registered on blockchain successfully',
      data: {
        tokenId: result.tokenId,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        ipfsHash: result.ipfsHash,
        gasUsed: result.gasUsed,
        projectId: frontendData.projectId,
        projectName: frontendData.projectName,
        ecosystemType: frontendData.ecosystemType,
        carbonCredits: frontendData.estimatedCO2Sequestration
      }
    });
  } catch (error) {
    console.error('Error registering project from frontend:', error);
    res.status(500).json({ 
      error: 'Failed to register project on blockchain',
      details: error.message 
    });
  }
});

/**
 * Calculate CO2 sequestration for frontend
 * POST /api/frontend/calculate-co2
 */
router.post('/calculate-co2', async (req, res) => {
  try {
    const { treeCount, averageHeight, averageLength, averageBreadth, ecosystemType } = req.body;

    // Validate required fields
    if (!treeCount || !ecosystemType) {
      return res.status(400).json({ 
        error: 'Tree count and ecosystem type are required' 
      });
    }

    // Initialize blockchain service if needed
    if (!blockchainService.contract) {
      await blockchainService.initialize();
    }

    // Calculate CO2 sequestration
    const co2Sequestration = await blockchainService.contract.calculateCO2Sequestration(
      treeCount,
      averageHeight || 1,
      averageLength || 1,
      averageBreadth || 1,
      ecosystemType
    );

    res.json({
      success: true,
      data: {
        co2Sequestration: co2Sequestration.toString(),
        treeCount,
        ecosystemType,
        averageHeight: averageHeight || 1,
        averageLength: averageLength || 1,
        averageBreadth: averageBreadth || 1
      }
    });
  } catch (error) {
    console.error('Error calculating CO2 sequestration:', error);
    res.status(500).json({ 
      error: 'Failed to calculate CO2 sequestration',
      details: error.message 
    });
  }
});

/**
 * Get projects by ecosystem type
 * GET /api/frontend/projects/ecosystem/:ecosystemType
 */
router.get('/projects/ecosystem/:ecosystemType', async (req, res) => {
  try {
    const { ecosystemType } = req.params;

    // Initialize blockchain service if needed
    if (!blockchainService.contract) {
      await blockchainService.initialize();
    }

    // Get project IDs by ecosystem type
    const projectIds = await blockchainService.contract.getProjectsByEcosystemType(ecosystemType);

    // Get detailed data for each project
    const projects = [];
    for (const tokenId of projectIds) {
      try {
        const project = await blockchainService.contract.getProject(tokenId);
        projects.push({
          tokenId: tokenId.toString(),
          projectId: project.projectId,
          projectName: project.projectName,
          ecosystemType: project.ecosystemType,
          organizationName: project.organizationName,
          area: project.area.toString(),
          treeCount: project.plantation.treeCount.toString(),
          carbonCredits: project.carbonCredits.toString(),
          status: project.status,
          location: project.location
        });
      } catch (error) {
        console.warn(`Could not fetch project ${tokenId}:`, error.message);
      }
    }

    res.json({
      success: true,
      data: {
        ecosystemType,
        projects,
        count: projects.length
      }
    });
  } catch (error) {
    console.error('Error getting projects by ecosystem type:', error);
    res.status(500).json({ 
      error: 'Failed to get projects by ecosystem type',
      details: error.message 
    });
  }
});

/**
 * Get project details by token ID
 * GET /api/frontend/projects/:tokenId
 */
router.get('/projects/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;

    // Initialize blockchain service if needed
    if (!blockchainService.contract) {
      await blockchainService.initialize();
    }

    // Get project data
    const project = await blockchainService.contract.getProject(tokenId);

    res.json({
      success: true,
      data: {
        tokenId: tokenId,
        projectId: project.projectId,
        projectName: project.projectName,
        description: project.description,
        ecosystemType: project.ecosystemType,
        organizationName: project.organizationName,
        ownerName: project.ownerName,
        email: project.email,
        phone: project.phone,
        location: project.location,
        area: project.area.toString(),
        density: project.density.toString(),
        startDate: new Date(Number(project.startDate) * 1000).toISOString(),
        duration: project.duration.toString(),
        legalOwnership: project.legalOwnership,
        permits: project.permits,
        communityConsent: project.communityConsent,
        plantation: project.plantation,
        baselineData: project.baselineData,
        monitoringPlan: project.monitoringPlan,
        validator: project.validator,
        documents: project.documents,
        carbonCredits: project.carbonCredits.toString(),
        status: project.status,
        projectOwner: project.projectOwner,
        isRetired: project.isRetired
      }
    });
  } catch (error) {
    console.error('Error getting project details:', error);
    res.status(500).json({ 
      error: 'Failed to get project details',
      details: error.message 
    });
  }
});

/**
 * Validate a project
 * POST /api/frontend/projects/:tokenId/validate
 */
router.post('/projects/:tokenId/validate', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { validator } = req.body;

    if (!validator) {
      return res.status(400).json({ 
        error: 'Validator information is required' 
      });
    }

    // Initialize blockchain service if needed
    if (!blockchainService.contract) {
      await blockchainService.initialize();
    }

    // Validate project
    const tx = await blockchainService.contract.validateProject(tokenId, validator);
    const receipt = await tx.wait();

    res.json({
      success: true,
      message: 'Project validated successfully',
      data: {
        tokenId,
        validator,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }
    });
  } catch (error) {
    console.error('Error validating project:', error);
    res.status(500).json({ 
      error: 'Failed to validate project',
      details: error.message 
    });
  }
});

/**
 * Get blockchain statistics
 * GET /api/frontend/statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    // Initialize blockchain service if needed
    if (!blockchainService.contract) {
      await blockchainService.initialize();
    }

    const stats = await blockchainService.getStatistics();
    const walletBalance = await blockchainService.getWalletBalance();

    res.json({
      success: true,
      data: {
        ...stats,
        walletBalance: walletBalance,
        contractAddress: process.env.CONTRACT_ADDRESS
      }
    });
  } catch (error) {
    console.error('Error getting blockchain statistics:', error);
    res.status(500).json({ 
      error: 'Failed to get blockchain statistics',
      details: error.message 
    });
  }
});

module.exports = router;
