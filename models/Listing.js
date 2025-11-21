const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  projectId: { type: String, required: true, index: true },
  tokenId: { type: String, required: true, index: true },
  sellerAddress: { type: String, required: true, index: true },
  priceWei: { type: String, required: true },
  currency: { type: String, default: 'ETH' },
  status: { type: String, enum: ['ACTIVE', 'SOLD', 'CANCELLED'], default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Listing', listingSchema);
