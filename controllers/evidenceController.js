const Evidence = require("../models/Evidence");
const Project = require("../models/Project");
const crypto = require("crypto");

// Utility: create SHA256 hash of evidence JSON
function generateHash(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

// @desc Submit field evidence for a project
// @route POST /api/evidence
// @access Inspector
exports.submitEvidence = async (req, res) => {
  try {
    const {
      projectId,
      plotId,
      timestampISO,
      gps,
      photos,
      videos,
      ecosystemType,
      mangroveData,
      seagrassData,
      saltMarshData,
      soilCores,
      sensorReadings,
      co2Estimate,
    } = req.body;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Prepare evidence payload to hash (immutable data snapshot)
    const evidencePayload = {
      projectId,
      plotId,
      timestampISO,
      gps,
      ecosystemType,
      mangroveData,
      seagrassData,
      saltMarshData,
      soilCores,
      sensorReadings,
      co2Estimate,
      photos,
      videos,
    };

    // Generate hash for immutability
    const evidenceHash = generateHash(evidencePayload);

    // Create the evidence document
    const evidence = await Evidence.create({
      projectId,
      plotId,
      timestampISO,
      gps,
      photos,
      videos,
      ecosystemType,
      mangroveData,
      seagrassData,
      saltMarshData,
      soilCores,
      sensorReadings,
      co2Estimate,
      evidenceHash,
      inspector: req.user._id, // auth middleware fills this
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
