# Carbon Credit Registry - Project Structure

## 📁 Clean Project Structure

```
backend/
├── 📄 server.js                    # Main Express server
├── 📄 package.json                 # Dependencies and scripts
├── 📄 hardhat.config.js            # Hardhat configuration
├── 📄 PROJECT_STRUCTURE.md         # This file
│
├── 📁 contracts/                   # Smart Contracts
│   └── CarbonCreditRegistry.sol    # Main carbon credit contract
│
├── 📁 controllers/                 # API Controllers
│   ├── blockchainController.js     # Blockchain operations
│   ├── evidenceController.js       # Evidence management
│   ├── projectController.js        # Project management
│   └── userController.js           # User authentication
│
├── 📁 routes/                      # API Routes
│   ├── blockchainRoutes.js         # Blockchain endpoints
│   ├── evidenceRoutes.js           # Evidence endpoints
│   ├── frontendRoutes.js           # Frontend integration
│   ├── projectRoutes.js            # Project endpoints
│   └── userRoutes.js               # User endpoints
│
├── 📁 models/                      # Database Models
│   ├── Evidence.js                 # Evidence schema
│   ├── Project.js                  # Project schema
│   ├── User.js                     # User schema
│   └── index.js                    # Model exports
│
├── 📁 middlewares/                 # Express Middleware
│   ├── authMiddleware.js           # Authentication
│   └── roleMiddleware.js           # Role-based access
│
├── 📁 utils/                       # Utility Functions
│   ├── blockchainService.js        # Blockchain interactions
│   ├── hashUtils.js                # Hashing utilities
│   └── ipfsUpload.js               # IPFS integration
│
├── 📁 config/                      # Configuration
│   ├── db.js                       # Database connection
│   └── setupCollection.js          # Collection setup
│
├── 📁 types/                       # TypeScript Definitions
│   └── ProjectRegistration.ts      # Frontend type definitions
│
├── 📁 scripts/                     # Utility Scripts
│   ├── deploy.js                   # Contract deployment
│   ├── checkEnv.js                 # Environment validation
│   ├── migrateSampleData.js        # Sample data migration
│   ├── registerProjectExample.js   # Example project registration
│   ├── viewData.js                 # Console data viewer
│   ├── simpleDataViewer.js         # Web data viewer
│   └── README.md                   # Scripts documentation
│
└── 📁 artifacts/                   # Compiled Contracts (Auto-generated)
    └── contracts/
        └── CarbonCreditRegistry.sol/
            ├── CarbonCreditRegistry.json
            └── CarbonCreditRegistry.dbg.json
```

## 🧹 Cleanup Summary

### ❌ **Removed Files:**
- **Documentation**: 6 duplicate/outdated MD files
- **Scripts**: 10 duplicate test scripts
- **Controllers**: Empty verification controller
- **Routes**: Unused verification routes
- **Models**: Unused verification model
- **Directories**: Empty blockchain directory, cache directory
- **Temporary**: tempCodeRunnerFile.js, start-integration.js

### ✅ **Kept Essential Files:**
- **Core**: server.js, package.json, hardhat.config.js
- **Smart Contracts**: CarbonCreditRegistry.sol
- **API**: All essential controllers and routes
- **Database**: All necessary models
- **Utilities**: All utility functions
- **Scripts**: Only essential, production-ready scripts
- **Types**: Frontend integration types

## 🎯 **Key Features:**
- ✅ **Clean structure** - No duplicate or unnecessary files
- ✅ **Production ready** - Only essential components
- ✅ **Well organized** - Clear separation of concerns
- ✅ **Documented** - Clear purpose for each file
- ✅ **Maintainable** - Easy to understand and modify

## 🚀 **Quick Start:**
```bash
# Install dependencies
npm install

# Check environment
npm run check:env

# Deploy contract locally
npm run deploy:local

# Start server
npm start

# View data
npm run view:web
```

## 📊 **Project Stats:**
- **Total Files**: ~30 essential files
- **Removed Files**: ~20 unnecessary files
- **Cleanup**: 40% reduction in file count
- **Organization**: 100% clear structure
