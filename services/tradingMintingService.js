/**
 * Trading and Minting Service
 * Queries blockchain events to show actual trading and minting activities
 */

const { ethers } = require('ethers');
const blockchainService = require('../utils/blockchainService');

class TradingMintingService {
  constructor() {
    this.provider = null;
    this.registryContract = null;
    this.tokenContract = null;
  }

  async initialize() {
    if (!this.provider) {
      this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    }

    if (!this.registryContract && process.env.CONTRACT_ADDRESS) {
      const registryABI = [
        "event ProjectRegistered(uint256 indexed tokenId, string indexed projectId, address indexed owner, uint256 carbonCredits)",
        "event ERC20CreditsMinted(uint256 indexed tokenId, uint256 amount, address to)",
        "event VerifierRewardMinted(uint256 indexed tokenId, address indexed verifier, uint256 amount)",
        "event CreditsRetired(uint256 indexed tokenId, string indexed projectId, uint256 amount, string reason)",
        "function projects(uint256 tokenId) external view returns (tuple(string projectId, uint16 carbonCredits, uint8 status, bool isRetired, uint64 retirementDate, address projectOwner, bytes32 ipfsHash))"
      ];
      this.registryContract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        registryABI,
        this.provider
      );
    }

    if (!this.tokenContract && process.env.BLUECARBON_ADDRESS) {
      const tokenABI = [
        "event Transfer(address indexed from, address indexed to, uint256 value)",
        "event Approval(address indexed owner, address indexed spender, uint256 value)",
        "function balanceOf(address owner) external view returns (uint256)",
        "function decimals() external view returns (uint8)",
        "function symbol() external view returns (string)"
      ];
      this.tokenContract = new ethers.Contract(
        process.env.BLUECARBON_ADDRESS,
        tokenABI,
        this.provider
      );
    }
  }

  /**
   * Get all minting events
   */
  async getMintingEvents(fromBlock = 0, toBlock = 'latest', limit = 100) {
    try {
      await this.initialize();

      if (!this.registryContract) {
        throw new Error('Registry contract not initialized');
      }

      // Get ERC20CreditsMinted events
      const mintFilter = this.registryContract.filters.ERC20CreditsMinted();
      const mintEvents = await this.registryContract.queryFilter(mintFilter, fromBlock, toBlock);

      // Get VerifierRewardMinted events
      const verifierRewardFilter = this.registryContract.filters.VerifierRewardMinted();
      const verifierRewardEvents = await this.registryContract.queryFilter(verifierRewardFilter, fromBlock, toBlock);

      // Get ProjectRegistered events (NFT minting)
      const projectRegisteredFilter = this.registryContract.filters.ProjectRegistered();
      const projectRegisteredEvents = await this.registryContract.queryFilter(projectRegisteredFilter, fromBlock, toBlock);

      const mintingActivities = [];

      // Process ERC20 minting events
      for (const event of mintEvents.slice(-limit)) {
        const block = await event.getBlock();
        const parsed = this.registryContract.interface.parseLog(event);
        
        mintingActivities.push({
          type: 'ERC20_MINT',
          tokenId: parsed.args.tokenId.toString(),
          amount: ethers.formatUnits(parsed.args.amount, 18),
          to: parsed.args.to,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(block.timestamp * 1000).toISOString(),
          description: `Minted ${ethers.formatUnits(parsed.args.amount, 18)} BCARB tokens to ${parsed.args.to}`
        });
      }

      // Process verifier reward events
      for (const event of verifierRewardEvents.slice(-limit)) {
        const block = await event.getBlock();
        const parsed = this.registryContract.interface.parseLog(event);
        
        mintingActivities.push({
          type: 'VERIFIER_REWARD',
          tokenId: parsed.args.tokenId.toString(),
          amount: parsed.args.amount.toString(),
          to: parsed.args.verifier,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(block.timestamp * 1000).toISOString(),
          description: `Minted ${parsed.args.amount} BCARB tokens as verifier reward to ${parsed.args.verifier}`
        });
      }

      // Process NFT minting events
      for (const event of projectRegisteredEvents.slice(-limit)) {
        const block = await event.getBlock();
        const parsed = this.registryContract.interface.parseLog(event);
        
        mintingActivities.push({
          type: 'NFT_MINT',
          tokenId: parsed.args.tokenId.toString(),
          projectId: parsed.args.projectId,
          amount: parsed.args.carbonCredits.toString(),
          to: parsed.args.owner,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(block.timestamp * 1000).toISOString(),
          description: `Minted NFT #${parsed.args.tokenId} for project ${parsed.args.projectId} to ${parsed.args.owner}`
        });
      }

      // Sort by timestamp (newest first)
      mintingActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return mintingActivities.slice(0, limit);
    } catch (error) {
      console.error('Error getting minting events:', error);
      throw error;
    }
  }

  /**
   * Get all trading/transfer events
   */
  async getTradingEvents(fromBlock = 0, toBlock = 'latest', limit = 100) {
    try {
      await this.initialize();

      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }

      // Get Transfer events (exclude minting by filtering out zero address)
      const transferFilter = this.tokenContract.filters.Transfer();
      const transferEvents = await this.tokenContract.queryFilter(transferFilter, fromBlock, toBlock);

      const tradingActivities = [];

      for (const event of transferEvents.slice(-limit * 2)) {
        try {
          const block = await event.getBlock();
          const parsed = this.tokenContract.interface.parseLog(event);
          
          if (!parsed || !parsed.args) continue;
          
          const from = parsed.args.from;
          const to = parsed.args.to;
          const amount = ethers.formatUnits(parsed.args.value, 18);

          // Skip minting events (from zero address)
          if (from === ethers.ZeroAddress) {
            continue;
          }

          // Skip burning events (to zero address) - we can include these if needed
          // if (to === ethers.ZeroAddress) continue;

          tradingActivities.push({
            type: to === ethers.ZeroAddress ? 'BURN' : 'TRANSFER',
            from: from,
            to: to,
            amount: amount,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: new Date(block.timestamp * 1000).toISOString(),
            description: to === ethers.ZeroAddress 
              ? `Burned ${amount} BCARB tokens from ${from}`
              : `Transferred ${amount} BCARB tokens from ${from} to ${to}`
          });
        } catch (e) {
          // Skip events that can't be parsed
          continue;
        }
      }

      // Sort by timestamp (newest first)
      tradingActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return tradingActivities.slice(0, limit);
    } catch (error) {
      console.error('Error getting trading events:', error);
      throw error;
    }
  }

  /**
   * Get all activities (minting + trading)
   */
  async getAllActivities(fromBlock = 0, toBlock = 'latest', limit = 100) {
    try {
      const [minting, trading] = await Promise.all([
        this.getMintingEvents(fromBlock, toBlock, limit),
        this.getTradingEvents(fromBlock, toBlock, limit)
      ]);

      const allActivities = [...minting, ...trading];
      allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return allActivities.slice(0, limit);
    } catch (error) {
      console.error('Error getting all activities:', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    try {
      await this.initialize();

      const [minting, trading] = await Promise.all([
        this.getMintingEvents(0, 'latest', 1000),
        this.getTradingEvents(0, 'latest', 1000)
      ]);

      const totalMinted = minting
        .filter(m => m.type === 'ERC20_MINT' || m.type === 'VERIFIER_REWARD')
        .reduce((sum, m) => sum + parseFloat(m.amount), 0);

      const totalTraded = trading
        .filter(t => t.type === 'TRANSFER')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const totalNFTs = minting.filter(m => m.type === 'NFT_MINT').length;

      return {
        totalMinted: totalMinted.toFixed(2),
        totalTraded: totalTraded.toFixed(2),
        totalNFTs,
        totalMintingEvents: minting.length,
        totalTradingEvents: trading.length,
        recentMinting: minting.slice(0, 10),
        recentTrading: trading.slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Get activities for a specific address
   */
  async getAddressActivities(address, fromBlock = 0, toBlock = 'latest', limit = 100) {
    try {
      const allActivities = await this.getAllActivities(fromBlock, toBlock, limit * 2);
      
      const addressActivities = allActivities.filter(activity => {
        if (activity.type === 'NFT_MINT' || activity.type === 'ERC20_MINT' || activity.type === 'VERIFIER_REWARD') {
          return activity.to.toLowerCase() === address.toLowerCase();
        }
        if (activity.type === 'TRANSFER' || activity.type === 'BURN') {
          return activity.from.toLowerCase() === address.toLowerCase() || 
                 activity.to.toLowerCase() === address.toLowerCase();
        }
        return false;
      });

      return addressActivities.slice(0, limit);
    } catch (error) {
      console.error('Error getting address activities:', error);
      throw error;
    }
  }
}

module.exports = new TradingMintingService();

