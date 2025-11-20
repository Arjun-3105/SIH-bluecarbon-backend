
// Test Project Registration Example
const blockchainService = require('./utils/blockchainService');

async function testProjectRegistration() {
  try {
    // Create test project data
    const testProject = {
      Project_ID: 'TEST_' + Date.now(),
      Project_Name: 'Test Carbon Project',
      Ecosystem_Type: 'Forest',
      estimatedCO2Sequestration: 1000,
      Carbon_Credits_Issued: 1000
    };

    console.log('Registering test project...');
    const result = await blockchainService.registerProject(testProject);
    
    console.log('✅ Project registered successfully!');
    console.log('Token ID:', result.tokenId);
    console.log('Transaction Hash:', result.transactionHash);
    
    // Test getting project from blockchain
    const project = await blockchainService.getProject(result.tokenId);
    console.log('✅ Project retrieved from blockchain:', project);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Uncomment to run test
// testProjectRegistration();
