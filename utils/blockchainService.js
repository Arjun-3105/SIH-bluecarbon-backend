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
      "function registerProject(tuple(string projectId, string projectName, string ecosystemType, string stateUT, string district, string villagePanchayat, string coordinates, uint256 areaHectares, string speciesPlanted, uint256 plantationDate, string verificationAgency, uint256 verifiedDate, uint256 carbonSequestration, uint256 carbonCredits, string status, string supportingNGO, string ipfsHash, address projectOwner, bool isRetired, uint256 retirementDate, string retirementReason) projectData, string ipfsHash) external returns (uint256)",
      "function retireCredits(uint256 tokenId, uint256 amount, string memory reason) external",
      "function updateProjectStatus(uint256 tokenId, string memory newStatus) external",
      "function getProject(uint256 tokenId) external view returns (tuple(string projectId, string projectName, string ecosystemType, string stateUT, string district, string villagePanchayat, string coordinates, uint256 areaHectares, string speciesPlanted, uint256 plantationDate, string verificationAgency, uint256 verifiedDate, uint256 carbonSequestration, uint256 carbonCredits, string status, string supportingNGO, string ipfsHash, address projectOwner, bool isRetired, uint256 retirementDate, string retirementReason))",
      "function getProjectById(string memory projectId) external view returns (tuple(string projectId, string projectName, string ecosystemType, string stateUT, string district, string villagePanchayat, string coordinates, uint256 areaHectares, string speciesPlanted, uint256 plantationDate, string verificationAgency, uint256 verifiedDate, uint256 carbonSequestration, uint256 carbonCredits, string status, string supportingNGO, string ipfsHash, address projectOwner, bool isRetired, uint256 retirementDate, string retirementReason))",
      "function getTotalProjects() external view returns (uint256)",
      "function getTotalCarbonCredits() external view returns (uint256)",
      "function getTotalRetiredCredits() external view returns (uint256)",
      "function projectExistsById(string memory projectId) external view returns (bool)",
      "function tokenURI(uint256 tokenId) external view returns (string memory)",
      "function ownerOf(uint256 tokenId) external view returns (address)",
      "function balanceOf(address owner) external view returns (uint256)",
      "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
      "event ProjectRegistered(uint256 indexed tokenId, string indexed projectId, address indexed owner, uint256 carbonCredits)",
      "event CreditsRetired(uint256 indexed tokenId, string indexed projectId, uint256 amount, string reason)",
      "event ProjectUpdated(uint256 indexed tokenId, string indexed projectId, string field, string newValue)"
    ];
  }

  /**
   * Register a carbon credit project on blockchain
   * @param {Object} projectData - Project data from MongoDB
   * @returns {Promise<Object>} Transaction result
   */
  async registerProject(projectData) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      // Create metadata and upload to IPFS
      const metadata = ipfsService.createProjectMetadata(projectData);
      const ipfsHash = await ipfsService.uploadToIPFS(metadata);

      // Convert dates to timestamps
      const plantationTimestamp = Math.floor(new Date(projectData.Plantation_Date).getTime() / 1000);
      const verifiedTimestamp = Math.floor(new Date(projectData.Verified_Date).getTime() / 1000);

      // Prepare project data for smart contract
      const contractProjectData = {
        projectId: projectData.Project_ID,
        projectName: projectData.Project_Name,
        ecosystemType: projectData.Ecosystem_Type,
        stateUT: projectData.State_UT,
        district: projectData.District,
        villagePanchayat: projectData.Village_Coastal_Panchayat,
        coordinates: projectData.Latitude_Longitude,
        areaHectares: projectData.Area_Hectares,
        speciesPlanted: projectData.Species_Planted,
        plantationDate: plantationTimestamp,
        verificationAgency: projectData.Verification_Agency,
        verifiedDate: verifiedTimestamp,
        carbonSequestration: projectData.Carbon_Sequestration_tCO2,
        carbonCredits: projectData.Carbon_Credits_Issued,
        status: projectData.Status,
        supportingNGO: projectData.Supporting_NGO_Community,
        ipfsHash: ipfsHash,
        projectOwner: ethers.ZeroAddress, // Will be set by contract
        isRetired: false,
        retirementDate: 0,
        retirementReason: ""
      };

      // Estimate gas
      const gasEstimate = await this.contract.registerProject.estimateGas(
        contractProjectData,
        ipfsHash
      );

      // Register project
      const tx = await this.contract.registerProject(
        contractProjectData,
        ipfsHash,
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
        amount,
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
   * @param {string} newStatus - New status
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
        coordinates: project.coordinates,
        areaHectares: project.areaHectares.toString(),
        speciesPlanted: project.speciesPlanted,
        plantationDate: new Date(Number(project.plantationDate) * 1000).toISOString(),
        verificationAgency: project.verificationAgency,
        verifiedDate: new Date(Number(project.verifiedDate) * 1000).toISOString(),
        carbonSequestration: project.carbonSequestration.toString(),
        carbonCredits: project.carbonCredits.toString(),
        status: project.status,
        supportingNGO: project.supportingNGO,
        ipfsHash: project.ipfsHash,
        projectOwner: project.projectOwner,
        isRetired: project.isRetired,
        retirementDate: project.retirementDate.toString(),
        retirementReason: project.retirementReason
      };
    } catch (error) {
      console.error('Failed to get project:', error);
      throw error;
    }
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
        coordinates: project.coordinates,
        areaHectares: project.areaHectares.toString(),
        speciesPlanted: project.speciesPlanted,
        plantationDate: new Date(Number(project.plantationDate) * 1000).toISOString(),
        verificationAgency: project.verificationAgency,
        verifiedDate: new Date(Number(project.verifiedDate) * 1000).toISOString(),
        carbonSequestration: project.carbonSequestration.toString(),
        carbonCredits: project.carbonCredits.toString(),
        status: project.status,
        supportingNGO: project.supportingNGO,
        ipfsHash: project.ipfsHash,
        projectOwner: project.projectOwner,
        isRetired: project.isRetired,
        retirementDate: project.retirementDate.toString(),
        retirementReason: project.retirementReason
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
}

module.exports = new BlockchainService();
