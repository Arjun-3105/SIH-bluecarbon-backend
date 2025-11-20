const { ethers } = require('ethers');
const Project = require('../models/Project');
const blockchainService = require('../utils/blockchainService');
const ipfsService = require('../utils/ipfsUpload');

class ProgressController {
  constructor() {
    this.activeRegistrations = new Map(); // Track active registrations
    this.progressCallbacks = new Map(); // Store progress callbacks
  }

  /**
   * Start project registration with progress tracking
   */
  async startProjectRegistration(req, res) {
    try {
      const { projectId } = req.params;
      const { userAddress } = req.body;

      // Find project in database
      const project = await Project.findOne({ Project_ID: projectId });
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if already registered
      if (project.isBlockchainRegistered()) {
        return res.status(400).json({ error: 'Project already registered on blockchain' });
      }

      // Create registration session
      const sessionId = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const registrationData = {
        sessionId,
        projectId,
        userAddress,
        status: 'initializing',
        progress: 0,
        steps: [
          { id: 'validation', name: 'Validating Project Data', status: 'pending', timestamp: null },
          { id: 'ipfs_upload', name: 'Uploading to IPFS', status: 'pending', timestamp: null },
          { id: 'blockchain_prep', name: 'Preparing Blockchain Transaction', status: 'pending', timestamp: null },
          { id: 'registration', name: 'Registering Project on Blockchain', status: 'pending', timestamp: null },
          { id: 'token_mint', name: 'Minting Carbon Credits', status: 'pending', timestamp: null },
          { id: 'confirmation', name: 'Confirming Transaction', status: 'pending', timestamp: null }
        ],
        transactionHash: null,
        tokenId: null,
        error: null,
        startTime: new Date()
      };

      this.activeRegistrations.set(sessionId, registrationData);

      // Start the registration process asynchronously
      this.processRegistration(sessionId, project, userAddress);

      res.json({
        success: true,
        data: {
          sessionId,
          message: 'Project registration started',
          progressUrl: `/api/progress/${sessionId}`
        }
      });
    } catch (error) {
      console.error('Error starting project registration:', error);
      res.status(500).json({
        error: 'Failed to start project registration',
        details: error.message
      });
    }
  }

  /**
   * Process project registration with progress updates
   */
  async processRegistration(sessionId, project, userAddress) {
    const registration = this.activeRegistrations.get(sessionId);
    if (!registration) return;

    try {
      // Step 1: Validation
      this.updateProgress(sessionId, 'validation', 'in_progress');
      await this.validateProject(project);
      this.updateProgress(sessionId, 'validation', 'completed');

      // Step 2: IPFS Upload
      this.updateProgress(sessionId, 'ipfs_upload', 'in_progress');
      const ipfsHash = await this.uploadToIPFS(project);
      this.updateProgress(sessionId, 'ipfs_upload', 'completed');

      // Step 3: Blockchain Preparation
      this.updateProgress(sessionId, 'blockchain_prep', 'in_progress');
      const registrationData = await this.prepareBlockchainRegistration(project, ipfsHash, userAddress);
      this.updateProgress(sessionId, 'blockchain_prep', 'completed');

      // Step 4: Blockchain Registration
      this.updateProgress(sessionId, 'registration', 'in_progress');
      const txResult = await this.registerOnBlockchain(registrationData);
      registration.transactionHash = txResult.transactionHash;
      this.updateProgress(sessionId, 'registration', 'completed');

      // Step 5: Token Minting (happens automatically in contract)
      this.updateProgress(sessionId, 'token_mint', 'in_progress');
      await this.waitForTokenMinting(txResult.transactionHash);
      this.updateProgress(sessionId, 'token_mint', 'completed');

      // Step 6: Confirmation
      this.updateProgress(sessionId, 'confirmation', 'in_progress');
      const finalResult = await this.confirmRegistration(project, txResult);
      registration.tokenId = finalResult.tokenId;
      this.updateProgress(sessionId, 'confirmation', 'completed');

      // Update project in database
      await this.updateProjectInDatabase(project, finalResult);

      registration.status = 'completed';
      registration.progress = 100;

    } catch (error) {
      console.error('Registration error:', error);
      registration.status = 'failed';
      registration.error = error.message;
      this.updateProgress(sessionId, 'error', 'failed');
    }
  }

  /**
   * Get registration progress
   */
  async getRegistrationProgress(req, res) {
    try {
      const { sessionId } = req.params;
      const registration = this.activeRegistrations.get(sessionId);

      if (!registration) {
        return res.status(404).json({ error: 'Registration session not found' });
      }

      res.json({
        success: true,
        data: registration
      });
    } catch (error) {
      console.error('Error getting registration progress:', error);
      res.status(500).json({
        error: 'Failed to get registration progress',
        details: error.message
      });
    }
  }

