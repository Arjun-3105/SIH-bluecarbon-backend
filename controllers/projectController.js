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
    const {
      projectName,
      description,
      ecosystemType,
      organizationName,
      ownerName,
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
      estimatedCO2Sequestration
    } = req.body;

    // Generate unique project ID
    const projectId = `PROJ_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Create new project
    const project = new Project({
      // Legacy fields for compatibility
      name: projectName,
      location: location?.address || `${location?.lat}, ${location?.lng}`,
      area: parseFloat(area) || 0,
      method: ecosystemType,
      status: "Pending",
      createdBy: req.user.id,

      // New structured fields
      Project_ID: projectId,
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

      // Additional metadata
      metadata: {
        description,
        ownerName,
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
        seedlings
      },

      // Blockchain fields (initially empty)
      blockchain: {
        isRegistered: false,
        isRetired: false
      }
    });

    await project.save();

    res.status(201).json({
      success: true,
      message: "Project registered successfully and is pending verification.",
      project: {
        id: project._id,
        projectId: project.Project_ID,
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
    const pendingStamps = await ProjectStamp.find({ status: "Pending" })
      .select("projectId ownerId assignedInspector status createdAt updatedAt")
      .lean();

    if (pendingStamps.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const projectIds = pendingStamps
      .map((stamp) => stamp.projectId)
      .filter(Boolean);

    const evidenceDocs = await Project.find(
      { projectId: { $in: projectIds } },
      "projectId timestampISO gps photos videos ecosystemType soilCores co2Estimate evidenceHash status submittedAt inspector"
    )
      .lean();

    const evidenceMap = new Map(
      evidenceDocs.map((doc) => [doc.projectId, doc])
    );

    const enriched = pendingStamps.map((stamp) => {
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

