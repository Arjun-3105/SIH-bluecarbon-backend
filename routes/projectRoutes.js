const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const projectController = require("../controllers/projectController");

// Register a new project (Owner, Inspector, or Verifier can register)
router.post(
  "/register",
  authMiddleware,
  roleMiddleware(["Owner", "Inspector", "Verifier", "Admin"]),
  projectController.registerProject
);

// Get all projects for the logged-in user
router.get(
  "/my-projects",
  authMiddleware,
  roleMiddleware(["Register", "Owner", "Inspector"]),
  projectController.getUserProjects
);

// Get all projects assigned to the user (Inspector role)
router.get(
  "/assigned",
  authMiddleware,
  roleMiddleware(["Owner", "Inspector"]),
  projectController.getAssignedProjects
);

// Get all projects (Admin/Verifier only)
router.get(
  "/allID",
  authMiddleware,
  roleMiddleware(["Verifier"]),
  projectController.getAllProjectsID
);

// Get a single project by ID
router.get(
  "/:projectId",
  authMiddleware,
  projectController.getProjectById
);

module.exports = router;
