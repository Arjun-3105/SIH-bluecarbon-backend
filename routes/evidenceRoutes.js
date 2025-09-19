const express = require("express");
const router = express.Router();
const { submitEvidence } = require("../controllers/evidenceController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

// Inspector-only route
router.post("/", authMiddleware, roleMiddleware(["Inspector"]), submitEvidence);

module.exports = router;
