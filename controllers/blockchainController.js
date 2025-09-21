const Project = require('../models/Project');
const blockchainService = require('../utils/blockchainService');
const ipfsService = require('../utils/ipfsUpload');

/**
 * Register a project on the blockchain
 */
const registerProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Find project in database
    const project = await Project.findOne({ Project_ID: projectId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if already registered
    if (project.isBlockchainRegistered()) {
      return res.status(400).json({ error: 'Project already registered on blockchain' });
    }

    // Register on blockchain
    const result = await blockchainService.registerProject(project);

    // Update project with blockchain data
    project.blockchain = {
      tokenId: result.tokenId,
      contractAddress: process.env.CONTRACT_ADDRESS,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
      ipfsHash: result.ipfsHash,
      isRegistered: true,
      isRetired: false,
      lastBlockchainUpdate: new Date()
    };

    await project.save();

    res.json({
      success: true,
      message: 'Project registered on blockchain successfully',
      data: {
        tokenId: result.tokenId,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        ipfsHash: result.ipfsHash,
        gasUsed: result.gasUsed
      }
    });
  } catch (error) {
    console.error('Error registering project:', error);
    res.status(500).json({ 
      error: 'Failed to register project on blockchain',
      details: error.message 
    });
  }
};

/**
 * Retire carbon credits
 */
const retireCredits = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({ error: 'Amount and reason are required' });
    }

    // Find project
    const project = await Project.findOne({ Project_ID: projectId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isBlockchainRegistered()) {
      return res.status(400).json({ error: 'Project not registered on blockchain' });
    }

    if (project.blockchain.isRetired) {
      return res.status(400).json({ error: 'Credits already retired' });
    }

    if (amount > project.Carbon_Credits_Issued) {
      return res.status(400).json({ error: 'Amount exceeds available credits' });
    }

    // Retire credits on blockchain
    const result = await blockchainService.retireCredits(
      project.blockchain.tokenId,
      amount,
      reason
    );

    // Update project
    project.blockchain.isRetired = true;
    project.blockchain.retirementDate = new Date();
    project.blockchain.retirementReason = reason;
    project.blockchain.retirementTransactionHash = result.transactionHash;
    project.blockchain.lastBlockchainUpdate = new Date();
    project.status = 'Retired';

    await project.save();

    res.json({
      success: true,
      message: 'Credits retired successfully',
      data: {
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed
      }
    });
  } catch (error) {
    console.error('Error retiring credits:', error);
    res.status(500).json({ 
      error: 'Failed to retire credits',
      details: error.message 
    });
  }
};

/**
 * Update project status on blockchain
 */
const updateProjectStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Find project
    const project = await Project.findOne({ Project_ID: projectId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isBlockchainRegistered()) {
      return res.status(400).json({ error: 'Project not registered on blockchain' });
    }

    // Update status on blockchain
    const result = await blockchainService.updateProjectStatus(
      project.blockchain.tokenId,
      status
    );

    // Update project
    project.status = status;
    project.blockchain.lastBlockchainUpdate = new Date();

    await project.save();

    res.json({
      success: true,
      message: 'Project status updated successfully',
      data: {
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed
      }
    });
  } catch (error) {
    console.error('Error updating project status:', error);
    res.status(500).json({ 
      error: 'Failed to update project status',
      details: error.message 
    });
  }
};

/**
 * Get project data from blockchain
 */
const getProjectFromBlockchain = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check if project exists in database
    const project = await Project.findOne({ Project_ID: projectId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found in database' });
    }

    if (!project.isBlockchainRegistered()) {
      return res.status(400).json({ error: 'Project not registered on blockchain' });
    }

    // Get data from blockchain
    const blockchainData = await blockchainService.getProject(project.blockchain.tokenId);

    res.json({
      success: true,
      data: {
        database: project,
        blockchain: blockchainData,
        ipfsMetadata: await ipfsService.getFromIPFS(project.blockchain.ipfsHash)
      }
    });
  } catch (error) {
    console.error('Error getting project from blockchain:', error);
    res.status(500).json({ 
      error: 'Failed to get project from blockchain',
      details: error.message 
    });
  }
};

/**
 * Get blockchain statistics
 */
const getBlockchainStatistics = async (req, res) => {
  try {
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
};

/**
 * Get all blockchain registered projects
 */
const getBlockchainProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, ecosystemType } = req.query;
    
    const query = { 'blockchain.isRegistered': true };
    
    if (status) {
      query.status = status;
    }
    
    if (ecosystemType) {
      query.Ecosystem_Type = ecosystemType;
    }

    const projects = await Project.find(query)
      .select('Project_ID Project_Name Ecosystem_Type State_UT District Carbon_Sequestration_tCO2 Carbon_Credits_Issued status blockchain')
      .sort({ 'blockchain.lastBlockchainUpdate': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Error getting blockchain projects:', error);
    res.status(500).json({ 
      error: 'Failed to get blockchain projects',
      details: error.message 
    });
  }
};

/**
 * Verify project exists on blockchain
 */
const verifyProjectOnBlockchain = async (req, res) => {
  try {
    const { projectId } = req.params;

    const exists = await blockchainService.projectExists(projectId);

    res.json({
      success: true,
      data: {
        projectId,
        existsOnBlockchain: exists
      }
    });
  } catch (error) {
    console.error('Error verifying project on blockchain:', error);
    res.status(500).json({ 
      error: 'Failed to verify project on blockchain',
      details: error.message 
    });
  }
};

/**
 * Get token URI for a project
 */
const getTokenURI = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({ Project_ID: projectId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isBlockchainRegistered()) {
      return res.status(400).json({ error: 'Project not registered on blockchain' });
    }

    const tokenURI = await blockchainService.getTokenURI(project.blockchain.tokenId);

    res.json({
      success: true,
      data: {
        tokenId: project.blockchain.tokenId,
        tokenURI,
        ipfsHash: project.blockchain.ipfsHash
      }
    });
  } catch (error) {
    console.error('Error getting token URI:', error);
    res.status(500).json({ 
      error: 'Failed to get token URI',
      details: error.message 
    });
  }
};

/**
 * Sync project with blockchain data
 */
const syncProjectWithBlockchain = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({ Project_ID: projectId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isBlockchainRegistered()) {
      return res.status(400).json({ error: 'Project not registered on blockchain' });
    }

    // Get latest data from blockchain
    const blockchainData = await blockchainService.getProject(project.blockchain.tokenId);

    // Update project with latest blockchain data
    project.status = blockchainData.status;
    project.blockchain.isRetired = blockchainData.isRetired;
    project.blockchain.retirementDate = blockchainData.retirementDate ? new Date(blockchainData.retirementDate) : null;
    project.blockchain.retirementReason = blockchainData.retirementReason;
    project.blockchain.lastBlockchainUpdate = new Date();

    await project.save();

    res.json({
      success: true,
      message: 'Project synced with blockchain successfully',
      data: {
        project: project,
        blockchainData: blockchainData
      }
    });
  } catch (error) {
    console.error('Error syncing project with blockchain:', error);
    res.status(500).json({ 
      error: 'Failed to sync project with blockchain',
      details: error.message 
    });
  }
};

module.exports = {
  registerProject,
  retireCredits,
  updateProjectStatus,
  getProjectFromBlockchain,
  getBlockchainStatistics,
  getBlockchainProjects,
  verifyProjectOnBlockchain,
  getTokenURI,
  syncProjectWithBlockchain
};
