const Project = require("../models/Evidence"); // Evidence model contains the actual project data
const ProjectStamp = require("../models/Project"); // ProjectStamp is the tracking model
const Verification = require("../models/Verification");
const User = require("../models/User");
const blockchainService = require("../utils/blockchainService");

// Get all projects pending verification
exports.getPendingVerifications = async (req, res) => {
  try {
    // Find projects with either "Pending" or "PENDING" status
    const projects = await Project.find({ 
      $or: [
        { status: "Pending" },
        { status: "PENDING" }
      ]
    })
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

    // Find the project - try by _id first (Evidence document), then by projectId string, then by Project_ID
    let project = null;
    
    // Check if projectId is a valid MongoDB ObjectId
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      // Try finding in Evidence model (actual project data)
      project = await Project.findById(projectId);
    }
    
    // If not found by _id, try finding by projectId string field (Evidence model)
    if (!project) {
      project = await Project.findOne({ projectId: projectId });
    }
    
    // If still not found, try finding by Project_ID field (for projects created via registerProject)
    if (!project) {
      project = await Project.findOne({ Project_ID: projectId });
    }
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: `Project not found with ID: ${projectId}. Please check the project ID and try again.` 
      });
    }

    // Check status - Evidence model uses "PENDING", but projects created via registerProject use "Pending"
    const isPending = project.status === "Pending" || project.status === "PENDING";
    if (!isPending) {
      return res.status(400).json({ 
        success: false, 
        message: `Project is not in pending status. Current status: ${project.status}` 
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

    // Update project status to Approved/Verified
    // Use "APPROVED" for Evidence model, but keep "Approved" for backward compatibility
    project.status = project.status === "PENDING" ? "APPROVED" : "Approved"; // Mark as approved
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

    // Attach owner wallet address - REQUIRED for minting tokens to owner
    const ownerAddress = project.ownerWalletAddress || project.metadata?.ownerAddress;
    if (!ownerAddress) {
      return res.status(400).json({
        success: false,
        message: "Project owner wallet address is required. Cannot register project on blockchain without owner address."
      });
    }
    projectData.ownerAddress = ownerAddress;

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

      // Enrich blockchain info: tokenURI and ERC20 balance for owner (optional)
      try {
        const tokenUri = await blockchainService.getTokenURI(blockchainResult.tokenId);
        project.blockchain.tokenURI = tokenUri;
      } catch (e) {
        console.warn('Failed to fetch tokenURI:', e.message || e);
      }

      try {
        const ownerAddr = projectData.ownerAddress || project.ownerWalletAddress || project.createdBy;
        if (ownerAddr) {
          const erc20Balance = await blockchainService.getERC20Balance(ownerAddr);
          project.blockchain.ownerAddress = ownerAddr;
          project.blockchain.erc20Balance = erc20Balance;
        }
      } catch (e) {
        console.warn('Failed to fetch ERC20 balance:', e.message || e);
      }

      await project.save();

      // Mint blue carbon tokens to verifier as reward
      let verifierRewardResult = null;
      try {
        // Get verifier's wallet address
        const verifier = await User.findById(verifierId);
        if (!verifier || !verifier.walletAddress) {
          console.warn('Verifier wallet address not found. Skipping verifier reward minting.');
        } else {
          // Get verifierRewardAmount from project metadata
          const verifierRewardAmount = project.metadata?.verifierRewardAmount || 0;
          
          if (verifierRewardAmount > 0) {
            console.log(`Minting ${verifierRewardAmount} tokens to verifier ${verifier.walletAddress}`);
            verifierRewardResult = await blockchainService.mintVerifierReward(
              blockchainResult.tokenId,
              verifier.walletAddress,
              verifierRewardAmount
            );
            console.log('Verifier reward minted successfully:', verifierRewardResult);
          } else {
            console.warn('Verifier reward amount is 0 or not set. Skipping verifier reward minting.');
          }
        }
      } catch (verifierRewardError) {
        console.error('Failed to mint verifier reward:', verifierRewardError);
        // Don't fail the entire approval if verifier reward minting fails
        // The project is already registered and NFT is minted
      }

      res.json({
        success: true,
        message: `Project approved and registered on blockchain successfully. NFT minted to owner (${ownerAddress}). ${project.Carbon_Credits_Issued} BCARB tokens minted to owner.`,
        verification,
        blockchainResult,
        verifierReward: verifierRewardResult,
        ownerReward: {
          address: ownerAddress,
          tokensMinted: project.Carbon_Credits_Issued,
          nftTokenId: blockchainResult.tokenId
        },
        project: {
          id: project._id,
          status: project.status,
          blockchain: project.blockchain
        }
      });

    } catch (blockchainError) {
      console.error("Blockchain registration failed:", blockchainError);
      
      // Still save the verification but mark blockchain registration as failed
      // Use "APPROVED" for Evidence model (which is what Project refers to)
      project.status = "APPROVED";
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

    // Check if project is approved (Evidence model uses "APPROVED", not "Verified")
    if (project.status !== "APPROVED" && project.status !== "Approved") {
      return res.status(400).json({ 
        success: false, 
        message: "Project must be approved/verified to register on blockchain." 
      });
    }

    if (project.blockchain?.isRegistered) {
      return res.status(400).json({ 
        success: false, 
        message: "Project is already registered on blockchain." 
      });
    }

    // Attach owner wallet address - REQUIRED for minting tokens to owner
    const ownerAddress = project.ownerWalletAddress || project.metadata?.ownerAddress;
    if (!ownerAddress || typeof ownerAddress !== 'string' || ownerAddress.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project owner wallet address is required. Cannot register project on blockchain without owner address."
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
      estimatedCO2Sequestration: project.Carbon_Sequestration_tCO2 || project.estimatedCO2Sequestration || 0,
      ownerAddress: ownerAddress  // Set owner address for blockchain registration
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
    // Evidence model uses "APPROVED", but also check for "Approved" for backward compatibility
    const projects = await Project.find({ 
      $or: [
        { status: "APPROVED" },
        { status: "Approved" }
      ]
    })
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

// Get all pending evidence for verification
exports.getPendingEvidence = async (req, res) => {
  try {
    const Evidence = require("../models/Evidence");
    
    const pendingEvidence = await Evidence.find({ status: "PENDING" })
      .populate('inspector', 'name email')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      evidence: pendingEvidence,
      count: pendingEvidence.length
    });
  } catch (error) {
    console.error("Error fetching pending evidence:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching pending evidence"
    });
  }
};

// Submit verification for evidence (new endpoint for verifiers)
exports.submitVerification = async (req, res) => {
  try {
    const { 
      evidenceId,
      projectId,
      status, // "APPROVED" or "REJECTED"
      comments,
      gps,
      ecosystemType,
      soilCores,
      co2Estimate,
      photos,
      videos,
      evidenceHash
    } = req.body;

    const verifierId = req.user.id;

    // Validate required fields
    if (!evidenceId || !status || !evidenceHash) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: evidenceId, status, and evidenceHash are required"
      });
    }

    // Find the evidence
    const Evidence = require("../models/Evidence");
    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: "Evidence not found"
      });
    }

    // Check if evidence is already verified
    if (evidence.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Evidence has already been verified"
      });
    }

    // Create verification record
    const verification = new Verification({
      projectId: evidence.projectId,
      evidenceId: evidenceId,
      status: status === "APPROVED" ? "Approved" : "Rejected",
      comments,
      verifier: verifierId,
      gps: gps || evidence.gps,
      ecosystemType: ecosystemType || evidence.ecosystemType,
      soilCores: soilCores || evidence.soilCores,
      co2Estimate: co2Estimate || evidence.co2Estimate,
      photos: photos || evidence.photos,
      videos: videos || evidence.videos,
      evidenceHash,
      verifiedAt: new Date()
    });

    await verification.save();

    // Update evidence status
    evidence.status = status;
    evidence.verifiedAt = new Date();
    evidence.verifier = verifierId;
    await evidence.save();

    // If approved, register minimal data on blockchain
    if (status === "APPROVED") {
      try {
        // Prepare minimal data for blockchain storage
        const minimalProjectData = {
          projectId: evidence.projectId || `EVIDENCE_${evidenceId}`,
          projectName: `Verified ${ecosystemType || evidence.ecosystemType} Project`,
          ecosystemType: ecosystemType || evidence.ecosystemType,
          location: {
            stateUT: "Unknown", // Could be extracted from GPS if needed
            district: "Unknown",
            villagePanchayat: "Unknown"
          },
          estimatedCO2Sequestration: co2Estimate || evidence.co2Estimate || 0
        };

        // Register on blockchain with minimal data
        const blockchainResult = await blockchainService.registerProject(minimalProjectData);

        // Update verification with blockchain info
        verification.blockchain = {
          tokenId: blockchainResult.tokenId,
          transactionHash: blockchainResult.transactionHash,
          blockNumber: blockchainResult.blockNumber,
          ipfsHash: blockchainResult.ipfsHash,
          isRegistered: true
        };
        await verification.save();

        res.json({
          success: true,
          message: "Evidence verified and registered on blockchain successfully",
          verification,
          blockchainResult,
          evidence: {
            id: evidence._id,
            status: evidence.status,
            verifiedAt: evidence.verifiedAt
          }
        });

      } catch (blockchainError) {
        console.error("Blockchain registration failed:", blockchainError);
        
        // Still save verification but mark blockchain registration as failed
        verification.blockchain = {
          isRegistered: false,
          registrationError: blockchainError.message
        };
        await verification.save();

        res.status(500).json({
          success: false,
          message: "Evidence verified but blockchain registration failed. Please retry blockchain registration.",
          verification,
          blockchainError: blockchainError.message,
          evidence: {
            id: evidence._id,
            status: evidence.status,
            verifiedAt: evidence.verifiedAt
          }
        });
      }
    } else {
      // For rejected evidence, just save verification
      res.json({
        success: true,
        message: "Evidence verification completed (rejected)",
        verification,
        evidence: {
          id: evidence._id,
          status: evidence.status,
          verifiedAt: evidence.verifiedAt
        }
      });
    }

  } catch (error) {
    console.error("Error submitting verification:", error);
    res.status(500).json({
      success: false,
      message: "Server error while submitting verification"
    });
  }
};