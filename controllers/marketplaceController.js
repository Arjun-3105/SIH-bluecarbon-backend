const Listing = require('../models/Listing');
const Project = require('../models/Project');

// Create a marketplace listing
exports.createListing = async (req, res) => {
  try {
    const { projectId, tokenId, priceEth } = req.body;
    const sellerAddress = req.user.walletAddress || req.body.sellerAddress || null;

    if (!projectId || !tokenId || !priceEth || !sellerAddress) {
      return res.status(400).json({ success: false, message: 'projectId, tokenId, priceEth and sellerAddress are required' });
    }

    // Verify project exists and is registered
    const project = await Project.findOne({ Project_ID: projectId });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!project.blockchain || !project.blockchain.isRegistered) return res.status(400).json({ success: false, message: 'Project not registered on-chain' });

    // Convert ETH to wei string
    const priceWei = (BigInt(Math.floor(parseFloat(priceEth) * 1e18))).toString();

    const listing = new Listing({ projectId, tokenId, sellerAddress, priceWei });
    await listing.save();

    res.json({ success: true, message: 'Listing created', listing });
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({ success: false, message: 'Failed to create listing', error: error.message });
  }
};

// Get active listings
exports.getListings = async (req, res) => {
  try {
    const listings = await Listing.find({ status: 'ACTIVE' }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: listings });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch listings' });
  }
};
