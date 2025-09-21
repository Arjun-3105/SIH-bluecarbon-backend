const { ethers } = require('ethers');
require('dotenv').config();

async function testRPC() {
  console.log('🔗 Testing RPC Connection...\n');
  
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  console.log('RPC URL:', rpcUrl);
  
  if (!rpcUrl) {
    console.log('❌ SEPOLIA_RPC_URL not set in .env file');
    return;
  }
  
  try {
    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Test connection
    console.log('Testing connection...');
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name, '(Chain ID:', network.chainId, ')');
    
    // Check if it's Sepolia
    if (network.chainId === 11155111n) {
      console.log('✅ Correct Sepolia network detected');
    } else {
      console.log('⚠️  Warning: Not connected to Sepolia (Chain ID should be 11155111)');
    }
    
    // Test getting latest block
    const blockNumber = await provider.getBlockNumber();
    console.log('✅ Latest block number:', blockNumber);
    
    // Test wallet connection
    if (process.env.PRIVATE_KEY) {
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      const balance = await provider.getBalance(wallet.address);
      console.log('✅ Wallet address:', wallet.address);
      console.log('✅ Wallet balance:', ethers.formatEther(balance), 'ETH');
      
      if (balance === 0n) {
        console.log('⚠️  Warning: Wallet has 0 ETH. Get testnet ETH from faucet.');
      }
    } else {
      console.log('⚠️  PRIVATE_KEY not set in .env file');
    }
    
    console.log('\n🎉 RPC connection test successful!');
    
  } catch (error) {
    console.log('❌ RPC connection failed:');
    console.log('Error:', error.message);
    
    if (error.message.includes('invalid project id')) {
      console.log('\n💡 Solution:');
      console.log('1. Check your Infura project ID');
      console.log('2. Make sure you\'re using the Sepolia endpoint');
      console.log('3. URL should be: https://sepolia.infura.io/v3/YOUR_PROJECT_ID');
    }
  }
}

testRPC();
