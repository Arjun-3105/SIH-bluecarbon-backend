# Scripts Directory

This directory contains essential scripts for the Carbon Credit Registry backend.

## 📁 Available Scripts

### 🚀 **Deployment & Setup**
- **`deploy.js`** - Deploy smart contract to blockchain
  - `npm run deploy` - Deploy to Sepolia testnet
  - `npm run deploy:local` - Deploy to local Hardhat network

### 🔧 **Environment & Configuration**
- **`checkEnv.js`** - Validate environment variables
  - `npm run check:env` - Check if all required env vars are set

### 📊 **Data Management**
- **`migrateSampleData.js`** - Load sample data into database
  - `npm run migrate` - Populate database with sample projects

- **`viewData.js`** - View blockchain data in console
  - `npm run view:data` - Display all projects and statistics

- **`simpleDataViewer.js`** - Web interface for viewing data
  - `npm run view:web` - Start web viewer at http://localhost:3002

### 📝 **Examples & Testing**
- **`registerProjectExample.js`** - Example project registration
  - `npm run example` - Register a sample project

## 🎯 **Quick Start Commands**

```bash
# 1. Check environment
npm run check:env

# 2. Deploy contract locally
npm run deploy:local

# 3. View data in console
npm run view:data

# 4. View data in web interface
npm run view:web

# 5. Register example project
npm run example
```

## 🔗 **Integration Commands**

```bash
# Start backend server
npm start

# Start with auto-reload
npm run dev

# Start integration mode
npm run start:integration
```

## 📋 **Script Purposes**

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `deploy.js` | Deploy smart contract | When deploying to blockchain |
| `checkEnv.js` | Validate configuration | Before running any script |
| `migrateSampleData.js` | Load sample data | For testing with sample projects |
| `viewData.js` | Console data viewer | Quick data inspection |
| `simpleDataViewer.js` | Web data viewer | User-friendly data viewing |
| `registerProjectExample.js` | Example registration | Testing project registration |

## 🧹 **Cleanup Summary**

**Removed Duplicate Scripts:**
- ❌ `testBlockchain.js` - Basic blockchain test
- ❌ `testFrontendData.js` - Frontend data test
- ❌ `testFrontendIntegration.js` - Frontend integration test
- ❌ `testReactDataDirect.js` - React data direct test
- ❌ `testReactFrontendIntegration.js` - React frontend integration test
- ❌ `testLocal.js` - Local testing
- ❌ `testLocalSimple.js` - Simple local testing
- ❌ `simpleTest.js` - Simple test
- ❌ `finalTest.js` - Final test
- ❌ `quickTest.js` - Quick test
- ❌ `testRPC.js` - RPC test

**Kept Essential Scripts:**
- ✅ `deploy.js` - Contract deployment
- ✅ `checkEnv.js` - Environment validation
- ✅ `migrateSampleData.js` - Sample data migration
- ✅ `registerProjectExample.js` - Example project registration
- ✅ `viewData.js` - Console data viewer
- ✅ `simpleDataViewer.js` - Web data viewer

## 🎉 **Result**

The scripts directory is now clean and organized with only essential, production-ready scripts. Each script has a clear purpose and is referenced in the package.json for easy execution.
