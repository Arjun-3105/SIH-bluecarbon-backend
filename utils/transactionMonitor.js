const { ethers } = require('ethers');

class TransactionMonitor {
  constructor() {
    this.provider = null;
    this.monitoredTransactions = new Map();
  }

  /**
   * Initialize the transaction monitor
   */
  async initialize() {
    try {
      this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      console.log('Transaction monitor initialized');
    } catch (error) {
      console.error('Failed to initialize transaction monitor:', error);
      throw error;
    }
  }

  /**
   * Start monitoring a transaction
   */
  async startMonitoring(transactionHash, callback) {
    if (!this.provider) {
      await this.initialize();
    }

    const monitorData = {
      hash: transactionHash,
      status: 'pending',
      confirmations: 0,
      blockNumber: null,
      gasUsed: null,
      callback,
      startTime: new Date()
    };

    this.monitoredTransactions.set(transactionHash, monitorData);
    
    // Start monitoring
    this.monitorTransaction(transactionHash);
    
    return monitorData;
  }

  /**
   * Monitor a specific transaction
   */
  async monitorTransaction(transactionHash) {
    try {
      const tx = await this.provider.getTransaction(transactionHash);
      
      if (!tx) {
        this.updateTransactionStatus(transactionHash, 'not_found', null);
        return;
      }

      // Check if transaction is pending
      if (!tx.blockNumber) {
        // Transaction is still pending
        setTimeout(() => this.monitorTransaction(transactionHash), 5000);
        return;
      }

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      
      if (receipt) {
        const confirmations = await this.getConfirmations(transactionHash);
        
        this.updateTransactionStatus(transactionHash, 'confirmed', {
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 1 ? 'success' : 'failed',
          confirmations
        });

        // Continue monitoring for more confirmations
        if (confirmations < 12) { // Standard confirmation threshold
          setTimeout(() => this.monitorTransaction(transactionHash), 10000);
        } else {
          this.updateTransactionStatus(transactionHash, 'finalized', {
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            status: receipt.status === 1 ? 'success' : 'failed',
            confirmations
          });
        }
      }
    } catch (error) {
      console.error(`Error monitoring transaction ${transactionHash}:`, error);
      this.updateTransactionStatus(transactionHash, 'error', { error: error.message });
    }
  }

  /**
   * Get transaction confirmations
   */
  async getConfirmations(transactionHash) {
    try {
      const tx = await this.provider.getTransaction(transactionHash);
      if (!tx || !tx.blockNumber) return 0;
      
      const currentBlock = await this.provider.getBlockNumber();
      return currentBlock - tx.blockNumber + 1;
    } catch (error) {
      console.error('Error getting confirmations:', error);
      return 0;
    }
  }

  /**
   * Update transaction status
   */
  updateTransactionStatus(transactionHash, status, data) {
    const monitorData = this.monitoredTransactions.get(transactionHash);
    if (!monitorData) return;

    monitorData.status = status;
    if (data) {
      Object.assign(monitorData, data);
    }

    // Call callback if provided
    if (monitorData.callback) {
      monitorData.callback(monitorData);
    }

    // Remove from monitoring if finalized or failed
    if (status === 'finalized' || status === 'failed' || status === 'error') {
      setTimeout(() => {
        this.monitoredTransactions.delete(transactionHash);
      }, 60000); // Keep for 1 minute after completion
    }
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionHash) {
    return this.monitoredTransactions.get(transactionHash);
  }

  /**
   * Stop monitoring a transaction
   */
  stopMonitoring(transactionHash) {
    this.monitoredTransactions.delete(transactionHash);
  }

  /**
   * Get all monitored transactions
   */
  getAllMonitoredTransactions() {
    return Array.from(this.monitoredTransactions.values());
  }

  /**
   * Get transaction details from blockchain
   */
  async getTransactionDetails(transactionHash) {
    if (!this.provider) {
      await this.initialize();
    }

    try {
      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(transactionHash),
        this.provider.getTransactionReceipt(transactionHash)
      ]);

      if (!tx) {
        throw new Error('Transaction not found');
      }

      const block = await this.provider.getBlock(tx.blockNumber || 'latest');
      const confirmations = tx.blockNumber ? await this.getConfirmations(transactionHash) : 0;

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasLimit: tx.gasLimit.toString(),
        gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei'),
        nonce: tx.nonce,
        blockNumber: tx.blockNumber,
        confirmations,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
        gasUsed: receipt ? receipt.gasUsed.toString() : null,
        timestamp: block ? new Date(block.timestamp * 1000) : null,
        data: tx.data
      };
    } catch (error) {
      console.error('Error getting transaction details:', error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(transactionHash, requiredConfirmations = 1) {
    return new Promise((resolve, reject) => {
      const checkConfirmation = async () => {
        try {
          const confirmations = await this.getConfirmations(transactionHash);
          
          if (confirmations >= requiredConfirmations) {
            const details = await this.getTransactionDetails(transactionHash);
            resolve(details);
          } else {
            setTimeout(checkConfirmation, 5000);
          }
        } catch (error) {
          reject(error);
        }
      };

      checkConfirmation();
    });
  }

  /**
   * Monitor contract events for a specific transaction
   */
  async monitorContractEvents(contractAddress, transactionHash, eventFilters = []) {
    if (!this.provider) {
      await this.initialize();
    }

    try {
      const contract = new ethers.Contract(contractAddress, this.getContractABI(), this.provider);
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }

      const events = [];
      
      for (const filter of eventFilters) {
        const contractEvents = await contract.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
        const relevantEvents = contractEvents.filter(event => event.transactionHash === transactionHash);
        events.push(...relevantEvents);
      }

      return events;
    } catch (error) {
      console.error('Error monitoring contract events:', error);
      throw error;
    }
  }

  /**
   * Get contract ABI for monitoring
   */
  getContractABI() {
    return [
      "event ProjectRegistered(uint256 indexed tokenId, string indexed projectId, address indexed projectOwner, uint256 carbonCredits)",
      "event ERC20CreditsMinted(uint256 indexed tokenId, uint256 indexed amount, address indexed recipient)",
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
    ];
  }

  /**
   * Clean up old monitored transactions
   */
  cleanupOldTransactions() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [hash, data] of this.monitoredTransactions.entries()) {
      if (data.startTime < oneHourAgo && (data.status === 'finalized' || data.status === 'failed')) {
        this.monitoredTransactions.delete(hash);
      }
    }
  }

  /**
   * Get transaction statistics
   */
  getMonitoringStats() {
    const transactions = Array.from(this.monitoredTransactions.values());
    
    return {
      totalMonitored: transactions.length,
      pending: transactions.filter(tx => tx.status === 'pending').length,
      confirmed: transactions.filter(tx => tx.status === 'confirmed').length,
      finalized: transactions.filter(tx => tx.status === 'finalized').length,
      failed: transactions.filter(tx => tx.status === 'failed').length,
      errors: transactions.filter(tx => tx.status === 'error').length
    };
  }
}

module.exports = new TransactionMonitor();
