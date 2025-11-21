const { ethers } = require('ethers');
const ipfsService = require('./ipfsUpload');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.abi = this.getContractABI();
  }

  /**
   * Initialize blockchain connection
   */
  async initialize() {
    try {
      // Initialize provider (Sepolia testnet)
      this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      
      // Initialize wallet
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      
      // Initialize contract
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.abi,
        this.wallet
      );

      console.log('Blockchain service initialized');
      console.log('Contract address:', this.contractAddress);
      console.log('Wallet address:', this.wallet.address);
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  /**
   * Get contract ABI
   */
  getContractABI() {
    return [
      "function registerProject(string memory projectId, uint16 carbonCredits, address projectOwner, bytes32 ipfsHash) external returns (uint256)",
      "function retireCredits(uint256 tokenId, uint16 amount, string memory reason) external",
      "function updateProjectStatus(uint256 tokenId, uint8 newStatus) external",
      "function getProject(uint256 tokenId) external view returns (tuple(string projectId, string projectName, string ecosystemType, string stateUT, string district, string villagePanchayat, uint16 carbonCredits, bool isRetired, uint64 retirementDate, string retirementReason, uint8 status, address projectOwner, bytes32 ipfsHash))",
      "function getProjectById(string memory projectId) external view returns (tuple(string projectId, string projectName, string ecosystemType, string stateUT, string district, string villagePanchayat, uint16 carbonCredits, bool isRetired, uint64 retirementDate, string retirementReason, uint8 status, address projectOwner, bytes32 ipfsHash))",
      "function getTotalProjects() external view returns (uint256)",
      "function getTotalCarbonCredits() external view returns (uint256)",
      "function getTotalRetiredCredits() external view returns (uint256)",
      "function projectExistsById(string memory projectId) external view returns (bool)",
      "function tokenURI(uint256 tokenId) external view returns (string memory)",
      "function ownerOf(uint256 tokenId) external view returns (address)",
      "function balanceOf(address owner) external view returns (uint256)",
      "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
      "function projects(uint256 tokenId) external view returns (tuple(string projectId, uint16 carbonCredits, uint8 status, bool isRetired, uint64 retirementDate, address projectOwner, bytes32 ipfsHash))",
      "event ProjectRegistered(uint256 indexed tokenId, string indexed projectId, address indexed owner, uint256 carbonCredits)",
      "function mintVerifierReward(uint256 tokenId, address verifierAddress, uint256 rewardAmount) external",
      "event ProjectRegistered(uint256 indexed tokenId, string indexed projectId, address indexed owner, uint256 carbonCredits)",
      "event CreditsRetired(uint256 indexed tokenId, string indexed projectId, uint256 amount, string reason)",
      "event ProjectUpdated(uint256 indexed tokenId, string indexed projectId, string field, string newValue)",
      "event VerifierRewardMinted(uint256 indexed tokenId, address indexed verifier, uint256 amount)"
    ];
  }

  /**
   * Register a carbon credit project on blockchain
   * @param {Object} projectData - Project data from frontend form
   * @returns {Promise<Object>} Transaction result
   */
  async registerProject(projectData) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      // Create metadata and upload to IPFS
      const metadata = this.createProjectMetadata(projectData);
      const ipfsHash = await ipfsService.uploadToIPFS(metadata);

      // Convert IPFS hash to bytes32
      const ipfsHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(ipfsHash));

      // Get owner address - this is critical for minting tokens to the correct owner
      const ownerAddress = projectData.ownerAddress || projectData.ownerWalletAddress;
      if (!ownerAddress || ownerAddress === ethers.ZeroAddress) {
        throw new Error('Owner wallet address is required for project registration. Please ensure the project owner has provided their wallet address.');
      }

      // Validate owner address
      if (!ethers.isAddress(ownerAddress)) {
        throw new Error(`Invalid owner address: ${ownerAddress}`);
      }

      // Calculate carbon credits (ensure it fits in uint16: 0-65535)
      const carbonCredits = Math.floor(projectData.estimatedCO2Sequestration || 0);
      if (carbonCredits <= 0) {
        throw new Error('Carbon credits must be greater than 0');
      }
      if (carbonCredits > 65535) {
        throw new Error('Carbon credits exceed maximum value (65535). Please reduce the CO2 estimate.');
      }

      // Estimate gas
      const gasEstimate = await this.contract.registerProject.estimateGas(
        projectData.projectId,
        carbonCredits,
        ownerAddress,
        ipfsHashBytes32
      );

      // Register project - this will:
      // 1. Mint NFT to projectOwner
      // 2. Mint ERC20 tokens to projectOwner (carbonCredits * 1e18)
      const tx = await this.contract.registerProject(
        projectData.projectId,
        carbonCredits,
        ownerAddress,
        ipfsHashBytes32,
        {
          gasLimit: gasEstimate * 2n, // Add buffer
          gasPrice: await this.provider.getGasPrice()
        }
      );

      console.log('Transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      // Get token ID from events
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed.name === 'ProjectRegistered';
        } catch (e) {
          return false;
        }
      });

      if (event) {
        const parsedEvent = this.contract.interface.parseLog(event);
        const tokenId = parsedEvent.args.tokenId.toString();
        
        return {
          success: true,
          tokenId: tokenId,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          ipfsHash: ipfsHash,
          gasUsed: receipt.gasUsed.toString()
        };
      } else {
        throw new Error('ProjectRegistered event not found');
      }
    } catch (error) {
      console.error('Failed to register project:', error);
      throw error;
    }
  }

  /**
   * Create project metadata for IPFS
   * @param {Object} projectData - Project data from frontend
   * @returns {Object} Metadata object
   */
  createProjectMetadata(projectData) {
    return {
      name: projectData.projectName,
      description: projectData.description,
      ecosystemType: projectData.ecosystemType,
      organizationName: projectData.organizationName,
      ownerName: projectData.ownerName,
      email: projectData.email,
      phone: projectData.phone,
      area: projectData.area,
      density: projectData.density,
      location: projectData.location,
      startDate: projectData.startDate,
      duration: projectData.duration,
      legalOwnership: projectData.legalOwnership,
      permits: projectData.permits,
      baselineData: projectData.baselineData,
      monitoringPlan: projectData.monitoringPlan,
      validator: projectData.validator,
      communityConsent: projectData.communityConsent,
      documents: projectData.documents,
      plantationSpecies: projectData.plantationSpecies,
      treeCount: projectData.treeCount,
      averageHeight: projectData.averageHeight,
      averageLength: projectData.averageLength,
      averageBreadth: projectData.averageBreadth,
      seedlings: projectData.seedlings,
      estimatedCO2Sequestration: projectData.estimatedCO2Sequestration,
      timestamp: new Date().toISOString(),
      version: "1.0"
    };
  }

  /**
   * Retire carbon credits
   * @param {string} tokenId - Token ID
   * @param {number} amount - Amount to retire
   * @param {string} reason - Retirement reason
   * @returns {Promise<Object>} Transaction result
   */
  async retireCredits(tokenId, amount, reason) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const tx = await this.contract.retireCredits(
        tokenId,
        Math.floor(amount), // Ensure it's an integer
        reason,
        {
          gasLimit: 200000,
          gasPrice: await this.provider.getGasPrice()
        }
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Failed to retire credits:', error);
      throw error;
    }
  }

  /**
   * Update project status
   * @param {string} tokenId - Token ID
   * @param {number} newStatus - New status (0=PENDING, 1=VERIFIED, 2=RETIRED)
   * @returns {Promise<Object>} Transaction result
   */
  async updateProjectStatus(tokenId, newStatus) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const tx = await this.contract.updateProjectStatus(
        tokenId,
        newStatus,
        {
          gasLimit: 100000,
          gasPrice: await this.provider.getGasPrice()
        }
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Failed to update project status:', error);
      throw error;
    }
  }

  /**
   * Get project data from blockchain
   * @param {string} tokenId - Token ID
   * @returns {Promise<Object>} Project data
   */
  async getProject(tokenId) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const project = await this.contract.getProject(tokenId);
      
      return {
        tokenId: tokenId,
        projectId: project.projectId,
        projectName: project.projectName,
        ecosystemType: project.ecosystemType,
        stateUT: project.stateUT,
        district: project.district,
        villagePanchayat: project.villagePanchayat,
        carbonCredits: project.carbonCredits.toString(),
        isRetired: project.isRetired,
        retirementDate: project.retirementDate.toString(),
        retirementReason: project.retirementReason,
        status: this.getStatusString(project.status),
        projectOwner: project.projectOwner,
        ipfsHash: this.bytes32ToString(project.ipfsHash)
      };
    } catch (error) {
      console.error('Failed to get project:', error);
      throw error;
    }
  }

  /**
   * Convert status enum to string
   * @param {number} status - Status enum value
   * @returns {string} Status string
   */
  getStatusString(status) {
    switch (status) {
      case 0: return 'PENDING';
      case 1: return 'VERIFIED';
      case 2: return 'RETIRED';
      default: return 'UNKNOWN';
    }
  }

  /**
   * Convert bytes32 to string
   * @param {string} bytes32Data - Bytes32 data
   * @returns {string} String representation
   */
  bytes32ToString(bytes32Data) {
    // Remove the 0x prefix and convert to string
    return ethers.toUtf8String(bytes32Data);
  }

  /**
   * Get project by project ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project data
   */
  async getProjectById(projectId) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const project = await this.contract.getProjectById(projectId);
      
      return {
        projectId: project.projectId,
        projectName: project.projectName,
        ecosystemType: project.ecosystemType,
        stateUT: project.stateUT,
        district: project.district,
        villagePanchayat: project.villagePanchayat,
        carbonCredits: project.carbonCredits.toString(),
        isRetired: project.isRetired,
        retirementDate: project.retirementDate.toString(),
        retirementReason: project.retirementReason,
        status: this.getStatusString(project.status),
        projectOwner: project.projectOwner,
        ipfsHash: this.bytes32ToString(project.ipfsHash)
      };
    } catch (error) {
      console.error('Failed to get project by ID:', error);
      throw error;
    }
  }

  /**
   * Get total statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const [totalProjects, totalCredits, retiredCredits] = await Promise.all([
        this.contract.getTotalProjects(),
        this.contract.getTotalCarbonCredits(),
        this.contract.getTotalRetiredCredits()
      ]);

      return {
        totalProjects: totalProjects.toString(),
        totalCarbonCredits: totalCredits.toString(),
        totalRetiredCredits: retiredCredits.toString(),
        activeCredits: (BigInt(totalCredits) - BigInt(retiredCredits)).toString()
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      throw error;
    }
  }

  /**
   * Check if project exists
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} Whether project exists
   */
  async projectExists(projectId) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      return await this.contract.projectExistsById(projectId);
    } catch (error) {
      console.error('Failed to check project existence:', error);
      throw error;
    }
  }

  /**
   * Get token URI
   * @param {string} tokenId - Token ID
   * @returns {Promise<string>} Token URI
   */
  async getTokenURI(tokenId) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      return await this.contract.tokenURI(tokenId);
    } catch (error) {
      console.error('Failed to get token URI:', error);
      throw error;
    }
  }

  /**
   * Get ERC20 token balance for an address (BlueCarbon token)
   * @param {string} ownerAddress
   * @returns {Promise<string>} balance formatted in tokens (not wei)
   */
  async getERC20Balance(ownerAddress) {
    try {
      if (!process.env.BLUECARBON_ADDRESS) {
        throw new Error('BLUECARBON_ADDRESS not configured');
      }

      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];

      const tokenContract = new ethers.Contract(process.env.BLUECARBON_ADDRESS, erc20Abi, this.provider);
      const [raw, decimals] = await Promise.all([
        tokenContract.balanceOf(ownerAddress),
        tokenContract.decimals()
      ]);

      const formatted = ethers.formatUnits(raw, decimals);
      return formatted;
    } catch (error) {
      console.error('Failed to get ERC20 balance:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   * @returns {Promise<string>} Balance in ETH
   */
  async getWalletBalance() {
    try {
      if (!this.wallet) {
        await this.initialize();
      }

      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      throw error;
    }
  }

  /**
   * Get all NFTs owned by an address
   * Note: This queries ProjectRegistered events to find all NFTs, then filters by owner
   * @param {string} ownerAddress - Wallet address of the owner
   * @returns {Promise<Array>} Array of NFT token IDs and details
   */
  async getOwnedNFTs(ownerAddress) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
        throw new Error('Invalid owner address');
      }

      const nfts = [];
      const normalizedAddress = ownerAddress.toLowerCase();

      // Query ProjectRegistered events to find all registered projects
      const filter = this.contract.filters.ProjectRegistered();
      const events = await this.contract.queryFilter(filter, 0, 'latest');

      // Check ownership for each token
      for (const event of events) {
        try {
          const tokenId = event.args.tokenId;
          const owner = await this.contract.ownerOf(tokenId);
          
          if (owner.toLowerCase() === normalizedAddress) {
            // Get project details
            const project = await this.contract.projects(tokenId);
            let tokenURI = '';
            try {
              tokenURI = await this.contract.tokenURI(tokenId);
            } catch (e) {
              console.warn(`Could not get tokenURI for token ${tokenId}:`, e.message);
            }
            
            nfts.push({
              tokenId: tokenId.toString(),
              projectId: project.projectId,
              carbonCredits: project.carbonCredits.toString(),
              status: project.status,
              isRetired: project.isRetired,
              retirementDate: project.retirementDate.toString(),
              tokenURI: tokenURI,
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber
            });
          }
        } catch (e) {
          // Skip tokens that can't be accessed
          console.warn(`Error processing token from event:`, e.message);
          continue;
        }
      }

      return nfts;
    } catch (error) {
      console.error('Failed to get owned NFTs:', error);
      throw error;
    }
  }

  /**
   * Mint blue carbon tokens to verifier as reward for approving a project
   * @param {string} tokenId - Token ID of the approved project
   * @param {string} verifierAddress - Wallet address of the verifier
   * @param {number} rewardAmount - Amount of tokens to mint (in tokens, will be scaled to 18 decimals)
   * @returns {Promise<Object>} Transaction result
   */
  async mintVerifierReward(tokenId, verifierAddress, rewardAmount) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      // Validate inputs
      if (!verifierAddress || !ethers.isAddress(verifierAddress)) {
        throw new Error('Invalid verifier address');
      }

      if (!rewardAmount || rewardAmount <= 0) {
        throw new Error('Reward amount must be greater than 0');
      }

      // Convert tokenId to BigInt if it's a string
      const tokenIdBigInt = typeof tokenId === 'string' ? BigInt(tokenId) : tokenId;
      
      // Convert rewardAmount to BigInt (will be scaled to 18 decimals in contract)
      const rewardAmountBigInt = BigInt(Math.floor(rewardAmount));

      // Estimate gas
      const gasEstimate = await this.contract.mintVerifierReward.estimateGas(
        tokenIdBigInt,
        verifierAddress,
        rewardAmountBigInt
      );

      // Mint tokens to verifier
      const tx = await this.contract.mintVerifierReward(
        tokenIdBigInt,
        verifierAddress,
        rewardAmountBigInt,
        {
          gasLimit: gasEstimate * 2n, // Add buffer
          gasPrice: await this.provider.getGasPrice()
        }
      );

      console.log('Verifier reward transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Verifier reward transaction confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        verifierAddress,
        rewardAmount: rewardAmount.toString()
      };
    } catch (error) {
      console.error('Failed to mint verifier reward:', error);
      throw error;
    }
  }
}

module.exports = new BlockchainService();
