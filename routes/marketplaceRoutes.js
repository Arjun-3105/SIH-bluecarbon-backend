const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Create a new listing
router.post('/list', marketplaceController.createListing);

// Get active listings
router.get('/listings', marketplaceController.getListings);

module.exports = router;
