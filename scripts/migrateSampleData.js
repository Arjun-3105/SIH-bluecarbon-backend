const mongoose = require('mongoose');
const Project = require('../models/Project');
require('dotenv').config();

// Sample data from the provided MongoDB collection
const sampleProjects = [
  {
    Project_ID: "SDF-WB-2022-001",
    Project_Name: "Sundarbans Mangrove Restoration",
    Ecosystem_Type: "Mangrove",
    State_UT: "West Bengal",
    District: "South 24 Parganas",
    Village_Coastal_Panchayat: "Bali Island",
    Latitude_Longitude: "21.95° N, 88.85° E",
    Area_Hectares: 750,
    Species_Planted: "Avicennia marina, Rhizophora mucronata",
    Plantation_Date: new Date("2022-06-15"),
    Verification_Agency: "NCCR, State Forest Dept",
    Verified_Date: new Date("2024-03-20"),
    Carbon_Sequestration_tCO2: 8250,
    Carbon_Credits_Issued: 8250,
    Status: "Ongoing",
    Supporting_NGO_Community: "Sundarban Tiger Reserve Community",
    name: "Sundarbans Mangrove Restoration",
    location: "Bali Island, South 24 Parganas, West Bengal",
    area: 750,
    method: "Mangrove Restoration",
    status: "Verified",
    createdBy: new mongoose.Types.ObjectId(), // You'll need to replace with actual user ID
    blockchain: {
      isRegistered: false,
      isRetired: false
    }
  }
];

async function migrateSampleData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing projects (optional - remove this line if you want to keep existing data)
    // await Project.deleteMany({});
    // console.log('Cleared existing projects');

    // Insert sample projects
    for (const projectData of sampleProjects) {
      try {
        const project = new Project(projectData);
        await project.save();
        console.log(`✅ Migrated project: ${project.Project_ID} - ${project.Project_Name}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  Project ${projectData.Project_ID} already exists, skipping...`);
        } else {
          console.error(`❌ Error migrating project ${projectData.Project_ID}:`, error.message);
        }
      }
    }

    console.log('✅ Sample data migration completed!');
    
    // Display statistics
    const totalProjects = await Project.countDocuments();
    const verifiedProjects = await Project.countDocuments({ status: 'Verified' });
    const blockchainRegistered = await Project.countDocuments({ 'blockchain.isRegistered': true });
    
    console.log('\n📊 Database Statistics:');
    console.log(`Total Projects: ${totalProjects}`);
    console.log(`Verified Projects: ${verifiedProjects}`);
    console.log(`Blockchain Registered: ${blockchainRegistered}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateSampleData();
}

module.exports = migrateSampleData;