  /**
   * Update progress for a specific step
   */
  updateProgress(sessionId, stepId, status) {
    const registration = this.activeRegistrations.get(sessionId);
    if (!registration) return;

    const step = registration.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      step.timestamp = new Date();
    }

    // Calculate overall progress
    const completedSteps = registration.steps.filter(s => s.status === 'completed').length;
    registration.progress = Math.round((completedSteps / registration.steps.length) * 100);

    // Notify any WebSocket listeners
    this.notifyProgressUpdate(sessionId, registration);
  }

  /**
   * Validate project data
   */
  async validateProject(project) {
    if (!project.Project_ID) {
      throw new Error('Project ID is required');
    }
    if (!project.co2Estimate || project.co2Estimate <= 0) {
      throw new Error('Valid CO2 estimate is required');
    }
    if (!project.evidenceHash) {
      throw new Error('Evidence hash is required');
    }
    return true;
  }

  /**
   * Upload project metadata to IPFS
   */
  async uploadToIPFS(project) {
    const metadata = {
      projectId: project.Project_ID,
      projectName: project.projectName,
      description: project.description,
      co2Estimate: project.co2Estimate,
      ecosystemType: project.ecosystemType,
      gps: project.gps,
      photos: project.photos,
      videos: project.videos,
      seagrassData: project.seagrassData,
      soilCores: project.soilCores,
      submittedAt: project.submittedAt,
      timestamp: new Date().toISOString()
    };

    const ipfsHash = await ipfsService.uploadMetadata(metadata);
    return ipfsHash;
  }

  /**
   * Prepare blockchain registration data
   */
  async prepareBlockchainRegistration(project, ipfsHash, userAddress) {
    const carbonCredits = Math.floor(project.co2Estimate / 1000); // Convert to credits
    const ipfsHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(ipfsHash));

    return {
      projectId: project.Project_ID,
      carbonCredits,
      projectOwner: userAddress,
      ipfsHash: ipfsHashBytes32
    };
  }

  /**
   * Register project on blockchain
   */
  async registerOnBlockchain(registrationData) {
    await blockchainService.initialize();
    
    const tx = await blockchainService.registerProject(registrationData);
    
    return {
      transactionHash: tx.hash,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed
    };
  }

  /**
   * Wait for token minting to complete
   */
  async waitForTokenMinting(transactionHash) {
    // The token minting happens automatically in the smart contract
    // We just need to wait for the transaction to be confirmed
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const receipt = await provider.waitForTransaction(transactionHash);
    
    if (receipt.status !== 1) {
      throw new Error('Transaction failed');
    }
    
    return receipt;
  }

  /**
   * Confirm registration and get token ID
   */
  async confirmRegistration(project, txResult) {
    // Parse events from transaction receipt to get token ID
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const receipt = await provider.getTransactionReceipt(txResult.transactionHash);
    
    // Find the ProjectRegistered event
    const registryContract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      this.getRegistryABI(),
      provider
    );

    const eventFilter = registryContract.filters.ProjectRegistered();
    const events = await registryContract.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber);
    
    const projectEvent = events.find(e => e.transactionHash === txResult.transactionHash);
    const tokenId = projectEvent ? projectEvent.args.tokenId.toString() : null;

    return {
      tokenId,
      transactionHash: txResult.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Update project in database with blockchain data
   */
  async updateProjectInDatabase(project, result) {
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
  }

  /**
   * Notify progress update via WebSocket (if implemented)
   */
  notifyProgressUpdate(sessionId, registration) {
    // This would integrate with WebSocket or Server-Sent Events
    // For now, we'll just log the update
    console.log(`Progress update for ${sessionId}: ${registration.progress}%`);
  }

  /**
   * Get contract ABI for registry
   */
  getRegistryABI() {
    return [
      "event ProjectRegistered(uint256 indexed tokenId, string indexed projectId, address indexed projectOwner, uint256 carbonCredits)",
      "event ERC20CreditsMinted(uint256 indexed tokenId, uint256 indexed amount, address indexed recipient)"
    ];
  }

  /**
   * Clean up completed registrations
   */
  cleanupCompletedRegistrations() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const [sessionId, registration] of this.activeRegistrations.entries()) {
      if (registration.status === 'completed' && registration.startTime < oneHourAgo) {
        this.activeRegistrations.delete(sessionId);
      }
    }
  }
}

module.exports = new ProgressController();
