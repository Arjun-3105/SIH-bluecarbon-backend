const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: String,
  location: String,          // text or GeoJSON
  area: Number,              // hectares
  method: String,            // methodology used
  metaURI: String,           // optional (link to docs/IPFS)
  status: { type: String, enum: ["Pending", "Verified", "Completed"], default: "Pending" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
