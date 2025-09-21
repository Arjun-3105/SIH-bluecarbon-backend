const mongoose = require("mongoose");

const projectStampSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,  // 👈 directly store Project_ID string
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId, // uploader/owner
      ref: "User",
      required: true,
      index: true,
    },
    assignedInspector: {
      type: mongoose.Schema.Types.ObjectId, // verifier
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Under Review", "Verified", "Completed", "Retired"],
      default: "Pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProjectStamp", projectStampSchema);
