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
        ownerWalletAddress: stamp.ownerWalletAddress,
        assignedInspector: stamp.assignedInspector,
        status: stamp.status,
        createdAt: stamp.createdAt,
        updatedAt: stamp.updatedAt,
        evidence: evidence,
        ownerName: stamp.ownerId?.name || 'Unknown',
        ownerEmail: stamp.ownerId?.email || 'Unknown'
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (error) {
    console.error('Error fetching pending projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending projects',
      error: error.message
    });
  }
};

/**
 * Get all approved projects with minting details
 */
exports.getApprovedProjects = async (req, res) => {
  try {
    // Get approved/verified projects
    const approvedProjects = await Project.find({ 
      status: { $in: ["Approved", "Verified"] }
    })
      .populate('createdBy', 'name email')
      .sort({ Verified_Date: -1, createdAt: -1 })
      .lean();

    // Enrich with blockchain and minting information
    const enrichedProjects = await Promise.all(
      approvedProjects.map(async (project) => {
        const mintingInfo = {
          nftMinted: false,
          nftTokenId: null,
          tokensMinted: 0,
          tokensMintedTo: null,
          verifierRewardMinted: false,
          verifierRewardAmount: 0,
          verifierRewardTo: null,
          transactionHash: null,
          blockNumber: null,
          mintedAt: null
        };

        // Check if project is registered on blockchain
        if (project.blockchain && project.blockchain.isRegistered) {
          mintingInfo.nftMinted = true;
          mintingInfo.nftTokenId = project.blockchain.tokenId;
          mintingInfo.transactionHash = project.blockchain.transactionHash;
          mintingInfo.blockNumber = project.blockchain.blockNumber;
          mintingInfo.mintedAt = project.blockchain.lastBlockchainUpdate || project.Verified_Date;

          // Get owner address
          const ownerAddress = project.ownerWalletAddress || 
                              project.metadata?.ownerAddress || 
                              project.blockchain.ownerAddress;

          if (ownerAddress) {
            mintingInfo.tokensMintedTo = ownerAddress;
            mintingInfo.tokensMinted = project.Carbon_Credits_Issued || 
                                      project.Carbon_Sequestration_tCO2 || 
                                      0;
          }

          // Check for verifier reward
          const verifierRewardAmount = project.metadata?.verifierRewardAmount || 0;
          if (verifierRewardAmount > 0) {
            mintingInfo.verifierRewardMinted = true;
            mintingInfo.verifierRewardAmount = verifierRewardAmount;
            
            // Try to get verifier address from verification record
            const verification = await Verification.findOne({ projectId: project._id })
              .populate('verifier', 'walletAddress')
              .lean();
            
            if (verification?.verifier?.walletAddress) {
              mintingInfo.verifierRewardTo = verification.verifier.walletAddress;
            }
          }

          // Try to get actual token balance from blockchain if owner address exists
          if (ownerAddress) {
            try {
              const balance = await blockchainService.getERC20Balance(ownerAddress);
              mintingInfo.currentTokenBalance = parseFloat(balance);
            } catch (e) {
              console.warn(`Could not fetch balance for ${ownerAddress}:`, e.message);
            }
          }
        }

        return {
          _id: project._id,
          Project_ID: project.Project_ID,
          Project_Name: project.Project_Name || project.name,
          Ecosystem_Type: project.Ecosystem_Type || project.ecosystemType,
          status: project.status,
          Carbon_Sequestration_tCO2: project.Carbon_Sequestration_tCO2 || 0,
          Carbon_Credits_Issued: project.Carbon_Credits_Issued || 0,
          Verified_Date: project.Verified_Date,
          Verification_Agency: project.Verification_Agency,
          ownerWalletAddress: project.ownerWalletAddress || project.metadata?.ownerAddress,
          createdBy: project.createdBy,
          blockchain: project.blockchain,
          mintingInfo: mintingInfo
        };
      })
    );

    res.json({
      success: true,
      count: enrichedProjects.length,
      data: enrichedProjects
    });
  } catch (error) {
    console.error('Error fetching approved projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approved projects',
      error: error.message
    });
  }
};

/**
 * Get admin dashboard statistics
 */
exports.getAdminStatistics = async (req, res) => {
  try {
    const [pendingCount, approvedCount, totalProjects] = await Promise.all([
      ProjectStamp.countDocuments({ status: "Pending" }),
      Project.countDocuments({ status: { $in: ["Approved", "Verified"] } }),
      Project.countDocuments({})
    ]);

    // Get total tokens minted
    const approvedProjects = await Project.find({ 
      status: { $in: ["Approved", "Verified"] },
      'blockchain.isRegistered': true
    }).lean();

    const totalTokensMinted = approvedProjects.reduce((sum, project) => {
      return sum + (project.Carbon_Credits_Issued || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        pendingProjects: pendingCount,
        approvedProjects: approvedCount,
        totalProjects: totalProjects,
        totalTokensMinted: totalTokensMinted
      }
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

