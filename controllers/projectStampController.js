// // controllers/projectStampController.js
// const ProjectStamp = require("../models/Project");

// exports.createProjectStamp = async (req, res) => {
//   try {
//     // The frontend is sending project data, but we only need certain fields
//     const { projectId } = req.body;

//     // Make sure req.user is set by your authMiddleware
//     const ownerId = req.user._id;

//     const newProjectStamp = new ProjectStamp({
//       projectId,
//       ownerId,
//       assignedInspector: null, // default, unless you want to assign
//       status: "Pending",       // default
//     });

//     await newProjectStamp.save();

//     res.status(201).json({
//       message: "Project stamp created successfully",
//       projectStamp: newProjectStamp,
//     });
//   } catch (err) {
//     console.error("Error creating project stamp:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };