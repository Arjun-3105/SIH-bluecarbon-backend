const Project = require("../models/Evidence");
const ProjectStamp = require("../models/Project");
const { v4: uuidv4 } = require('uuid');

// Get all projects assigned to the logged-in register/inspector
exports.getAssignedProjects = async (req, res) => {
  try {
    const userId = req.user.id; // from authMiddleware
    let projects;

    if (["Inspector", "Owner"].includes(req.user.role)) {
      projects = await Project.find({ assignedInspector: userId });
    } else {
      return res.status(403).json({ message: "Invalid role for this action." });
    }

    if (!projects || projects.length === 0) {
      return res.status(404).json({ message: "No projects found for your account." });
    }

    res.json({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Server error while fetching projects." });
  }
};

// Register a new project from frontend form
exports.registerProject = async (req, res) => {
  try {
    // Extract all fields except projectId - we'll generate a unique one on the backend
    const {
      projectName,
      description,
      ecosystemType,
      organizationName,
      ownerName,
      ownerAddress,
      email,
      phone,
      area,
      density,
      location,
      startDate,
      duration,
      legalOwnership,
      permits,
      baselineData,
      monitoringPlan,
      validator,
      communityConsent,
      documents,
      plantationSpecies,
      treeCount,
      averageHeight,
      averageLength,
      averageBreadth,
      seedlings,
      estimatedCO2Sequestration,
      verifierRewardAmount,  // Required: Amount of blue carbon tokens to mint to verifier on approval
      // Explicitly ignore projectId from frontend - we generate it on backend
      projectId: _ignoredProjectId,
      Project_ID: _ignoredProject_ID
    } = req.body;

    // Generate unique project ID - always generate a new one on the backend
    // Ignore any projectId from the frontend to ensure uniqueness
    let projectId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Generate a unique project ID, checking for collisions
    while (!isUnique && attempts < maxAttempts) {
      const timestamp = Date.now();
      const randomPart = uuidv4().substring(0, 8);
      projectId = `PROJ_${timestamp}_${randomPart}`;
      
      // Check if this projectId already exists in either Project or ProjectStamp
      const existingProject = await Project.findOne({ 
        $or: [
          { projectId: projectId },
          { Project_ID: projectId }
        ]
      });
      const existingStamp = await ProjectStamp.findOne({ projectId: projectId });
      
      if (!existingProject && !existingStamp) {
        isUnique = true;
      } else {
        attempts++;
        // Add a small delay to ensure timestamp changes
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate a unique project ID. Please try again.'
      });
    }
    
    console.log(`✅ Generated unique project ID: ${projectId} (attempts: ${attempts + 1})`);

    // Require owner wallet address to be present and valid
    if (!ownerAddress || typeof ownerAddress !== 'string' || ownerAddress.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ownerAddress (wallet) is required and must be a valid non-empty string for project registration.'
      });
    }

    // Require verifierRewardAmount to be present
    if (verifierRewardAmount === undefined || verifierRewardAmount === null || verifierRewardAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'verifierRewardAmount is required and must be a non-negative number for project registration.'
      });
    }

    // Create new project
    const project = new Project({
      // Legacy fields for compatibility
      name: projectName,
      location: location?.address || `${location?.lat}, ${location?.lng}`,
      area: parseFloat(area) || 0,
      method: ecosystemType,
      status: "Pending",
      createdBy: req.user.id,

      // Project ID fields (both formats for compatibility)
      projectId: projectId, // Used by Evidence model and getAllProjectsID endpoint
      Project_ID: projectId, // Used by legacy fields
      Project_Name: projectName,
      Ecosystem_Type: ecosystemType,
      State_UT: location?.stateUT || '',
      District: location?.district || '',
      Village_Coastal_Panchayat: location?.villagePanchayat || '',
      Latitude_Longitude: `${location?.lat}, ${location?.lng}`,
      Area_Hectares: parseFloat(area) || 0,
      Species_Planted: plantationSpecies?.join(', ') || '',
      Plantation_Date: new Date(startDate),
      Verification_Agency: validator || '',
      Verified_Date: null,
      Carbon_Sequestration_tCO2: estimatedCO2Sequestration || 0,
      Carbon_Credits_Issued: 0, // Will be set after verification
      Supporting_NGO_Community: organizationName,

      // Owner wallet address (required - provided by frontend via MetaMask)
      ownerWalletAddress: ownerAddress,

      // Additional metadata
      metadata: {
        description,
        ownerName,
        ownerAddress,
        email,
        phone,
        density,
        duration,
        legalOwnership,
        permits,
        baselineData,
        monitoringPlan,
        communityConsent,
        documents,
        treeCount,
        averageHeight,
        averageLength,
        averageBreadth,
        seedlings,
        verifierRewardAmount  // Store verifier reward amount
      },

      // Blockchain fields (initially empty)
      blockchain: {
        isRegistered: false,
        isRetired: false
      }
    });

    await project.save();

    // Create a ProjectStamp so the project appears in verifier dashboard
    // This links the Evidence document to the ProjectStamp tracking system
    try {
      // Validate required fields before creating ProjectStamp
      if (!ownerAddress || typeof ownerAddress !== 'string' || ownerAddress.trim().length === 0) {
        console.error(`Error: Cannot create ProjectStamp - ownerAddress is missing or invalid for project ${projectId}`);
        throw new Error('Owner wallet address is required for ProjectStamp creation');
      }

      if (!req.user || !req.user.id) {
        console.error(`Error: Cannot create ProjectStamp - user ID is missing for project ${projectId}`);
        throw new Error('User ID is required for ProjectStamp creation');
      }

      console.log(`Creating ProjectStamp for project ${projectId} with owner ${req.user.id} and wallet ${ownerAddress.trim()}`);

      // Use findOneAndUpdate with upsert to create or update ProjectStamp
      const projectStamp = await ProjectStamp.findOneAndUpdate(
        { projectId: projectId },
        {
          $set: {
            projectId: projectId,
            ownerId: req.user.id,
            ownerWalletAddress: ownerAddress.trim(),
            status: "Pending"
          },
          $setOnInsert: {
            assignedInspector: null // Will be assigned later by admin/verifier
          }
        },
        {
          new: true,
          upsert: true, // Create if doesn't exist, update if exists
          setDefaultsOnInsert: true,
          runValidators: true
        }
      );
      
      // Verify the ProjectStamp was created/updated
      if (projectStamp && projectStamp._id) {
        console.log(`✅ ProjectStamp created/updated successfully for project ${projectId}`);
        console.log(`   - ProjectStamp ID: ${projectStamp._id}`);
        console.log(`   - Owner ID: ${projectStamp.ownerId}`);
        console.log(`   - Owner Wallet: ${projectStamp.ownerWalletAddress}`);
        console.log(`   - Status: ${projectStamp.status}`);
        
        // Double-check by querying the database
        const verifyStamp = await ProjectStamp.findById(projectStamp._id);
        if (verifyStamp) {
          console.log(`✅ Verified: ProjectStamp exists in database with ID ${verifyStamp._id}`);
        } else {
          console.error(`❌ Warning: ProjectStamp was created but cannot be found in database`);
        }
      } else {
        console.error(`❌ ProjectStamp creation failed - no _id returned for project ${projectId}`);
      }
    } catch (stampError) {
      // Log the full error for debugging
      console.error(`❌ Error creating/updating ProjectStamp for ${projectId}:`, {
        message: stampError.message,
        stack: stampError.stack,
        name: stampError.name,
        errors: stampError.errors,
        ownerAddress: ownerAddress,
        userId: req.user?.id
      });
      // Don't fail the entire registration, but log the error clearly
    }

    res.status(201).json({
      success: true,
      message: "Project registered successfully and is pending verification.",
      project: {
        id: project._id,
        projectId: projectId, // Return the generated unique project ID
        Project_ID: project.Project_ID, // Also include for backward compatibility
        name: project.Project_Name,
        status: project.status,
        ecosystemType: project.Ecosystem_Type,
        area: project.Area_Hectares,
        createdAt: project.createdAt
      }
    });

  } catch (error) {
    console.error("Error registering project:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while registering project." 
    });
  }
};

// Fetch a single project by id
exports.getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ projectId })
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }
    res.json({ 
      success: true, 
      project 
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Server error while fetching project." });
  }
};

// Get all projects for the logged-in user
exports.getUserProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await Project.find({ createdBy: userId })
      .populate('assignedInspector', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      projects,
      count: projects.length
    });
  } catch (error) {
    console.error("Error fetching user projects:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching projects." 
    });
  }
};

// Get all projects (Admin/Verifier only)
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find() // if you want to include user details
      .lean();

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
    });
  }
};

exports.getAllProjectsID = async (req, res) => {
  try {
    // Get all pending ProjectStamps
    const pendingStamps = await ProjectStamp.find({ status: "Pending" })
      .select("projectId ownerId assignedInspector status createdAt updatedAt ownerWalletAddress")
      .lean();

    // Also find Evidence documents with "Pending" or "PENDING" status that might not have ProjectStamps yet
    const pendingEvidence = await Project.find({
      $or: [
        { status: "Pending" },
        { status: "PENDING" }
      ],
      projectId: { $exists: true, $ne: null }
    })
      .select("projectId timestampISO gps photos videos ecosystemType soilCores co2Estimate evidenceHash status submittedAt inspector ownerWalletAddress createdBy")
      .lean();

    // Create a map of projectIds from ProjectStamps
    const stampProjectIds = new Set(pendingStamps.map(stamp => stamp.projectId).filter(Boolean));
    
    // Find Evidence documents that don't have a ProjectStamp yet
    const evidenceWithoutStamps = pendingEvidence.filter(ev => 
      ev.projectId && !stampProjectIds.has(ev.projectId)
    );

    // Create ProjectStamp-like objects for Evidence documents without stamps
    const virtualStamps = evidenceWithoutStamps.map(ev => ({
      _id: ev._id,
      projectId: ev.projectId,
      ownerId: ev.createdBy,
      ownerWalletAddress: ev.ownerWalletAddress,
      status: "Pending",
      assignedInspector: null,
      createdAt: ev.submittedAt || ev.createdAt,
      updatedAt: ev.updatedAt || ev.createdAt
    }));

    // Combine actual stamps and virtual stamps
    const allStamps = [...pendingStamps, ...virtualStamps];

    if (allStamps.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // Get all projectIds
    const allProjectIds = allStamps
      .map((stamp) => stamp.projectId)
      .filter(Boolean);

    // Fetch all Evidence documents for these projectIds
    const evidenceDocs = await Project.find(
      { 
        $or: [
          { projectId: { $in: allProjectIds } },
          { Project_ID: { $in: allProjectIds } }
        ]
      },
      "projectId Project_ID timestampISO gps photos videos ecosystemType soilCores co2Estimate evidenceHash status submittedAt inspector"
    )
      .lean();

    // Create evidence map (check both projectId and Project_ID)
    const evidenceMap = new Map();
    evidenceDocs.forEach(doc => {
      const id = doc.projectId || doc.Project_ID;
      if (id) {
        evidenceMap.set(id, doc);
      }
    });

    // Enrich stamps with evidence data
    const enriched = allStamps.map((stamp) => {
      const evidence = evidenceMap.get(stamp.projectId) || null;
      const ipfs = (evidence?.photos || []).map((hash) => ({
        hash,
        gateways: {
          ipfs: `https://ipfs.io/ipfs/${hash}`,
          pinata: `https://gateway.pinata.cloud/ipfs/${hash}`,
          cloudflare: `https://cloudflare-ipfs.com/ipfs/${hash}`,
        },
      }));

      return {
        ...stamp,
        evidence,
        ipfs,
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
    });
  }
};

