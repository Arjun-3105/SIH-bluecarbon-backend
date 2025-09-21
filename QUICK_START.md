# 🚀 Quick Start Guide - Carbon Credit Registry

Get your blockchain-powered carbon credit registry up and running in minutes!

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
Create a `.env` file with these **minimum required** variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/carbon-credit-registry

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Server
PORT=5000

# Blockchain (Get these from free services)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS=

# IPFS (Optional - will work without)
INFURA_PROJECT_ID=your_infura_project_id
INFURA_PROJECT_SECRET=your_infura_project_secret
```

### 3. Get Free Testnet Resources

#### Get Sepolia ETH (Free)
- Visit [Sepolia Faucet](https://sepoliafaucet.com/)
- Enter your wallet address
- Get 0.1 ETH (enough for testing)

#### Get Infura Access (Free)
- Go to [Infura.io](https://infura.io)
- Sign up for free account
- Create new project
- Copy Project ID and Secret

### 4. Deploy Smart Contract
```bash
# Compile contracts
npm run compile

# Deploy to Sepolia
npm run deploy
```

**Copy the contract address** from the output and add it to your `.env` file.

### 5. Start the Server
```bash
npm start
```

### 6. Test Everything
```bash
# Test blockchain functionality
npm run test:blockchain

# Migrate sample data
npm run migrate
```

## 🎯 Test the API

### Register a Project
```bash
curl -X POST http://localhost:5000/api/blockchain/register/SDF-WB-2022-001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Statistics
```bash
curl http://localhost:5000/api/blockchain/statistics
```

## 📊 What You Get

✅ **ERC-721 NFT Tokens** - Each project is a unique NFT  
✅ **IPFS Storage** - Decentralized metadata storage  
✅ **Immutable Records** - Project data stored on blockchain  
✅ **Carbon Credit Retirement** - Burn credits permanently  
✅ **Real-time Statistics** - Track total credits and projects  
✅ **Production Ready** - Industry-grade security and optimization  

## 🔧 Troubleshooting

### "Insufficient funds" error
- Get more Sepolia ETH from faucet
- Check your wallet balance

### "Contract not deployed" error
- Make sure CONTRACT_ADDRESS is set in .env
- Redeploy the contract

### "IPFS upload failed" error
- Check Infura credentials
- Or remove IPFS config to use fallback

## 🚀 Next Steps

1. **Customize**: Modify the smart contract for your needs
2. **Frontend**: Build a React/Next.js frontend
3. **Mobile**: Create a mobile app
4. **Analytics**: Add detailed reporting
5. **Marketplace**: Build a carbon credit trading platform

## 📚 Documentation

- [Full Setup Guide](BLOCKCHAIN_SETUP.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Smart Contract Code](contracts/CarbonCreditRegistry.sol)

## 🆘 Need Help?

1. Check the logs: `npm run dev` for detailed output
2. Verify on Etherscan: [Sepolia Explorer](https://sepolia.etherscan.io/)
3. Test blockchain: `npm run test:blockchain`

---

**🎉 Congratulations!** You now have a production-ready blockchain carbon credit registry!
