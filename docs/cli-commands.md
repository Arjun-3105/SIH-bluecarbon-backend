## CLI Commands for Blockchain & Token Ops

This guide gathers the primary command-line workflows used to demo project registration, token minting, balance checks, and credit retirement.

All commands assume you run them from the `backend/` directory and have already run `npm install`.

---

### 1. Start Local Blockchain
```bash
npx hardhat node
```
Runs a local Ethereum chain with prefunded accounts (keep this terminal open).

### 2. Deploy Contracts
```bash
npx hardhat run scripts/deploy.js --network localhost
```
Outputs `backend/deployments/localhost.json` containing `BlueCarbonToken` and `CarbonCreditRegistry` addresses.

### 3. Register Dummy Project (Mint BCARB)
```bash
npx hardhat run scripts/register-dummy-project.js \
  --network localhost \
  --owner 0xYourDemoWallet
```
- Registers a project with unique `projectId`.
- Mints BCARB credits to the `--owner` wallet.
- Prints token ID, transaction hash, and resulting BCARB balance.

### 4. Check Token Balance via CLI
```bash
npx hardhat run scripts/token-tools.js \
  --network localhost \
  --action balance \
  --address 0xYourWallet
```
- Uses `deployments/<network>.json` to find the BCARB token.
- Prints balance in both wei and human-readable BCARB units.

### 5. Retire Credits via CLI
```bash
npx hardhat run scripts/token-tools.js \
  --network localhost \
  --action retire \
  --tokenId 1 \
  --amount 100 \
  --reason "Sold to Buyer X"
```
Options:
- `--signer <index>`: which Hardhat signer sends the tx (default 0).
- `--reason`: comment stored on-chain.
The script logs the tx hash, block number, and gas usage.

### 6. Backend API Calls (Optional)
- **Register project in blockchain**  
  ```bash
  curl -X POST http://localhost:5000/api/blockchain/register/<Project_ID>
  ```
- **Retire credits via API**  
  ```bash
  curl -X POST http://localhost:5000/api/blockchain/retire/<Project_ID> \
    -H "Content-Type: application/json" \
    -d '{"amount":100,"reason":"Sold to Buyer X"}'
  ```
- **Fetch blockchain stats**  
  ```bash
  curl http://localhost:5000/api/blockchain/statistics
  ```

These commands let you demonstrate the entire lifecycle: deploy contracts, register dummy projects, read balances, retire credits, and present verifiable blockchain interactions to judges. Adjust `--network` or RPC URLs if you migrate to GoChain/Sepolia.


