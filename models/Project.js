const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    // Original fields
    name: String,
    location: String,          // text or GeoJSON
    area: Number,              // hectares
    method: String,            // methodology used
    metaURI: String,           // optional (link to docs/IPFS)
    status: { 
      type: String,   
      enum: ["Pending", "Verified", "Completed", "Retired"], 
      default: "Pending" 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    assignedInspector: {       // 👈 add this
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },

    // Carbon credit specific fields (matching MongoDB sample data)
    Project_ID: {
      type: String,
      unique: true,
      required: true
    },
    Project_Name: String,
    Ecosystem_Type: String,
    State_UT: String,
    District: String,
    Village_Coastal_Panchayat: String,
    Latitude_Longitude: String,
    Area_Hectares: Number,
    Species_Planted: String,
    Plantation_Date: Date,
    Verification_Agency: String,
    Verified_Date: Date,
    Carbon_Sequestration_tCO2: Number,
    Carbon_Credits_Issued: Number,
    Supporting_NGO_Community: String,

    // Blockchain fields
    blockchain: {
      tokenId: {
        type: String,
        unique: true,
        sparse: true
      },
      contractAddress: String,
      transactionHash: String,
      blockNumber: Number,
      ipfsHash: String,
      isRegistered: {
        type: Boolean,
        default: false
      },
      isRetired: {
        type: Boolean,
        default: false
      },
      retirementDate: Date,
      retirementReason: String,
      retirementTransactionHash: String,
      lastBlockchainUpdate: Date
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

// Indexes for better performance
projectSchema.index({ Project_ID: 1 });
projectSchema.index({ "blockchain.tokenId": 1 });
projectSchema.index({ "blockchain.isRegistered": 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ Ecosystem_Type: 1 });
projectSchema.index({ State_UT: 1 });

// Virtual for total carbon credits available
projectSchema.virtual('availableCredits').get(function() {
  if (this.blockchain.isRetired) {
    return 0;
  }
  return this.Carbon_Credits_Issued || 0;
});

// Method to check if project is blockchain registered
projectSchema.methods.isBlockchainRegistered = function() {
  return this.blockchain && this.blockchain.isRegistered && this.blockchain.tokenId;
};

// Method to get blockchain status
projectSchema.methods.getBlockchainStatus = function() {
  if (!this.blockchain) return 'Not Registered';
  if (this.blockchain.isRetired) return 'Retired';
  if (this.blockchain.isRegistered) return 'Registered';
  return 'Pending Registration';
};

module.exports = mongoose.model("Project", projectSchema);
