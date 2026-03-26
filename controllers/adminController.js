/**
 * Admin Controller
 * Handles admin-specific operations
 */

const Project = require('../models/Evidence'); // This is the actual Project model
const ProjectStamp = require('../models/Project'); // This is ProjectStamp
const Verification = require('../models/Verification');
const blockchainService = require('../utils/blockchainService');

/**
 * Get all pending projects for admin
 */
exports.getPendingProjects = async (req, res) => {
  try {
    // Get pending projects from ProjectStamp
    const pendingStamps = await ProjectStamp.find({ status: "Pending" })
      .populate('ownerId', 'name email')
      .populate('assignedInspector', 'name email')
      .select("projectId ownerId assignedInspector status createdAt updatedAt ownerWalletAddress")
      .lean();

    // Get evidence for these projects
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

    // Enrich with evidence data
    const enriched = pendingStamps.map((stamp) => {
      const evidence = evidenceMap.get(stamp.projectId) || null;
      return {
        _id: stamp._id,
        projectId: stamp.projectId,
        ownerId: stamp.ownerId,
        assignedInspector: stamp.assignedInspector,
        status: stamp.status,
        createdAt: stamp.createdAt,
        updatedAt: stamp.updatedAt,
        ownerWalletAddress: stamp.ownerWalletAddress,
        evidence: evidence
      };
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};