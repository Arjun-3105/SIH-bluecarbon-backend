const mongoose = require("mongoose");

const gpsSchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  precision: Number, // meters
});

const mangroveDataSchema = new mongoose.Schema({
  species: [String],           // dominant mangrove species
  treeCount: Number,
  avgDBHcm: Number,
  avgHeightM: Number,
  soilCarbonContentPercent: Number,  // if measured
  seedlingsCount: Number,
});

const seagrassDataSchema = new mongoose.Schema({
  species: [String],            // seagrass species present
  meadowAreaM2: Number,
  shootDensity: Number,         // shoots per m²-
  biomassKgPerM2: Number,
  soilCarbonContentPercent: Number,
});

const saltMarshDataSchema = new mongoose.Schema({
  species: [String],            // marsh grass species
  areaM2: Number,
  vegetationHeightM: Number,
  biomassKgPerM2: Number,
  soilCarbonContentPercent: Number,
});

const blueCarbonSchema = new mongoose.Schema({
  projectId: { type: String, ref: "Project" },
  plotId: String,

  inspector: { type: String, ref: "User" },
  submittedAt: { type: Date, default: Date.now },

  timestampISO: { type: String, required: true },
  gps: gpsSchema,

  photos: [String], // URLs or hashes
  videos: [String],

  // Type of blue carbon ecosystem
  ecosystemType: {
    type: String,
    enum: ["mangrove", "seagrass", "salt_marsh", "tidal_flat", "coastal_peatland","coral_reef"],
    required: true,
  },

  // Ecosystem-specific data (only one of these will be filled depending on ecosystemType)
  mangroveData: mangroveDataSchema,
  seagrassData: seagrassDataSchema,
  saltMarshData: saltMarshDataSchema,

  soilCores: [{
    soilCoreId: String,
    depthCm: Number,
    sampleLabel: String,
  }],

  sensorReadings: {
    salinity: Number,
    waterTemp: Number,
    pH: Number,
  },

  co2Estimate: Number,    // calculated carbon sequestration

  evidenceHash: String,   // hash of raw evidence files
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING",
  },
  
  // Verification fields
  verifier: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  verifiedAt: { type: Date }
});

module.exports = mongoose.model("BlueCarbonEvidence", blueCarbonSchema);
