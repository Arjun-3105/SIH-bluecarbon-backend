const { ethers } = require("ethers");
require("dotenv").config();

const TOKEN_ADDRESS = process.env.BLUE_CARBON_TOKEN_ADDRESS;
const REGISTRY_ADDRESS = process.env.CARBON_CREDIT_REGISTRY_ADDRESS;
const RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const erc20Iface = new ethers.Interface([
  "function transfer(address to, uint256 value)",
  "function approve(address spender, uint256 value)",
  "function transferFrom(address from, address to, uint256 value)",
]);

const registryIface = new ethers.Interface([
  "function registerProject(string projectId, uint16 carbonCredits, address projectOwner, bytes32 ipfsHash) external returns (uint256)",
]);

function parseAmount(amount) {
  if (typeof amount === "string" && amount.includes(".")) {
    return ethers.parseUnits(amount, 18);
  }
  try { return ethers.parseUnits(String(amount), 18); } catch { return BigInt(amount); }
}

exports.buildRegisterProjectTx = async (req, res) => {
  try {
    const { projectId, carbonCredits, projectOwner, ipfsHash } = req.body;
    if (!REGISTRY_ADDRESS) return res.status(500).json({ error: "REGISTRY address not set" });
    if (!projectId || !carbonCredits || !projectOwner || !ipfsHash) {
      return res.status(400).json({ error: "projectId, carbonCredits, projectOwner, ipfsHash required" });
    }
    const data = registryIface.encodeFunctionData("registerProject", [
      projectId,
      Number(carbonCredits),
      projectOwner,
      ipfsHash
    ]);
    // Additional code to send the transaction would go here
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Change the routes endpoint of verifier
const express = require('express');
const router = express.Router();

router.post('/verifier/register', exports.buildRegisterProjectTx);

module.exports = router;