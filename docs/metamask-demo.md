## Metamask Demo: Viewing BCARB Credits and Showing Reductions

Use this guide to demonstrate the on-chain lifecycle end-to-end: import the Hardhat wallet into Metamask, add the BlueCarbon (BCARB) token, and visibly reduce the token balance by retiring credits.

### 1. Prerequisites
- Hardhat local node running (`npx hardhat node` in `backend/`).
- Contracts deployed to that node (`npx hardhat run scripts/deploy.js --network localhost`).
- `backend/deployments/localhost.json` generated with addresses.
- The same Hardhat account private key configured in `.env` (`PRIVATE_KEY=...`) for backend transactions.

### 2. Import the Hardhat Account into Metamask
1. Copy the private key for the first Hardhat account from the node console (starts with `0xf39f...`).
2. In Metamask:
   - Top-right account icon → `Import Account`.
   - Paste the private key → `Import`.
3. Add the Hardhat localhost network (if not already):
   - Settings → `Networks` → `Add network manually`.
   - Network name: `Hardhat Localhost`.
   - RPC URL: `http://127.0.0.1:8545`.
   - Chain ID: `31337`.
   - Currency symbol: `ETH`.

### 3. Add the BCARB Token
1. From `backend/deployments/localhost.json`, copy `blueCarbonToken.address`.
2. In Metamask, select the imported Hardhat account → `Import tokens`.
3. Paste the BCARB token address; symbol (`BCARB`) and decimals (`18`) should auto-fill.
4. Save; Metamask now shows the BCARB balance for that wallet.

### 4. Mint Dummy Credits (if needed)
Run the existing script to register a dummy project and mint credits to the demo wallet:
```bash
npx hardhat run scripts/register-dummy-project.js --network localhost --owner <metamask_account_address>
```
Observe the BCARB balance increase inside Metamask.

### 5. Show Balance Reduction (Carbon Retirement)
1. Use the backend API to retire credits:
   ```bash
   curl -X POST http://localhost:5000/api/blockchain/retire/<Project_ID> \
     -H "Content-Type: application/json" \
     -d '{"amount":100,"reason":"Sold to Buyer X"}'
   ```
2. The backend calls `blockchainService.retireCredits`, which burns credits on-chain.
3. Watch the Hardhat node log for the `retireCredits` transaction hash.
4. Open Metamask; the BCARB token balance drops by the retired amount (after refreshing or switching tabs).

### 6. Suggested Demo Flow for Judges
1. Show Metamask account + BCARB token with starting balance.
2. Run the retirement curl command (or trigger via UI).
3. Reveal:
   - API response containing `transactionHash`.
   - Hardhat console log confirming `retireCredits`.
   - Metamask window where the BCARB balance decreased.
4. Conclude with `GET /api/blockchain/project/<Project_ID>` to show on-chain status = `RETIRED` and matching retirement data.

This sequence clearly proves that project data reaches the blockchain, IPFS metadata is stored, BCARB credits mint to the owner, and retiring/trading credits reduces the on-chain token balance visible inside Metamask.


