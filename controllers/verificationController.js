const Project = require("../models/Project");
const Verification = require("../models/Verification");
const blockchainService = require("../utils/blockchainService");

// Get all projects pending verification
exports.getPendingVerifications = async (req, res) => {
  try {
    const projects = await Project.find({ status: "Pending" })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      projects,
      count: projects.length 
    });
  } catch (error) {
    console.error("Error fetching pending verifications:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching pending verifications." 
    });
  }
};

// Get verification details for a specific project
exports.getVerificationDetails = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const project = await Project.findById(projectId)
      .populate('createdBy', 'name email phone')
      .populate('assignedInspector', 'name email');

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found." 
      });
    }

    // Get existing verification if any
    const verification = await Verification.findOne({ projectId })
      .populate('verifier', 'name email');

    res.json({ 
      success: true, 
      project,
      verification 
    });
  } catch (error) {
    console.error("Error fetching verification details:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching verification details." 
    });
  }
};

// Approve a project and register it on blockchain
exports.approveProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      comments, 
      gps, 
      mangroveData, 
      seagrassData, 
      saltMarshData, 
      soilCores, 
      sensorReadings, 
      co2Estimate,
      photos,
      videos,
      evidenceHash 
    } = req.body;

    const verifierId = req.user.id; // from authMiddleware

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found." 
      });
    }

    if (project.status !== "Pending") {
      return res.status(400).json({ 
        success: false, 
        message: "Project is not in pending status." 
      });
    }

    // Create verification record
    const verification = new Verification({
      projectId,
      status: "Approved",
      comments,
      verifier: verifierId,
      gps,
      mangroveData,
      seagrassData,
      saltMarshData,
      soilCores,
      sensorReadings,
      co2Estimate,
      photos,
      videos,
      evidenceHash,
      verifiedAt: new Date()
    });

    await verification.save();

    // Update project status to verified
    project.status = "Verified";
    project.Verification_Agency = req.user.name || req.user.email;
    project.Verified_Date = new Date();
    project.Carbon_Sequestration_tCO2 = co2Estimate || project.estimatedCO2Sequestration || 0;
    project.Carbon_Credits_Issued = Math.floor(co2Estimate || project.estimatedCO2Sequestration || 0);

    // Prepare project data for blockchain registration
    const projectData = {
      projectId: project.Project_ID || `PROJ_${project._id}`,
      projectName: project.Project_Name || project.name,
      description: project.description || '',
      ecosystemType: project.Ecosystem_Type || project.ecosystemType,
      organizationName: project.organizationName || '',
      ownerName: project.ownerName || project.createdBy?.name || '',
      email: project.email || project.createdBy?.email || '',
      phone: project.phone || '',
      area: project.Area_Hectares?.toString() || project.area?.toString() || '',
      density: project.density || '',
      location: {
        lat: project.Latitude_Longitude?.split(',')[0] || '',
        lng: project.Latitude_Longitude?.split(',')[1] || '',
        address: project.location || '',
        stateUT: project.State_UT || '',
        district: project.District || '',
        villagePanchayat: project.Village_Coastal_Panchayat || ''
      },
      startDate: project.Plantation_Date || project.startDate || new Date(),
      duration: project.duration || '',
      legalOwnership: project.legalOwnership || '',
      permits: project.permits || [],
      baselineData: project.baselineData || '',
      monitoringPlan: project.monitoringPlan || '',
      validator: project.Verification_Agency || req.user.name,
      communityConsent: project.communityConsent || true,
      documents: project.documents || [],
      plantationSpecies: project.Species_Planted?.split(',') || project.plantationSpecies || [],
      treeCount: project.treeCount || '',
      averageHeight: project.averageHeight || '',
      averageLength: project.averageLength || '',
      averageBreadth: project.averageBreadth || '',
      seedlings: project.seedlings || '',
      estimatedCO2Sequestration: co2Estimate || project.estimatedCO2Sequestration || 0
    };

    try {
      // Register project on blockchain
      const blockchainResult = await blockchainService.registerProject(projectData);

      // Update project with blockchain information
      project.blockchain = {
        tokenId: blockchainResult.tokenId,
        contractAddress: process.env.CONTRACT_ADDRESS,
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        ipfsHash: blockchainResult.ipfsHash,
        isRegistered: true,
        lastBlockchainUpdate: new Date()
      };

      await project.save();

      res.json({
        success: true,
        message: "Project approved and registered on blockchain successfully.",
        verification,
        blockchainResult,
        project: {
          id: project._id,
          status: project.status,
          blockchain: project.blockchain
        }
      });

    } catch (blockchainError) {
      console.error("Blockchain registration failed:", blockchainError);
      
      // Still save the verification but mark blockchain registration as failed
      project.status = "Verified";
      project.blockchain = {
        isRegistered: false,
        registrationError: blockchainError.message,
        lastBlockchainUpdate: new Date()
      };
      await project.save();

      res.status(500).json({
        success: false,
        message: "Project approved but blockchain registration failed. Please retry blockchain registration.",
        verification,
        blockchainError: blockchainError.message,
        project: {
          id: project._id,
          status: project.status
        }
      });
    }

  } catch (error) {
    console.error("Error approving project:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while approving project." 
    });
  }
};

