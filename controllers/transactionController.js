const { ethers } = require('ethers');
const Project = require('../models/Project');

class TransactionController {
  constructor() {
    this.provider = null;
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.blueCarbonAddress = process.env.BLUECARBON_ADDRESS;
  }

  /**
   * Initialize blockchain connection
   */
  async initialize() {
    try {
      this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      console.log('Transaction controller initialized');
    } catch (error) {
      console.error('Failed to initialize transaction controller:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a specific address
   */
  async getTransactionHistory(req, res) {
    try {
      const { address } = req.params;
      const { page = 1, limit = 20, type = 'all' } = req.query;

      if (!ethers.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid Ethereum address' });
      }

      await this.initialize();

      // Get transactions from multiple sources
      const [blockchainTxs, projectTxs, tokenTxs] = await Promise.all([
        this.getBlockchainTransactions(address, page, limit, type),
        this.getProjectTransactions(address, page, limit, type),
        this.getTokenTransactions(address, page, limit, type)
      ]);

      // Combine and sort all transactions by timestamp
      const allTransactions = [
        ...blockchainTxs,
        ...projectTxs,
        ...tokenTxs
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Paginate results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedTxs = allTransactions.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          transactions: paginatedTxs,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(allTransactions.length / limit),
            totalTransactions: allTransactions.length,
            hasNext: endIndex < allTransactions.length,
            hasPrev: startIndex > 0
          }
        }
      });
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      res.status(500).json({
        error: 'Failed to fetch transaction history',
        details: error.message
      });
    }
  }

  /**
   * Get blockchain transactions (contract interactions)
   */
  async getBlockchainTransactions(address, page, limit, type) {
    try {
      const transactions = [];
      
      // Get recent blocks and filter for our address
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks
      
      // Get contract events
      const registryContract = new ethers.Contract(
        this.contractAddress,
        this.getRegistryABI(),
        this.provider
      );

      const blueCarbonContract = new ethers.Contract(
        this.blueCarbonAddress,
        this.getBlueCarbonABI(),
        this.provider
      );

      // Get project registration events
      const projectEvents = await registryContract.queryFilter(
        registryContract.filters.ProjectRegistered(),
        fromBlock,
        'latest'
      );

      // Get token transfer events
      const transferEvents = await blueCarbonContract.queryFilter(
        blueCarbonContract.filters.Transfer(),
        fromBlock,
        'latest'
      );

      // Process project events
      for (const event of projectEvents) {
        if (event.args.projectOwner.toLowerCase() === address.toLowerCase()) {
          const tx = await this.provider.getTransaction(event.transactionHash);
          const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
          
          transactions.push({
            hash: event.transactionHash,
            type: 'project_registration',
            from: tx.from,
            to: tx.to,
            value: ethers.formatEther(tx.value),
            gasUsed: receipt.gasUsed.toString(),
            gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei'),
            timestamp: new Date((await this.provider.getBlock(receipt.blockNumber)).timestamp * 1000),
            blockNumber: receipt.blockNumber,
            status: receipt.status === 1 ? 'success' : 'failed',
            projectId: event.args.projectId,
            carbonCredits: event.args.carbonCredits.toString(),
            ipfsHash: event.args.ipfsHash
          });
        }
      }

      // Process transfer events
      for (const event of transferEvents) {
        if (event.args.from.toLowerCase() === address.toLowerCase() || 
            event.args.to.toLowerCase() === address.toLowerCase()) {
          const tx = await this.provider.getTransaction(event.transactionHash);
          const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
          
          transactions.push({
            hash: event.transactionHash,
            type: 'token_transfer',
            from: event.args.from,
            to: event.args.to,
            value: ethers.formatEther(event.args.value),
            gasUsed: receipt.gasUsed.toString(),
            gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei'),
            timestamp: new Date((await this.provider.getBlock(receipt.blockNumber)).timestamp * 1000),
            blockNumber: receipt.blockNumber,
            status: receipt.status === 1 ? 'success' : 'failed',
            tokenId: event.args.tokenId?.toString()
          });
        }
      }

      return transactions;
    } catch (error) {
      console.error('Error fetching blockchain transactions:', error);
      return [];
    }
  }

