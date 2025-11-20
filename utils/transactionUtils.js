const { ethers } = require('ethers');

class TransactionUtils {
  /**
   * Format transaction hash for display
   */
  static formatTransactionHash(hash) {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  }

  /**
   * Format Ethereum address for display
   */
  static formatAddress(address) {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Format transaction value
   */
  static formatValue(value, decimals = 18) {
    if (!value) return '0 ETH';
    const formatted = ethers.formatEther(value);
    return `${parseFloat(formatted).toFixed(6)} ETH`;
  }

  /**
   * Format gas price
   */
  static formatGasPrice(gasPrice) {
    if (!gasPrice) return 'N/A';
    return `${ethers.formatUnits(gasPrice, 'gwei')} Gwei`;
  }

  /**
   * Format gas used
   */
  static formatGasUsed(gasUsed) {
    if (!gasUsed) return 'N/A';
    return new Intl.NumberFormat().format(gasUsed.toString());
  }

  /**
   * Format timestamp
   */
  static formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Get transaction type display name
   */
  static getTransactionTypeDisplay(type) {
    const typeMap = {
      'project_registration': 'Project Registration',
      'token_transfer': 'Token Transfer',
      'project_activity': 'Project Activity',
      'contract_interaction': 'Contract Interaction',
      'token_mint': 'Token Mint',
      'token_burn': 'Token Burn'
    };
    return typeMap[type] || type;
  }

  /**
   * Get transaction status display
   */
  static getTransactionStatusDisplay(status) {
    const statusMap = {
      'success': 'Success',
      'failed': 'Failed',
      'pending': 'Pending',
      'confirmed': 'Confirmed'
    };
    return statusMap[status] || status;
  }

  /**
   * Calculate transaction fee
   */
  static calculateTransactionFee(gasUsed, gasPrice) {
    if (!gasUsed || !gasPrice) return '0 ETH';
    const fee = BigInt(gasUsed) * BigInt(gasPrice);
    return ethers.formatEther(fee);
  }

  /**
   * Get transaction priority (based on gas price)
   */
  static getTransactionPriority(gasPrice) {
    if (!gasPrice) return 'Unknown';
    
    const gwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gwei < 10) return 'Low';
    if (gwei < 20) return 'Standard';
    if (gwei < 50) return 'Fast';
    return 'Instant';
  }

  /**
   * Format block number
   */
  static formatBlockNumber(blockNumber) {
    if (!blockNumber) return 'N/A';
    return `#${blockNumber}`;
  }

  /**
   * Get transaction age
   */
  static getTransactionAge(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const txTime = new Date(timestamp);
    const diffMs = now - txTime;
    
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return txTime.toLocaleDateString();
  }

  /**
   * Validate Ethereum address
   */
  static isValidAddress(address) {
    return ethers.isAddress(address);
  }

