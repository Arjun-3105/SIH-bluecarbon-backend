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
      ipfsHash,
    ]);
    return res.json({ to: REGISTRY_ADDRESS, data, value: "0x0" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to build tx", details: e.message });
  }
};

exports.buildTransferTx = async (req, res) => {
  try {
    const { to, amount } = req.body;
    if (!TOKEN_ADDRESS) return res.status(500).json({ error: "TOKEN address not set" });
    if (!to || !amount) return res.status(400).json({ error: "to and amount required" });
    const value = parseAmount(amount);
    const data = erc20Iface.encodeFunctionData("transfer", [to, value]);
    return res.json({ to: TOKEN_ADDRESS, data, value: "0x0" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to build tx", details: e.message });
  }
};

exports.buildApproveTx = async (req, res) => {
  try {
    const { spender, amount } = req.body;
    if (!TOKEN_ADDRESS) return res.status(500).json({ error: "TOKEN address not set" });
    if (!spender || !amount) return res.status(400).json({ error: "spender and amount required" });
    const value = parseAmount(amount);
    const data = erc20Iface.encodeFunctionData("approve", [spender, value]);
    return res.json({ to: TOKEN_ADDRESS, data, value: "0x0" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to build tx", details: e.message });
  }
};

exports.buildTransferFromTx = async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    if (!TOKEN_ADDRESS) return res.status(500).json({ error: "TOKEN address not set" });
    if (!from || !to || !amount) return res.status(400).json({ error: "from, to, amount required" });
    const value = parseAmount(amount);
    const data = erc20Iface.encodeFunctionData("transferFrom", [from, to, value]);
    return res.json({ to: TOKEN_ADDRESS, data, value: "0x0" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to build tx", details: e.message });
  }
};

exports.serverRegisterProject = async (req, res) => {
  try {
    const { projectId, carbonCredits, projectOwner, ipfsHash } = req.body;
    if (!REGISTRY_ADDRESS) return res.status(500).json({ error: "REGISTRY address not set" });
    if (!PRIVATE_KEY) return res.status(500).json({ error: "Server PRIVATE_KEY not set" });

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const registry = new ethers.Contract(REGISTRY_ADDRESS, registryIface, wallet);

    const tx = await registry.registerProject(projectId, Number(carbonCredits), projectOwner, ipfsHash);
    const receipt = await tx.wait();
    return res.json({ success: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to send tx", details: e.message });
  }
};

exports.tokenDetails = async (_req, res) => {
  try {
    return res.json({ address: TOKEN_ADDRESS, symbol: "BCARB", decimals: 18 });
  } catch (e) {
    return res.status(500).json({ error: "Failed" });
  }
};
