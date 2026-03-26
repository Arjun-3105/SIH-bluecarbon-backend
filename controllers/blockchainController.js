const { ethers } = require('ethers');
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
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  registerProject
};