const Project = require("../models/Project");

// Get all projects assigned to the logged-in register/inspector
exports.getAssignedProjects = async (req, res) => {
  try {
    const userId = req.user.id; // from authMiddleware
    let projects;

     if (req.user.role === "Inspector") {
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

// Fetch a single project by id
exports.getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (
      (req.user.role === "Register" && project.createdBy.toString() !== req.user.id) ||
      (req.user.role === "Inspector" && project.assignedInspector.toString() !== req.user.id)
    ) {
      return res.status(403).json({ message: "Access denied: not your project." });
    }

    res.json({ project });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Server error while fetching project." });
  }
};