  /**
   * Validate transaction hash
   */
  static isValidTransactionHash(hash) {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * Get transaction type icon
   */
  static getTransactionTypeIcon(type) {
    const iconMap = {
      'project_registration': '🌱',
      'token_transfer': '🔄',
      'project_activity': '📊',
      'contract_interaction': '⚙️',
      'token_mint': '✨',
      'token_burn': '🔥'
    };
    return iconMap[type] || '📄';
  }

  /**
   * Get transaction status color
   */
  static getTransactionStatusColor(status) {
    const colorMap = {
      'success': '#28a745',
      'failed': '#dc3545',
      'pending': '#ffc107',
      'confirmed': '#17a2b8'
    };
    return colorMap[status] || '#6c757d';
  }

  /**
   * Format large numbers
   */
  static formatLargeNumber(num) {
    if (!num) return '0';
    
    const number = parseInt(num);
    if (number < 1000) return number.toString();
    if (number < 1000000) return `${(number / 1000).toFixed(1)}K`;
    if (number < 1000000000) return `${(number / 1000000).toFixed(1)}M`;
    return `${(number / 1000000000).toFixed(1)}B`;
  }

  /**
   * Get transaction direction (incoming/outgoing)
   */
  static getTransactionDirection(from, to, userAddress) {
    if (!userAddress) return 'unknown';
    
    const userLower = userAddress.toLowerCase();
    const fromLower = from?.toLowerCase();
    const toLower = to?.toLowerCase();
    
    if (fromLower === userLower && toLower !== userLower) return 'outgoing';
    if (toLower === userLower && fromLower !== userLower) return 'incoming';
    return 'internal';
  }

  /**
   * Sort transactions by timestamp
   */
  static sortTransactionsByTime(transactions, order = 'desc') {
    return transactions.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return order === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }

  /**
   * Filter transactions by type
   */
  static filterTransactionsByType(transactions, type) {
    if (type === 'all') return transactions;
    return transactions.filter(tx => tx.type === type);
  }

  /**
   * Filter transactions by status
   */
  static filterTransactionsByStatus(transactions, status) {
    if (status === 'all') return transactions;
    return transactions.filter(tx => tx.status === status);
  }

  /**
   * Search transactions by hash or address
   */
  static searchTransactions(transactions, query) {
    if (!query) return transactions;
    
    const lowerQuery = query.toLowerCase();
    return transactions.filter(tx => 
      tx.hash?.toLowerCase().includes(lowerQuery) ||
      tx.from?.toLowerCase().includes(lowerQuery) ||
      tx.to?.toLowerCase().includes(lowerQuery) ||
      tx.projectId?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get transaction summary for display
   */
  static getTransactionSummary(transaction) {
    const type = this.getTransactionTypeDisplay(transaction.type);
    const status = this.getTransactionStatusDisplay(transaction.status);
    const age = this.getTransactionAge(transaction.timestamp);
    const direction = this.getTransactionDirection(
      transaction.from, 
      transaction.to, 
      transaction.userAddress
    );
    
    return {
      type,
      status,
      age,
      direction,
      icon: this.getTransactionTypeIcon(transaction.type),
      color: this.getTransactionStatusColor(transaction.status)
    };
  }

  /**
   * Generate transaction CSV data
   */
  static generateTransactionCSV(transactions) {
    const headers = [
      'Hash',
      'Type',
      'Status',
      'From',
      'To',
      'Value (ETH)',
      'Gas Used',
      'Gas Price (Gwei)',
      'Block Number',
      'Timestamp'
    ];
    
    const rows = transactions.map(tx => [
      tx.hash,
      tx.type,
      tx.status,
      tx.from,
      tx.to,
      tx.value,
      tx.gasUsed,
      tx.gasPrice,
      tx.blockNumber,
      tx.timestamp
    ]);
    
    return [headers, ...rows];
  }

  /**
   * Calculate transaction statistics
   */
  static calculateTransactionStats(transactions) {
    const total = transactions.length;
    const successful = transactions.filter(tx => tx.status === 'success').length;
    const failed = transactions.filter(tx => tx.status === 'failed').length;
    const pending = transactions.filter(tx => tx.status === 'pending').length;
    
    const totalGasUsed = transactions.reduce((sum, tx) => 
      sum + parseInt(tx.gasUsed || 0), 0
    );
    
    const totalValue = transactions.reduce((sum, tx) => 
      sum + parseFloat(tx.value || 0), 0
    );
    
    const typeCounts = transactions.reduce((counts, tx) => {
      counts[tx.type] = (counts[tx.type] || 0) + 1;
      return counts;
    }, {});
    
    return {
      total,
      successful,
      failed,
      pending,
      successRate: total > 0 ? (successful / total * 100).toFixed(2) : 0,
      totalGasUsed,
      totalValue,
      typeCounts,
      averageGasUsed: total > 0 ? Math.round(totalGasUsed / total) : 0
    };
  }
}

module.exports = TransactionUtils;
