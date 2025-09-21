const express = require("express");
const router = express.Router();
const verificationController = require("../controllers/verificationController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all projects pending verification (Verifiers only)
router.get("/pending", 
  roleMiddleware(["Verifier", "Admin"]), 
  verificationController.getPendingVerifications
);

// Get verification details for a specific project (Verifiers only)
router.get("/project/:projectId", 
  roleMiddleware(["Verifier", "Admin"]), 
  verificationController.getVerificationDetails
);

// Approve a project and register it on blockchain (Verifiers only)
router.post("/approve/:projectId", 
  roleMiddleware(["Verifier", "Admin"]), 
  verificationController.approveProject
);

// Reject a project (Verifiers only)
router.post("/reject/:projectId", 
  roleMiddleware(["Verifier", "Admin"]), 
  verificationController.rejectProject
);

// Retry blockchain registration for a verified project (Verifiers/Admins only)
router.post("/retry-blockchain/:projectId", 
  roleMiddleware(["Verifier", "Admin"]), 
  verificationController.retryBlockchainRegistration
);

// Get verification history for a project (Verifiers/Admins only)
router.get("/history/:projectId", 
  roleMiddleware(["Verifier", "Admin"]), 
  verificationController.getVerificationHistory
);

// Get all verified projects (Verifiers/Admins only)
router.get("/verified", 
  roleMiddleware(["Verifier", "Admin"]), 
  verificationController.getVerifiedProjects
);

module.exports = router;
