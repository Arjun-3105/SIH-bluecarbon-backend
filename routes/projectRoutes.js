const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const projectController = require("../controllers/projectController");

// Register a new project (Register role only)
router.post(
  "/register",
  authMiddleware,
  roleMiddleware(["Register"]),
  projectController.registerProject
);

// Get all projects for the logged-in user
router.get(
  "/my-projects",
  authMiddleware,
  roleMiddleware(["Register", "Inspector"]),
  projectController.getUserProjects
);

// Get all projects assigned to the user (Inspector role)
router.get(
  "/assigned",
  authMiddleware,
  roleMiddleware(["Inspector"]),
  projectController.getAssignedProjects
);

// Get all projects (Admin/Verifier only)
router.get(
  "/all",
  authMiddleware,
  roleMiddleware(["Verifier"]),
  projectController.getAllProjects
);

// Get a single project by ID
router.get(
  "/:projectId",
  authMiddleware,
  projectController.getProjectById
);

module.exports = router;