// Reject a project
exports.rejectProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { comments, reason } = req.body;
    const verifierId = req.user.id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found." 
      });
    }

    if (project.status !== "Pending") {
      return res.status(400).json({ 
        success: false, 
        message: "Project is not in pending status." 
      });
    }

    // Create verification record
    const verification = new Verification({
      projectId,
      status: "Rejected",
      comments: comments || reason,
      verifier: verifierId,
      verifiedAt: new Date()
    });

    await verification.save();

    // Update project status
    project.status = "Rejected";
    project.Verification_Agency = req.user.name || req.user.email;
    project.Verified_Date = new Date();

    await project.save();

    res.json({
      success: true,
      message: "Project rejected successfully.",
      verification,
      project: {
        id: project._id,
        status: project.status
      }
    });

  } catch (error) {
    console.error("Error rejecting project:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while rejecting project." 
    });
  }
};

// Retry blockchain registration for a verified project
exports.retryBlockchainRegistration = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found." 
      });
    }

    if (project.status !== "Verified") {
      return res.status(400).json({ 
        success: false, 
        message: "Project must be verified to register on blockchain." 
      });
    }

    if (project.blockchain?.isRegistered) {
      return res.status(400).json({ 
        success: false, 
        message: "Project is already registered on blockchain." 
      });
    }

    // Prepare project data for blockchain registration
    const projectData = {
      projectId: project.Project_ID || `PROJ_${project._id}`,
      projectName: project.Project_Name || project.name,
      description: project.description || '',
      ecosystemType: project.Ecosystem_Type || project.ecosystemType,
      organizationName: project.organizationName || '',
      ownerName: project.ownerName || project.createdBy?.name || '',
      email: project.email || project.createdBy?.email || '',
      phone: project.phone || '',
      area: project.Area_Hectares?.toString() || project.area?.toString() || '',
      density: project.density || '',
      location: {
        lat: project.Latitude_Longitude?.split(',')[0] || '',
        lng: project.Latitude_Longitude?.split(',')[1] || '',
        address: project.location || '',
        stateUT: project.State_UT || '',
        district: project.District || '',
        villagePanchayat: project.Village_Coastal_Panchayat || ''
      },
      startDate: project.Plantation_Date || project.startDate || new Date(),
      duration: project.duration || '',
      legalOwnership: project.legalOwnership || '',
      permits: project.permits || [],
      baselineData: project.baselineData || '',
      monitoringPlan: project.monitoringPlan || '',
      validator: project.Verification_Agency || '',
      communityConsent: project.communityConsent || true,
      documents: project.documents || [],
      plantationSpecies: project.Species_Planted?.split(',') || project.plantationSpecies || [],
      treeCount: project.treeCount || '',
      averageHeight: project.averageHeight || '',
      averageLength: project.averageLength || '',
      averageBreadth: project.averageBreadth || '',
      seedlings: project.seedlings || '',
      estimatedCO2Sequestration: project.Carbon_Sequestration_tCO2 || project.estimatedCO2Sequestration || 0
    };

    try {
      // Register project on blockchain
      const blockchainResult = await blockchainService.registerProject(projectData);

      // Update project with blockchain information
      project.blockchain = {
        tokenId: blockchainResult.tokenId,
        contractAddress: process.env.CONTRACT_ADDRESS,
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        ipfsHash: blockchainResult.ipfsHash,
        isRegistered: true,
        lastBlockchainUpdate: new Date()
      };

      await project.save();

      res.json({
        success: true,
        message: "Project registered on blockchain successfully.",
        blockchainResult,
        project: {
          id: project._id,
          status: project.status,
          blockchain: project.blockchain
        }
      });

    } catch (blockchainError) {
      console.error("Blockchain registration failed:", blockchainError);
      
      // Update blockchain registration error
      project.blockchain = {
        ...project.blockchain,
        isRegistered: false,
        registrationError: blockchainError.message,
        lastBlockchainUpdate: new Date()
      };
      await project.save();

      res.status(500).json({
        success: false,
        message: "Blockchain registration failed. Please try again.",
        blockchainError: blockchainError.message,
        project: {
          id: project._id,
          status: project.status
        }
      });
    }

  } catch (error) {
    console.error("Error retrying blockchain registration:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while retrying blockchain registration." 
    });
  }
};

// Get verification history for a project
exports.getVerificationHistory = async (req, res) => {
  try {
    const { projectId } = req.params;

    const verifications = await Verification.find({ projectId })
      .populate('verifier', 'name email')
      .sort({ verifiedAt: -1 });

    res.json({
      success: true,
      verifications,
      count: verifications.length
    });
  } catch (error) {
    console.error("Error fetching verification history:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching verification history." 
    });
  }
};

// Get all verified projects
exports.getVerifiedProjects = async (req, res) => {
  try {
    const projects = await Project.find({ status: "Verified" })
      .populate('createdBy', 'name email')
      .populate('assignedInspector', 'name email')
      .sort({ Verified_Date: -1 });

    res.json({ 
      success: true, 
      projects,
      count: projects.length 
    });
  } catch (error) {
    console.error("Error fetching verified projects:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching verified projects." 
    });
  }
};
