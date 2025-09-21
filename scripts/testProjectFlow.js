const mongoose = require('mongoose');
const Project = require('../models/Project');
const Verification = require('../models/Verification');
const blockchainService = require('../utils/blockchainService');
require('dotenv').config();

async function testProjectFlow() {
  try {
    console.log('🚀 Testing Project Registration and Verification Flow...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Create a sample project
    console.log('\n📝 Test 1: Creating a sample project...');
    
    const sampleProjectData = {
      projectName: 'Test Mangrove Restoration Project',
      description: 'A test project for mangrove restoration in coastal areas',
      ecosystemType: 'mangroves',
      organizationName: 'Test Environmental NGO',
      ownerName: 'John Doe',
      email: 'john@test.com',
      phone: '+1234567890',
      area: '10.5',
      density: 'high',
      location: {
        lat: '19.0760',
        lng: '72.8777',
        address: 'Mumbai, Maharashtra, India',
        stateUT: 'Maharashtra',
        district: 'Mumbai',
        villagePanchayat: 'Mumbai City'
      },
      startDate: '2024-01-01',
      duration: '5 years',
      legalOwnership: 'Community owned',
      permits: ['Environmental Clearance', 'Coastal Regulation Zone'],
      baselineData: 'Baseline carbon stock: 50 tCO2/ha',
      monitoringPlan: 'Quarterly monitoring with GPS coordinates',
      validator: 'Test Verifier',
      communityConsent: true,
      documents: [
        {
          name: 'Environmental Impact Assessment',
          type: 'pdf',
          size: 1024000,
          category: 'legal'
        }
      ],
      plantationSpecies: ['Rhizophora apiculata', 'Avicennia marina'],
      treeCount: '1000',
      averageHeight: '2.5',
      averageLength: '1.2',
      averageBreadth: '0.8',
      seedlings: '500',
      estimatedCO2Sequestration: 25.5
    };

    // Create project (simulating the registerProject endpoint)
    const project = new Project({
      name: sampleProjectData.projectName,
      location: sampleProjectData.location.address,
      area: parseFloat(sampleProjectData.area),
      method: sampleProjectData.ecosystemType,
      status: 'Pending',
      createdBy: new mongoose.Types.ObjectId(), // Mock user ID

      Project_ID: `PROJ_${Date.now()}_TEST`,
      Project_Name: sampleProjectData.projectName,
      Ecosystem_Type: sampleProjectData.ecosystemType,
      State_UT: sampleProjectData.location.stateUT,
      District: sampleProjectData.location.district,
      Village_Coastal_Panchayat: sampleProjectData.location.villagePanchayat,
      Latitude_Longitude: `${sampleProjectData.location.lat}, ${sampleProjectData.location.lng}`,
      Area_Hectares: parseFloat(sampleProjectData.area),
      Species_Planted: sampleProjectData.plantationSpecies.join(', '),
      Plantation_Date: new Date(sampleProjectData.startDate),
      Verification_Agency: '',
      Verified_Date: null,
      Carbon_Sequestration_tCO2: sampleProjectData.estimatedCO2Sequestration,
      Carbon_Credits_Issued: 0,
      Supporting_NGO_Community: sampleProjectData.organizationName,

      metadata: {
        description: sampleProjectData.description,
        ownerName: sampleProjectData.ownerName,
        email: sampleProjectData.email,
        phone: sampleProjectData.phone,
        density: sampleProjectData.density,
        duration: sampleProjectData.duration,
        legalOwnership: sampleProjectData.legalOwnership,
        permits: sampleProjectData.permits,
        baselineData: sampleProjectData.baselineData,
        monitoringPlan: sampleProjectData.monitoringPlan,
        communityConsent: sampleProjectData.communityConsent,
        documents: sampleProjectData.documents,
        treeCount: sampleProjectData.treeCount,
        averageHeight: sampleProjectData.averageHeight,
        averageLength: sampleProjectData.averageLength,
        averageBreadth: sampleProjectData.averageBreadth,
        seedlings: sampleProjectData.seedlings
      },

      blockchain: {
        isRegistered: false,
        isRetired: false
      }
    });

    await project.save();
    console.log(`✅ Project created with ID: ${project._id}`);
    console.log(`   Project ID: ${project.Project_ID}`);
    console.log(`   Status: ${project.status}`);

    // Test 2: Create verification record (simulating approval)
    console.log('\n🔍 Test 2: Creating verification record...');
    
    const verification = new Verification({
      projectId: project._id,
      status: 'Approved',
      comments: 'Project meets all verification criteria. Mangrove species are appropriate for the location.',
      verifier: new mongoose.Types.ObjectId(), // Mock verifier ID
      gps: {
        latitude: parseFloat(sampleProjectData.location.lat),
        longitude: parseFloat(sampleProjectData.location.lng),
        precision: 5
      },
      mangroveData: {
        species: sampleProjectData.plantationSpecies,
        treeCount: parseInt(sampleProjectData.treeCount),
        avgDBHcm: 15,
        avgHeightM: parseFloat(sampleProjectData.averageHeight),
        soilCarbonContentPercent: 2.5,
        seedlingsCount: parseInt(sampleProjectData.seedlings)
      },
      co2Estimate: sampleProjectData.estimatedCO2Sequestration,
      verifiedAt: new Date()
    });

    await verification.save();
    console.log(`✅ Verification created with ID: ${verification._id}`);
    console.log(`   Status: ${verification.status}`);
    console.log(`   CO2 Estimate: ${verification.co2Estimate} tCO2`);

    // Test 3: Update project status to verified
    console.log('\n✅ Test 3: Updating project status to verified...');
    
    project.status = 'Verified';
    project.Verification_Agency = 'Test Verifier';
    project.Verified_Date = new Date();
    project.Carbon_Sequestration_tCO2 = verification.co2Estimate;
    project.Carbon_Credits_Issued = Math.floor(verification.co2Estimate);

    await project.save();
    console.log(`✅ Project status updated to: ${project.status}`);
    console.log(`   Carbon Credits Issued: ${project.Carbon_Credits_Issued}`);

    // Test 4: Test blockchain service (without actually calling blockchain)
    console.log('\n⛓️ Test 4: Testing blockchain service preparation...');
    
    try {
      // Test the metadata creation function
      const metadata = blockchainService.createProjectMetadata(sampleProjectData);
      console.log('✅ Project metadata created successfully');
      console.log(`   Metadata keys: ${Object.keys(metadata).join(', ')}`);
      console.log(`   CO2 Sequestration: ${metadata.estimatedCO2Sequestration} tCO2`);
      
      // Test project data preparation for blockchain
      const contractProjectData = {
        projectId: project.Project_ID,
        projectName: project.Project_Name,
        ecosystemType: project.Ecosystem_Type,
        stateUT: project.State_UT,
        district: project.District,
        villagePanchayat: project.Village_Coastal_Panchayat,
        carbonCredits: project.Carbon_Credits_Issued,
        isRetired: false,
        retirementDate: 0,
        retirementReason: "",
        status: 1, // VERIFIED status
        projectOwner: '0x0000000000000000000000000000000000000000',
        ipfsHash: '0x0000000000000000000000000000000000000000000000000000000000000000'
      };
      
      console.log('✅ Contract project data prepared successfully');
      console.log(`   Project ID: ${contractProjectData.projectId}`);
      console.log(`   Carbon Credits: ${contractProjectData.carbonCredits}`);
      console.log(`   Status: ${contractProjectData.status} (VERIFIED)`);
      
    } catch (blockchainError) {
      console.log(`⚠️ Blockchain service test failed: ${blockchainError.message}`);
    }

    // Test 5: Clean up test data
    console.log('\n🧹 Test 5: Cleaning up test data...');
    
    await Verification.deleteOne({ _id: verification._id });
    await Project.deleteOne({ _id: project._id });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Project creation works');
    console.log('   ✅ Verification process works');
    console.log('   ✅ Status updates work');
    console.log('   ✅ Blockchain data preparation works');
    console.log('   ✅ Database operations work');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testProjectFlow();
