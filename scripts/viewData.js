#!/usr/bin/env node

/**
 * View Blockchain Data
 * Shows all the data stored on the blockchain
 */

const { ethers } = require('ethers');
require('dotenv').config();

async function viewBlockchainData() {
  console.log('📊 Viewing Blockchain Data\n');
  
  try {
    // Connect to local Hardhat network
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    const accounts = await provider.listAccounts();
    const wallet = accounts[0];
    
    console.log('1️⃣ Connected to local blockchain');
    console.log(`   Wallet: ${wallet.address}\n`);
    
    // Contract ABI for viewing data
    const contractABI = [
      "function getTotalProjects() external view returns (uint256)",
      "function getTotalCarbonCredits() external view returns (uint256)",
      "function getProject(uint256 tokenId) external view returns (tuple(string projectId, string projectName, string description, string ecosystemType, string organizationName, string ownerName, string email, string phone, tuple(string lat, string lng, string fullAddress) location, uint256 area, uint256 density, uint256 startDate, uint256 duration, string legalOwnership, string[] permits, bool communityConsent, tuple(string[] species, uint256 treeCount, uint256 averageHeight, uint256 averageLength, uint256 averageBreadth, uint256 seedlings, uint256 estimatedCO2Sequestration) plantation, string baselineData, string monitoringPlan, string validator, string[] documents, string stateUT, string district, string villagePanchayat, string coordinates, uint256 areaHectares, string speciesPlanted, uint256 plantationDate, string verificationAgency, uint256 verifiedDate, uint256 carbonSequestration, uint256 carbonCredits, string status, string supportingNGO, string ipfsHash, address projectOwner, bool isRetired, uint256 retirementDate, string retirementReason))",
      "function getProjectsByEcosystemType(string memory ecosystemType) external view returns (uint256[] memory)",
      "function calculateCO2Sequestration(uint256 treeCount, uint256 avgHeight, uint256 avgLength, uint256 avgBreadth, string memory ecosystemType) external pure returns (uint256)"
    ];
    
    const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    // Get overall statistics
    console.log('2️⃣ Blockchain Statistics');
    const totalProjects = await contract.getTotalProjects();
    const totalCredits = await contract.getTotalCarbonCredits();
    
    console.log(`   Total Projects: ${totalProjects.toString()}`);
    console.log(`   Total Carbon Credits: ${totalCredits.toString()}\n`);
    
    // Get all projects
    console.log('3️⃣ All Projects on Blockchain');
    console.log('   ' + '='.repeat(80));
    
    for (let i = 1; i <= totalProjects; i++) {
      try {
        const project = await contract.getProject(i);
        
        console.log(`\n   📋 Project #${i} (Token ID: ${i})`);
        console.log(`   Project ID: ${project.projectId}`);
        console.log(`   Name: ${project.projectName}`);
        console.log(`   Ecosystem: ${project.ecosystemType}`);
        console.log(`   Organization: ${project.organizationName}`);
        console.log(`   Owner: ${project.ownerName}`);
        console.log(`   Email: ${project.email}`);
        console.log(`   Phone: ${project.phone}`);
        console.log(`   Location: ${project.location.fullAddress}`);
        console.log(`   Area: ${project.area.toString()} hectares`);
        console.log(`   Density: ${project.density.toString()} trees/hectare`);
        console.log(`   Start Date: ${new Date(Number(project.startDate) * 1000).toLocaleDateString()}`);
        console.log(`   Duration: ${project.duration.toString()} days`);
        console.log(`   Legal Ownership: ${project.legalOwnership}`);
        console.log(`   Community Consent: ${project.communityConsent ? 'Yes' : 'No'}`);
        console.log(`   Permits: ${project.permits.length} permits`);
        project.permits.forEach((permit, index) => {
          console.log(`     ${index + 1}. ${permit}`);
        });
        
        console.log(`\n   🌱 Plantation Data:`);
        console.log(`   Species: ${project.plantation.species.length} species`);
        project.plantation.species.forEach((species, index) => {
          console.log(`     ${index + 1}. ${species}`);
        });
        console.log(`   Tree Count: ${project.plantation.treeCount.toString().toLocaleString()}`);
        console.log(`   Average Height: ${project.plantation.averageHeight.toString()}m`);
        console.log(`   Average Length: ${project.plantation.averageLength.toString()}m`);
        console.log(`   Average Breadth: ${project.plantation.averageBreadth.toString()}m`);
        console.log(`   Seedlings: ${project.plantation.seedlings.toString().toLocaleString()}`);
        console.log(`   Estimated CO2: ${project.plantation.estimatedCO2Sequestration.toString()} tonnes`);
        
        console.log(`\n   📊 Monitoring & Validation:`);
        console.log(`   Baseline Data: ${project.baselineData.substring(0, 100)}...`);
        console.log(`   Monitoring Plan: ${project.monitoringPlan.substring(0, 100)}...`);
        console.log(`   Validator: ${project.validator}`);
        console.log(`   Documents: ${project.documents.length} documents`);
        project.documents.forEach((doc, index) => {
          console.log(`     ${index + 1}. ${doc}`);
        });
        
        console.log(`\n   🔗 Blockchain Data:`);
        console.log(`   IPFS Hash: ${project.ipfsHash}`);
        console.log(`   Project Owner: ${project.projectOwner}`);
        console.log(`   Carbon Credits: ${project.carbonCredits.toString()}`);
        console.log(`   Status: ${project.status}`);
        console.log(`   Is Retired: ${project.isRetired ? 'Yes' : 'No'}`);
        
        console.log(`\n   ` + '-'.repeat(80));
        
      } catch (error) {
        console.log(`   ❌ Error loading project ${i}: ${error.message}`);
      }
    }
    
    // Get projects by ecosystem type
    console.log('\n4️⃣ Projects by Ecosystem Type');
    const ecosystemTypes = ['mangroves', 'seagrass', 'salt_marsh', 'coral_reef'];
    
    for (const ecosystem of ecosystemTypes) {
      try {
        const projectIds = await contract.getProjectsByEcosystemType(ecosystem);
        console.log(`   ${ecosystem}: ${projectIds.length} projects`);
        if (projectIds.length > 0) {
          projectIds.forEach(id => {
            console.log(`     - Project #${id.toString()}`);
          });
        }
      } catch (error) {
        console.log(`   ${ecosystem}: Error - ${error.message}`);
      }
    }
    
    console.log('\n5️⃣ CO2 Calculation Examples');
    console.log('   Testing CO2 calculation with different parameters:');
    
    const testCases = [
      { trees: 1000, height: 2, length: 1, breadth: 1, ecosystem: 'mangroves' },
      { trees: 5000, height: 3, length: 2, breadth: 1, ecosystem: 'seagrass' },
      { trees: 10000, height: 4, length: 2, breadth: 2, ecosystem: 'salt_marsh' }
    ];
    
    for (const test of testCases) {
      try {
        const co2 = await contract.calculateCO2Sequestration(
          test.trees,
          test.height,
          test.length,
          test.breadth,
          test.ecosystem
        );
        console.log(`   ${test.trees} trees, ${test.height}x${test.length}x${test.breadth}m, ${test.ecosystem}: ${co2.toString()} tonnes CO2`);
      } catch (error) {
        console.log(`   Error calculating CO2 for ${test.ecosystem}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Data viewing complete!');
    console.log('\n📝 Summary:');
    console.log(`• Total projects registered: ${totalProjects.toString()}`);
    console.log(`• Total carbon credits issued: ${totalCredits.toString()}`);
    console.log(`• All project data is stored on the blockchain`);
    console.log(`• Data is immutable and verifiable`);
    console.log(`• Each project is an NFT (ERC-721 token)`);
    
  } catch (error) {
    console.error('❌ Error viewing data:', error.message);
    if (error.message.includes('connect')) {
      console.log('\n🔧 Make sure Hardhat node is running:');
      console.log('   npx hardhat node');
    }
  }
}

// Run the viewer
if (require.main === module) {
  viewBlockchainData().catch(console.error);
}

module.exports = viewBlockchainData;
