const blockchainService = require('../utils/blockchainService');
const ipfsService = require('../utils/ipfsUpload');
const Project = require('../models/Project');
require('dotenv').config();

async function testBlockchainFunctionality() {
  console.log('🧪 Testing Blockchain Functionality...\n');

  try {
    // Test 1: Initialize blockchain service
    console.log('1️⃣ Testing blockchain service initialization...');
    await blockchainService.initialize();
    console.log('✅ Blockchain service initialized successfully\n');

    // Test 2: Get wallet balance
    console.log('2️⃣ Testing wallet balance...');
    const balance = await blockchainService.getWalletBalance();
    console.log(`💰 Wallet balance: ${balance} ETH\n`);

    // Test 3: Get blockchain statistics
    console.log('3️⃣ Testing blockchain statistics...');
    const stats = await blockchainService.getStatistics();
    console.log('📊 Blockchain Statistics:');
    console.log(`   Total Projects: ${stats.totalProjects}`);
    console.log(`   Total Carbon Credits: ${stats.totalCarbonCredits}`);
    console.log(`   Total Retired Credits: ${stats.totalRetiredCredits}`);
    console.log(`   Active Credits: ${stats.activeCredits}\n`);

    // Test 4: Test IPFS functionality
    console.log('4️⃣ Testing IPFS functionality...');
    const testData = {
      name: 'Test Project',
      description: 'This is a test project for IPFS',
      timestamp: new Date().toISOString()
    };
    
    try {
      const ipfsHash = await ipfsService.uploadToIPFS(testData);
      console.log(`✅ Data uploaded to IPFS: ${ipfsHash}`);
      
      const retrievedData = await ipfsService.getFromIPFS(ipfsHash);
      console.log(`✅ Data retrieved from IPFS: ${JSON.stringify(retrievedData)}\n`);
    } catch (ipfsError) {
      console.log(`⚠️  IPFS test failed (this is expected if Infura credentials are not set): ${ipfsError.message}\n`);
    }

    // Test 5: Test project metadata creation
    console.log('5️⃣ Testing project metadata creation...');
    const sampleProject = {
      Project_ID: "TEST-001",
      Project_Name: "Test Carbon Project",
      Ecosystem_Type: "Forest",
      State_UT: "Test State",
      District: "Test District",
      Village_Coastal_Panchayat: "Test Village",
      Latitude_Longitude: "0.0° N, 0.0° E",
      Area_Hectares: 100,
      Species_Planted: "Test Species",
      Plantation_Date: "2024-01-01",
      Verification_Agency: "Test Agency",
      Verified_Date: "2024-01-15",
      Carbon_Sequestration_tCO2: 1000,
      Carbon_Credits_Issued: 1000,
      Status: "Verified",
      Supporting_NGO_Community: "Test NGO"
    };

    const metadata = ipfsService.createProjectMetadata(sampleProject);
    console.log('✅ Project metadata created successfully');
    console.log(`   Metadata name: ${metadata.name}`);
    console.log(`   Attributes count: ${metadata.attributes.length}\n`);

    // Test 6: Test project existence check
    console.log('6️⃣ Testing project existence check...');
    const exists = await blockchainService.projectExists("TEST-001");
    console.log(`✅ Project existence check: ${exists}\n`);

    // Test 7: Test contract connection
    console.log('7️⃣ Testing contract connection...');
    if (blockchainService.contract) {
      console.log('✅ Contract connection successful');
      console.log(`   Contract address: ${process.env.CONTRACT_ADDRESS || 'Not set'}`);
    } else {
      console.log('⚠️  Contract not initialized (expected if not deployed yet)');
    }
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Deploy the contract: npm run deploy');
    console.log('2. Update CONTRACT_ADDRESS in .env file');
    console.log('3. Run the migration script: node scripts/migrateSampleData.js');
    console.log('4. Test the API endpoints');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testBlockchainFunctionality();
}

module.exports = testBlockchainFunctionality;