  /**
   * Get project-related transactions from database
   */
  async getProjectTransactions(address, page, limit, type) {
    try {
      const projects = await Project.find({
        $or: [
          { 'blockchain.projectOwner': address },
          { 'ethereumOwner': address }
        ]
      }).sort({ 'blockchain.lastBlockchainUpdate': -1 });

      return projects.map(project => ({
        hash: project.blockchain?.transactionHash,
        type: 'project_activity',
        from: project.ethereumOwner,
        to: this.contractAddress,
        value: '0',
        timestamp: project.blockchain?.lastBlockchainUpdate || project.submittedAt,
        blockNumber: project.blockchain?.blockNumber,
        status: project.blockchain?.isRegistered ? 'success' : 'pending',
        projectId: project.Project_ID,
        projectName: project.projectName,
        co2Estimate: project.co2Estimate,
        isRetired: project.blockchain?.isRetired || false
      })).filter(tx => tx.hash); // Only include transactions with blockchain hash
    } catch (error) {
      console.error('Error fetching project transactions:', error);
      return [];
    }
  }

  /**
   * Get token transactions
   */
  async getTokenTransactions(address, page, limit, type) {
    try {
      // This would typically query a token contract for transfer events
      // For now, return empty array as token transactions are handled in blockchain transactions
      return [];
    } catch (error) {
      console.error('Error fetching token transactions:', error);
      return [];
    }
  }

  /**
   * Get transaction details by hash
   */
  async getTransactionDetails(req, res) {
    try {
      const { hash } = req.params;
      
      await this.initialize();

      const tx = await this.provider.getTransaction(hash);
      if (!tx) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const receipt = await this.provider.getTransactionReceipt(hash);
      const block = await this.provider.getBlock(tx.blockNumber);

      const transactionDetails = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasLimit: tx.gasLimit.toString(),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei'),
        timestamp: new Date(block.timestamp * 1000),
        blockNumber: tx.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed',
        nonce: tx.nonce,
        data: tx.data,
        type: tx.type,
        chainId: tx.chainId,
        maxFeePerGas: tx.maxFeePerGas ? ethers.formatUnits(tx.maxFeePerGas, 'gwei') : null,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei') : null
      };

      res.json({
        success: true,
        data: transactionDetails
      });
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      res.status(500).json({
        error: 'Failed to fetch transaction details',
        details: error.message
      });
    }
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(req, res) {
    try {
      const { address } = req.params;
      
      await this.initialize();

      const [blockchainTxs, projectTxs] = await Promise.all([
        this.getBlockchainTransactions(address, 1, 1000, 'all'),
        this.getProjectTransactions(address, 1, 1000, 'all')
      ]);

      const allTransactions = [...blockchainTxs, ...projectTxs];

      const stats = {
        totalTransactions: allTransactions.length,
        successfulTransactions: allTransactions.filter(tx => tx.status === 'success').length,
        failedTransactions: allTransactions.filter(tx => tx.status === 'failed').length,
        totalGasUsed: allTransactions.reduce((sum, tx) => sum + parseInt(tx.gasUsed || 0), 0),
        totalValue: allTransactions.reduce((sum, tx) => sum + parseFloat(tx.value || 0), 0),
        transactionTypes: {
          project_registration: allTransactions.filter(tx => tx.type === 'project_registration').length,
          token_transfer: allTransactions.filter(tx => tx.type === 'token_transfer').length,
          project_activity: allTransactions.filter(tx => tx.type === 'project_activity').length
        },
        recentActivity: allTransactions
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5)
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      res.status(500).json({
        error: 'Failed to fetch transaction statistics',
        details: error.message
      });
    }
  }

  /**
   * Get contract ABI for registry
   */
  getRegistryABI() {
    return [
      "event ProjectRegistered(string indexed projectId, uint256 indexed carbonCredits, address indexed projectOwner, bytes32 ipfsHash)",
      "event CreditsRetired(string indexed projectId, uint256 indexed amount, address indexed retirer)"
    ];
  }

  /**
   * Get contract ABI for BlueCarbon token
   */
  getBlueCarbonABI() {
    return [
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
      "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)"
    ];
  }
}

module.exports = new TransactionController();
