const Evidence = require("../models/Evidence");
const Project = require("../models/Project");
const crypto = require("crypto");

// Utility: create SHA256 hash of evidence JSON
function generateHash(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

// Transform raw frontend payload → backend schema
function transformPayload(payload) {
  const ecosystemTypeMap = {
    mangroves: "mangrove",
    seagrass: "seagrass",
    saltMarsh: "salt_marsh",
  };
  const ecosystemType = ecosystemTypeMap[payload.ecosystemType] || payload.ecosystemType;

  // GPS
  const gps = {
    latitude: Number(payload.location?.lat || 0),
    longitude: Number(payload.location?.lng || 0),
    precision: Number(payload.gpsPrecision || 5),
  };

  let mangroveData, seagrassData, saltMarshData;
  if (ecosystemType === "mangrove") {
    mangroveData = {
      species: payload.plantationSpecies || [],
      treeCount: Number(payload.treeCount || 0),
      avgDBHcm: Number(payload.averageBreadth || payload.averageLength || 0),
      avgHeightM: Number(payload.averageHeight || 0),
      seedlingsCount: Number(payload.seedlings || 0),
      soilCarbonContentPercent: payload.soilCarbonContentPercent || undefined,
    };
  } else if (ecosystemType === "seagrass") {
    seagrassData = {
      species: payload.plantationSpecies || [],
      meadowAreaM2: Number(payload.area || 0),
      shootDensity: Number(payload.density || 0),
      biomassKgPerM2: Number(payload.biomass || 0),
      soilCarbonContentPercent: payload.soilCarbonContentPercent || undefined,
    };
  } else if (ecosystemType === "salt_marsh") {
    saltMarshData = {
      species: payload.plantationSpecies || [],
      areaM2: Number(payload.area || 0),
      vegetationHeightM: Number(payload.averageHeight || 0),
      biomassKgPerM2: Number(payload.biomass || 0),
      soilCarbonContentPercent: payload.soilCarbonContentPercent || undefined,
    };
  }

  return {
    projectId: payload.projectId,
    plotId: payload.plotId,
    timestampISO: payload.timestampISO || new Date().toISOString(),
    gps,
    photos: (payload.documents || []).map(doc => doc.name),
    videos: (payload.videos || []).map(video => video.name),
    ecosystemType,
    mangroveData,
    seagrassData,
    saltMarshData,
    soilCores: payload.soilCores || [],
    sensorReadings: payload.sensorReadings || {},
    co2Estimate: Number(payload.estimatedCO2Sequestration || 0),
  };
}

// @desc Submit field evidence for a project
// @route POST /api/evidence
// @access Inspector
exports.submitEvidence = async (req, res) => {
  try {
    const payload = transformPayload(req.body);

    // Check if project exists
    const project = await Project.findById(payload.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Generate hash for immutability
    const evidenceHash = generateHash(payload);

    // Create the evidence document
    const evidence = await Evidence.create({
      ...payload,
      evidenceHash,
      inspector: req.user._id,
    });

    res.status(201).json({
      message: "Evidence submitted successfully",
      data: evidence,
    });
  } catch (error) {
    console.error("Error submitting evidence:", error);
    res.status(500).json({ message: "Server error" });
  }
};
