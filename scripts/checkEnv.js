require('dotenv').config();

console.log('🔍 Checking Environment Configuration...\n');

// Check required environment variables
const requiredVars = [
  'SEPOLIA_RPC_URL',
  'PRIVATE_KEY',
  'ETHERSCAN_API_KEY'
];

const optionalVars = [
  'INFURA_PROJECT_ID',
  'INFURA_PROJECT_SECRET',
  'CONTRACT_ADDRESS'
];

console.log('✅ Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`   ❌ ${varName}: NOT SET`);
  }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`   ⚠️  ${varName}: NOT SET`);
  }
});

console.log('\n🔧 Configuration Status:');
const missingRequired = requiredVars.filter(varName => !process.env[varName]);
if (missingRequired.length === 0) {
  console.log('   ✅ All required variables are set!');
  console.log('   🚀 Ready to deploy!');
} else {
  console.log('   ❌ Missing required variables:', missingRequired.join(', '));
  console.log('   📝 Please set up your .env file first');
}

console.log('\n📚 Next Steps:');
console.log('1. Create .env file with required variables');
console.log('2. Get Sepolia ETH from faucet');
console.log('3. Get Infura credentials');
console.log('4. Run: npm run deploy');
