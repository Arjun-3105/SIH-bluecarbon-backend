# Carbon Credit Registry - Blockchain Setup Guide

This guide will help you set up the blockchain-powered carbon credit registry using industry-grade tools and free integrations.

## 🚀 Features

- **ERC-721 NFT Tokens**: Each carbon credit project is represented as a unique NFT
- **IPFS Integration**: Project metadata stored on IPFS for decentralization
- **Sepolia Testnet**: Deployed on Ethereum Sepolia testnet
- **Hardhat Framework**: Professional development and deployment tools
- **OpenZeppelin Contracts**: Industry-standard smart contract libraries
- **Immutable Storage**: Project data stored immutably on blockchain
- **Carbon Credit Retirement**: Ability to retire/burn carbon credits

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **Git**
3. **Testnet ETH** (Sepolia testnet)
4. **Infura Account** (free tier available)
5. **Etherscan Account** (for contract verification)

## 🛠️ Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Install Hardhat Dependencies**
   ```bash
   npm install --save-dev @nomicfoundation/hardhat-toolbox hardhat @openzeppelin/contracts
   ```

**Note**: The contract uses OpenZeppelin v5.4.0 which requires Solidity ^0.8.20 and has some breaking changes from v4:
- `Counters` utility is deprecated (replaced with simple uint256)
- `Ownable` constructor requires initial owner parameter
- `_exists()` function is removed (replaced with custom logic)

## 🔧 Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/carbon-credit-registry

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Server
PORT=5000

# Blockchain Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS=
ETHERSCAN_API_KEY=your_etherscan_api_key

# IPFS Configuration
INFURA_PROJECT_ID=your_infura_project_id
INFURA_PROJECT_SECRET=your_infura_project_secret

# Gas reporting (optional)
REPORT_GAS=false
```

### Getting Free Testnet Resources

#### 1. Infura Setup (Free Tier)
- Go to [Infura.io](https://infura.io)
- Create a free account
- Create a new project
- Get your Project ID and Project Secret
- Use the Sepolia endpoint: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

#### 2. Sepolia Testnet ETH
- Use [Sepolia Faucet](https://sepoliafaucet.com/)
- Or [Alchemy Faucet](https://sepoliafaucet.com/)
- You'll need ETH for gas fees (usually 0.01-0.1 ETH is enough)

#### 3. Etherscan API Key
- Go to [Etherscan.io](https://etherscan.io)
- Create a free account
- Go to API Keys section
- Create a new API key

## 🚀 Deployment

### 1. Compile Contracts
```bash
npm run compile
```

### 2. Deploy to Sepolia
```bash
npm run deploy
```

### 3. Update Environment
After deployment, update your `.env` file with the contract address returned by the deployment script.

## 📊 Smart Contract Features

### CarbonCreditRegistry Contract

**Key Functions:**
- `registerProject()` - Register a new carbon credit project
- `retireCredits()` - Retire/burn carbon credits
- `updateProjectStatus()` - Update project status
- `getProject()` - Get project data by token ID
- `getProjectById()` - Get project data by project ID
- `getTotalCarbonCredits()` - Get total credits issued
- `getTotalRetiredCredits()` - Get total credits retired

**Events:**
- `ProjectRegistered` - Emitted when a project is registered
- `CreditsRetired` - Emitted when credits are retired
- `ProjectUpdated` - Emitted when project is updated

## 🔗 API Endpoints

### Blockchain Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/blockchain/register/:projectId` | Register project on blockchain |
| POST | `/api/blockchain/retire/:projectId` | Retire carbon credits |
| PUT | `/api/blockchain/status/:projectId` | Update project status |
| GET | `/api/blockchain/project/:projectId` | Get project from blockchain |
| GET | `/api/blockchain/statistics` | Get blockchain statistics |
| GET | `/api/blockchain/projects` | Get all blockchain projects |
| GET | `/api/blockchain/verify/:projectId` | Verify project exists |
| GET | `/api/blockchain/token-uri/:projectId` | Get token URI |
| POST | `/api/blockchain/sync/:projectId` | Sync with blockchain |

### Example Usage

#### Register a Project
```bash
curl -X POST http://localhost:5000/api/blockchain/register/SDF-WB-2022-001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Retire Credits
```bash
curl -X POST http://localhost:5000/api/blockchain/retire/SDF-WB-2022-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": 1000, "reason": "Project completed"}'
```

## 🗃️ Database Schema

The Project model has been updated with blockchain fields:

```javascript
{
  // Original fields
  name: String,
  location: String,
  area: Number,
  // ... other fields

  // Carbon credit specific fields
  Project_ID: String,
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
    tokenId: String,
    contractAddress: String,
    transactionHash: String,
    blockNumber: Number,
    ipfsHash: String,
    isRegistered: Boolean,
    isRetired: Boolean,
    retirementDate: Date,
    retirementReason: String,
    retirementTransactionHash: String,
    lastBlockchainUpdate: Date
  }
}
```

## 🔍 IPFS Integration

The system uses IPFS for storing project metadata:

- **Upload**: Project metadata is uploaded to IPFS
- **Retrieval**: Metadata is retrieved from multiple IPFS gateways for reliability
- **NFT Metadata**: Standard NFT metadata format for compatibility

## 🛡️ Security Features

- **Access Control**: Only project owners can retire credits
- **Pausable**: Contract can be paused in emergencies
- **Reentrancy Protection**: Prevents reentrancy attacks
- **Input Validation**: Comprehensive input validation
- **Gas Optimization**: Optimized for gas efficiency

## 📈 Monitoring & Analytics

- **Blockchain Statistics**: Total projects, credits, retired credits
- **Transaction Tracking**: All blockchain operations are logged
- **IPFS Monitoring**: Metadata availability across gateways
- **Gas Usage**: Track gas consumption for optimization

## 🔄 Workflow

1. **Project Creation**: Project created in MongoDB
2. **Verification**: Project verified by authorized agency
3. **Blockchain Registration**: Project registered as NFT on blockchain
4. **IPFS Upload**: Metadata uploaded to IPFS
5. **Credit Trading**: Credits can be transferred (ERC-721 standard)
6. **Retirement**: Credits can be retired/burned permanently

## 🚨 Important Notes

- **Testnet Only**: This setup uses Sepolia testnet
- **Private Keys**: Never commit private keys to version control
- **Gas Fees**: Ensure sufficient ETH for gas fees
- **Backup**: Always backup your private keys securely
- **Monitoring**: Monitor contract events and transactions

## 🆘 Troubleshooting

### Common Issues

1. **Insufficient Gas**: Ensure wallet has enough ETH
2. **Network Issues**: Check RPC URL and network connectivity
3. **Contract Not Deployed**: Verify contract address in .env
4. **IPFS Issues**: Check Infura credentials and network

### Getting Help

- Check transaction on [Sepolia Etherscan](https://sepolia.etherscan.io/)
- Verify contract deployment
- Check server logs for detailed error messages

## 🔮 Future Enhancements

- **Carbon Credit Marketplace**: Trading platform for credits
- **Automated Verification**: IoT integration for real-time monitoring
- **Multi-chain Support**: Support for other blockchains
- **Advanced Analytics**: Detailed carbon impact reporting
- **Mobile App**: Mobile interface for project management

---

This blockchain implementation provides a robust, production-ready foundation for carbon credit management with industry-standard security and decentralization features.
