const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: "BlueCarbonEvidence" },  // Ensure to reference the correct model
  verifiedHash: String,      // new hash after verification
  status: { type: String, enum: ["Approved", "Rejected"], required: true },
  comments: String,
  verifier: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  verifiedAt: { type: Date, default: Date.now },

  // Additional fields for verification process

  gps: {
    latitude: Number,
    longitude: Number,
    precision: Number, // meters
  },
  
  // Ecosystem-specific data to help the verifier validate
  mangroveData: {
    species: [String],           // dominant mangrove species
    treeCount: Number,
    avgDBHcm: Number,
    avgHeightM: Number,
    soilCarbonContentPercent: Number,  // if measured
    seedlingsCount: Number,
  },
  seagrassData: {
    species: [String],            // seagrass species present
    meadowAreaM2: Number,
    shootDensity: Number,         // shoots per m²
    biomassKgPerM2: Number,
    soilCarbonContentPercent: Number,
  },
  saltMarshData: {
    species: [String],            // marsh grass species
    areaM2: Number,
    vegetationHeightM: Number,
    biomassKgPerM2: Number,
    soilCarbonContentPercent: Number,
  },

  // Verification of soil cores (if needed)
  soilCores: [{
    soilCoreId: String,
    depthCm: Number,
    sampleLabel: String,
  }],

  // Sensor readings for verification
  sensorReadings: {
    salinity: Number,
    waterTemp: Number,
    pH: Number,
  },

  // Co2 sequestration estimate for verification
  co2Estimate: Number,    // calculated carbon sequestration

  // Verification photos and videos (optional for verification purposes)
  photos: [String], // URLs or hashes
  videos: [String], 

  // Evidence hash for raw evidence files
  evidenceHash: String,   // hash of raw evidence files
});

module.exports = mongoose.model("Verification", verificationSchema);
