/**
 * Example script showing how to register a project using the updated CarbonCreditRegistry contract
 * This demonstrates how to map frontend form data to the smart contract structure
 */

const { ethers } = require("hardhat");

async function registerProjectExample() {
    // Get the contract instance
    const CarbonCreditRegistry = await ethers.getContractFactory("CarbonCreditRegistry");
    const registry = await CarbonCreditRegistry.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"); // Replace with actual contract address

    // Example frontend form data (from your React component)
    const frontendFormData = {
        projectId: "PROJ-2024-001",
        projectName: "Mangrove Restoration Project - Sundarbans",
        description: "A comprehensive mangrove restoration project in the Sundarbans delta",
        ecosystemType: "mangroves",
        organizationName: "Green Earth Foundation",
        ownerName: "Dr. Rajesh Kumar",
        email: "rajesh@greenearth.org",
        phone: "+91-9876543210",
        area: 50, // hectares
        density: 1000, // trees per hectare
        location: {
            lat: "22.3475",
            lng: "88.9456",
            fullAddress: "Sundarbans National Park, West Bengal, India"
        },
        startDate: Math.floor(Date.now() / 1000), // Current timestamp
        duration: 365, // 1 year in days
        legalOwnership: "Community Forest Rights under FRA 2006",
        permits: ["Forest Clearance", "Environmental Clearance", "Coastal Regulation Zone Clearance"],
        communityConsent: true,
        plantationSpecies: [
            "Rhizophora apiculata",
            "Avicennia marina",
            "Rhizophora mucronata"
        ],
        treeCount: 50000,
        averageHeight: 3, // meters
        averageLength: 2, // meters
        averageBreadth: 1.5, // meters
        seedlings: 50000,
        estimatedCO2Sequestration: 0, // Will be calculated by contract
        baselineData: "Baseline carbon stock: 45 tC/ha",
        monitoringPlan: "Monthly monitoring of tree growth and survival rates",
        validator: "Indian Institute of Forest Management",
        documents: ["QmHash1", "QmHash2", "QmHash3"] // IPFS hashes
    };

    // Convert frontend data to contract structure
    const contractProjectData = {
        // Basic Project Information
        projectId: frontendFormData.projectId,
        projectName: frontendFormData.projectName,
        description: frontendFormData.description,
        ecosystemType: frontendFormData.ecosystemType,
        
        // Organization Information
        organizationName: frontendFormData.organizationName,
        ownerName: frontendFormData.ownerName,
        email: frontendFormData.email,
        phone: frontendFormData.phone,
        
        // Location and Area Information
        location: {
            lat: frontendFormData.location.lat,
            lng: frontendFormData.location.lng,
            fullAddress: frontendFormData.location.address
        },
        area: frontendFormData.area,
        density: frontendFormData.density,
        
        // Project Timeline
        startDate: frontendFormData.startDate,
        duration: frontendFormData.duration,
        
        // Legal and Ownership
        legalOwnership: frontendFormData.legalOwnership,
        permits: frontendFormData.permits,
        communityConsent: frontendFormData.communityConsent,
        
        // Plantation Data
        plantation: {
            species: frontendFormData.plantationSpecies,
            treeCount: frontendFormData.treeCount,
            averageHeight: frontendFormData.averageHeight,
            averageLength: frontendFormData.averageLength,
            averageBreadth: frontendFormData.averageBreadth,
            seedlings: frontendFormData.seedlings,
            estimatedCO2Sequestration: frontendFormData.estimatedCO2Sequestration
        },
        
        // Monitoring and Validation
        baselineData: frontendFormData.baselineData,
        monitoringPlan: frontendFormData.monitoringPlan,
        validator: frontendFormData.validator,
        
        // Documents and Evidence
        documents: frontendFormData.documents,
        
        // Legacy fields (will be set by contract)
        stateUT: "",
        district: "",
        villagePanchayat: "",
        coordinates: "",
        areaHectares: 0,
        speciesPlanted: "",
        plantationDate: 0,
        verificationAgency: "",
        verifiedDate: 0,
        carbonSequestration: 0,
        carbonCredits: 0,
        status: "",
        supportingNGO: "",
        ipfsHash: "",
        projectOwner: ethers.ZeroAddress, // Will be set by contract
        isRetired: false,
        retirementDate: 0,
        retirementReason: ""
    };

    try {
        // Register the project
        console.log("Registering project...");
        const tx = await registry.registerProject(
            contractProjectData,
            "QmMainProjectHash" // Main IPFS hash for project metadata
        );
        
        console.log("Transaction hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("Transaction confirmed in block:", receipt.blockNumber);
        
        // Get the token ID from the event
        const event = receipt.logs.find(log => {
            try {
                const parsed = registry.interface.parseLog(log);
                return parsed.name === "ProjectRegistered";
            } catch (e) {
                return false;
            }
        });
        
        if (event) {
            const parsedEvent = registry.interface.parseLog(event);
            const tokenId = parsedEvent.args.tokenId;
            console.log("Project registered with token ID:", tokenId.toString());
            
            // Get the project data to verify
            const projectData = await registry.getProject(tokenId);
            console.log("Project data:", {
                projectId: projectData.projectId,
                projectName: projectData.projectName,
                ecosystemType: projectData.ecosystemType,
                carbonCredits: projectData.carbonCredits.toString(),
                treeCount: projectData.plantation.treeCount.toString(),
                status: projectData.status
            });
            
            // Calculate CO2 sequestration using the contract function
            const calculatedCO2 = await registry.calculateCO2Sequestration(
                frontendFormData.treeCount,
                frontendFormData.averageHeight,
                frontendFormData.averageLength,
                frontendFormData.averageBreadth,
                frontendFormData.ecosystemType
            );
            console.log("Calculated CO2 sequestration:", calculatedCO2.toString(), "tonnes");
        }
        
    } catch (error) {
        console.error("Error registering project:", error);
    }
}

// Helper function to convert frontend form data to contract format
function convertFrontendToContract(frontendData) {
    return {
        projectId: frontendData.projectId,
        projectName: frontendData.projectName,
        description: frontendData.description,
        ecosystemType: frontendData.ecosystemType,
        organizationName: frontendData.organizationName,
        ownerName: frontendData.ownerName,
        email: frontendData.email,
        phone: frontendData.phone,
        location: {
            lat: frontendData.location.lat,
            lng: frontendData.location.lng,
            fullAddress: frontendData.location.address
        },
        area: frontendData.area,
        density: frontendData.density,
        startDate: frontendData.startDate,
        duration: frontendData.duration,
        legalOwnership: frontendData.legalOwnership,
        permits: frontendData.permits,
        communityConsent: frontendData.communityConsent,
        plantation: {
            species: frontendData.plantationSpecies,
            treeCount: frontendData.treeCount,
            averageHeight: frontendData.averageHeight,
            averageLength: frontendData.averageLength,
            averageBreadth: frontendData.averageBreadth,
            seedlings: frontendData.seedlings,
            estimatedCO2Sequestration: frontendData.estimatedCO2Sequestration
        },
        baselineData: frontendData.baselineData,
        monitoringPlan: frontendData.monitoringPlan,
        validator: frontendData.validator,
        documents: frontendData.documents,
        // Legacy fields will be set by contract
        stateUT: "",
        district: "",
        villagePanchayat: "",
        coordinates: "",
        areaHectares: 0,
        speciesPlanted: "",
        plantationDate: 0,
        verificationAgency: "",
        verifiedDate: 0,
        carbonSequestration: 0,
        carbonCredits: 0,
        status: "",
        supportingNGO: "",
        ipfsHash: "",
        projectOwner: ethers.ZeroAddress,
        isRetired: false,
        retirementDate: 0,
        retirementReason: ""
    };
}

if (require.main === module) {
    registerProjectExample()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { registerProjectExample, convertFrontendToContract };
