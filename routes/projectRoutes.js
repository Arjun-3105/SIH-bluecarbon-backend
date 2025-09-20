const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const projectController = require("../controllers/projectController");

// Get all projects assigned to the user
router.get(
  "/my-projects",
  authMiddleware,
  roleMiddleware(["Register", "Inspector"]),
  projectController.getAssignedProjects
);

// Get a single project by ID
router.get(
  "/my-projects/:projectId",
  authMiddleware,
  roleMiddleware(["Register", "Inspector"]),
  projectController.getProjectById
);

module.exports = router;
