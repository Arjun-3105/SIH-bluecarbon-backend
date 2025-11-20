const express = require("express");
const router = express.Router();
const dapp = require("../controllers/dappController");

// Build unsigned tx payloads for MetaMask
router.post("/build/register-project", dapp.buildRegisterProjectTx);
router.post("/build/transfer", dapp.buildTransferTx);
router.post("/build/approve", dapp.buildApproveTx);
router.post("/build/transfer-from", dapp.buildTransferFromTx);

// Optional server-signed registration
router.post("/server/register-project", dapp.serverRegisterProject);

// Token details for easy MetaMask import
router.get("/token", dapp.tokenDetails);

module.exports = router;
